"""
Generate Shadow Legends Android splash screens.
Gothic theme: dark background, amber border, sword, pixel "SHADOW LEGENDS" text.
Landscape: 16:9 ratio. Portrait: 9:16.
"""
import os
from PIL import Image, ImageDraw

BASE = r"C:\Users\Windows\.kiro\crew\workspace\shadow-legends\android\app\src\main\res"

# (folder, width, height)
LAND_SIZES = {
    "drawable-land-mdpi":    (320, 180),
    "drawable-land-hdpi":    (480, 270),
    "drawable-land-xhdpi":   (640, 360),
    "drawable-land-xxhdpi":  (960, 540),
    "drawable-land-xxxhdpi": (1280, 720),
}
PORT_SIZES = {
    "drawable-port-mdpi":    (180, 320),
    "drawable-port-hdpi":    (270, 480),
    "drawable-port-xhdpi":   (360, 640),
    "drawable-port-xxhdpi":  (540, 960),
    "drawable-port-xxxhdpi": (720, 1280),
}
BASE_SIZE = {
    "drawable": (320, 180),  # fallback, landscape
}

BG     = (9,   7,  16)
AMBER  = (251, 191, 36)
AMBER2 = (253, 224, 71)
WHITE  = (255, 255, 255)
CRIMSON= (220,  38, 38)
BROWN  = (139,  90, 43)


def draw_pixel_text(d, text, ox, oy, px, color):
    """Draw text as a 5x5 dot-matrix bitmap."""
    CHARS = {
        'S': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
        'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
        'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
        'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
        'O': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
        'W': [[1,0,1],[1,0,1],[1,1,1],[1,1,1],[1,0,1]],
        'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
        'E': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
        'G': [[1,1,1],[1,0,0],[1,0,1],[1,0,1],[1,1,1]],
        'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
        'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
        ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
    }
    cell = px + 1
    x = ox
    for ch in text:
        pat = CHARS.get(ch.upper(), CHARS[' '])
        for row_i, row in enumerate(pat):
            for col_i, on in enumerate(row):
                if on:
                    rx = x + col_i * cell
                    ry = oy + row_i * cell
                    d.rectangle([rx, ry, rx+px-1, ry+px-1], fill=color)
        x += 3 * cell + cell  # 3 cols + 1 gap between letters


def pixel_text_width(text, px):
    cell = px + 1
    return len(text) * (3 * cell + cell) - cell


def draw_sword(d, cx, cy, blade_h, blade_w, guard_w, guard_h, handle_h, pommel_r):
    """Draw vertical sword centered at (cx, cy)."""
    # Blade
    bx1 = cx - blade_w // 2
    by1 = cy - blade_h // 2
    bx2 = cx + blade_w // 2
    by2 = cy + blade_h // 2
    d.rectangle([bx1, by1, bx2, by2], fill=AMBER2)
    d.rectangle([bx1, by1, bx1, by2], fill=WHITE)

    # Crossguard
    gx1 = cx - guard_w // 2
    gy1 = cy - guard_h // 2
    gx2 = cx + guard_w // 2
    gy2 = cy + guard_h // 2
    d.rectangle([gx1, gy1, gx2, gy2], fill=AMBER)
    tip = guard_h
    d.ellipse([gx1 - tip//2, gy1, gx1 + tip//2, gy2], fill=AMBER)
    d.ellipse([gx2 - tip//2, gy1, gx2 + tip//2, gy2], fill=AMBER)

    # Handle
    hw = max(1, blade_w - 2)
    hx1 = cx - hw // 2
    hy1 = gy2
    hx2 = cx + hw // 2
    hy2 = gy2 + handle_h
    d.rectangle([hx1, hy1, hx2, hy2], fill=BROWN)

    # Pommel
    d.ellipse([cx - pommel_r, hy2 - pommel_r//2,
               cx + pommel_r, hy2 + pommel_r], fill=CRIMSON)
    pr2 = max(1, pommel_r - 2)
    d.ellipse([cx - pr2 + 1, hy2 - pr2//2 + 1,
               cx + pr2 - 1, hy2 + pr2 - 1], fill=(248, 113, 113))


def draw_splash(W, H):
    img = Image.new("RGBA", (W, H), BG)
    d   = ImageDraw.Draw(img)

    cx, cy = W // 2, H // 2

    # ── Decorative frame ────────────────────────────────────────────────────
    pad   = max(4, min(W, H) // 20)
    border_w = max(2, min(W, H) // 60)
    d.rectangle([pad, pad, W-1-pad, H-1-pad], outline=AMBER, width=border_w)

    # Corner accents
    ca = pad + border_w * 2
    cs = max(4, min(W, H) // 18)
    corners = [(pad, pad), (W-1-pad, pad), (pad, H-1-pad), (W-1-pad, H-1-pad)]
    for (cx2, cy2) in corners:
        d.ellipse([cx2-cs//2, cy2-cs//2, cx2+cs//2, cy2+cs//2], fill=AMBER)

    # ── Sword (drawn FIRST so text renders on top) ───────────────────────────
    short = min(W, H)
    long  = max(W, H)
    is_portrait = H > W

    blade_ref = long if is_portrait else short
    blade_h   = int(blade_ref * (0.38 if is_portrait else 0.40))
    blade_w   = max(4, int(short * 0.038))
    guard_w   = int(short * (0.55 if is_portrait else 0.20))
    guard_h   = max(4, int(short * 0.026))
    handle_h  = int(short * 0.12)
    pommel_r  = max(4, int(short * 0.034))

    bottom_limit = H - pad - border_w * 2 - max(6, short // 25)
    text_bottom  = int(H * (0.32 if is_portrait else 0.30))
    avail_top    = text_bottom + max(4, short // 40)

    below    = blade_h // 2 + guard_h + handle_h + pommel_r * 2
    above    = blade_h // 2
    midpoint = (avail_top + above + bottom_limit - below) // 2
    sword_cy = min(bottom_limit - below, midpoint)

    draw_sword(d, cx, sword_cy, blade_h, blade_w, guard_w, guard_h, handle_h, pommel_r)

    # ── "SHADOW LEGENDS" pixel text (drawn AFTER sword so it sits on top) ───
    px = max(2, short // 55)

    line1 = "SHADOW"
    line2 = "LEGENDS"
    tw1 = pixel_text_width(line1, px)
    tw2 = pixel_text_width(line2, px)
    lh  = 5 * (px + 1)
    gap = px * 2

    text_top = int(H * 0.07)
    # Dark backing strip so text is always readable over the blade tip
    strip_pad = px * 2
    strip_y1  = text_top - strip_pad
    strip_y2  = text_top + lh * 2 + gap + strip_pad
    d.rectangle([pad + border_w, strip_y1, W - pad - border_w, strip_y2],
                fill=(9, 7, 16))

    draw_pixel_text(d, line1, cx - tw1 // 2, text_top, px, AMBER)
    draw_pixel_text(d, line2, cx - tw2 // 2, text_top + lh + gap, px, AMBER2)

    return img.convert("RGB")


# Write all landscape sizes
for folder, (W, H) in LAND_SIZES.items():
    img  = draw_splash(W, H)
    path = os.path.join(BASE, folder, "splash.png")
    img.save(path, "PNG")
    print(f"  {W}x{H} -> {folder}/splash.png")

# Write all portrait sizes
for folder, (W, H) in PORT_SIZES.items():
    img  = draw_splash(W, H)
    path = os.path.join(BASE, folder, "splash.png")
    img.save(path, "PNG")
    print(f"  {W}x{H} -> {folder}/splash.png")

# Fallback drawable
for folder, (W, H) in BASE_SIZE.items():
    img  = draw_splash(W, H)
    path = os.path.join(BASE, folder, "splash.png")
    img.save(path, "PNG")
    print(f"  {W}x{H} -> {folder}/splash.png")

print("Done.")
