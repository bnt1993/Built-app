#!/usr/bin/env python3
"""Generate versioned WebP previews and a SAP image manifest beside Material images."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from PIL import Image, ImageOps

NAME = re.compile(r"^([A-Za-z0-9.-]+?)(?:_(\d+))?\.(jpg|jpeg|png|webp)$", re.I)

def build(folder):
    folder = Path(folder)
    originals = sorted(p for p in folder.iterdir()
                       if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if not originals:
        raise ValueError("No source images in Material; existing manifests were not changed.")
    entries, skipped = {}, []
    for source in originals:
        match = NAME.fullmatch(source.name)
        if not match or source.stem.upper().startswith("IMG_"):
            skipped.append(source.name)
            continue
        sap = match[1]
        with Image.open(source) as opened:
            photo = ImageOps.exif_transpose(opened)
            photo = photo.convert("RGBA" if "A" in photo.getbands() or "transparency" in photo.info else "RGB")
            digest = hashlib.sha256(source.read_bytes()+b"webp-v1-160-960-q82").hexdigest()[:16]
            variants = {}
            for kind, size in (("thumb", 160), ("preview", 960)):
                relative = Path("_optimized") / (source.stem+"-"+digest+"-"+kind+".webp")
                target = folder / relative
                if not target.exists():
                    target.parent.mkdir(exist_ok=True)
                    resized = photo.copy()
                    resized.thumbnail((size, size), Image.Resampling.LANCZOS)
                    temp = target.with_suffix(".tmp")
                    resized.save(temp, format="WEBP", quality=82, method=6)
                    temp.replace(target)
                variants[kind] = relative.as_posix()
        entries.setdefault(sap, []).append({"original": source.name, **variants})
    if not entries:
        raise ValueError("No SAP-named images. Rename IMG_* using the actual SAP mapping first.")
    for images in entries.values():
        images.sort(key=lambda item: [int(t) if t.isdigit() else t.lower()
                    for t in re.split(r"(\d+)", item["original"])])
    manifest = {"version": 2, "complete": not skipped, "materials": entries}
    payload = json.dumps(manifest, ensure_ascii=True, separators=(",", ":"))
    for name, content in (("manifest.json", payload+"\n"),
                          ("manifest.js", "window.MaterialImageManifest="+payload+";\n")):
        target = folder / name
        temp = target.with_suffix(target.suffix+".tmp")
        temp.write_text(content, encoding="utf-8")
        temp.replace(target)
    return sum(map(len, entries.values())), skipped

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--material", type=Path, default=Path("Material"))
    args = parser.parse_args()
    try:
        count, skipped = build(args.material)
    except (ValueError, OSError) as exc:
        parser.exit(1, str(exc)+"\n")
    print(f"Prepared {count} images; original files preserved.")
    if skipped:
        print("Unmapped names skipped (fallback scanning retained): "+", ".join(skipped))
