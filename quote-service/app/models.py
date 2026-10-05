"""Data shapes shared across extraction, pricing and the PDF."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


class PartSpec(BaseModel):
    """What we need to price one custom part. Filled by Claude from the drawing + message."""

    part_name: str = Field(description="Part title from the title block, e.g. 'Mounting Bracket'.")
    part_number: Optional[str] = Field(None, description="Drawing/part number if shown.")
    revision: Optional[str] = None
    material_text: str = Field(description="Material exactly as written on the drawing or message.")
    material_key: str = Field(
        description="Closest key from the shop's material list, or 'other' if none fits."
    )
    process: Literal["mill_3axis", "mill_5axis", "turning"] = Field(
        description="turning for round parts made on a lathe; mill_5axis only for compound angles "
        "or features on many faces; otherwise mill_3axis."
    )
    shape: Literal["prismatic", "cylindrical"]
    length_in: float = Field(description="Overall length in inches (longest axis / turned length).")
    width_in: float = Field(description="Overall width in inches. For cylindrical parts: max diameter.")
    height_in: float = Field(description="Overall height/thickness in inches. For cylindrical parts: max diameter.")
    feature_count: int = Field(
        description="Count of machined features: each hole, pocket, slot, thread, keyway, step, "
        "groove or chamfer group. Patterns count each instance (4X holes = 4)."
    )
    setups: int = Field(description="Number of machine setups/orientations needed, usually 1-3.")
    material_removal_fraction: float = Field(
        description="Estimated fraction (0.05-0.95) of the stock envelope volume removed by machining."
    )
    tightest_tolerance_in: Optional[float] = Field(
        None, description="Tightest +/- tolerance on the drawing in inches (e.g. 0.001)."
    )
    finish_text: Optional[str] = Field(None, description="Finish/coating as written, if any.")
    finish_key: str = Field(description="Closest key from the shop's finish list ('none' if as machined).")
    quantity: Optional[int] = Field(
        None, description="Quantity requested in the customer's message, else on the drawing, else null."
    )
    due_date_text: Optional[str] = Field(None, description="Requested delivery date if mentioned.")
    assumptions: list[str] = Field(
        default_factory=list,
        description="Short notes on anything inferred or unclear, for the shop owner to check.",
    )
    confidence: Literal["low", "medium", "high"]


class PriceTier(BaseModel):
    quantity: int
    unit_price: float
    extended_price: float
    lead_time_days: int


class PriceBreakdown(BaseModel):
    """Per-part costs for the requested quantity, kept for the owner and for calibrating later."""

    stock_dims_in: tuple[float, float, float]
    stock_weight_lb: float
    material_cost_per_part: float
    setup_cost: float
    programming_cost: float
    cycle_minutes_per_part: float
    machining_cost_per_part: float
    finish_cost_per_part: float
    finish_lot_charge: float
    tolerance_band: str
    margin: float


class Pricing(BaseModel):
    requested_quantity: int
    tiers: list[PriceTier]
    breakdown: PriceBreakdown
    flags: list[str] = Field(default_factory=list)

    def tier_for(self, qty: int) -> PriceTier:
        return next(t for t in self.tiers if t.quantity == qty)
