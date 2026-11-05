import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from PIL import Image
spec=importlib.util.spec_from_file_location("build_images",Path(__file__).resolve().parents[1]/"scripts/build_material_images.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class ImageBuildTests(unittest.TestCase):
    def test_versions_sizes_and_originals(self):
        with tempfile.TemporaryDirectory() as root:
            folder=Path(root)
            source=folder/"00123_01.JPG"
            Image.new("RGB",(1600,1200),"red").save(source)
            original=source.read_bytes()
            self.assertEqual(mod.build(folder),(1,[]))
            data=json.loads((folder/"manifest.json").read_text())
            self.assertTrue(data["complete"])
            entry=data["materials"]["00123"][0]
            for key,size in (("thumb",160),("preview",960)):
                with Image.open(folder/entry[key]) as img:self.assertLessEqual(max(img.size),size)
            self.assertEqual(source.read_bytes(),original)
            self.assertEqual(mod.build(folder),(1,[]))
            Image.new("RGB",(1600,1200),"blue").save(source)
            mod.build(folder)
            changed=json.loads((folder/"manifest.json").read_text())["materials"]["00123"][0]
            self.assertNotEqual(entry["preview"],changed["preview"])

    def test_unmapped_or_empty_does_not_hide_images(self):
        with tempfile.TemporaryDirectory() as root:
            folder=Path(root)
            with self.assertRaises(ValueError):mod.build(folder)
            self.assertFalse((folder/"manifest.json").exists())
            Image.new("RGB",(20,20)).save(folder/"IMG_1234.JPG")
            with self.assertRaises(ValueError):mod.build(folder)
            Image.new("RGB",(20,20)).save(folder/"SAP01.png")
            mod.build(folder)
            self.assertFalse(json.loads((folder/"manifest.json").read_text())["complete"])

if __name__=="__main__":unittest.main()
