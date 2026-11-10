#!/usr/bin/env python3
"""
POWATER CORP. v1.0.2.1 - High-Definition Anti-Aliased Vector PNG Asset Generator
Generates crisp 4x HD RGBA PNG sprites (using Signed Distance Field / anti-aliased
vector stroke geometry) for GDevelop 5 objects, rivers, badges, toolbar buttons, and icons
so they never look blurry or pixelated when zoomed in.
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


def blend_pixel(buf, w, h, x, y, r, g, b, alpha):
    """Alpha-blends a pixel at (x, y) into buf."""
    if x < 0 or x >= w or y < 0 or y >= h or alpha <= 0.0:
        return
    if alpha > 1.0:
        alpha = 1.0
    idx = (y * w + x) * 4
    dst_r = buf[idx]
    dst_g = buf[idx + 1]
    dst_b = buf[idx + 2]
    dst_a = buf[idx + 3] / 255.0

    out_a = alpha + dst_a * (1.0 - alpha)
    if out_a > 1e-5:
        out_r = (r * alpha + dst_r * dst_a * (1.0 - alpha)) / out_a
        out_g = (g * alpha + dst_g * dst_a * (1.0 - alpha)) / out_a
        out_b = (b * alpha + dst_b * dst_a * (1.0 - alpha)) / out_a
        buf[idx] = int(min(255, max(0, out_r)))
        buf[idx + 1] = int(min(255, max(0, out_g)))
        buf[idx + 2] = int(min(255, max(0, out_b)))
        buf[idx + 3] = int(min(255, max(0, out_a * 255.0)))


def draw_aa_segment(buf, w, h, x1, y1, x2, y2, thickness, color):
    """Draws an anti-aliased round-capped capsule segment using Signed Distance Field."""
    r, g, b, a = color
    base_alpha = a / 255.0
    half_t = thickness * 0.5
    pad = int(math.ceil(half_t + 2.0))
    min_x = max(0, int(min(x1, x2)) - pad)
    max_x = min(w - 1, int(max(x1, x2)) + pad)
    min_y = max(0, int(min(y1, y2)) - pad)
    max_y = min(h - 1, int(max(y1, y2)) + pad)

    dx = x2 - x1
    dy = y2 - y1
    seg_len_sq = dx * dx + dy * dy

    for py in range(min_y, max_y + 1):
        for px in range(min_x, max_x + 1):
            if seg_len_sq < 1e-6:
                dist = math.hypot(px - x1, py - y1)
            else:
                t = ((px - x1) * dx + (py - y1) * dy) / seg_len_sq
                if t < 0.0:
                    t = 0.0
                elif t > 1.0:
                    t = 1.0
                proj_x = x1 + t * dx
                proj_y = y1 + t * dy
                dist = math.hypot(px - proj_x, py - proj_y)
            if dist <= half_t + 1.0:
                cov = min(1.0, max(0.0, half_t + 0.5 - dist))
                blend_pixel(buf, w, h, px, py, r, g, b, cov * base_alpha)


def draw_aa_circle(buf, w, h, cx, cy, radius, fill_color=None, stroke_color=None, stroke_w=0.0):
    """Draws an anti-aliased filled and/or stroked circle."""
    max_r = radius + stroke_w * 0.5 + 2.0
    min_x = max(0, int(cx - max_r))
    max_x = min(w - 1, int(cx + max_r))
    min_y = max(0, int(cy - max_r))
    max_y = min(h - 1, int(cy + max_r))

    for py in range(min_y, max_y + 1):
        for px in range(min_x, max_x + 1):
            d = math.hypot(px - cx, py - cy)
            if fill_color is not None and d <= radius + 1.0:
                cov = min(1.0, max(0.0, radius + 0.5 - d))
                fr, fg, fb, fa = fill_color
                blend_pixel(buf, w, h, px, py, fr, fg, fb, cov * (fa / 255.0))
            if stroke_color is not None and stroke_w > 0.0:
                sd = abs(d - radius)
                half_s = stroke_w * 0.5
                if sd <= half_s + 1.0:
                    cov = min(1.0, max(0.0, half_s + 0.5 - sd))
                    sr, sg, sb, sa = stroke_color
                    blend_pixel(buf, w, h, px, py, sr, sg, sb, cov * (sa / 255.0))


# Smooth Vector Stroke Font (Normalized in [0..1] x [0..1] glyph box)
# Every character is defined by crisp vector line segments so scaling to any resolution is 100% sharp!
VECTOR_GLYPHS = {
    'A': [(0.05, 1.0, 0.5, 0.0), (0.95, 1.0, 0.5, 0.0), (0.2, 0.65, 0.8, 0.65)],
    'B': [(0.1, 0.0, 0.1, 1.0), (0.1, 0.0, 0.75, 0.0), (0.75, 0.0, 0.9, 0.15), (0.9, 0.15, 0.9, 0.35),
          (0.9, 0.35, 0.75, 0.5), (0.1, 0.5, 0.75, 0.5), (0.75, 0.5, 0.92, 0.65), (0.92, 0.65, 0.92, 0.85),
          (0.92, 0.85, 0.75, 1.0), (0.75, 1.0, 0.1, 1.0)],
    'C': [(0.9, 0.18, 0.7, 0.0), (0.7, 0.0, 0.3, 0.0), (0.3, 0.0, 0.1, 0.2), (0.1, 0.2, 0.1, 0.8),
          (0.1, 0.8, 0.3, 1.0), (0.3, 1.0, 0.7, 1.0), (0.7, 1.0, 0.9, 0.82)],
    'D': [(0.1, 0.0, 0.1, 1.0), (0.1, 0.0, 0.65, 0.0), (0.65, 0.0, 0.9, 0.22), (0.9, 0.22, 0.9, 0.78),
          (0.9, 0.78, 0.65, 1.0), (0.65, 1.0, 0.1, 1.0)],
    'E': [(0.1, 0.0, 0.1, 1.0), (0.1, 0.0, 0.9, 0.0), (0.1, 0.5, 0.75, 0.5), (0.1, 1.0, 0.9, 1.0)],
    'F': [(0.1, 0.0, 0.1, 1.0), (0.1, 0.0, 0.9, 0.0), (0.1, 0.5, 0.75, 0.5)],
    'G': [(0.9, 0.18, 0.7, 0.0), (0.7, 0.0, 0.3, 0.0), (0.3, 0.0, 0.1, 0.2), (0.1, 0.2, 0.1, 0.8),
          (0.1, 0.8, 0.3, 1.0), (0.3, 1.0, 0.75, 1.0), (0.75, 1.0, 0.9, 0.82), (0.9, 0.82, 0.9, 0.52),
          (0.55, 0.52, 0.9, 0.52)],
    'H': [(0.1, 0.0, 0.1, 1.0), (0.9, 0.0, 0.9, 1.0), (0.1, 0.5, 0.9, 0.5)],
    'I': [(0.2, 0.0, 0.8, 0.0), (0.5, 0.0, 0.5, 1.0), (0.2, 1.0, 0.8, 1.0)],
    'K': [(0.1, 0.0, 0.1, 1.0), (0.88, 0.0, 0.1, 0.52), (0.28, 0.4, 0.9, 1.0)],
    'L': [(0.12, 0.0, 0.12, 1.0), (0.12, 1.0, 0.9, 1.0)],
    'M': [(0.08, 1.0, 0.08, 0.0), (0.08, 0.0, 0.5, 0.55), (0.5, 0.55, 0.92, 0.0), (0.92, 0.0, 0.92, 1.0)],
    'N': [(0.1, 1.0, 0.1, 0.0), (0.1, 0.0, 0.9, 1.0), (0.9, 1.0, 0.9, 0.0)],
    'O': [(0.3, 0.0, 0.7, 0.0), (0.7, 0.0, 0.9, 0.2), (0.9, 0.2, 0.9, 0.8), (0.9, 0.8, 0.7, 1.0),
          (0.7, 1.0, 0.3, 1.0), (0.3, 1.0, 0.1, 0.8), (0.1, 0.8, 0.1, 0.2), (0.1, 0.2, 0.3, 0.0)],
    'P': [(0.1, 0.0, 0.1, 1.0), (0.1, 0.0, 0.72, 0.0), (0.72, 0.0, 0.9, 0.16), (0.9, 0.16, 0.9, 0.38),
          (0.9, 0.38, 0.72, 0.54), (0.72, 0.54, 0.1, 0.54)],
    'R': [(0.1, 0.0, 0.1, 1.0), (0.1, 0.0, 0.72, 0.0), (0.72, 0.0, 0.9, 0.16), (0.9, 0.16, 0.9, 0.38),
          (0.9, 0.38, 0.72, 0.52), (0.72, 0.52, 0.1, 0.52), (0.52, 0.52, 0.9, 1.0)],
    'S': [(0.88, 0.16, 0.7, 0.0), (0.7, 0.0, 0.28, 0.0), (0.28, 0.0, 0.1, 0.16), (0.1, 0.16, 0.1, 0.34),
          (0.1, 0.34, 0.28, 0.48), (0.28, 0.48, 0.72, 0.52), (0.72, 0.52, 0.9, 0.66), (0.9, 0.66, 0.9, 0.84),
          (0.9, 0.84, 0.72, 1.0), (0.72, 1.0, 0.28, 1.0), (0.28, 1.0, 0.1, 0.84)],
    'T': [(0.05, 0.0, 0.95, 0.0), (0.5, 0.0, 0.5, 1.0)],
    'U': [(0.1, 0.0, 0.1, 0.78), (0.1, 0.78, 0.3, 1.0), (0.3, 1.0, 0.7, 1.0), (0.7, 1.0, 0.9, 0.78),
          (0.9, 0.78, 0.9, 0.0)],
    'V': [(0.08, 0.0, 0.5, 1.0), (0.92, 0.0, 0.5, 1.0)],
    'W': [(0.05, 0.0, 0.26, 1.0), (0.26, 1.0, 0.5, 0.45), (0.5, 0.45, 0.74, 1.0), (0.74, 1.0, 0.95, 0.0)],
    'X': [(0.1, 0.0, 0.9, 1.0), (0.9, 0.0, 0.1, 1.0)],
    'Y': [(0.1, 0.0, 0.5, 0.5), (0.9, 0.0, 0.5, 0.5), (0.5, 0.5, 0.5, 1.0)],
    '1': [(0.25, 0.2, 0.55, 0.0), (0.55, 0.0, 0.55, 1.0), (0.2, 1.0, 0.85, 1.0)],
    '2': [(0.12, 0.22, 0.3, 0.0), (0.3, 0.0, 0.72, 0.0), (0.72, 0.0, 0.9, 0.2), (0.9, 0.2, 0.9, 0.38),
          (0.9, 0.38, 0.1, 1.0), (0.1, 1.0, 0.92, 1.0)],
    '3': [(0.12, 0.15, 0.3, 0.0), (0.3, 0.0, 0.72, 0.0), (0.72, 0.0, 0.88, 0.18), (0.88, 0.18, 0.88, 0.35),
          (0.88, 0.35, 0.68, 0.48), (0.4, 0.48, 0.68, 0.48), (0.68, 0.48, 0.9, 0.65), (0.9, 0.65, 0.9, 0.84),
          (0.9, 0.84, 0.72, 1.0), (0.72, 1.0, 0.28, 1.0), (0.28, 1.0, 0.1, 0.84)],
    '4': [(0.72, 0.0, 0.1, 0.68), (0.1, 0.68, 0.92, 0.68), (0.72, 0.0, 0.72, 1.0)],
    '5': [(0.88, 0.0, 0.15, 0.0), (0.15, 0.0, 0.12, 0.45), (0.12, 0.45, 0.7, 0.45), (0.7, 0.45, 0.9, 0.62),
          (0.9, 0.62, 0.9, 0.84), (0.9, 0.84, 0.7, 1.0), (0.7, 1.0, 0.25, 1.0), (0.25, 1.0, 0.1, 0.85)],
    '0': [(0.3, 0.0, 0.7, 0.0), (0.7, 0.0, 0.9, 0.2), (0.9, 0.2, 0.9, 0.8), (0.9, 0.8, 0.7, 1.0),
          (0.7, 1.0, 0.3, 1.0), (0.3, 1.0, 0.1, 0.8), (0.1, 0.8, 0.1, 0.2), (0.1, 0.2, 0.3, 0.0)],
    '$': [(0.85, 0.18, 0.7, 0.06), (0.7, 0.06, 0.3, 0.06), (0.3, 0.06, 0.15, 0.2), (0.15, 0.2, 0.15, 0.36),
          (0.15, 0.36, 0.3, 0.48), (0.3, 0.48, 0.7, 0.52), (0.7, 0.52, 0.85, 0.65), (0.85, 0.65, 0.85, 0.82),
          (0.85, 0.82, 0.7, 0.94), (0.7, 0.94, 0.3, 0.94), (0.3, 0.94, 0.15, 0.82), (0.5, 0.0, 0.5, 1.0)],
    '[': [(0.75, 0.0, 0.35, 0.0), (0.35, 0.0, 0.35, 1.0), (0.35, 1.0, 0.75, 1.0)],
    ']': [(0.25, 0.0, 0.65, 0.0), (0.65, 0.0, 0.65, 1.0), (0.65, 1.0, 0.25, 1.0)],
    '+': [(0.5, 0.2, 0.5, 0.8), (0.2, 0.5, 0.8, 0.5)],
    '/': [(0.8, 0.0, 0.2, 1.0)],
    ' ': []
}


def draw_vector_text(buf, w, h, text, cx, cy, char_w, char_h, stroke_w, color, letter_gap=None):
    """Draws smooth anti-aliased vector text centered at (cx, cy)."""
    text = text.upper()
    if letter_gap is None:
        letter_gap = char_w * 0.32
    total_w = len(text) * char_w + max(0, len(text) - 1) * letter_gap
    start_x = cx - total_w * 0.5
    start_y = cy - char_h * 0.5

    for idx, ch in enumerate(text):
        segs = VECTOR_GLYPHS.get(ch, [])
        ox = start_x + idx * (char_w + letter_gap)
        for x1, y1, x2, y2 in segs:
            draw_aa_segment(
                buf, w, h,
                ox + x1 * char_w, start_y + y1 * char_h,
                ox + x2 * char_w, start_y + y2 * char_h,
                stroke_w, color
            )


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


def generate_hd_button_png(filename, title, subtitle, accent_rgb):
    """Generates a crisp 256x192 (4x HD) anti-aliased toolbar button PNG."""
    w, h = 256, 192
    buf = bytearray(w * h * 4)
    ar, ag, ab = accent_rgb
    bg_r, bg_g, bg_b = (26, 22, 50)
    radius = 28.0
    border_t = 6.0

    for y in range(h):
        for x in range(w):
            dx = max(0.0, radius - x, x - (w - 1 - radius))
            dy = max(0.0, radius - y, y - (h - 1 - radius))
            dist = math.hypot(dx, dy)
            if dist <= radius + 1.0:
                cov = min(1.0, max(0.0, radius + 0.5 - dist))
                idx = (y * w + x) * 4
                edge_dist = min(x, w - 1 - x, y, h - 1 - y, radius - dist)
                is_header = (y < 26)
                if edge_dist <= border_t or is_header:
                    buf[idx] = ar
                    buf[idx + 1] = ag
                    buf[idx + 2] = ab
                    buf[idx + 3] = int(255 * cov)
                else:
                    # Subtle vertical gradient
                    grad = 1.0 - (y / float(h)) * 0.18
                    buf[idx] = int(bg_r * grad)
                    buf[idx + 1] = int(bg_g * grad)
                    buf[idx + 2] = int(bg_b * grad)
                    buf[idx + 3] = int(255 * cov)

    # Crisp anti-aliased vector title & subtitle
    title_char_w = 22.0 if len(title) <= 6 else 18.5
    draw_vector_text(
        buf, w, h, title,
        cx=w * 0.5, cy=84.0,
        char_w=title_char_w, char_h=34.0,
        stroke_w=5.2,
        color=(255, 255, 255, 255),
        letter_gap=title_char_w * 0.30
    )

    sub_char_w = 14.5 if len(subtitle) <= 8 else 12.5
    draw_vector_text(
        buf, w, h, subtitle,
        cx=w * 0.5, cy=146.0,
        char_w=sub_char_w, char_h=22.0,
        stroke_w=3.6,
        color=(ar, ag, ab, 255),
        letter_gap=sub_char_w * 0.28
    )

    write_png(os.path.join(ASSETS_DIR, filename), w, h, buf)
    print(f'Generated HD {filename} ({w}x{h})')


def generate_badge_repair():
    """Generates HD badge_repair.png (128x128) circular alert badge with anti-aliased wrench icon."""
    w, h = 128, 128
    buf = bytearray(w * h * 4)
    cx, cy = 63.5, 63.5
    draw_aa_circle(buf, w, h, cx, cy, 56.0, fill_color=(38, 18, 35, 255), stroke_color=(255, 90, 95, 255), stroke_w=10.0)
    # Wrench shaft & jaws
    draw_aa_segment(buf, w, h, 42, 86, 86, 42, 13.0, (255, 183, 3, 255))
    draw_aa_circle(buf, w, h, 86, 42, 16.0, fill_color=(255, 209, 102, 255))
    draw_aa_circle(buf, w, h, 92, 36, 8.0, fill_color=(38, 18, 35, 255))
    draw_aa_circle(buf, w, h, 42, 86, 14.0, fill_color=(255, 209, 102, 255))
    draw_aa_circle(buf, w, h, 36, 92, 7.0, fill_color=(38, 18, 35, 255))
    write_png(os.path.join(ASSETS_DIR, 'badge_repair.png'), w, h, buf)
    print('Generated HD badge_repair.png (128x128)')


def generate_badge_candle():
    """Generates HD badge_candle.png (128x128) circular badge with glowing candle icon."""
    w, h = 128, 128
    buf = bytearray(w * h * 4)
    cx, cy = 63.5, 63.5
    draw_aa_circle(buf, w, h, cx, cy, 56.0, fill_color=(28, 22, 48, 255), stroke_color=(255, 209, 102, 255), stroke_w=10.0)
    # Candle body
    draw_aa_segment(buf, w, h, 63.5, 68, 63.5, 98, 24.0, (248, 249, 250, 255))
    # Wick
    draw_aa_segment(buf, w, h, 63.5, 56, 63.5, 66, 4.0, (140, 148, 160, 255))
    # Flame outer & inner
    draw_aa_segment(buf, w, h, 63.5, 34, 63.5, 48, 16.0, (255, 159, 28, 255))
    draw_aa_segment(buf, w, h, 63.5, 38, 63.5, 48, 9.0, (255, 255, 220, 255))
    write_png(os.path.join(ASSETS_DIR, 'badge_candle.png'), w, h, buf)
    print('Generated HD badge_candle.png (128x128)')


def generate_day_night_icons():
    """Generates HD icon_day.png and icon_night.png (128x128)."""
    w, h = 128, 128
    cx, cy = 63.5, 63.5
    buf_day = bytearray(w * h * 4)
    for i in range(8):
        ang = i * (math.pi / 4.0)
        x1 = cx + math.cos(ang) * 38.0
        y1 = cy + math.sin(ang) * 38.0
        x2 = cx + math.cos(ang) * 54.0
        y2 = cy + math.sin(ang) * 54.0
        draw_aa_segment(buf_day, w, h, x1, y1, x2, y2, 7.5, (255, 183, 3, 255))
    draw_aa_circle(buf_day, w, h, cx, cy, 28.0, fill_color=(255, 209, 102, 255))
    write_png(os.path.join(ASSETS_DIR, 'icon_day.png'), w, h, buf_day)
    print('Generated HD icon_day.png (128x128)')

    buf_night = bytearray(w * h * 4)
    for y in range(h):
        for x in range(w):
            d1 = math.hypot(x - 58.0, y - 64.0)
            d2 = math.hypot(x - 76.0, y - 52.0)
            if d1 <= 40.0 and d2 >= 33.0:
                cov1 = min(1.0, max(0.0, 40.5 - d1))
                cov2 = min(1.0, max(0.0, d2 - 32.5))
                blend_pixel(buf_night, w, h, x, y, 144, 224, 239, cov1 * cov2)
    write_png(os.path.join(ASSETS_DIR, 'icon_night.png'), w, h, buf_night)
    print('Generated HD icon_night.png (128x128)')


def generate_logo_powater():
    """Generates HD logo_powater.png (128x128)."""
    w, h = 128, 128
    buf = bytearray(w * h * 4)
    draw_aa_circle(buf, w, h, 64, 64, 56.0, fill_color=(16, 28, 58, 255), stroke_color=(0, 180, 216, 255), stroke_w=8.0)
    # Lightning bolt
    draw_aa_segment(buf, w, h, 72, 26, 50, 66, 11.0, (255, 209, 102, 255))
    draw_aa_segment(buf, w, h, 50, 66, 74, 66, 11.0, (255, 209, 102, 255))
    draw_aa_segment(buf, w, h, 74, 66, 54, 104, 11.0, (0, 180, 216, 255))
    write_png(os.path.join(ASSETS_DIR, 'logo_powater.png'), w, h, buf)
    print('Generated HD logo_powater.png (128x128)')


def generate_toolbar_dock():
    """Generates toolbar_dock.png (820x56) rounded dock tray behind 10 evenly spaced buttons."""
    w, h = 820, 56
    buf = bytearray(w * h * 4)
    radius = 12.0
    for y in range(h):
        for x in range(w):
            dx = max(0.0, radius - x, x - (w - 1 - radius))
            dy = max(0.0, radius - y, y - (h - 1 - radius))
            dist = math.hypot(dx, dy)
            if dist <= radius + 1.0:
                cov = min(1.0, max(0.0, radius + 0.5 - dist))
                idx = (y * w + x) * 4
                is_border = (dist >= radius - 2.0) or (x < 2) or (x >= w - 2) or (y < 2) or (y >= h - 2)
                if is_border:
                    buf[idx:idx + 4] = bytes((72, 202, 228, int(190 * cov)))
                else:
                    buf[idx:idx + 4] = bytes((24, 20, 44, int(238 * cov)))
    write_png(os.path.join(ASSETS_DIR, 'toolbar_dock.png'), w, h, buf)
    print('Generated toolbar_dock.png (820x56)')


def generate_video_help_icon():
    """Generates HD icon_video_help.png (144x96, 4x HD of 36x24) clickable video tutorial badge."""
    w, h = 144, 96
    buf = bytearray(w * h * 4)
    radius = 22.0
    border_t = 5.0
    for y in range(h):
        for x in range(w):
            dx = max(0.0, radius - x, x - (w - 1 - radius))
            dy = max(0.0, radius - y, y - (h - 1 - radius))
            dist = math.hypot(dx, dy)
            if dist <= radius + 1.0:
                cov = min(1.0, max(0.0, radius + 0.5 - dist))
                idx = (y * w + x) * 4
                edge_dist = min(x, w - 1 - x, y, h - 1 - y, radius - dist)
                if edge_dist <= border_t:
                    buf[idx:idx + 4] = bytes((0, 180, 216, int(255 * cov)))
                else:
                    buf[idx:idx + 4] = bytes((20, 16, 42, int(245 * cov)))

    # Smooth anti-aliased Play triangle on left + "VID" label on right
    for py in range(24, 73):
        half_span = (24.0 - abs(py - 48.0)) * 1.15
        for px in range(32, 68):
            if px <= 34.0 + half_span:
                cov = min(1.0, max(0.0, (34.5 + half_span) - px))
                blend_pixel(buf, w, h, px, py, 255, 209, 102, cov)

    draw_vector_text(
        buf, w, h, 'VID',
        cx=96.0, cy=48.0,
        char_w=14.0, char_h=24.0,
        stroke_w=3.8,
        color=(144, 224, 239, 255),
        letter_gap=4.0
    )

    write_png(os.path.join(ASSETS_DIR, 'icon_video_help.png'), w, h, buf)
    print('Generated HD icon_video_help.png (144x96)')


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

    # 3. All 12 Toolbar Buttons in 4x HD (256x192) with Anti-Aliased Vector Typography
    all_buttons = [  # labels match the live toolbar (scripts/ui.js)
        ('btn_power.png', 'POWER', '[1] WIRE', (255, 183, 3)),
        ('btn_water.png', 'WATER', '[2] PIPE', (0, 180, 216)),
        ('btn_drain.png', 'DRAIN', '[3] SEWAGE', (157, 78, 221)),
        ('btn_delete.png', 'DELETE', '[X] WIRE', (173, 181, 189)),
        ('btn_filter.png', 'FILTER', '[4] $40', (6, 214, 160)),
        ('btn_repair.png', 'REPAIR', '[R] FIX', (255, 90, 95)),
        ('btn_special.png', 'TEST', '[I] LAB', (6, 214, 160)),
        ('btn_pause.png', 'PAUSE', '[SPACE]', (173, 181, 189)),
        ('btn_speed.png', 'SPEED', '1X 2X 4X', (173, 181, 189)),
        ('btn_upgrade.png', 'TECH', '[U] UPGRD', (255, 209, 102)),
        ('btn_guide.png', 'LEVELS', 'BRIEFING', (72, 202, 228))
    ]
    for fname, title, sub, col in all_buttons:
        generate_hd_button_png(fname, title, sub, col)

    # 4. HD Badges & Icons
    generate_badge_repair()
    generate_badge_candle()
    generate_day_night_icons()
    # logo_powater.png now comes from scripts/generate_story_assets.py (team logo)
    generate_toolbar_dock()
    generate_video_help_icon()
