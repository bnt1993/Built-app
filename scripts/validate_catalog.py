#!/usr/bin/env python3
"""Validate generated Database arrays before replacing the deployed catalog."""
import argparse
import json
import re
from pathlib import Path


def validate(source):
    arrays = {}
    for name in ("DATABASE_HEADERS", "DATABASE_DATA"):
        match = re.search(r"\b(?:window\.)?" + name + r"\s*=\s*", source)
        if not match:
            raise ValueError("Missing " + name)
        try:
            value, _ = json.JSONDecoder().raw_decode(source, match.end())
        except json.JSONDecodeError as error:
            raise ValueError(f"{name}: incomplete/invalid JSON near line {error.lineno}") from error
        if not isinstance(value, list):
            raise ValueError(name + " must be an array")
        arrays[name] = value
    headers, rows = arrays["DATABASE_HEADERS"], arrays["DATABASE_DATA"]
    if not {"material", "material description"}.issubset({str(x).strip().lower() for x in headers}):
        raise ValueError("Missing Material / Material Description")
    for number, row in enumerate(rows, 1):
        if not isinstance(row, list) or len(row) != len(headers):
            raise ValueError(f"Row {number}: expected {len(headers)} columns")
    return len(rows)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    args = parser.parse_args()
    try:
        count = validate(args.file.read_text(encoding="utf-8-sig"))
    except (ValueError, OSError) as error:
        parser.exit(1, str(error) + "\n")
    print(f"Valid Database: {count} rows")
