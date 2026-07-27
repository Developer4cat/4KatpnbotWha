from PIL import Image, ImageSequence

SCALE = 2

im = Image.open("./temp/w.webp")
frames = []
durations = []

if not getattr(im, "is_animated", False) and getattr(im, "n_frames", 1) <= 1:
    raise SystemExit("El sticker no está animado.")

for frame in ImageSequence.Iterator(im):
    frame_rgba = frame.convert("RGBA")
    if SCALE > 1:
        frame_rgba = frame_rgba.resize(
            (frame_rgba.width * SCALE, frame_rgba.height * SCALE),
            resample=Image.LANCZOS,
        )
    frames.append(frame_rgba)
    durations.append(frame.info.get("duration", 100))

frames[0].save(
    "./temp/w.gif",
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    loop=0,
    disposal=2,
)
