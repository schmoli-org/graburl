#!/usr/bin/env python3

import re

import cairosvg
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_SVG = ROOT / "web" / "public" / "toolbar-icon.svg"
TARGET_DIRS = [
    ROOT / "web-extension" / "icons",
    ROOT / "GrabURL" / "GrabURL Extension" / "Resources" / "icons",
]
SIZES = [16, 32, 48, 128, 256, 512]

# macOS app icon (Xcode asset catalog). Artwork is inset to Apple's HIG grid:
# the rounded rect occupies 824/1024 of the canvas, centered, with transparent margins.
APPICON_DIR = ROOT / "GrabURL" / "GrabURL" / "Assets.xcassets" / "AppIcon.appiconset"
APPICON_SIZES = [16, 32, 64, 128, 256, 512, 1024]
CANVAS = 1024
ARTWORK = 824

# In-app artwork (edge-to-edge, same rendering as the toolbar icon).
LARGEICON_DIR = ROOT / "GrabURL" / "GrabURL" / "Assets.xcassets" / "LargeIcon.imageset"
LARGEICON_FILES = {
    "large-icon.png": 128,
    "large-icon@2x.png": 256,
    "large-icon@3x.png": 384,
}
RESOURCES_ICON = ROOT / "GrabURL" / "GrabURL" / "Resources" / "Icon.png"


def build_inset_svg(source: Path) -> bytes:
    """Wrap the toolbar SVG in a larger transparent canvas per the macOS icon grid."""
    svg = source.read_text()
    match = re.search(r"<svg[^>]*viewBox=\"0 0 (\d+) (\d+)\"[^>]*>(.*)</svg>", svg, re.DOTALL)
    if not match:
        raise SystemExit(f"Could not parse {source}")
    width, height, inner = match.groups()
    if width != height:
        raise SystemExit(f"Expected square viewBox in {source}, got {width}x{height}")
    scale = ARTWORK / int(width)
    offset = (CANVAS - ARTWORK) / 2
    wrapper = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}" fill="none">'
        f'<g transform="translate({offset} {offset}) scale({scale})">{inner}</g>'
        f"</svg>"
    )
    return wrapper.encode()


def render(svg_bytes: bytes, target: Path, size: int) -> None:
    cairosvg.svg2png(
        bytestring=svg_bytes,
        write_to=str(target),
        output_width=size,
        output_height=size,
    )
    print(f"  {target.parent.name}/{target.name}")


def main() -> None:
    if not SOURCE_SVG.exists():
        raise SystemExit(f"Missing source SVG: {SOURCE_SVG}")

    edge_to_edge = SOURCE_SVG.read_bytes()
    for target_dir in TARGET_DIRS:
        target_dir.mkdir(parents=True, exist_ok=True)
        for size in SIZES:
            render(edge_to_edge, target_dir / f"icon-{size}.png", size)

    inset = build_inset_svg(SOURCE_SVG)
    for size in APPICON_SIZES:
        render(inset, APPICON_DIR / f"icon-{size}.png", size)

    for name, size in LARGEICON_FILES.items():
        render(edge_to_edge, LARGEICON_DIR / name, size)
    render(edge_to_edge, RESOURCES_ICON, 384)


if __name__ == "__main__":
    main()
