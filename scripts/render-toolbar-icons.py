#!/usr/bin/env python3

import cairosvg
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_SVG = ROOT / "web" / "public" / "toolbar-icon.svg"
TARGET_DIRS = [
    ROOT / "web-extension" / "icons",
    ROOT / "GrabURL" / "GrabURL Extension" / "Resources" / "icons",
]
SIZES = [16, 32, 48, 128, 256, 512]


def main() -> None:
    if not SOURCE_SVG.exists():
        raise SystemExit(f"Missing source SVG: {SOURCE_SVG}")

    for target_dir in TARGET_DIRS:
        target_dir.mkdir(parents=True, exist_ok=True)
        for size in SIZES:
            cairosvg.svg2png(
                url=str(SOURCE_SVG),
                write_to=str(target_dir / f"icon-{size}.png"),
                output_width=size,
                output_height=size,
            )
            print(f"  {target_dir.name}/icon-{size}.png")


if __name__ == "__main__":
    main()
