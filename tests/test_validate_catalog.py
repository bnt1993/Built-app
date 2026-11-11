import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from validate_catalog import validate


class CatalogValidationTests(unittest.TestCase):
    def test_valid_generated_export(self):
        self.assertEqual(validate('const DATABASE_HEADERS=["Material","Material Description"];'
                                  'const DATABASE_DATA=[["001","Motor"]];'), 1)

    def test_truncated_export(self):
        with self.assertRaisesRegex(ValueError, "incomplete/invalid"):
            validate('const DATABASE_HEADERS=["Material","Material Description"];'
                     'const DATABASE_DATA=[["001","Motor')

    def test_misaligned_rows(self):
        with self.assertRaisesRegex(ValueError, "Row 1"):
            validate('const DATABASE_HEADERS=["Material","Material Description"];'
                     'const DATABASE_DATA=[["001"]];')


if __name__ == "__main__":
    unittest.main()
