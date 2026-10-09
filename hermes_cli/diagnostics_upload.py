"""Client for uploading diagnostics bundles to the configured service."""

import json
import os
import urllib.request
from urllib.parse import urlsplit

from hermes_cli.endpoints import brand_name, endpoint

from hermes_cli.debug_redaction import redact_debug_support_text

# Overridable via env so the feature can be pointed at staging / a local dev NAS instance.
_REQUEST_TIMEOUT = 30
_UPLOAD_TIMEOUT = 120  # the PUT carries the gzipped log bundle, so a more generous window
_USER_AGENT = f"{brand_name()}/debug-share"


def diagnostics_base_url() -> str:
    return (os.environ.get("HERMES_DIAGNOSTICS_BASE_URL") or endpoint("diagnosticsBaseUrl")).rstrip("/")


def _same_origin(upload_url: str, base: str) -> bool:
    try:
        upload, configured = urlsplit(upload_url), urlsplit(base)
        return (upload.scheme in ("http", "https") and upload.scheme == configured.scheme
                and upload.hostname == configured.hostname and upload.port == configured.port
                and bool(upload.hostname) and not upload.username and not upload.password)
    except ValueError:
        return False


def _urlopen_checked(url: str, data: bytes, method: str, headers: dict, *, timeout: int, what: str):
    """Send the request; raise ``RuntimeError`` on non-2xx and return the response body bytes."""
    req = urllib.request.Request(url, data=data, method=method, headers={**headers, "User-Agent": _USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        status = getattr(resp, "status", None)
        status = resp.getcode() if status is None else status
        if not (200 <= status < 300):
            raise RuntimeError(f"{what} failed: HTTP {status}")
        return resp.read()


def request_upload_url(content_type: str = "application/gzip", size_bytes: int | None = None,
                       *, base_url: str | None = None) -> dict:
    """Ask NAS to mint a presigned PUT URL for a diagnostics bundle. Returns the parsed JSON, expected to
    carry at least ``uploadUrl``, ``viewUrl`` and ``id``. Raises on non-2xx responses or unparseable JSON."""
    base = base_url if base_url is not None else diagnostics_base_url()
    if not base:
        raise RuntimeError("Diagnostics upload is disabled: no diagnostics endpoint is configured")
    payload: dict = {"contentType": content_type}
    if size_bytes is not None:
        payload["sizeBytes"] = int(size_bytes)
    body = _urlopen_checked(
        f"{base.rstrip('/')}/api/diagnostics/upload-url", json.dumps(payload).encode("utf-8"), "POST",
        {"Content-Type": "application/json", "Accept": "application/json"},
        timeout=_REQUEST_TIMEOUT, what="diagnostics upload-url request").decode("utf-8")
    try:
        result = json.loads(body)
    except (ValueError, json.JSONDecodeError) as exc:
        safe_body = redact_debug_support_text(body, max_chars=200)
        raise RuntimeError(f"diagnostics upload-url returned non-JSON response: {safe_body}") from exc
    if not isinstance(result, dict) or not result.get("uploadUrl"):
        safe_body = redact_debug_support_text(body, max_chars=200)
        raise RuntimeError(f"diagnostics upload-url response missing 'uploadUrl': {safe_body}")
    return result


def put_bundle(upload_url: str, data: bytes, content_type: str = "application/gzip") -> None:
    """PUT the gzipped *data* bundle to a presigned *upload_url*. Raises on non-2xx.
    ``Content-Type`` must match what NAS pinned when signing the URL, otherwise S3 rejects the signature."""
    _urlopen_checked(upload_url, data, "PUT", {"Content-Type": content_type}, timeout=_UPLOAD_TIMEOUT,
                     what="diagnostics bundle PUT")


def share_to_nous(report_bundle: bytes) -> dict:
    """Mint a presigned PUT URL (with the exact ``sizeBytes`` NAS signs), then PUT *report_bundle*."""
    base = diagnostics_base_url()
    info = request_upload_url(content_type="application/gzip", size_bytes=len(report_bundle), base_url=base)
    if not _same_origin(info["uploadUrl"], base):
        raise RuntimeError("Diagnostics upload URL must use the configured diagnostics host")
    put_bundle(info["uploadUrl"], report_bundle, content_type="application/gzip")
    return info
