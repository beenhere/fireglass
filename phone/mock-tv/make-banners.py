"""Draws the mock TV's app banners (320x180 PNG): the app's colour as a soft gradient and its name.
Run: python3 -I make-banners.py   (needs Pillow). Output: banners/<pkg>.png"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

here = os.path.dirname(os.path.abspath(sys.argv[0]))
font_path = os.path.join(here, '..', 'assets', 'fonts', 'Figtree-Bold.ttf')
os.makedirs(os.path.join(here, 'banners'), exist_ok=True)
W, H = 320, 180

def hex2rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

for app in json.load(open(os.path.join(here, 'apps.json'))):
    r, g, b = hex2rgb(app['color'])
    img = Image.new('RGB', (W, H))
    px = img.load()
    for y in range(H):
        for x in range(W):
            t = (x / W) * 0.6 + (y / H) * 0.4
            k = 1.0 - 0.55 * t
            px[x, y] = (int(r * k + 8 * (1 - k)), int(g * k + 10 * (1 - k)), int(b * k + 30 * (1 - k)))
    glow = Image.new('L', (W, H), 0)
    ImageDraw.Draw(glow).ellipse((-60, -110, 240, 90), fill=90)
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    img = Image.composite(Image.new('RGB', (W, H), (255, 255, 255)), img, glow)
    d = ImageDraw.Draw(img)
    size = 44 if len(app['label']) <= 8 else 36
    font = ImageFont.truetype(font_path, size)
    box = d.textbbox((0, 0), app['label'], font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text(((W - tw) / 2 - box[0], (H - th) / 2 - box[1]), app['label'], font=font, fill=(255, 255, 255))
    img.save(os.path.join(here, 'banners', app['pkg'] + '.png'), optimize=True)
    print('wrote', app['pkg'])
