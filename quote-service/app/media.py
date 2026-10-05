"""Download WhatsApp attachments to local storage (Twilio media URLs need auth and expire)."""
from __future__ import annotations

import mimetypes
import shutil
from pathlib import Path
from urllib.parse import urlparse

import httpx

from .config import get_settings

DRAWING_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"}
CAD_EXTENSIONS = {".step", ".stp", ".iges", ".igs", ".sldprt", ".dxf", ".dwg"}


def classify(content_type: str, filename: str = "") -> str:
    if content_type in DRAWING_TYPES:
        return "drawing"
    if Path(filename).suffix.lower() in CAD_EXTENSIONS or "step" in content_type or "octet-stream" in content_type:
        return "cad"
    return "other"


def download(url: str, content_type: str, dest_dir: Path, index: int) -> Path:
    settings = get_settings()
    dest_dir.mkdir(parents=True, exist_ok=True)
    ext = mimetypes.guess_extension(content_type) or ".bin"
    dest = dest_dir / f"attachment-{index}{ext}"
    parsed = urlparse(url)
    if parsed.scheme == "file":
        if not settings.allow_local_media:
            raise PermissionError("file:// media is only allowed when ALLOW_LOCAL_MEDIA=true")
        shutil.copyfile(parsed.path, dest)
        return dest
    auth = None
    if "twilio.com" in parsed.netloc and settings.twilio_account_sid:
        auth = (settings.twilio_account_sid, settings.twilio_auth_token)
    with httpx.Client(follow_redirects=True, timeout=60) as client:
        r = client.get(url, auth=auth)
        r.raise_for_status()
        dest.write_bytes(r.content)
    return dest
