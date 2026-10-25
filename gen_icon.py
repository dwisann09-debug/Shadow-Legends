"""
Generate Shadow Legends Android icons (all mipmap sizes).
Gothic theme: dark background, amber sword, "SL" text.
"""
import os
from PIL import Image, ImageDraw

BASE = r"C:\Users\Windows\.kiro\crew\workspace\shadow-legends\android\app\src\main\res"

SIZES = {
    "mipmap-mdpi":    48,
    "mipmap-hdpi":    72,
    "mipmap-xhdpi":   96,
    "mipmap-xxhdpi":  144,
    "mipmap-xxxhdpi": 192,
}

BG       = (9, 7, 16)        # #090710  (game background color)
BORDER   = (251, 191, 36)    # amber-400
GOLD     = (251, 191, 36)
GOLD2    = (253, 224, 71)
CRIMSON  = (220, 38,  38)


def draw_icon(size):
    img  = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d    = ImageDraw.Draw(img)
    s    = size
    pad  = max(1, s // 24)

    # ── Background circle ───────────────────────────────────────────────────
    d.ellipse([0, 0, s-1, s-1], fill=BG)

    # ── Border ring ─────────────────────────────────────────────────────────
    ring = max(2, s // 20)
    d.ellipse([ring//2, ring//2, s-1-ring//2, s-1-ring//2],
              outline=BORDER, width=ring)

    cx, cy = s // 2, s // 2

    # ── Sword (vertical, pixel art) ─────────────────────────────────────────
    sw  = max(2, s // 22)      # blade width
    sh  = int(s * 0.56)        # blade height
    bx1 = cx - sw // 2
    by1 = cy - sh // 2
    bx2 = cx + sw // 2
    by2 = cy + sh // 2

    # Blade
    d.rectangle([bx1, by1, bx2, by2], fill=GOLD2)
    # Highlight stripe
    d.rectangle([bx1, by1, bx1, by2], fill=(255, 255, 255, 200))

    # Crossguard
    gw  = int(s * 0.30)
    gh  = max(2, s // 18)
    gx1 = cx - gw // 2
    gy1 = cy - gh // 2
    gx2 = cx + gw // 2
    gy2 = cy + gh // 2
    d.rectangle([gx1, gy1, gx2, gy2], fill=GOLD)
    # Crossguard tips (round)
    tip = gh
    d.ellipse([gx1 - tip//2, gy1, gx1 + tip//2, gy2], fill=GOLD)
    d.ellipse([gx2 - tip//2, gy1, gx2 + tip//2, gy2], fill=GOLD)

    # Handle
    hw  = max(1, sw - 1)
    hh  = int(s * 0.15)
    hx1 = cx - hw // 2
    hy1 = gy2
    hx2 = cx + hw // 2
    hy2 = gy2 + hh
    d.rectangle([hx1, hy1, hx2, hy2], fill=(139, 90, 43))

    # Pommel
    pr = max(2, s // 16)
    d.ellipse([cx - pr, hy2 - pr//2, cx + pr, hy2 + pr], fill=CRIMSON)
    d.ellipse([cx - pr + max(1, pr//3), hy2 - pr//2 + max(1, pr//4),
               cx + pr - max(1, pr//3), hy2 + pr - max(1, pr//4)],
              fill=(248, 113, 113))

    # ── "SL" text at top and bottom using pixel rectangles ──────────────────
    # Draw tiny pixel "SL" as dot matrix to avoid font issues
    px = max(1, s // 48)

    # "S" pattern (5x5 pixel dots), top-left area
    def dot(rx, ry, col=GOLD):
        d.rectangle([rx, ry, rx + px - 1, ry + px - 1], fill=col)

    def letter(ox, oy, pattern):
        for row_i, row in enumerate(pattern):
            for col_i, on in enumerate(row):
                if on:
                    dot(ox + col_i * (px + 1), oy + row_i * (px + 1))

    S_PAT = [
        [1, 1, 1],
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 1],
        [1, 1, 1],
    ]
    L_PAT = [
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
        [1, 0, 0],
        [1, 1, 1],
    ]

    lw = 3 * (px + 1)           # letter width
    lh = 5 * (px + 1)           # letter height
    gap = px + 1
    total_w = lw + gap + lw
    tx = cx - total_w // 2
    ty = int(s * 0.08)

    letter(tx, ty, S_PAT)
    letter(tx + lw + gap, ty, L_PAT)

    return img


def make_square(img):
    """Already square, just return."""
    return img


for folder, size in SIZES.items():
    icon = draw_icon(size)
    for fname in ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]:
        path = os.path.join(BASE, folder, fname)
        if os.path.exists(os.path.dirname(path)):
            icon.save(path, "PNG")
            print(f"  wrote {size}x{size} -> {folder}/{fname}")

print("Done.")
