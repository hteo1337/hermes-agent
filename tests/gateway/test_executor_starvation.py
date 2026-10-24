"""TH1-1839: desktop bootstrap and RPCs must not queue behind long default-pool work."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
import threading
from types import SimpleNamespace

import pytest

from gateway.control_socket import GatewayControlServer, resolve_client_socket_path
from gateway.runtime_bootstrap import TicketStore
from tui_gateway.ws import _dispatch_request


@pytest.mark.platforms("posix")
def test_ticket_and_rpc_ping_survive_default_executor_saturation(tmp_path):
    async def scenario():
        home = tmp_path / "home"
        home.mkdir(mode=0o700)
        profile = str(home.resolve())
        control = GatewayControlServer(home)
        control.ticket_store = TicketStore("saturation-instance", frozenset({profile}))
        assert await control.start()
        loop = asyncio.get_running_loop()
        loop.set_default_executor(ThreadPoolExecutor(max_workers=22))
        release = threading.Event()
        started = [asyncio.Event() for _ in range(22)]

        def hold(event):
            loop.call_soon_threadsafe(event.set)
            release.wait()

        holders = [loop.run_in_executor(None, hold, event) for event in started]

        async def mint():
            reader, writer = await asyncio.open_unix_connection(str(resolve_client_socket_path(home)))
            try:
                writer.write(json.dumps({"protocol": 1, "id": 1, "verb": "session-ticket", "params": {
                    "profile_id": profile, "instance_id": "saturation-instance", "purpose": "interactive",
                }}).encode() + b"\n")
                await writer.drain()
                reply = json.loads(await reader.readline())
                assert reply["ok"] is True
                grant = control.ticket_store.redeem(reply["result"]["ticket"], profile_id=profile,
                                                   purpose="interactive")
                assert grant["profile_id"] == profile
            finally:
                writer.close()
                await writer.wait_closed()

        try:
            await asyncio.wait_for(asyncio.gather(*(event.wait() for event in started)), 5)
            # All 22 workers have entered hold(). This probe must remain queued throughout
            # the treatment: replacing/enlarging the default executor would invalidate it.
            probe = loop.run_in_executor(None, lambda: "released")
            ping = {"jsonrpc": "2.0", "id": 2, "method": "ping", "params": {}}
            _, reply = await asyncio.wait_for(asyncio.gather(
                mint(), _dispatch_request(None, ping, "ping", SimpleNamespace(desktop_local=True)),
            ), 5)
            assert reply == {"jsonrpc": "2.0", "id": 2, "result": {"pong": True}}
            assert not probe.done(), "default pool was not actually saturated"
        finally:
            release.set()
            await asyncio.gather(*holders)
            await control.stop()

    asyncio.run(scenario())
