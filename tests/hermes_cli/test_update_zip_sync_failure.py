"""ZIP and Git-error fallback return the completion owner's exact failure."""
from types import SimpleNamespace
import subprocess
from unittest.mock import Mock

import pytest

from hermes_cli import main, update_cmd, update_cmd_zip


def test_zip_without_configured_repository_never_downloads(monkeypatch):
    from hermes_cli import source_releases

    monkeypatch.setattr(source_releases, "configured_repository", lambda: "")
    monkeypatch.setattr(update_cmd_zip, "_abort_zip_update_if_dirty_tree", lambda: None)
    monkeypatch.setattr(update_cmd_zip, "_download_and_swap_zip", lambda *args: pytest.fail("unexpected download"))
    with pytest.raises(ValueError, match="GitHub owner/repository"):
        update_cmd_zip._update_via_zip(SimpleNamespace(branch="main"), completion_request={})


@pytest.mark.parametrize("route", ["zip", "git-error"])
def test_zip_completion_failure_does_not_run_old_followup(tmp_path, monkeypatch, route):
    monkeypatch.setattr(main, "PROJECT_ROOT", tmp_path)
    monkeypatch.setattr(update_cmd_zip, "_abort_zip_update_if_dirty_tree", lambda: None)
    monkeypatch.setattr(update_cmd_zip, "_download_and_swap_zip", lambda *a: None)
    monkeypatch.setattr(update_cmd, "_should_zip_fallback_on_update_error", lambda exc: True)
    request = {"expected_sha": None, "desktop": True}
    completion = Mock(side_effect=SystemExit(23))
    monkeypatch.setattr(update_cmd, "_complete_source_update", completion)
    monkeypatch.setattr(update_cmd, "_run_post_update_maintenance", lambda **kw: pytest.fail("old maintenance"))
    monkeypatch.setattr(update_cmd, "_update_via_zip", update_cmd_zip._update_via_zip)
    with pytest.raises(SystemExit) as error:
        if route == "zip":
            update_cmd_zip._update_via_zip(SimpleNamespace(branch="main"), completion_request=request,
                                           target_repository="fixture/envoy")
        else:
            update_cmd._handle_update_called_process_error(
                subprocess.CalledProcessError(1, ["git", "fetch"]), SimpleNamespace(branch="main"),
                False, True, completion_request=request, target_repository="fixture/envoy")
    assert error.value.code == 23
    completion.assert_called_once_with(request)
