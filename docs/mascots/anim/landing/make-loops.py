#!/usr/bin/env python3
"""Subtle looping mascot assets from rest plates."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
SESS = Path(
    "/Users/johnny/.grok/sessions/%2FUsers%2Fjohnny%2Fprojects%2Fgithub.com%2Fechohello-dev%2Fsupaplane/01a07bb5-024a-79a2-9fda-6c03530caebc/images"
)

N = 16
DURATION_MS = 180  # 16 * 180ms ≈ 2.9s cycle


def load_jpg(name: str) -> Image.Image:
    return Image.open(SESS / name).convert("RGB")


def cover_mark(im: Image.Image) -> Image.Image:
    im = im.copy()
    w, h = im.size
    bg = im.getpixel((24, 24))
    draw = ImageDraw.Draw(im)
    draw.rectangle((w - 260, h - 78, w, h), fill=bg)
    return im


def breathe(im: Image.Image, n: int = N, amp: float = 0.016) -> list[Image.Image]:
    w, h = im.size
    bg = im.getpixel((12, 12))
    frames: list[Image.Image] = []
    for i in range(n):
        t = (i / n) * 2 * math.pi
        scale_y = 1.0 + amp * math.sin(t)
        new_h = max(1, int(round(h * scale_y)))
        scaled = im.resize((w, new_h), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (w, h), bg)
        canvas.paste(scaled, (0, h - new_h))
        frames.append(canvas)
    return frames


def sway(im: Image.Image, n: int = N, deg: float = 1.6) -> list[Image.Image]:
    w, h = im.size
    bg = im.getpixel((12, 12))
    pivot = (w / 2, h * 0.92)
    frames: list[Image.Image] = []
    for i in range(n):
        t = (i / n) * 2 * math.pi
        angle = deg * math.sin(t)
        rot = im.rotate(
            angle,
            resample=Image.Resampling.BICUBIC,
            center=pivot,
            fillcolor=bg,
        )
        frames.append(rot)
    return frames


def sway_breathe(im: Image.Image, n: int = N) -> list[Image.Image]:
    w, h = im.size
    bg = im.getpixel((12, 12))
    pivot = (w / 2, h * 0.90)
    frames: list[Image.Image] = []
    for i in range(n):
        t = (i / n) * 2 * math.pi
        scale_y = 1.0 + 0.012 * math.sin(t)
        angle = 1.8 * math.sin(t + 0.4)
        new_h = max(1, int(round(h * scale_y)))
        scaled = im.resize((w, new_h), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (w, h), bg)
        canvas.paste(scaled, (0, h - new_h))
        rot = canvas.rotate(
            angle,
            resample=Image.Resampling.BICUBIC,
            center=pivot,
            fillcolor=bg,
        )
        frames.append(rot)
    return frames


def walk_bob(rest: Image.Image, step: Image.Image, n: int = N) -> list[Image.Image]:
    w, h = rest.size
    step = step.resize((w, h), Image.Resampling.LANCZOS)
    bg = rest.getpixel((12, 12))
    frames: list[Image.Image] = []
    for i in range(n):
        t = (i / n) * 2 * math.pi
        # blend rest/step on a square wave with short crossfade
        phase = (i / n) % 1.0
        if phase < 0.08:
            alpha = phase / 0.08
            src = Image.blend(rest, step, alpha)
        elif phase < 0.50:
            src = step
        elif phase < 0.58:
            alpha = (phase - 0.50) / 0.08
            src = Image.blend(step, rest, alpha)
        else:
            src = rest
        scale_y = 1.0 + 0.010 * math.sin(t * 2)
        new_h = max(1, int(round(h * scale_y)))
        scaled = src.resize((w, new_h), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (w, h), bg)
        canvas.paste(scaled, (0, h - new_h))
        frames.append(canvas)
    return frames


def save_gif(frames: list[Image.Image], path: Path) -> None:
    quantized = [f.convert("P", palette=Image.Palette.ADAPTIVE, colors=64) for f in frames]
    quantized[0].save(
        path,
        save_all=True,
        append_images=quantized[1:],
        duration=DURATION_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )


def save_webp(frames: list[Image.Image], path: Path) -> None:
    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=DURATION_MS,
        loop=0,
        lossless=False,
        quality=82,
        method=4,
    )


def save_mp4(frames: list[Image.Image], path: Path) -> None:
    tmp = path.with_suffix(".frames")
    tmp.mkdir(exist_ok=True)
    for i, f in enumerate(frames):
        f.save(tmp / f"{i:03d}.png")
    import subprocess

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-framerate",
            str(1000 / DURATION_MS),
            "-i",
            str(tmp / "%03d.png"),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-crf",
            "18",
            str(path),
        ],
        check=True,
        capture_output=True,
    )
    for p in tmp.iterdir():
        p.unlink()
    tmp.rmdir()


def main() -> None:
    FRAMES.mkdir(parents=True, exist_ok=True)

    standing = cover_mark(load_jpg("4.jpg"))
    waiting = cover_mark(load_jpg("5.jpg"))
    moving = cover_mark(load_jpg("6.jpg"))
    moving_step = cover_mark(load_jpg("12.jpg"))
    capsule = cover_mark(load_jpg("3.jpg"))
    square = cover_mark(load_jpg("1.jpg"))
    family = cover_mark(load_jpg("2.jpg"))

    jobs: list[tuple[str, list[Image.Image]]] = [
        ("crowd-standing", breathe(standing, amp=0.014)),
        ("crowd-waiting", sway_breathe(waiting)),
        ("crowd-moving", walk_bob(moving, moving_step)),
        ("capsule-breathe", breathe(capsule, amp=0.022)),
        ("square-sway", sway(square, deg=2.4)),
        ("family-breathe", breathe(family, amp=0.018)),
    ]

    for name, frames in jobs:
        still = frames[0]
        still.save(FRAMES / f"{name}-00.png")
        save_gif(frames, ROOT / f"{name}.gif")
        save_webp(frames, ROOT / f"{name}.webp")
        save_mp4(frames, ROOT / f"{name}.mp4")
        print(name, frames[0].size, "gif/webp/mp4")


if __name__ == "__main__":
    main()
