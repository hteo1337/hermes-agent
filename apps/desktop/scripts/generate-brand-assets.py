#!/usr/bin/env python3
"""Render the desktop app icons and brand mark from one glyph (Pillow only).

Run from apps/desktop:  python3 scripts/generate-brand-assets.py
Outputs overwrite assets/icon*.{png,ico,icns}, assets/icon.icon/Assets/*,
assets/appx/*, public/apple-touch-icon.png, public/brand-mark*.png and
packaging/dmg-volume.icns and packaging/dmg-background.tiff. The glyph and palette live in the constants below.
"""
import glob
import os
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SS = 4  # supersampling factor

DARK_BG, DARK_FG = (15, 17, 21), (109, 124, 255)
LIGHT_BG, LIGHT_FG = (255, 255, 255), (79, 91, 213)


def squircle_mask(size, inset=0.0, n=5.0):
    """Superellipse mask; inset is the fraction of `size` left empty on each side."""
    big = size * SS
    img = Image.new("L", (big, big), 0)
    d = ImageDraw.Draw(img)
    half = big / 2
    r = half * (1 - 2 * inset)
    for y in range(big):
        dy = abs((y + 0.5 - half) / r)
        if dy > 1:
            continue
        span = (1 - dy**n) ** (1 / n)
        d.line([(half - r * span, y), (half + r * span, y)], fill=255)
    return img.resize((size, size), Image.LANCZOS)


def glyph(size, color, scale=0.52):
    """Rounded 'E': a stem and three bars, centred, on transparent."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    w = big * scale
    x0, y0 = (big - w) / 2, (big - w) / 2
    t = w * 0.19  # stroke
    rad = t / 2
    d.rounded_rectangle([x0, y0, x0 + t, y0 + w], rad, fill=color)
    for i, frac in enumerate((1.0, 0.78, 1.0)):
        y = y0 + i * (w - t) / 2
        d.rounded_rectangle([x0, y, x0 + w * frac, y + t], rad, fill=color)
    return img.resize((size, size), Image.LANCZOS)


def tile(size, dark, inset=0.0, glyph_scale=0.52):
    bg, fg = (DARK_BG, DARK_FG) if dark else (LIGHT_BG, LIGHT_FG)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(Image.new("RGBA", (size, size), bg + (255,)), (0, 0), squircle_mask(size, inset))
    g = glyph(size, fg + (255,), glyph_scale * (1 - 2 * inset))
    out.alpha_composite(g)
    return out


def save_png(img, rel):
    path = os.path.join(ROOT, rel)
    img.save(path)
    return path


def save_ico(dark, rel):
    sizes = [16, 24, 32, 48, 64, 128, 256]
    base = tile(256, dark)
    base.save(os.path.join(ROOT, rel), sizes=[(s, s) for s in sizes])


def save_icns(master, rel):
    path = os.path.join(ROOT, rel)
    with tempfile.TemporaryDirectory() as tmp:
        iconset = os.path.join(tmp, "x.iconset")
        os.mkdir(iconset)
        for s in (16, 32, 128, 256, 512):
            master.resize((s, s), Image.LANCZOS).save(os.path.join(iconset, f"icon_{s}x{s}.png"))
            master.resize((s * 2, s * 2), Image.LANCZOS).save(os.path.join(iconset, f"icon_{s}x{s}@2x.png"))
        subprocess.run(["iconutil", "-c", "icns", iconset, "-o", path], check=True)


def dmg_background():
    """Two-frame TIFF (1x at 72 dpi, 2x at 144 dpi): dark field, glow, arrow."""
    def frame(w, h, k):
        img = Image.new("RGB", (w, h), DARK_BG)
        glow = Image.new("RGB", (w, h), DARK_FG)
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).ellipse([w * 0.25, -h * 0.9, w * 0.75, h * 0.45], fill=46)
        img.paste(glow, (0, 0), mask.filter(ImageFilter.GaussianBlur(60 * k)))
        d = ImageDraw.Draw(img)
        y = int(h * 0.60)
        x0, x1, t = int(w * 0.50), int(w * 0.66), max(2, int(3 * k))
        d.line([(x0, y), (x1 - 10 * k, y)], fill=DARK_FG, width=t)
        d.polygon([(x1, y), (x1 - 14 * k, y - 9 * k), (x1 - 14 * k, y + 9 * k)], fill=DARK_FG)
        return img

    with tempfile.TemporaryDirectory() as tmp:
        a, b = os.path.join(tmp, "1x.tiff"), os.path.join(tmp, "2x.tiff")
        frame(769, 457, 1).save(a, dpi=(72, 72))
        frame(1538, 914, 2).save(b, dpi=(144, 144))
        # tiffutil -cat keeps each frame's dpi (-cathidpicheck would rewrite both to 72).
        subprocess.run(["tiffutil", "-cat", a, b, "-out", os.path.join(ROOT, "packaging/dmg-background.tiff")],
                       check=True, capture_output=True)

def main():
    light, dark = tile(1024, False), tile(1024, True)
    mac_light, mac_dark = tile(1024, False, 0.0977), tile(1024, True, 0.0977)

    save_png(light, "assets/icon.png")
    save_png(dark, "assets/icon-dark.png")
    save_png(mac_light, "assets/icon-mac.png")
    save_png(light, "public/apple-touch-icon.png")
    save_png(tile(256, False), "public/brand-mark.png")
    save_png(tile(256, True), "public/brand-mark-dark.png")
    save_ico(False, "assets/icon.ico")
    save_ico(True, "assets/icon-dark.ico")
    save_icns(mac_light, "assets/icon.icns")
    save_icns(mac_dark, "assets/icon-dark.icns")
    save_icns(mac_light, "packaging/dmg-volume.icns")
    dmg_background()

    # Icon Composer layers: glyph only, the system supplies the fill.
    layers = "assets/icon.icon/Assets"
    save_png(glyph(1024, LIGHT_FG + (255,)), f"{layers}/art-light.png")
    save_png(glyph(1024, DARK_FG + (255,)), f"{layers}/art-dark.png")
    save_png(glyph(1024, (255, 255, 255, 255)), f"{layers}/mono.png")

    # MSIX logos: keep each existing size; wide logos centre the tile.
    for path in sorted(glob.glob(os.path.join(ROOT, "assets/appx/*.png"))):
        w, h = Image.open(path).size
        unplated = "unplated" in os.path.basename(path)
        s = min(w, h)
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.alpha_composite(tile(s, unplated), ((w - s) // 2, (h - s) // 2))
        canvas.save(path)


if __name__ == "__main__":
    main()
