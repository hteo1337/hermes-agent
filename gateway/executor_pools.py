"""Bound blocking workloads independently of asyncio's shared default executor."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from contextvars import copy_context
import asyncio
import logging
import threading
import time

logger = logging.getLogger(__name__)

# MCP's registry and connections are process-wide; discovery is bounded across profiles too.
MCP_DISCOVERY_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="gateway-mcp")
WORKLOAD_WORKERS = {"compression": 4, "summary": 2}
WORKLOAD_ATTRIBUTES = tuple(f"_{name}_executor" for name in WORKLOAD_WORKERS)


def workload_executor(runner, name):
    """Use the runner's creation/shutdown fence, including on lightweight runner doubles."""
    from gateway.run import GatewayRunner
    return GatewayRunner._get_or_create_pool(
        runner, f"_{name}_executor", lambda: ThreadPoolExecutor(
            max_workers=WORKLOAD_WORKERS[name], thread_name_prefix=f"gateway-{name}"))


def submit_workload(runner, name, func, *args):
    """Return the real worker future so existing deferred-work tracking survives cancellation."""
    return asyncio.get_running_loop().run_in_executor(
        workload_executor(runner, name), copy_context().run, func, *args)


class ObservedDefaultExecutor(ThreadPoolExecutor):
    """Keep Python's default worker cap; measure queueing separately from execution."""

    def __init__(self):
        super().__init__(thread_name_prefix="asyncio")
        self._activity_lock = threading.Lock()
        self._active = 0

    def submit(self, fn, /, *args, **kwargs):
        queued_at = time.monotonic()

        def run():
            wait = time.monotonic() - queued_at
            with self._activity_lock:
                self._active += 1
                active = self._active
            try:
                if wait > 1.0:
                    logger.warning("Default executor queue wait=%.3fs active=%d max_workers=%d",
                                   wait, active, self._max_workers)
                logger.debug("Default executor start queue_wait=%.3fs active=%d", wait, active)
                return fn(*args, **kwargs)
            finally:
                with self._activity_lock:
                    self._active -= 1

        return super().submit(run)


def observe_default_executor():
    """Install before boot submits work; never replace an executor already in use."""
    loop = asyncio.get_running_loop()
    if getattr(loop, "_default_executor", None) is None:
        loop.set_default_executor(ObservedDefaultExecutor())
