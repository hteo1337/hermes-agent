"""Measure startup only against a temporary, synthetic gateway home."""
import asyncio
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

import psutil


def launch():
    from gateway.config import GatewayConfig
    from gateway.run_bootstrap import start_gateway

    home = Path(os.environ["HERMES_HOME"])
    result = asyncio.run(start_gateway(GatewayConfig(sessions_dir=home / "sessions")))
    if not result:
        raise SystemExit(1)


def measure():
    from gateway.control_socket import identify_gateway

    home = Path(os.environ["HERMES_HOME"]).resolve()
    root = Path(os.environ["HOME"]).resolve()
    assert root.name.startswith("hermes-th1-2642.") and home.parent == root
    home.mkdir(mode=0o700)
    shutil.copyfile(root / "seed.db", home / "state.db")
    home.joinpath("config.yaml").write_text("agent:\n  environment_probe: false\n")
    first = None
    with (root / "probe-gateway.log").open("w") as log:
        start = time.monotonic()
        child = subprocess.Popen([sys.executable, __file__, "launch"], stdout=log, stderr=log)
        try:
            while time.monotonic() - start < 60:
                if child.poll() is not None:
                    raise RuntimeError(f"test gateway exited with {child.returncode}")
                identity = identify_gateway(home, timeout=0.25)
                now = time.monotonic() - start
                if identity and identity.get("pid") == child.pid:
                    if first is None:
                        first = now
                        print(f"socket_ms={first*1000:.2f} first_state={identity.get('state')}", flush=True)
                    if identity.get("state") == "ready":
                        rss = psutil.Process(child.pid).memory_info().rss // 1024**2
                        print(f"ready_ms={now*1000:.2f} rss_mib={rss}", flush=True)
                        return
                time.sleep(0.025)
            raise RuntimeError("test gateway never became ready")
        finally:
            if child.poll() is None:
                child.terminate()
                try:
                    child.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    child.kill()
                    child.wait()


if __name__ == "__main__":
    (launch if sys.argv[1:] == ["launch"] else measure)()
