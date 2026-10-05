"""Turn a drawing (PDF or photo) + the customer's WhatsApp text into a PartSpec using Claude."""
from __future__ import annotations

import base64
import hashlib
import json
from pathlib import Path

import anthropic

from .config import get_settings
from .models import PartSpec

SYSTEM_PROMPT = """You read mechanical engineering drawings for a CNC machine shop in Puerto Rico and \
extract what the shop needs to estimate a price. Customers write in Spanish, English or a mix.

Report dimensions in inches; convert if the drawing is metric and say so in assumptions. \
Use the overall envelope of the finished part, not individual features. \
If the customer's message gives a quantity, it overrides the drawing. \
Never invent a quantity: leave it null if neither the message nor the drawing states one. \
When something is unclear, make the most reasonable machinist's assumption and note it briefly \
in assumptions (in English) so the owner can check it."""


def _catalog_prompt(shop: dict) -> str:
    p = shop["pricing"]
    materials = "\n".join(f"- {k}: {v['label']}" for k, v in p["materials"].items())
    finishes = "\n".join(f"- {k}: {v['label']}" for k, v in p["finishes"].items())
    return (
        f"Shop materials (material_key; use 'other' if none fits):\n{materials}\n\n"
        f"Shop finishes (finish_key; use 'none' if as machined, 'other' if not listed):\n{finishes}"
    )


def _file_block(path: Path, content_type: str) -> dict:
    data = base64.standard_b64encode(path.read_bytes()).decode()
    if content_type == "application/pdf":
        return {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": data}}
    return {"type": "image", "source": {"type": "base64", "media_type": content_type, "data": data}}


class ExtractionError(RuntimeError):
    pass


def extract_with_claude(files: list[tuple[Path, str]], customer_text: str, shop: dict) -> PartSpec:
    settings = get_settings()
    client = anthropic.Anthropic()
    content: list[dict] = [_file_block(p, ct) for p, ct in files]
    content.append({
        "type": "text",
        "text": f"{_catalog_prompt(shop)}\n\nCustomer's WhatsApp message(s):\n"
        f"{customer_text or '(no text, only the drawing)'}\n\nExtract the part specification.",
    })
    try:
        response = client.beta.messages.parse(
            model=settings.claude_model,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": content}],
            output_format=PartSpec,
            output_config={"effort": "medium"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
    except anthropic.APIStatusError as e:
        raise ExtractionError(f"Claude API error {e.status_code}: {e.message}") from e
    except anthropic.APIConnectionError as e:
        raise ExtractionError(f"Could not reach Claude API: {e}") from e
    if response.stop_reason == "refusal" or response.parsed_output is None:
        raise ExtractionError(f"No usable extraction (stop_reason={response.stop_reason})")
    return response.parsed_output


def extract_with_sidecar(files: list[tuple[Path, str]], customer_text: str, shop: dict) -> PartSpec:
    """Offline extractor for demos/tests: matches the file hash against samples/drawings/*.json."""
    samples = get_settings().shop_config_path.parent.parent.parent / "samples" / "drawings"
    for path, _ in files:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        for pdf in samples.glob("*.pdf"):
            if hashlib.sha256(pdf.read_bytes()).hexdigest() == digest:
                spec = json.loads(pdf.with_suffix(".json").read_text())
                qty = _quantity_from_text(customer_text)
                if qty:
                    spec["quantity"] = qty
                return PartSpec(**spec)
    raise ExtractionError("sidecar extractor only knows the sample drawings")


def _quantity_from_text(text: str) -> int | None:
    from .flow import parse_quantity

    return parse_quantity(text) if text else None


def extract(files: list[tuple[Path, str]], customer_text: str, shop: dict) -> PartSpec:
    if get_settings().extractor == "sidecar":
        return extract_with_sidecar(files, customer_text, shop)
    return extract_with_claude(files, customer_text, shop)
