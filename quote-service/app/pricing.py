"""Deterministic pricing. The LLM never sets a price; it only fills PartSpec.

unit price(q) = ( (setup + programming + finish lot charge) / q
                  + material + machining + finish per part ) * (1 + margin)
"""
from __future__ import annotations

import math

from .models import PartSpec, PriceBreakdown, PriceTier, Pricing


def _stock_dims(spec: PartSpec, allowance: float) -> tuple[float, float, float]:
    if spec.shape == "cylindrical":
        dia = max(spec.width_in, spec.height_in) + allowance
        return (round(spec.length_in + 2 * allowance, 3), round(dia, 3), round(dia, 3))
    return tuple(round(d + allowance, 3) for d in (spec.length_in, spec.width_in, spec.height_in))


def _stock_volume(spec: PartSpec, dims: tuple[float, float, float]) -> float:
    length, dia_or_w, h = dims
    if spec.shape == "cylindrical":
        return math.pi * (dia_or_w / 2) ** 2 * length
    return length * dia_or_w * h


def _tolerance_band(spec: PartSpec, bands: list[dict]) -> dict:
    tol = spec.tightest_tolerance_in or 0.005
    for band in sorted(bands, key=lambda b: b["max_in"]):
        if tol <= band["max_in"]:
            return band
    return bands[-1]


def quantity_tiers(requested: int, cfg: dict) -> list[int]:
    breaks = [q for q in cfg["quantity_breaks"] if q != requested]
    # keep the breaks closest to the requested quantity so the table stays relevant
    breaks.sort(key=lambda q: abs(math.log(q / requested)))
    picked = sorted({requested, *breaks[: cfg.get("max_tiers", 4) - 1]})
    return picked


def price_part(spec: PartSpec, shop: dict, quantity: int | None = None) -> Pricing:
    cfg = shop["pricing"]
    qty = quantity or spec.quantity
    if not qty or qty < 1:
        raise ValueError("quantity is required to price a part")

    flags: list[str] = []
    material = cfg["materials"].get(spec.material_key)
    if material is None:
        material = cfg["materials"]["steel_1018"]
        flags.append(f"Material '{spec.material_text}' not in price list; priced as {material['label']}.")
    finish = cfg["finishes"].get(spec.finish_key)
    if finish is None:
        finish = cfg["finishes"]["none"]
        flags.append(f"Finish '{spec.finish_text}' not in price list; priced as machined.")
    process = cfg["processes"][spec.process]
    if spec.confidence == "low":
        flags.append("Low extraction confidence; check dimensions on the drawing.")

    dims = _stock_dims(spec, cfg["stock_allowance_in"])
    stock_vol = _stock_volume(spec, dims)
    weight = stock_vol * material["density"]
    material_cost = weight * material["price_per_lb"] * (1 + cfg["scrap_factor"])

    removal = min(max(spec.material_removal_fraction, 0.05), 0.95)
    band = _tolerance_band(spec, cfg["tolerance_bands"])
    cycle_min = (
        (stock_vol * removal) / material["removal_rate"]
        + spec.feature_count * cfg["minutes_per_feature"]
    ) * band["multiplier"] + cfg["handling_minutes_per_part"]
    machining_cost = cycle_min / 60 * process["rate"]

    setups = max(spec.setups, 1)
    setup_cost = process["setup_hours"] * setups * process["rate"]
    programming_cost = cfg["programming_hours"] * process["rate"]

    margin = cfg["margin"]
    lead = cfg["lead_time"]
    tiers = []
    for q in quantity_tiers(qty, cfg):
        fixed = setup_cost + programming_cost + finish["lot_charge"]
        unit_cost = fixed / q + material_cost + machining_cost + finish["per_part"]
        unit = round(unit_cost * (1 + margin), 2)
        extended = round(unit * q, 2)
        if extended < cfg["minimum_order"]:
            extended = float(cfg["minimum_order"])
            unit = round(extended / q, 2)
        days = lead["base_days"] + math.ceil(q / 100) * lead["days_per_100_parts"] + finish["extra_days"]
        tiers.append(PriceTier(quantity=q, unit_price=unit, extended_price=extended, lead_time_days=days))

    breakdown = PriceBreakdown(
        stock_dims_in=dims,
        stock_weight_lb=round(weight, 3),
        material_cost_per_part=round(material_cost, 2),
        setup_cost=round(setup_cost, 2),
        programming_cost=round(programming_cost, 2),
        cycle_minutes_per_part=round(cycle_min, 1),
        machining_cost_per_part=round(machining_cost, 2),
        finish_cost_per_part=finish["per_part"],
        finish_lot_charge=finish["lot_charge"],
        tolerance_band=band["label"],
        margin=margin,
    )
    return Pricing(requested_quantity=qty, tiers=tiers, breakdown=breakdown, flags=flags)


def apply_owner_total(pricing: Pricing, new_total: float) -> Pricing:
    """Owner replied with a new total for the requested quantity: scale every tier by the same factor."""
    current = pricing.tier_for(pricing.requested_quantity).extended_price
    factor = new_total / current
    tiers = []
    for t in pricing.tiers:
        if t.quantity == pricing.requested_quantity:
            extended = round(new_total, 2)
            unit = round(new_total / t.quantity, 2)
        else:
            unit = round(t.unit_price * factor, 2)
            extended = round(unit * t.quantity, 2)
        tiers.append(t.model_copy(update={"unit_price": unit, "extended_price": extended}))
    return pricing.model_copy(update={"tiers": tiers})
