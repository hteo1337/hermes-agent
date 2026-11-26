"""Bound blocking workloads independently of asyncio's shared default executor."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from contextvars import copy_context
import asyncio

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
