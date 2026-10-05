"""Generate simple ANSI-style 2D drawings for demo parts, plus a ground-truth spec (.json) for each.

The .json files let you (1) check what Claude extracts against the truth and (2) run the whole
flow offline with EXTRACTOR=sidecar.

    python samples/generate_drawings.py
"""
from __future__ import annotations

import json
import math
from pathlib import Path

from reportlab.lib.pagesizes import landscape, LETTER
from reportlab.pdfgen import canvas

OUT = Path(__file__).parent / "drawings"
PT = 72.0  # points per inch on paper
W, H = landscape(LETTER)
MARGIN = 0.4 * PT


class Sheet:
    def __init__(self, path: Path, title: dict, notes: list[str], scale: float = 1.0):
        self.c = canvas.Canvas(str(path), pagesize=(W, H))
        self.c.setTitle(f"{title['number']} {title['name']}")
        self.title, self.notes, self.k = title, notes, scale * PT
        self.c.setLineWidth(0.8)

    # --- primitives in part inches, relative to a view origin ---
    def at(self, ox, oy, x, y):
        return ox + x * self.k, oy + y * self.k

    def rect(self, ox, oy, x, y, w, h, dashed=False):
        c = self.c
        c.setDash(4, 3) if dashed else c.setDash()
        c.setLineWidth(0.5 if dashed else 1.1)
        px, py = self.at(ox, oy, x, y)
        c.rect(px, py, w * self.k, h * self.k)
        c.setDash()

    def circle(self, ox, oy, x, y, d, dashed=False, center=True):
        c = self.c
        c.setDash(4, 3) if dashed else c.setDash()
        c.setLineWidth(0.5 if dashed else 1.1)
        px, py = self.at(ox, oy, x, y)
        c.circle(px, py, d / 2 * self.k)
        c.setDash()
        if center:
            self.centermark(px, py, d / 2 * self.k + 5)

    def line(self, ox, oy, x1, y1, x2, y2, dashed=False, width=1.1):
        c = self.c
        c.setDash(4, 3) if dashed else c.setDash()
        c.setLineWidth(width)
        c.line(*self.at(ox, oy, x1, y1), *self.at(ox, oy, x2, y2))
        c.setDash()

    def centermark(self, px, py, r):
        c = self.c
        c.setLineWidth(0.3)
        c.setDash([8, 2, 2, 2])
        c.line(px - r, py, px + r, py)
        c.line(px, py - r, px, py + r)
        c.setDash()

    def centerline(self, ox, oy, x1, y1, x2, y2):
        c = self.c
        c.setLineWidth(0.3)
        c.setDash([10, 3, 2, 3])
        c.line(*self.at(ox, oy, x1, y1), *self.at(ox, oy, x2, y2))
        c.setDash()

    # --- dimensions ---
    def _arrow(self, x, y, angle):
        c = self.c
        a, size = math.radians(angle), 6
        p = c.beginPath()
        p.moveTo(x, y)
        p.lineTo(x - size * math.cos(a - 0.3), y - size * math.sin(a - 0.3))
        p.lineTo(x - size * math.cos(a + 0.3), y - size * math.sin(a + 0.3))
        p.close()
        c.drawPath(p, fill=1, stroke=0)

    def dim_h(self, ox, oy, x1, x2, y_feat, offset, text):
        c = self.c
        (p1x, fy), (p2x, _) = self.at(ox, oy, x1, y_feat), self.at(ox, oy, x2, y_feat)
        dy = fy + offset
        c.setLineWidth(0.35)
        for px in (p1x, p2x):
            c.line(px, fy + (2 if offset > 0 else -2), px, dy + (3 if offset > 0 else -3))
        c.line(p1x, dy, p2x, dy)
        self._arrow(p1x, dy, 180)
        self._arrow(p2x, dy, 0)
        self._label((p1x + p2x) / 2, dy + 2.5, text)

    def dim_v(self, ox, oy, y1, y2, x_feat, offset, text):
        c = self.c
        (fx, p1y), (_, p2y) = self.at(ox, oy, x_feat, y1), self.at(ox, oy, x_feat, y2)
        dx = fx + offset
        c.setLineWidth(0.35)
        for py in (p1y, p2y):
            c.line(fx + (2 if offset > 0 else -2), py, dx + (3 if offset > 0 else -3), py)
        c.line(dx, p1y, dx, p2y)
        self._arrow(dx, p1y, 270)
        self._arrow(dx, p2y, 90)
        c.saveState()
        c.translate(dx - 2.5, (p1y + p2y) / 2)
        c.rotate(90)
        self._label(0, 0, text)
        c.restoreState()

    def leader(self, ox, oy, x, y, dx, dy, lines):
        c = self.c
        px, py = self.at(ox, oy, x, y)
        tx, ty = px + dx, py + dy
        c.setLineWidth(0.35)
        c.line(px, py, tx, ty)
        c.line(tx, ty, tx + (12 if dx > 0 else -12), ty)
        self._arrow(px, py, math.degrees(math.atan2(py - ty, px - tx)))
        c.setFont("Helvetica", 8)
        for i, t in enumerate(lines):
            if dx > 0:
                c.drawString(tx + 15, ty - 3 - i * 10, t)
            else:
                c.drawRightString(tx - 15, ty - 3 - i * 10, t)

    def _label(self, x, y, text):
        c = self.c
        c.setFont("Helvetica", 8)
        w = c.stringWidth(text, "Helvetica", 8)
        c.setFillColorRGB(1, 1, 1)
        c.rect(x - w / 2 - 1.5, y - 1, w + 3, 9, stroke=0, fill=1)
        c.setFillColorRGB(0, 0, 0)
        c.drawCentredString(x, y, text)

    def view_label(self, ox, oy, x, y, text):
        px, py = self.at(ox, oy, x, y)
        self.c.setFont("Helvetica-Bold", 8)
        self.c.drawCentredString(px, py, text)

    # --- frame ---
    def frame(self):
        c, t = self.c, self.title
        c.setDash()
        c.setLineWidth(1.4)
        c.rect(MARGIN, MARGIN, W - 2 * MARGIN, H - 2 * MARGIN)
        bw, bh = 4.6 * PT, 1.55 * PT
        bx, by = W - MARGIN - bw, MARGIN
        c.setLineWidth(1)
        c.rect(bx, by, bw, bh)
        rows = [
            [("COMPANY", t["company"], 1.0)],
            [("TITLE", t["name"], 1.0)],
            [("DWG NO.", t["number"], 0.45), ("REV", t["rev"], 0.15), ("SCALE", t["scale"], 0.2), ("SHEET", "1 OF 1", 0.2)],
            [("MATERIAL", t["material"], 0.6), ("QTY", t["qty"], 0.4)],
            [("FINISH", t["finish"], 1.0)],
            [("DRAWN", t["drawn"], 0.35), ("DATE", t["date"], 0.3), ("UNITS", "INCHES", 0.35)],
        ]
        rh = bh / len(rows)
        for r, row in enumerate(rows):
            y = by + bh - (r + 1) * rh
            c.setLineWidth(0.5)
            c.line(bx, y, bx + bw, y)
            x = bx
            for label, value, frac in row:
                cw = bw * frac
                if x > bx:
                    c.line(x, y, x, y + rh)
                c.setFont("Helvetica", 5.5)
                c.drawString(x + 3, y + rh - 7, label)
                c.setFont("Helvetica-Bold", 9 if label in ("TITLE", "DWG NO.") else 8)
                c.drawString(x + 3, y + 3.5, value)
                x += cw
        # tolerance block
        tx, ty, tw, th = bx - 2.1 * PT, MARGIN, 2.1 * PT, bh
        c.rect(tx, ty, tw, th)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawString(tx + 4, ty + th - 10, "UNLESS OTHERWISE SPECIFIED:")
        c.setFont("Helvetica", 7)
        for i, line in enumerate(["DIMENSIONS ARE IN INCHES", "TOLERANCES:", "  .XX   ± .010", "  .XXX  ± .005",
                                  "  ANGLES ± 0.5°", "BREAK SHARP EDGES .005-.015", "SURFACE FINISH 125 Ra MAX"]):
            c.drawString(tx + 4, ty + th - 22 - i * 9.5, line)
        # notes
        c.setFont("Helvetica-Bold", 8)
        nx, ny = MARGIN + 10, MARGIN + bh - 10
        c.drawString(nx, ny, "NOTES:")
        c.setFont("Helvetica", 7.5)
        for i, n in enumerate(self.notes):
            c.drawString(nx, ny - 11 - i * 10, f"{i + 1}. {n}")

    def save(self):
        self.frame()
        self.c.showPage()
        self.c.save()


COMMON = {"company": "ACME MEDICAL DEVICES PR", "drawn": "J. RIVERA", "date": "09/15/2026"}


def bracket():
    t = {**COMMON, "name": "MOUNTING BRACKET", "number": "PMP-1001", "rev": "A", "scale": "1:1",
         "material": "AL 6061-T6", "qty": "200", "finish": "CLEAR ANODIZE PER MIL-A-8625 TYPE II CL 1"}
    s = Sheet(OUT / "PMP-1001_mounting-bracket.pdf", t, [
        "REMOVE ALL BURRS.", "ANODIZE AFTER MACHINING.", "HOLE LOCATIONS ±.002 TO DATUM A/B.",
    ])
    ox, oy = 1.4 * PT, 4.3 * PT  # top view
    L, Wd, T = 4.0, 2.5, 0.5
    s.rect(ox, oy, 0, 0, L, Wd)
    for x in (0.375, L - 0.375):
        for y in (0.375, Wd - 0.375):
            s.circle(ox, oy, x, y, 0.266)
    s.c.roundRect(*s.at(ox, oy, 1.0, 0.75), 2.0 * s.k, 1.0 * s.k, 0.125 * s.k)
    s.dim_h(ox, oy, 0, L, Wd, 34, "4.000")
    s.dim_h(ox, oy, 0, 0.375, Wd, 16, ".375")
    s.dim_v(ox, oy, 0, Wd, 0, -34, "2.500")
    s.dim_v(ox, oy, 0, 0.375, 0, -16, ".375")
    s.dim_h(ox, oy, 1.0, 3.0, 0.75, -0.75 * s.k - 18, "2.000")
    s.dim_v(ox, oy, 0.75, 1.75, 3.0, 1.0 * s.k + 22, "1.000")
    s.leader(ox, oy, L - 0.375 + 0.094, Wd - 0.375 + 0.094, 50, 40, ["4X Ø.266 THRU ±.002"])
    s.leader(ox, oy, 2.6, 1.5, 120, 75, ["POCKET .250 DEEP", "R.125 TYP"])
    s.view_label(ox, oy, L / 2, -0.75, "TOP VIEW")
    fx, fy = ox, 2.55 * PT  # front view
    s.rect(fx, fy, 0, 0, L, T)
    s.line(fx, fy, 1.0, T - 0.25, 3.0, T - 0.25, dashed=True)
    s.line(fx, fy, 1.0, T - 0.25, 1.0, T, dashed=True)
    s.line(fx, fy, 3.0, T - 0.25, 3.0, T, dashed=True)
    s.dim_v(fx, fy, 0, T, L, 24, ".500")
    s.view_label(fx, fy, L / 2, -0.35, "FRONT VIEW")
    s.save()
    return t, {
        "part_name": "Mounting Bracket", "part_number": "PMP-1001", "revision": "A",
        "material_text": "AL 6061-T6", "material_key": "aluminum_6061", "process": "mill_3axis",
        "shape": "prismatic", "length_in": 4.0, "width_in": 2.5, "height_in": 0.5, "feature_count": 5,
        "setups": 2, "material_removal_fraction": 0.35, "tightest_tolerance_in": 0.002,
        "finish_text": "Clear anodize per MIL-A-8625 Type II Class 1", "finish_key": "anodize_clear",
        "quantity": 200, "due_date_text": None, "assumptions": [], "confidence": "high",
    }


def shaft():
    t = {**COMMON, "name": "DRIVE SHAFT", "number": "PMP-1002", "rev": "B", "scale": "1:1",
         "material": "4140 HT 28-32 HRC", "qty": "50", "finish": "BLACK OXIDE PER MIL-DTL-13924 CL 1"}
    s = Sheet(OUT / "PMP-1002_drive-shaft.pdf", t, [
        "MATERIAL PRE-HARDENED, NO HEAT TREAT REQUIRED.", "BEARING JOURNAL Ø.7500 +.0000/-.0005.",
        "CHAMFER BOTH ENDS .030 X 45°.",
    ])
    ox, oy = 1.2 * PT, 3.9 * PT
    L, D, d, jl = 6.0, 1.0, 0.75, 1.5
    s.rect(ox, oy, 0, -D / 2, L - jl, D)
    s.rect(ox, oy, L - jl, -d / 2, jl, d)
    s.centerline(ox, oy, -0.2, 0, L + 0.2, 0)
    # keyway (top view projection as slot)
    s.c.roundRect(*s.at(ox, oy, 1.5, -0.094), 1.0 * s.k, 0.188 * s.k, 0.094 * s.k)
    for x, h in ((0.03, D), (L - jl - 0.0, D), (L - 0.03, d)):
        s.line(ox, oy, x, -h / 2, x, h / 2, width=0.5)
    s.dim_h(ox, oy, 0, L, D / 2, 40, "6.000")
    s.dim_h(ox, oy, L - jl, L, d / 2, 20, "1.500")
    s.dim_h(ox, oy, 1.5, 2.5, -D / 2, -22, "1.000")
    s.dim_h(ox, oy, 0, 1.5, -D / 2, -40, "1.500")
    s.leader(ox, oy, 0.6, D / 2, -30, 30, ["Ø1.000 ±.002"])
    s.leader(ox, oy, L - 0.6, d / 2, 40, 45, ["Ø.7500 +.0000/-.0005", "BEARING JOURNAL"])
    s.leader(ox, oy, 2.2, 0.094, 70, 60, ["KEYWAY .188 W X .094 DP", "X 1.000 LG"])
    s.view_label(ox, oy, L / 2, -1.25, "SIDE VIEW")
    ex, ey = 9.0 * PT, 3.9 * PT
    s.circle(ex, ey, 0, 0, D)
    s.circle(ex, ey, 0, 0, d, center=False)
    s.rect(ex, ey, -0.094, D / 2 - 0.094, 0.188, 0.094)
    s.view_label(ex, ey, 0, -1.25, "END VIEW")
    s.save()
    return t, {
        "part_name": "Drive Shaft", "part_number": "PMP-1002", "revision": "B",
        "material_text": "4140 HT 28-32 HRC", "material_key": "steel_4140", "process": "turning",
        "shape": "cylindrical", "length_in": 6.0, "width_in": 1.0, "height_in": 1.0, "feature_count": 5,
        "setups": 2, "material_removal_fraction": 0.3, "tightest_tolerance_in": 0.0005,
        "finish_text": "Black oxide per MIL-DTL-13924 Class 1", "finish_key": "black_oxide",
        "quantity": 50, "due_date_text": None,
        "assumptions": ["Keyway milled as a secondary operation on the lathe part."], "confidence": "high",
    }


def flange():
    t = {**COMMON, "name": "PIPE FLANGE 1-1/2 IN", "number": "PMP-1003", "rev": "A", "scale": "3:4",
         "material": "SS 304", "qty": "25", "finish": "PASSIVATE PER ASTM A967"}
    s = Sheet(OUT / "PMP-1003_pipe-flange.pdf", t, [
        "BOLT HOLES EQUALLY SPACED.", "BORE TO BE CONCENTRIC TO OD WITHIN .003 TIR.", "NO TOOL MARKS ON SEALING FACE.",
    ], scale=0.75)
    ox, oy = 2.9 * PT, 4.85 * PT
    OD, ID, BC, T = 4.0, 1.5, 3.0, 0.75
    s.circle(ox, oy, 0, 0, OD)
    s.circle(ox, oy, 0, 0, ID, center=False)
    s.circle(ox, oy, 0, 0, BC, dashed=True, center=False)
    for a in (45, 135, 225, 315):
        r = BC / 2
        s.circle(ox, oy, r * math.cos(math.radians(a)), r * math.sin(math.radians(a)), 0.44)
    s.leader(ox, oy, 1.414, 1.414, 50, 30, ["Ø4.000 ±.005"])
    s.leader(ox, oy, 1.06 + 0.16, -1.06 - 0.16, 60, -25, ["4X Ø.44 THRU", "EQ SP ON Ø3.000 B.C."])
    s.leader(ox, oy, 0.53, 0.53, 150, 20, ["Ø1.500 ±.002 THRU"])
    s.view_label(ox, oy, 0, -2.4, "FRONT VIEW")
    sx, sy = 6.9 * PT, 4.85 * PT
    s.rect(sx, sy, 0, -OD / 2, T, OD)
    for y in (ID / 2, -ID / 2):
        s.line(sx, sy, 0, y, T, y, dashed=True)
    for y in (BC / 2 + 0.22, BC / 2 - 0.22, -BC / 2 + 0.22, -BC / 2 - 0.22):
        s.line(sx, sy, 0, y, T, y, dashed=True)
    s.centerline(sx, sy, -0.3, 0, T + 0.3, 0)
    s.dim_h(sx, sy, 0, T, OD / 2, 22, ".750")
    s.view_label(sx, sy, T / 2, -2.4, "SIDE VIEW")
    s.save()
    return t, {
        "part_name": "Pipe Flange 1-1/2 in", "part_number": "PMP-1003", "revision": "A",
        "material_text": "SS 304", "material_key": "stainless_304", "process": "turning",
        "shape": "cylindrical", "length_in": 0.75, "width_in": 4.0, "height_in": 4.0, "feature_count": 6,
        "setups": 2, "material_removal_fraction": 0.4, "tightest_tolerance_in": 0.002,
        "finish_text": "Passivate per ASTM A967", "finish_key": "passivate", "quantity": 25,
        "due_date_text": None, "assumptions": ["Bolt holes drilled on lathe with live tooling or secondary op."],
        "confidence": "high",
    }


def spacer():
    t = {**COMMON, "name": "SPACER BLOCK", "number": "PMP-1004", "rev": "A", "scale": "1.5:1",
         "material": "STEEL 1018 CRS", "qty": "SEE PO", "finish": "ZINC PLATE CLEAR PER ASTM B633"}
    s = Sheet(OUT / "PMP-1004_spacer-block.pdf", t, [
        "THREADS PER ASME B1.1.", "PLATE AFTER MACHINING; MASK THREADS.",
    ], scale=1.5)
    ox, oy = 1.6 * PT, 3.1 * PT
    A, T = 2.0, 1.0
    s.rect(ox, oy, 0, 0, A, A)
    s.circle(ox, oy, A / 2, A / 2, 0.5)
    for x in (0.25, 1.75):
        s.circle(ox, oy, x, A / 2, 0.25)
        s.circle(ox, oy, x, A / 2, 0.2, center=False)
    s.dim_h(ox, oy, 0, A, A, 28, "2.000")
    s.dim_h(ox, oy, 0.25, 1.75, A, 12, "1.500")
    s.dim_v(ox, oy, 0, A, 0, -28, "2.000")
    s.leader(ox, oy, A / 2 + 0.18, A / 2 + 0.18, 130, 70, ["Ø.500 ±.001 THRU"])
    s.leader(ox, oy, 1.75 + 0.05, A / 2 - 0.12, 20, -118, ["2X 1/4-20 UNC-2B THRU"])
    s.view_label(ox, oy, A / 2, -0.35, "TOP VIEW")
    fx, fy = 6.2 * PT, 3.1 * PT
    s.rect(fx, fy, 0, 0, A, T)
    for x in (0.75, 1.25):
        s.line(fx, fy, x, 0, x, T, dashed=True)
    s.dim_v(fx, fy, 0, T, A, 26, "1.000")
    s.view_label(fx, fy, A / 2, -0.35, "FRONT VIEW")
    s.save()
    return t, {
        "part_name": "Spacer Block", "part_number": "PMP-1004", "revision": "A",
        "material_text": "Steel 1018 CRS", "material_key": "steel_1018", "process": "mill_3axis",
        "shape": "prismatic", "length_in": 2.0, "width_in": 2.0, "height_in": 1.0, "feature_count": 3,
        "setups": 2, "material_removal_fraction": 0.2, "tightest_tolerance_in": 0.001,
        "finish_text": "Zinc plate clear per ASTM B633", "finish_key": "zinc_plate", "quantity": None,
        "due_date_text": None, "assumptions": [], "confidence": "high",
    }


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for make in (bracket, shaft, flange, spacer):
        title, spec = make()
        stem = next(OUT.glob(f"{title['number']}_*.pdf")).with_suffix(".json")
        stem.write_text(json.dumps(spec, indent=2) + "\n")
        print("wrote", stem.with_suffix(".pdf").name)
