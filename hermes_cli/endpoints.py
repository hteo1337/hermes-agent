"""Optional Envoy service endpoints from the desktop brand manifest."""

from __future__ import annotations

import json
from pathlib import Path


_BRAND_FILE = Path(__file__).resolve().parent.parent / "apps" / "desktop" / "brand.json"


def endpoint(name: str) -> str:
    """Return a configured endpoint, or empty when the service is disabled."""
    try:
        data = json.loads(_BRAND_FILE.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        return ""
    if not isinstance(data, dict):
        return ""
    endpoints = data.get("endpoints")
    value = endpoints.get(name) if isinstance(endpoints, dict) else None
    if value is None and name in ("updateRepository", "docsUrl"):
        value = data.get(name)
    return value.strip() if isinstance(value, str) else ""


def brand_name() -> str:
    try:
        data = json.loads(_BRAND_FILE.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError):
        data = None
    value = data.get("name") if isinstance(data, dict) else None
    return value.strip() if isinstance(value, str) and value.strip() else "Envoy"


def attribution_referer() -> str:
    return "https://envoy.invalid"
