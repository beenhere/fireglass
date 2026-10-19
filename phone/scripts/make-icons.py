"""Draws the app icon set from the launcher palette: night sky, a glass D-pad ring, a glowing OK.
Run: python3 -I scripts/make-icons.py   (needs Pillow). Writes into assets/."""
import os, sys, math
from PIL import Image, ImageDraw, ImageFilter

root = os.path.join(os.path.dirname(os.path.abspath(sys.argv[0])), '..', 'assets')
S = 1024

def sky(size):
    img = Image.new('RGB', (size, size), (7, 11, 31))
    for color, cx, cy, r, a in [((46, 58, 140), .2, .15, .75, 230), ((110, 63, 184), .9, .45, .6, 200), ((27, 111, 138), .25, .95, .7, 210)]:
        layer = Image.new('RGB', (size, size), color)
        mask = Image.new('L', (size, size), 0)
        ImageDraw.Draw(mask).ellipse(((cx - r / 2) * size, (cy - r / 2) * size, (cx + r / 2) * size, (cy + r / 2) * size), fill=a)
        img = Image.composite(layer, img, mask.filter(ImageFilter.GaussianBlur(size * 0.12)))
    return img

def glyph(size, mono=False):
    """Transparent layer: ring, chevrons, centre button, inside the adaptive-icon safe zone."""
    g = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    c = size / 2
    R, r = size * 0.30, size * 0.115
    white = (255, 255, 255, 255)
    if not mono:
        glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse((c - r * 1.9, c - r * 1.9, c + r * 1.9, c + r * 1.9), fill=(169, 184, 255, 150))
        g = Image.alpha_composite(g, glow.filter(ImageFilter.GaussianBlur(size * 0.05)))
        d = ImageDraw.Draw(g)
        d.ellipse((c - R, c - R, c + R, c + R), fill=(255, 255, 255, 34), outline=(255, 255, 255, 150), width=int(size * 0.008))
        d.ellipse((c - r, c - r, c + r, c + r), fill=(214, 221, 255, 255))
    else:
        d.ellipse((c - R, c - R, c + R, c + R), outline=white, width=int(size * 0.03))
        d.ellipse((c - r, c - r, c + r, c + r), fill=white)
    w = int(size * 0.022)
    k = size * 0.045
    m = (R + r) / 2 + size * 0.01
    for ang in (0, 90, 180, 270):
        a = math.radians(ang)
        tx, ty = c + math.cos(a) * m, c + math.sin(a) * m
        # chevron pointing outwards
        px, py = math.cos(a), math.sin(a)
        qx, qy = -py, px
        tip = (tx + px * k * 0.5, ty + py * k * 0.5)
        l1 = (tx - px * k * 0.5 + qx * k, ty - py * k * 0.5 + qy * k)
        l2 = (tx - px * k * 0.5 - qx * k, ty - py * k * 0.5 - qy * k)
        d.line([l1, tip, l2], fill=white, width=w, joint='curve')
    return g

icon = sky(S).convert('RGBA')
big = glyph(int(S * 1.35))
off = (S - big.width) // 2
icon.alpha_composite(big, (off, off))
icon.convert('RGB').save(os.path.join(root, 'icon.png'))
glyph(S).save(os.path.join(root, 'android-icon-foreground.png'))
glyph(S, mono=True).save(os.path.join(root, 'android-icon-monochrome.png'))
sky(S).save(os.path.join(root, 'android-icon-background.png'))
glyph(S).save(os.path.join(root, 'splash-icon.png'))
fav = icon.convert('RGB').resize((48, 48), Image.LANCZOS); fav.save(os.path.join(root, 'favicon.png'))
print('icons written')
