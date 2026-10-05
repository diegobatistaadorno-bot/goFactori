import json

import pytest

from app.models import PartSpec
from app.pricing import apply_owner_total, price_part, quantity_tiers
from conftest import SAMPLES


def spec(name: str, **overrides) -> PartSpec:
    data = json.loads(next(SAMPLES.glob(f"{name}_*.json")).read_text())
    return PartSpec(**{**data, **overrides})


@pytest.mark.parametrize("name", ["PMP-1001", "PMP-1002", "PMP-1003"])
def test_unit_price_falls_with_quantity(shop, name):
    p = price_part(spec(name), shop)
    units = [t.unit_price for t in p.tiers]
    assert units == sorted(units, reverse=True)
    assert p.requested_quantity in [t.quantity for t in p.tiers]


def test_bracket_price_is_in_a_sane_range(shop):
    p = price_part(spec("PMP-1001"), shop)
    unit = p.tier_for(200).unit_price
    assert 8 < unit < 60, unit  # small anodized aluminum plate at 200 pcs


def test_minimum_order_applies(shop):
    p = price_part(spec("PMP-1004"), shop, quantity=1)
    assert p.tier_for(1).extended_price >= shop["pricing"]["minimum_order"]


def test_tighter_tolerance_costs_more(shop):
    loose = price_part(spec("PMP-1002", tightest_tolerance_in=0.005), shop)
    tight = price_part(spec("PMP-1002"), shop)
    assert tight.tier_for(50).unit_price > loose.tier_for(50).unit_price


def test_unknown_material_is_flagged(shop):
    p = price_part(spec("PMP-1001", material_key="other", material_text="Inconel 718"), shop)
    assert any("Inconel" in f for f in p.flags)


def test_quantity_required(shop):
    with pytest.raises(ValueError):
        price_part(spec("PMP-1004"), shop)


def test_tiers_include_requested_and_closest_breaks(shop):
    assert quantity_tiers(200, shop["pricing"]) == [10, 50, 200]
    assert quantity_tiers(75, shop["pricing"]) == [10, 50, 75, 200]
    assert quantity_tiers(1000, shop["pricing"])[-1] == 1000


def test_owner_total_scales_all_tiers(shop):
    p = price_part(spec("PMP-1001"), shop)
    adjusted = apply_owner_total(p, 5000)
    assert adjusted.tier_for(200).extended_price == 5000
    assert adjusted.tier_for(200).unit_price == 25.0
    ratio = adjusted.tier_for(50).unit_price / p.tier_for(50).unit_price
    assert ratio == pytest.approx(5000 / p.tier_for(200).extended_price, rel=0.01)
