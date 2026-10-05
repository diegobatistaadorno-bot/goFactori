"""Shop profile + runtime settings."""
from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml

SERVICE_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    shop_config_path: Path
    data_dir: Path
    public_base_url: str
    owner_whatsapp: str
    business_whatsapp: str
    twilio_account_sid: str
    twilio_auth_token: str
    extractor: str  # "claude" or "sidecar" (offline demo/testing)
    claude_model: str
    allow_local_media: bool


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


@lru_cache
def get_settings() -> Settings:
    return Settings(
        shop_config_path=Path(_env("SHOP_CONFIG", str(SERVICE_ROOT / "config" / "shop.yaml"))),
        data_dir=Path(_env("DATA_DIR", str(SERVICE_ROOT / "data"))),
        public_base_url=_env("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/"),
        owner_whatsapp=_whatsapp(_env("OWNER_WHATSAPP", "+17875550100")),
        business_whatsapp=_whatsapp(_env("TWILIO_WHATSAPP_FROM", "+14155238886")),
        twilio_account_sid=_env("TWILIO_ACCOUNT_SID"),
        twilio_auth_token=_env("TWILIO_AUTH_TOKEN"),
        extractor=_env("EXTRACTOR", "claude"),
        claude_model=_env("CLAUDE_MODEL", "claude-opus-5-5"),
        allow_local_media=_env("ALLOW_LOCAL_MEDIA", "false").lower() == "true",
    )


def _whatsapp(number: str) -> str:
    number = number.strip()
    return number if number.startswith("whatsapp:") else f"whatsapp:{number}"


@lru_cache
def load_shop(path: str | None = None) -> dict:
    with open(path or get_settings().shop_config_path) as f:
        return yaml.safe_load(f)
