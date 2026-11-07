#!/usr/bin/env python3
"""
POWATER CORP. v1.0.0.0 - Real PNG Asset Generator
Generates crisp RGBA PNG sprites for GDevelop 5 objects, rivers, badges, toolbar buttons, and icons.
"""
import os
import math
import struct
import zlib

ASSETS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
os.makedirs(ASSETS_DIR, exist_ok=True)


def write_png(filepath, width, height, rgba_bytes):
    """Writes raw RGBA byte array to a valid PNG file."""
    def make_chunk(chunk_type, data):
        chunk = struct.pack('>I', len(data)) + chunk_type + data
        crc = zlib.crc32(chunk_type + data) & 0xffffffff
        return chunk + struct.pack('>I', crc)

    raw_rows = bytearray()
    stride = width * 4
    for y in range(height):
        raw_rows.append(0)  # Filter type 0 (None)
        raw_rows.extend(rgba_bytes[y * stride:(y + 1) * stride])

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(raw_rows), 9)

    with open(filepath, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(make_chunk(b'IHDR', ihdr))
        f.write(make_chunk(b'IDAT', compressed))
        f.write(make_chunk(b'IEND', b''))


# Clean 5x7 pixel font for crisp button labels
FONT_5X7 = {
    'A': ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    'B': ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    'C': ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
    'D': ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    'E': ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    'F': ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    'G': ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
    'H': ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    'I': ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    'K': ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    'L': ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    'M': ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    'N': ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    'O': ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    'P': ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    'R': ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    'S': ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    'T': ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    'U': ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    'V': ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    'W': ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    'X': ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    'Y': ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    '[': ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
    ']': ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
    ' ': ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
}


def draw_text(buf, w, h, text, cx, cy, scale, color):
    text = text.upper()
    char_w = 5 * scale
    char_h = 7 * scale
    gap = 1 * scale
    total_w = len(text) * char_w + max(0, len(text) - 1) * gap
    start_x = int(cx - total_w / 2)
    start_y = int(cy - char_h / 2)

    r, g, b, a = color
    for idx, ch in enumerate(text):
        glyph = FONT_5X7.get(ch, FONT_5X7[' '])
        ox = start_x + idx * (char_w + gap)
        for gy in range(7):
            row = glyph[gy]
            for gx in range(5):
                if row[gx] == '1':
                    for sy in range(scale):
                        for sx in range(scale):
                            px = ox + gx * scale + sx
                            py = start_y + gy * scale + sy
                            if 0 <= px < w and 0 <= py < h:
                                i = (py * w + px) * 4
                                buf[i] = r
                                buf[i + 1] = g
                                buf[i + 2] = b
                                buf[i + 3] = a


def generate_river_png(filename, img_w, img_h, origin_x, path_points, river_w, palette):
    """Generates a multi-band curvy river sprite matching river.png style."""
    buf = bytearray(img_w * img_h * 4)
    half_w = river_w / 2.0
    shadow_pad = 16.0

    def get_center_x(y):
        for i in range(len(path_points) - 1):
            p1 = path_points[i]
            p2 = path_points[i + 1]
            if p1[1] <= y <= p2[1]:
                frac = (y - p1[1]) / max(1.0, (p2[1] - p1[1]))
                smooth = (1.0 - math.cos(frac * math.pi)) / 2.0
                world_x = p1[0] + (p2[0] - p1[0]) * smooth
                return world_x - origin_x
        return path_points[0][0] - origin_x

    c_outer, c_mid, c_inner, c_core = palette

    for y in range(img_h):
        cx = get_center_x(y)
        row_offset = y * img_w * 4
        for x in range(img_w):
            dist = abs(x - cx)
            if dist <= half_w:
                norm = dist / half_w
                if norm < 0.25:
                    col = c_core
                elif norm < 0.52:
                    col = c_inner
                elif norm < 0.78:
                    col = c_mid
                else:
                    col = c_outer
                idx = row_offset + x * 4
                buf[idx] = col[0]
                buf[idx + 1] = col[1]
                buf[idx + 2] = col[2]
                buf[idx + 3] = 255
            elif dist <= half_w + shadow_pad:
                falloff = 1.0 - (dist - half_w) / shadow_pad
                alpha = int(45 * (falloff ** 2))
                idx = row_offset + x * 4
                buf[idx] = 10
                buf[idx + 1] = 25
                buf[idx + 2] = 45
                buf[idx + 3] = alpha

    write_png(os.path.join(ASSETS_DIR, filename), img_w, img_h, buf)
    print(f'Generated {filename} ({img_w}x{img_h})')


def generate_button_png(filename, title, subtitle, accent_rgb):
    """Generates a 128x96 toolbar button matching btn_power.png / btn_upgrade.png."""
    w, h = 128, 96
    buf = bytearray(w * h * 4)
    ar, ag, ab = accent_rgb
    bg_r, bg_g, bg_b = (28, 25, 54)
    radius = 16

    for y in range(h):
        for x in range(w):
            # Rounded rect distance check
            dx = max(0, radius - x, x - (w - 1 - radius))
            dy = max(0, radius - y, y - (h - 1 - radius))
            dist = math.hypot(dx, dy)
            if dist <= radius:
                idx = (y * w + x) * 4
                is_border = (dist >= radius - 4) or (x < 4) or (x >= w - 4) or (y < 4) or (y >= h - 4)
                is_header = (y < 16)
                if is_border or is_header:
                    buf[idx] = ar
                    buf[idx + 1] = ag
                    buf[idx + 2] = ab
                    buf[idx + 3] = 255
                else:
                    buf[idx] = bg_r
                    buf[idx + 1] = bg_g
                    buf[idx + 2] = bg_b
                    buf[idx + 3] = 255

    draw_text(buf, w, h, title, w // 2, 42, 3, (255, 255, 255, 255))
    draw_text(buf, w, h, subtitle, w // 2, 72, 2, (ar, ag, ab, 255))
    write_png(os.path.join(ASSETS_DIR, filename), w, h, buf)
    print(f'Generated {filename} ({w}x{h})')


def generate_badge_repair():
    """Generates badge_repair.png (48x48) circular alert badge with wrench icon."""
    w, h = 48, 48
    buf = bytearray(w * h * 4)
    cx, cy = 23.5, 23.5
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy)
            idx = (y * w + x) * 4
            if d <= 22.0:
                if d >= 18.0:
                    buf[idx:idx + 4] = bytes((255, 90, 95, 255))
                else:
                    buf[idx:idx + 4] = bytes((38, 18, 35, 255))
            # Diagonal wrench shaft
            if abs((x - cx) - (y - cy)) <= 2.8 and abs((x - cx) + (y - cy)) <= 14.0:
                buf[idx:idx + 4] = bytes((255, 183, 3, 255))
            # Wrench head
            if math.hypot(x - 16, y - 16) <= 5.5 and math.hypot(x - 14, y - 14) >= 2.2:
                buf[idx:idx + 4] = bytes((255, 209, 102, 255))
            if math.hypot(x - 31, y - 31) <= 5.0 and math.hypot(x - 33, y - 33) >= 2.2:
                buf[idx:idx + 4] = bytes((255, 209, 102, 255))

    write_png(os.path.join(ASSETS_DIR, 'badge_repair.png'), w, h, buf)
    print('Generated badge_repair.png (48x48)')


def generate_badge_candle():
    """Generates badge_candle.png (48x48) circular badge with glowing candle icon."""
    w, h = 48, 48
    buf = bytearray(w * h * 4)
    cx, cy = 23.5, 23.5
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy)
            idx = (y * w + x) * 4
            if d <= 22.0:
                if d >= 18.0:
                    buf[idx:idx + 4] = bytes((255, 209, 102, 255))
                else:
                    buf[idx:idx + 4] = bytes((28, 22, 48, 255))
            # Candle body
            if 19 <= x <= 28 and 24 <= y <= 37:
                buf[idx:idx + 4] = bytes((248, 249, 250, 255))
            # Candle wick
            if 23 <= x <= 24 and 21 <= y < 24:
                buf[idx:idx + 4] = bytes((108, 117, 125, 255))
            # Flame teardrop
            fx = (x - 23.5) / 4.5
            fy = (y - 16.0) / 6.0
            if fx * fx + fy * fy <= 1.0:
                if fx * fx + fy * fy <= 0.35:
                    buf[idx:idx + 4] = bytes((255, 255, 220, 255))
                else:
                    buf[idx:idx + 4] = bytes((255, 159, 28, 255))

    write_png(os.path.join(ASSETS_DIR, 'badge_candle.png'), w, h, buf)
    print('Generated badge_candle.png (48x48)')


def generate_day_night_icons():
    """Generates icon_day.png and icon_night.png (48x48)."""
    w, h = 48, 48
    # Day Sun Icon
    buf_day = bytearray(w * h * 4)
    cx, cy = 23.5, 23.5
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy)
            idx = (y * w + x) * 4
            if d <= 12.0:
                buf_day[idx:idx + 4] = bytes((255, 209, 102, 255))
            elif 14.5 <= d <= 20.5:
                ang = math.atan2(y - cy, x - cx)
                ray = abs(math.sin(ang * 4))
                if ray > 0.82:
                    buf_day[idx:idx + 4] = bytes((255, 183, 3, 255))
    write_png(os.path.join(ASSETS_DIR, 'icon_day.png'), w, h, buf_day)
    print('Generated icon_day.png (48x48)')

    # Night Crescent Moon Icon
    buf_night = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            d1 = math.hypot(x - 22.0, y - 24.0)
            d2 = math.hypot(x - 28.5, y - 19.5)
            idx = (y * w + x) * 4
            if d1 <= 15.0 and d2 >= 12.5:
                buf_night[idx:idx + 4] = bytes((144, 224, 239, 255))
    write_png(os.path.join(ASSETS_DIR, 'icon_night.png'), w, h, buf_night)
    print('Generated icon_night.png (48x48)')


def generate_logo_powater():
    """Generates logo_powater.png (64x64) matching the POWATER CORP. lightning water-drop logo."""
    w, h = 64, 64
    buf = bytearray(w * h * 4)
    cx, cy = 31.5, 35.0
    for y in range(h):
        for x in range(w):
            idx = (y * w + x) * 4
            # Teardrop water shape
            dy = (y - 10) / 46.0
            if 0 <= dy <= 1.0:
                max_rx = 22.0 * math.sin(dy * math.pi * 0.85)
                if abs(x - cx) <= max_rx:
                    buf[idx:idx + 4] = bytes((0, 180, 216, 255))
            # Lightning bolt cutout / highlight in center
            # Upper bolt segment & lower bolt segment
            in_bolt = False
            if 16 <= y <= 34:
                bx = 36 - (y - 16) * 0.55
                if abs(x - bx) <= 4.5:
                    in_bolt = True
            if 30 <= y <= 50:
                bx = 33 - (y - 30) * 0.55
                if abs(x - bx) <= 4.0:
                    in_bolt = True
            if in_bolt:
                buf[idx:idx + 4] = bytes((255, 255, 255, 255))

    write_png(os.path.join(ASSETS_DIR, 'logo_powater.png'), w, h, buf)
    print('Generated logo_powater.png (64x64)')


def generate_toolbar_dock():
    """Generates toolbar_dock.png (880x56) rounded dock tray with section dividers."""
    w, h = 880, 56
    buf = bytearray(w * h * 4)
    radius = 12
    for y in range(h):
        for x in range(w):
            dx = max(0, radius - x, x - (w - 1 - radius))
            dy = max(0, radius - y, y - (h - 1 - radius))
            dist = math.hypot(dx, dy)
            if dist <= radius:
                idx = (y * w + x) * 4
                is_border = (dist >= radius - 2) or (x < 2) or (x >= w - 2) or (y < 2) or (y >= h - 2)
                is_divider = (8 <= y <= h - 9) and (x in (218, 434, 580))
                if is_border or is_divider:
                    buf[idx:idx + 4] = bytes((72, 202, 228, 180))
                else:
                    buf[idx:idx + 4] = bytes((24, 20, 44, 235))
    write_png(os.path.join(ASSETS_DIR, 'toolbar_dock.png'), w, h, buf)
    print('Generated toolbar_dock.png (880x56)')


if __name__ == '__main__':
    # 1. Rome River (Tiber River)
    rome_path = [
        (730, 0),
        (530, 220),
        (750, 440),
        (500, 600),
        (580, 720)
    ]
    rome_palette = (
        (0, 119, 182),
        (0, 150, 199),
        (72, 202, 228),
        (173, 232, 244)
    )
    generate_river_png('river_rome.png', 400, 720, 420, rome_path, 75, rome_palette)

    # 2. Amsterdam River (Amstel Canal)
    amsterdam_path = [
        (640, 0),
        (580, 240),
        (670, 480),
        (610, 720)
    ]
    amsterdam_palette = (
        (2, 62, 138),
        (0, 119, 182),
        (0, 180, 216),
        (144, 224, 239)
    )
    generate_river_png('river_amsterdam.png', 280, 720, 490, amsterdam_path, 90, amsterdam_palette)

    # 3. Toolbar Buttons for Repair & Special Items
    generate_button_png('btn_repair.png', 'REPAIR', '[R] FIX', (255, 90, 95))
    generate_button_png('btn_special.png', 'ITEMS', '[I] SHOP', (6, 214, 160))

    # 4. Badges & Icons
    generate_badge_repair()
    generate_badge_candle()
    generate_day_night_icons()
    generate_logo_powater()
    generate_toolbar_dock()

