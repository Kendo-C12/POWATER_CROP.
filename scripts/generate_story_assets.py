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


def generate_logo(path=None, size=256):
    """POWATER logo, dark variant: blue water drop split by a lightning bolt on a dark rounded square.
    Coordinates are in a 500x500 design box (traced from the team's logo sheet)."""
    S = 4 * size / 500  # supersampled scale
    big = int(500 * S)
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    P = lambda pts: [(x * S, y * S) for x, y in pts]
    BG, BLUE = (38, 38, 38, 255), (37, 99, 235, 255)

    def bez(p0, p1, p2, n=24):
        return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                 (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in (i / n for i in range(n + 1))]

    # Reference sheet coords (square 30..480 x 40..495) mapped into the 10..490 design square
    M = lambda pts: [((x - 30) * 480 / 450 + 10, (y - 40) * 480 / 455 + 10) for x, y in pts]
    d.rounded_rectangle([10 * S, 10 * S, 490 * S, 490 * S], radius=70 * S, fill=BG)
    # Drop body + slim curved tip sweeping to the upper right
    (cx, cy), = M([(239, 312)])
    r = 136 * 480 / 450
    d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=BLUE)
    d.polygon(P(M(bez((196, 182), (270, 118), (384, 88)) + bez((384, 88), (352, 120), (336, 190)) + [(300, 240)])), fill=BLUE)
    # Lightning bolt cut out of the drop (background colour shows through)
    d.polygon(P(M([(186, 181), (338, 192), (268, 252), (331, 261), (172, 424), (213, 265), (150, 258)])), fill=BG)
    img = img.resize((size, size), Image.LANCZOS)
    path = path or os.path.join(ASSETS, 'logo_powater.png')
    img.save(path)
    print('Generated', path, img.size)


# Top-bar boxes as placed in every scene (x, width) — same spots the HUD draws them at runtime
HUD_SLOTS = [
    ('hud_slot_city', 8, 185, 'BANGKOK v1.0', (0, 180, 216)),
    ('hud_slot_money', 198, 112, '$150', (255, 209, 102)),
    ('hud_slot_houses', 314, 148, 'บ้าน 0/3 (Up:0)', (6, 214, 160)),
    ('hud_slot_goal', 466, 190, 'เป้าหมาย 0/15 หลัง', (144, 224, 239)),
    ('hud_slot_pollution', 660, 172, 'มลพิษ เริ่มเมื่อบ้าน 3/5', (255, 183, 3)),
    ('hud_slot_time', 836, 216, 'DAY (60s) | MON D1', (255, 209, 102)),
    ('hud_slot_strikes', 1056, 214, 'STRIKES: ☐ ☐ ☐', (255, 90, 95)),
]


def generate_scene_ui():
    """PNG versions of everything the game draws on screen, so each GDevelop scene shows the full level layout."""
    K = 4  # supersample, saved at 2x for crisp editor zoom
    font = lambda size: ImageFont.truetype('C:/Windows/Fonts/leelawdb.ttf', size)
    city_boxes = [('hud_slot_city_' + k, 8, 185, f'{v} v1.0', (0, 180, 216)) for k, v in
                  [('bangkok', 'BANGKOK'), ('tutorial', 'TUTORIAL'), ('tokyo', 'TOKYO'), ('rome', 'ROME'), ('amsterdam', 'AMSTERDAM')]]
    for name, _x, w, label, col in HUD_SLOTS + city_boxes:
        h = 32
        img = Image.new('RGBA', (w * K, h * K), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([0, 0, w * K - 1, h * K - 1], radius=6 * K, fill=(26, 19, 52, 225), outline=(72, 202, 228, 90), width=K)
        f = font(11 * K)
        tw = d.textlength(label, font=f)
        d.text(((w * K - tw) / 2, 7 * K), label, font=f, fill=col + (255,))
        img.resize((w * 2, h * 2), Image.LANCZOS).save(os.path.join(ASSETS, name + '.png'))
    # House spot marker: faded house + dashed ring = "a house will spawn here"
    house = Image.open(os.path.join(ASSETS, 'House.png')).convert('RGBA').resize((84 * K, 56 * K), Image.LANCZOS)
    house.putalpha(house.getchannel('A').point(lambda a: a * 45 // 100))
    spot = Image.new('RGBA', (100 * K, 100 * K), (0, 0, 0, 0))
    d = ImageDraw.Draw(spot)
    for i in range(24):  # dashed ring
        a0 = i * 15
        d.arc([4 * K, 4 * K, 96 * K, 96 * K], a0, a0 + 9, fill=(6, 214, 160, 230), width=3 * K)
    spot.alpha_composite(house, (8 * K, 22 * K))
    spot.resize((200, 200), Image.LANCZOS).save(os.path.join(ASSETS, 'house_spot.png'))
    print('Generated', len(HUD_SLOTS), 'hud_slot_*.png + house_spot.png')


if __name__ == '__main__':
    import sys
    if 'logo' in sys.argv:
        generate_logo(*(sys.argv[2:3]))
    elif 'ui' in sys.argv:
        generate_scene_ui()
    else:
        generate_bangkok()
        generate_amigo()
        generate_logo()
        generate_scene_ui()
