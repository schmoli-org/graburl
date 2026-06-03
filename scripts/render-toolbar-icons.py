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


def draw_rect(draw: ImageDraw.ImageDraw, rect: ET.Element, scale: float, *, fill=None) -> None:
    x = parse_length(rect.attrib.get("x", "0")) * scale
    y = parse_length(rect.attrib.get("y", "0")) * scale
    w = parse_length(rect.attrib["width"]) * scale
    h = parse_length(rect.attrib["height"]) * scale
    rx = parse_length(rect.attrib.get("rx", "0")) * scale

    if fill is not None:
        draw.rounded_rectangle((x, y, x + w, y + h), radius=rx, fill=fill)
        return

    stroke_width = parse_length(rect.attrib["stroke-width"]) * scale
    stroke = parse_color(rect.attrib["stroke"])
    draw.rounded_rectangle(
        (x, y, x + w, y + h),
        radius=rx,
        outline=stroke,
        width=max(1, round(stroke_width)),
    )


def render_mask(mask_element: ET.Element, scale: float, size: int) -> Image.Image:
    mask_image = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask_image)

    for child in mask_element:
        if child.tag.endswith("rect"):
            fill = child.attrib.get("fill", "#000000").strip()
            if fill == "white":
                gray = 255
            elif fill == "black":
                gray = 0
            else:
                gray = parse_color(fill)[0]
            draw_rect(mask_draw, child, scale, fill=gray)

    return mask_image


def render_group(group: ET.Element, scale: float, size: int, masks: dict[str, Image.Image]) -> tuple[Image.Image, Image.Image | None]:
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)

    for child in group:
        if child.tag.endswith("rect"):
            draw_rect(layer_draw, child, scale)

    mask_ref = group.attrib.get("mask")
    if mask_ref:
        mask_id = mask_ref.removeprefix("url(#").removesuffix(")")
        mask_image = masks.get(mask_id)
        if mask_image is None:
            raise ValueError(f"Missing SVG mask definition: {mask_id}")
        return layer, mask_image

    return layer, None


def render_icon(size: int) -> Image.Image:
    tree = ET.parse(SOURCE_SVG)
    root = tree.getroot()
    view_box = root.attrib["viewBox"].split()
    _, _, width, height = map(float, view_box)

    canvas_size = size * UPSCALE
    scale = canvas_size / width
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))

    masks = {}
    for mask in root.findall("{http://www.w3.org/2000/svg}defs/{http://www.w3.org/2000/svg}mask"):
        masks[mask.attrib["id"]] = render_mask(mask, scale, canvas_size)

    for child in root:
        if child.tag.endswith("defs"):
            continue
        if child.tag.endswith("rect"):
            layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
            draw_rect(ImageDraw.Draw(layer), child, scale)
            image.alpha_composite(layer)
        elif child.tag.endswith("g"):
            layer, mask_image = render_group(child, scale, canvas_size, masks)
            if mask_image is None:
                image.alpha_composite(layer)
            else:
                image.paste(layer, (0, 0), mask_image)

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
