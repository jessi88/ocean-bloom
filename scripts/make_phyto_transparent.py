from pathlib import Path

import numpy as np
from PIL import Image


ASSET_GROUPS = [
    {
        "name": "phytoplankton",
        "input_dir": Path("src/assets/phytoplankton"),
        "output_dir": Path("src/assets/phytoplankton/transparent"),
        "corner_size": 40,
        "fade_start": 8,
        "fade_range": 34,
        "darkness_boost": 1.15,
        "saturation_boost": 0.0,
    },
    {
        "name": "act3",
        "input_dir": Path("src/assets/act3"),
        "output_dir": Path("src/assets/act3/transparent"),
        "corner_size": 60,
        "fade_start": 7,
        "fade_range": 38,
        "darkness_boost": 1.2,
        "saturation_boost": 0.55,
    },
    {
        "name": "act4",
        "input_dir": Path("src/assets/act4"),
        "output_dir": Path("src/assets/act4/transparent"),
        "corner_size": 80,
        "fade_start": 6,
        "fade_range": 42,
        "darkness_boost": 1.25,
        "saturation_boost": 0.55,
    },
]


def remove_paper_background(
    path: Path,
    output_dir: Path,
    corner_size: int,
    fade_start: float,
    fade_range: float,
    darkness_boost: float,
    saturation_boost: float,
):
    img = Image.open(path).convert("RGBA")
    arr = np.array(img).astype(np.float32)

    rgb = arr[:, :, :3]
    height, width = rgb.shape[:2]

    safe_corner = min(corner_size, height // 4, width // 4)

    # Estimate the paper/background color from the corners.
    corner_samples = np.concatenate(
        [
            rgb[:safe_corner, :safe_corner].reshape(-1, 3),
            rgb[:safe_corner, -safe_corner:].reshape(-1, 3),
            rgb[-safe_corner:, :safe_corner].reshape(-1, 3),
            rgb[-safe_corner:, -safe_corner:].reshape(-1, 3),
        ]
    )

    paper = np.median(corner_samples, axis=0)

    # Distance from paper background.
    dist = np.linalg.norm(rgb - paper, axis=2)

    # Soft alpha: remove paper, preserve watercolor and ink.
    alpha = np.clip((dist - fade_start) / fade_range, 0, 1)

    # Preserve darker linework and text.
    darkness = 1 - (rgb.mean(axis=2) / 255)
    alpha = np.maximum(alpha, darkness * darkness_boost)

    # Preserve green/cyan saturated details.
    if saturation_boost > 0:
        saturation_signal = (
            np.abs(rgb[:, :, 1] - rgb[:, :, 0])
            + np.abs(rgb[:, :, 1] - rgb[:, :, 2])
        ) / 255
        alpha = np.maximum(alpha, saturation_signal * saturation_boost)

    alpha = np.clip(alpha, 0, 1)

    arr[:, :, 3] = alpha * 255

    output_dir.mkdir(parents=True, exist_ok=True)

    out = Image.fromarray(arr.astype(np.uint8), "RGBA")
    out.save(output_dir / path.name)


for group in ASSET_GROUPS:
    input_dir = group["input_dir"]
    output_dir = group["output_dir"]

    if not input_dir.exists():
        print(f"Skipped missing folder: {input_dir}")
        continue

    for file in input_dir.glob("*.png"):
        if file.parent.name == "transparent":
            continue

        remove_paper_background(
            path=file,
            output_dir=output_dir,
            corner_size=group["corner_size"],
            fade_start=group["fade_start"],
            fade_range=group["fade_range"],
            darkness_boost=group["darkness_boost"],
            saturation_boost=group["saturation_boost"],
        )

    print(f"Transparent {group['name']} images saved to {output_dir}")