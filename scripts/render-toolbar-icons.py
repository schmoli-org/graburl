#!/usr/bin/env python3

from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_SVG = ROOT / "outputs" / "copy-toolbar-icon-v2.svg"
TARGET_DIRS = [
    ROOT / "web-extension" / "icons",
    ROOT / "Safari Copy URL" / "Safari Copy URL Extension" / "Resources" / "icons",
]
SIZES = [16, 32, 48, 128, 256, 512]
UPSCALE = 8


def parse_length(value: str) -> float:
    return float(value.rstrip("px"))


def parse_color(value: str) -> tuple[int, int, int, int]:
    value = value.strip()
    if not value.startswith("#") or len(value) != 7:
        raise ValueError(f"Unsupported color value: {value}")
    red = int(value[1:3], 16)
    green = int(value[3:5], 16)
    blue = int(value[5:7], 16)
    return red, green, blue, 255


def render_icon(size: int) -> Image.Image:
    tree = ET.parse(SOURCE_SVG)
    root = tree.getroot()
    view_box = root.attrib["viewBox"].split()
    _, _, width, height = map(float, view_box)

    canvas_size = size * UPSCALE
    scale = canvas_size / width
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    for rect in root.findall("{http://www.w3.org/2000/svg}rect"):
        x = parse_length(rect.attrib["x"]) * scale
        y = parse_length(rect.attrib["y"]) * scale
        w = parse_length(rect.attrib["width"]) * scale
        h = parse_length(rect.attrib["height"]) * scale
        rx = parse_length(rect.attrib["rx"]) * scale
        stroke_width = parse_length(rect.attrib["stroke-width"]) * scale
        stroke = parse_color(rect.attrib["stroke"])
        draw.rounded_rectangle(
            (x, y, x + w, y + h),
            radius=rx,
            outline=stroke,
            width=max(1, round(stroke_width)),
        )

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    if not SOURCE_SVG.exists():
        raise SystemExit(f"Missing source SVG: {SOURCE_SVG}")

    for target_dir in TARGET_DIRS:
        target_dir.mkdir(parents=True, exist_ok=True)
        for size in SIZES:
            icon = render_icon(size)
            icon.save(target_dir / f"icon-{size}.png")


if __name__ == "__main__":
    main()
