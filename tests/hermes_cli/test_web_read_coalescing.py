"""GET /api/profiles coalesces a poll burst before AnyIO threadpool admission (#105179)."""
import asyncio
import threading
from functools import wraps

import pytest


async def wait_until(predicate):
    async with asyncio.timeout(3):
        while not predicate():
            await asyncio.sleep(0.005)


def async_test(fn):
    @wraps(fn)
    def run(*args, **kwargs):
        return asyncio.run(fn(*args, **kwargs))
    return run


@async_test
async def test_profiles_burst_leaves_threadpool_status_responsive(monkeypatch):
    import anyio.to_thread
    import httpx
    from fastapi import FastAPI
    from hermes_cli import profiles as profiles_mod
    from hermes_cli.web_routers import profiles
    from starlette.concurrency import run_in_threadpool
    release = threading.Event()
    calls = []

    def slow_profiles(**_kwargs):  # the router passes ``lazy_skill_count=True``
        calls.append(1)
        assert release.wait(3)
        return ["example"]

    monkeypatch.setattr(profiles_mod, "list_profiles", slow_profiles)
    monkeypatch.setattr(profiles, "_profile_to_dict", lambda p: {"name": p})
    monkeypatch.setattr(profiles, "run_in_threadpool", run_in_threadpool)
    app = FastAPI()
    app.include_router(profiles.router)

    @app.get("/api/status")
    def status():
        return {"ok": True}

    limiter = anyio.to_thread.current_default_thread_limiter()
    previous = limiter.total_tokens
    limiter.total_tokens = 2
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            tasks = [asyncio.create_task(client.get("/api/profiles")) for _ in range(12)]
            try:
                await wait_until(lambda: calls)
                await asyncio.sleep(0.05)
                response = await asyncio.wait_for(client.get("/api/status"), 0.5)
                assert response.status_code == 200
                assert response.json() == {"ok": True}
                assert calls == [1]
                assert limiter.borrowed_tokens == 1
            finally:
                release.set()
                responses = await asyncio.gather(*tasks)
            assert all(r.status_code == 200 for r in responses)
            assert all(r.json() == {"profiles": [{"name": "example"}]} for r in responses)
    finally:
        limiter.total_tokens = previous


@async_test
async def test_legacy_profile_sessions_burst_preserves_threadpool_capacity_and_freshness(monkeypatch, tmp_path):
    """Concurrent catalog reads must leave room for status, without caching completed pages."""
    import anyio.to_thread
    import httpx
    from fastapi import FastAPI
    from hermes_cli.web_routers import profiles
    from tests.waiting import async_wait_until

    release = threading.Event()
    admitted = asyncio.Event()
    calls = []
    arrivals = 0
    holding = True
    workers = 8

    class Database:
        def list_sessions_rich(self, **kwargs):
            return [{"id": str(kwargs["limit"]), "started_at": 1}]

        def session_count(self, **kwargs):
            return 1

    def read_profile(name, home, errors, read):
        calls.append(name)
        if holding:
            assert release.wait(10), "catalog scan was never released"
        return read(Database())

    monkeypatch.setattr(profiles, "_profile_targets", lambda _: [("default", tmp_path)])
    monkeypatch.setattr(profiles, "_cron_profile_home", lambda name: (name, tmp_path / name))
    monkeypatch.setattr(profiles, "_read_profile_db", read_profile)
    monkeypatch.setattr(profiles, "_corrupt_profile_stores", lambda _: {})
    monkeypatch.setattr(profiles, "subagent_listing_scope", lambda *a, **kw: (False, []))
    app = FastAPI()
    app.include_router(profiles.sessions_router)

    @app.middleware("http")
    async def count_requests(request, call_next):
        nonlocal arrivals
        if request.url.path == "/api/profiles/sessions":
            arrivals += 1
            if arrivals == workers:
                admitted.set()
        return await call_next(request)

    @app.get("/probe-status")
    def status():
        return {"ok": True}

    limiter = anyio.to_thread.current_default_thread_limiter()
    previous = limiter.total_tokens
    limiter.total_tokens = 2
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            tasks = [asyncio.create_task(client.get("/api/profiles/sessions?limit=20")) for _ in range(workers)]
            try:
                await asyncio.wait_for(admitted.wait(), 3)
                await async_wait_until(lambda: calls, timeout=3)
                response = await asyncio.wait_for(client.get("/probe-status"), 2)
                assert response.status_code == 200
                assert response.json() == {"ok": True}
                assert calls == ["default"]
                assert limiter.borrowed_tokens == 1
            finally:
                release.set()
                responses = await asyncio.gather(*tasks)
            assert all(response.status_code == 200 for response in responses)
            assert all(response.json()["sessions"][0]["id"] == "20" for response in responses)
            assert calls == ["default"]
            holding = False
            # A later identical read is fresh; other page/profile arguments retain their own results.
            fresh = await client.get("/api/profiles/sessions?limit=20")
            other = await client.get("/api/profiles/sessions?profile=worker&limit=7")
            assert fresh.json()["sessions"][0]["id"] == "20"
            assert other.json()["sessions"][0]["id"] == "7"
            assert other.json()["sessions"][0]["profile"] == "worker"
            assert calls == ["default", "default", "worker"]
    finally:
        limiter.total_tokens = previous
