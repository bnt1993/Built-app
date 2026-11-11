#!/usr/bin/env python3
"""Build optional fast refresh metadata + optimized thumbnails for Checking.

Usage:
    python -m pip install -r scripts/requirements-images.txt
    python scripts/prepare_stock_assets.py --root "path/to/warehouse"

The root contains Checking.html, data.js, History.js, Amount.js, Material/.
Never uploads the original SAP data; writes files only on the local machine.
"""
import argparse
import hashlib
import json
from pathlib import Path

def signature(path):
    digest=hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda:stream.read(1024*1024), b""):
            digest.update(chunk)
    return digest.hexdigest()[:20]

def prepare(root, images=True):
    root=Path(root)
    if not root.exists():
        raise FileNotFoundError(root)
    keys={"stock":"data.js","history":"History.js","amount":"Amount.js"}
    versions={key:signature(root/name) if (root/name).is_file() else None
              for key,name in keys.items()}
    if images:
        material=root/"Material"
        if material.is_dir():
            try:
                from build_material_images import build
                count,skipped=build(material)
                print("Optimized", count, "images in", material)
                if skipped:
                    print("Not mapped to SAP code:", ", ".join(skipped))
            except ValueError as exc:
                print("Images not generated:",exc)
        else:
            print("Material folder missing; place image files in Material/ and rerun.")
    manifest=root/"Material"/"manifest.json"
    versions["images"]=signature(manifest) if manifest.is_file() else None
    # Publish metadata only after image variants and manifests are complete.
    path=root/"checking-versions.js"
    temporary=path.with_suffix(".js.tmp")
    temporary.write_text(
        "window.checkingSourceVersions = "+
        json.dumps(versions,ensure_ascii=True,separators=(",",":"))+";\n",
        encoding="utf-8")
    temporary.replace(path)
    print("Wrote", path, "- versions:", ", ".join(
        f"{key}={'found' if value else 'missing'}" for key,value in versions.items()))
    return versions

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root",type=Path,default=Path("."))
    parser.add_argument("--no-images",action="store_true")
    args=parser.parse_args()
    prepare(args.root,images=not args.no_images)
