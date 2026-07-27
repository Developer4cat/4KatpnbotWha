#!/usr/bin/env python3
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

META_PATH = Path("./temp/pic_meta.json")

PADDING = 28
AVATAR_SIZE = 52
AVATAR_GAP = 14
BUBBLE_MAX_WIDTH = 560
BUBBLE_MIN_WIDTH = 80
BUBBLE_PADDING_X = 14
BUBBLE_PADDING_Y = 10
LINE_SPACING = 6
NAME_GAP = 8
CANVAS_MAX_WIDTH = 900

BG_COLOR = "#ECE5DD"
BUBBLE_COLOR = "#FFFFFF"
NAME_COLOR = "#128C7E"
TEXT_COLOR = "#111B21"
AVATAR_FALLBACK = "#8696A0"
AVATAR_TEXT = "#FFFFFF"


def load_font(size, bold=False):
    candidates = []
    if sys.platform == "win32":
        name = "segoeuib.ttf" if bold else "segoeui.ttf"
        candidates.append(Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts" / name)
    else:
        candidates.extend([
            Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
            Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        ])
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def wrap_text(text, font, max_width, draw):
    lines = []
    for paragraph in str(text).split("\n"):
        words = paragraph.split(" ") if paragraph else [""]
        current = ""
        for word in words:
            candidate = word if not current else f"{current} {word}"
            width = draw.textbbox((0, 0), candidate, font=font)[2]
            if width <= max_width:
                current = candidate
            else:
                if current:
                    lines.append(current)
                current = word
        lines.append(current or "")
    return lines


def load_avatar(path, size):
    draw_size = (size, size)
    if path and Path(path).exists():
        avatar = Image.open(path).convert("RGBA")
        avatar = avatar.resize(draw_size, Image.LANCZOS)
        mask = Image.new("L", draw_size, 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
        avatar.putalpha(mask)
        return avatar

    fallback = Image.new("RGBA", draw_size, AVATAR_FALLBACK)
    mask = Image.new("L", draw_size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size, size), fill=255)
    fallback.putalpha(mask)
    return fallback


def draw_initial_avatar(draw, name, size, offset):
    x, y = offset
    initial = (name or "?").strip()[:1].upper() or "?"
    font = load_font(int(size * 0.45), bold=True)
    bbox = draw.textbbox((0, 0), initial, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(
        (x + (size - tw) / 2, y + (size - th) / 2 - bbox[1]),
        initial,
        font=font,
        fill=AVATAR_TEXT,
    )


def measure_text_width(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


def build_image(meta):
    name = meta.get("name") or "Contacto"
    message = meta.get("message") or ""
    avatar_path = meta.get("avatar")

    name_font = load_font(22, bold=True)
    text_font = load_font(24)
    temp = Image.new("RGB", (CANVAS_MAX_WIDTH, 200), BG_COLOR)
    temp_draw = ImageDraw.Draw(temp)

    text_max_width = BUBBLE_MAX_WIDTH - (BUBBLE_PADDING_X * 2)
    lines = wrap_text(message, text_font, text_max_width, temp_draw)
    if not lines:
        lines = [""]

    line_heights = []
    line_widths = []
    for line in lines:
        bbox = temp_draw.textbbox((0, 0), line, font=text_font)
        line_heights.append(bbox[3] - bbox[1])
        line_widths.append(bbox[2] - bbox[0])

    name_bbox = temp_draw.textbbox((0, 0), name, font=name_font)
    name_height = name_bbox[3] - name_bbox[1]
    name_width = measure_text_width(temp_draw, name, name_font)

    bubble_content_width = max(line_widths) if line_widths else 0
    bubble_width = min(
        BUBBLE_MAX_WIDTH,
        max(BUBBLE_MIN_WIDTH, bubble_content_width + (BUBBLE_PADDING_X * 2)),
    )

    content_width = max(name_width, bubble_width)
    canvas_width = min(
        CANVAS_MAX_WIDTH,
        PADDING + AVATAR_SIZE + AVATAR_GAP + content_width + PADDING,
    )

    bubble_height = (BUBBLE_PADDING_Y * 2) + sum(line_heights) + (LINE_SPACING * max(0, len(lines) - 1))
    content_height = max(AVATAR_SIZE, name_height + NAME_GAP + bubble_height)
    canvas_height = (PADDING * 2) + content_height

    canvas = Image.new("RGB", (canvas_width, canvas_height), BG_COLOR)
    draw = ImageDraw.Draw(canvas)

    avatar_x = PADDING
    avatar_y = PADDING + max(0, (content_height - AVATAR_SIZE) // 2)
    avatar = load_avatar(avatar_path, AVATAR_SIZE)
    canvas.paste(avatar, (avatar_x, avatar_y), avatar)
    if not avatar_path or not Path(avatar_path).exists():
        draw_initial_avatar(draw, name, AVATAR_SIZE, (avatar_x, avatar_y))

    content_x = avatar_x + AVATAR_SIZE + AVATAR_GAP
    name_y = PADDING
    draw.text((content_x, name_y), name, font=name_font, fill=NAME_COLOR)

    bubble_x = content_x
    bubble_y = name_y + name_height + NAME_GAP
    draw.rounded_rectangle(
        (bubble_x, bubble_y, bubble_x + bubble_width, bubble_y + bubble_height),
        radius=14,
        fill=BUBBLE_COLOR,
    )

    text_y = bubble_y + BUBBLE_PADDING_Y
    for line, height in zip(lines, line_heights):
        draw.text((bubble_x + BUBBLE_PADDING_X, text_y), line, font=text_font, fill=TEXT_COLOR)
        text_y += height + LINE_SPACING

    return canvas


def main():
    if not META_PATH.exists():
        raise SystemExit(f"No se encontró {META_PATH}")

    meta = json.loads(META_PATH.read_text(encoding="utf-8-sig"))
    output = Path(meta.get("output") or "./temp/pic_out.png")
    output.parent.mkdir(parents=True, exist_ok=True)

    image = build_image(meta)
    image.save(output, "PNG")
    print(str(output))


if __name__ == "__main__":
    main()
