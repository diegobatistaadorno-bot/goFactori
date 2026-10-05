import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.update(
    EXTRACTOR="sidecar",
    ALLOW_LOCAL_MEDIA="true",
    OWNER_WHATSAPP="+17875550100",
    PUBLIC_BASE_URL="https://quotes.example.com",
)

from app.config import get_settings, load_shop  # noqa: E402

SAMPLES = ROOT.parent / "samples" / "drawings"


@pytest.fixture
def shop():
    return load_shop()


@pytest.fixture
def flow(tmp_path, monkeypatch):
    from app.flow import QuoteFlow
    from app.store import Store

    monkeypatch.setenv("DATA_DIR", str(tmp_path))
    get_settings.cache_clear()
    yield QuoteFlow(Store(tmp_path / "q.db"), load_shop())
    get_settings.cache_clear()


def drawing(name: str) -> dict:
    path = next(SAMPLES.glob(f"{name}_*.pdf"))
    return {"url": f"file://{path}", "content_type": "application/pdf"}
