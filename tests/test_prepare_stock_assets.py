#!/usr/bin/env python3
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from prepare_stock_assets import prepare

class TestPrepareSources(unittest.TestCase):
    def test_hash_refresh_without_images(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/"data.js").write_text("window.duLieuCongTy=[];",encoding="utf-8")
            (root/"History.js").write_text("window.materialHistory=[];",encoding="utf-8")
            (root/"Amount.js").write_text("window.amountData=[];",encoding="utf-8")
            old=prepare(root,images=False)
            script=(root/"checking-versions.js").read_text(encoding="utf-8")
            self.assertNotIn("duLieuCongTy",script)
            self.assertNotIn("materialHistory",script)
            self.assertEqual(old,prepare(root,images=False))
            (root/"Amount.js").write_text("window.amountData=[[1]];",encoding="utf-8")
            latest=prepare(root,images=False)
            self.assertNotEqual(old["amount"],latest["amount"])
            self.assertEqual(old["stock"],latest["stock"])

if __name__=="__main__":
    unittest.main()
