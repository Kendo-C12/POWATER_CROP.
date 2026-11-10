#!/usr/bin/env python3
"""Generates story art in the hand-drawn map style of assets/Tokyo.jpg, Rome.jpg, Amsterdam.jpg (needs Pillow).

- assets/Bangkok.jpg : Chao Phraya river through Bangkok (1522x1076, same frame as the other city maps)
- assets/amigo.png   : main character Amigo TheGOATHimself (story/story.txt), transparent portrait
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')

CREAM = (255, 241, 215)
WATER = (121, 231, 254)
OUTLINE = (14, 138, 155)
GRAY = (180, 180, 182)
SS = 2  # supersampling factor


def offset_polyline(pts, half_w):
    """Left/right outlines of a thick polyline with mitered (sharp) joints, like the Rome map."""
    left, right = [], []
    n = len(pts)
    for i in range(n):
        if i == 0:
            dx, dy = pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]
            ln = math.hypot(dx, dy); nx, ny = -dy / ln, dx / ln; m = 1.0
        elif i == n - 1:
            dx, dy = pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]
            ln = math.hypot(dx, dy); nx, ny = -dy / ln, dx / ln; m = 1.0
        else:
            ax, ay = pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]
            bx, by = pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]
            la, lb = math.hypot(ax, ay), math.hypot(bx, by)
            n1 = (-ay / la, ax / la); n2 = (-by / lb, bx / lb)
            sx, sy = n1[0] + n2[0], n1[1] + n2[1]
            ls = math.hypot(sx, sy)
            nx, ny = sx / ls, sy / ls
            m = min(2.5, 1.0 / max(0.2, nx * n1[0] + ny * n1[1]))
        left.append((pts[i][0] + nx * half_w * m, pts[i][1] + ny * half_w * m))
        right.append((pts[i][0] - nx * half_w * m, pts[i][1] - ny * half_w * m))
    return left, right


def generate_bangkok():
    W, H = 1522, 1076
    img = Image.new('RGB', (W * SS, H * SS), CREAM)
    d = ImageDraw.Draw(img)
    s = lambda p: (p[0] * SS, p[1] * SS)

    # Chao Phraya, north (top) to south (bottom): Nonthaburi -> west bend at Bang Phlat ->
    # Rattanakosin / Grand Palace -> SE past Chinatown & Bang Rak -> Sathorn -> Rama III ->
    # the big omega loop around Bang Krachao ("Bangkok's green lung") -> Phra Pradaeng -> gulf
    river = [(720, -60), (690, 140), (540, 230), (480, 330), (500, 420), (580, 500), (720, 540),
             (770, 620), (730, 710), (830, 790), (990, 710), (1090, 580), (1250, 570), (1360, 680),
             (1340, 820), (1200, 900), (1040, 880), (980, 940), (960, 1140)]
    half = 44
    left, right = offset_polyline(river, half)
    poly = [s(p) for p in left + right[::-1]]
    d.polygon(poly, fill=WATER, outline=OUTLINE, width=8 * SS)

    # Bridges (grey bars across the river, like the Rome map)
    for i in (1, 3, 5, 7, 10, 12):
        (x1, y1), (x2, y2) = river[i], river[i + 1]
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ln = math.hypot(x2 - x1, y2 - y1)
        nx, ny = -(y2 - y1) / ln, (x2 - x1) / ln
        a = (mx + nx * (half + 2), my + ny * (half + 2))
        b = (mx - nx * (half + 2), my - ny * (half + 2))
        d.line([s(a), s(b)], fill=GRAY, width=9 * SS)

    # Rotated grey city label at the left edge, matching the other maps
    font = ImageFont.truetype('C:/Windows/Fonts/seguibl.ttf', 70 * SS)
    label = Image.new('RGBA', (360 * SS, 100 * SS), (0, 0, 0, 0))
    ImageDraw.Draw(label).text((0, 0), 'Bangkok', font=font, fill=GRAY + (255,))
    label = label.crop(label.getbbox()).rotate(-90, expand=True)
    img.paste(label, (14 * SS, 600 * SS), label)

    img = img.resize((W, H), Image.LANCZOS)
    img.save(os.path.join(ASSETS, 'Bangkok.jpg'), quality=92)
    print('Generated assets/Bangkok.jpg (1522x1076)')


def generate_amigo():
    """Amigo TheGOATHimself: eco-minded business leader. Flat art, teal outline, green tie + leaf pin, goatee."""
    W, H = 640, 800
    img = Image.new('RGBA', (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = lambda pts: [(x * SS, y * SS) for x, y in pts]
    box = lambda x1, y1, x2, y2: [x1 * SS, y1 * SS, x2 * SS, y2 * SS]
    OL = (12, 84, 98)
    ow = 9 * SS
    SUIT = (36, 92, 84)
    SUIT_D = (26, 70, 64)
    SKIN = (240, 200, 160)
    HAIR = (66, 46, 36)

    # Suit body & shoulders
    d.polygon(s([(70, 798), (95, 618), (170, 553), (320, 526), (470, 553), (545, 618), (570, 798)]), fill=SUIT, outline=OL, width=ow)
    # Neck
    d.rectangle(box(287, 460, 353, 540), fill=SKIN, outline=OL, width=ow)
    # Shirt V + collar
    d.polygon(s([(255, 530), (320, 678), (385, 530), (320, 563)]), fill=(250, 248, 240), outline=OL, width=ow)
    # Green tie
    d.polygon(s([(304, 566), (336, 566), (348, 678), (320, 720), (292, 678)]), fill=(84, 190, 96), outline=OL, width=ow)
    d.polygon(s([(300, 550), (340, 550), (336, 576), (304, 576)]), fill=(70, 165, 84), outline=OL, width=ow)
    # Lapels
    d.polygon(s([(170, 553), (255, 530), (320, 678), (240, 618)]), fill=SUIT_D, outline=OL, width=ow)
    d.polygon(s([(470, 553), (385, 530), (320, 678), (400, 618)]), fill=SUIT_D, outline=OL, width=ow)
    # Leaf lapel pin (nature first)
    leaf = Image.new('RGBA', (60 * SS, 30 * SS), (0, 0, 0, 0))
    ImageDraw.Draw(leaf).ellipse([0, 0, 60 * SS - 1, 30 * SS - 1], fill=(120, 220, 110), outline=OL, width=4 * SS)
    leaf = leaf.rotate(35, expand=True)
    img.paste(leaf, (408 * SS, 588 * SS), leaf)
    # Ears
    d.ellipse(box(198, 330, 238, 400), fill=SKIN, outline=OL, width=ow)
    d.ellipse(box(402, 330, 442, 400), fill=SKIN, outline=OL, width=ow)
    # Head
    d.ellipse(box(215, 215, 425, 495), fill=SKIN, outline=OL, width=ow)
    # Hair: confident side swoop
    d.polygon(s([(212, 330), (205, 255), (250, 205), (330, 190), (405, 215), (432, 270), (430, 330),
                 (405, 275), (330, 262), (275, 290), (238, 280)]), fill=HAIR, outline=OL, width=ow)
    # Eyebrows & eyes
    d.line(s([(262, 330), (300, 322)]), fill=HAIR, width=8 * SS)
    d.line(s([(342, 322), (380, 330)]), fill=HAIR, width=8 * SS)
    d.ellipse(box(272, 348, 292, 372), fill=(30, 40, 50))
    d.ellipse(box(350, 348, 370, 372), fill=(30, 40, 50))
    # Smile
    d.arc(box(285, 395, 355, 440), start=20, end=160, fill=OL, width=6 * SS)
    # Goatee (the GOAT himself)
    d.polygon(s([(300, 452), (340, 452), (330, 488), (320, 500), (310, 488)]), fill=HAIR, outline=OL, width=5 * SS)

    img = img.crop(img.getbbox())
    img = img.resize((img.width // SS, img.height // SS), Image.LANCZOS)
    img.save(os.path.join(ASSETS, 'amigo.png'))
    print('Generated assets/amigo.png', img.size)


if __name__ == '__main__':
    generate_bangkok()
    generate_amigo()
