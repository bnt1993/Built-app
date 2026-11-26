import json
import sys
from pathlib import Path
from openpyxl import load_workbook

source = Path(sys.argv[1]) if len(sys.argv)>1 else Path("lx02_20261125.XLSX")
sheet = load_workbook(source, read_only=True, data_only=True).active
rows = iter(sheet.values)
headers = next(rows)
required = ["Material","Material Description","Storage Bin","Available stock","Base Unit of Measure"]
if not all(k in headers for k in required):
    raise ValueError("Missing LX02 columns")
data = []
for row in rows:
    record = dict(zip(headers,row))
    if record.get("Material") is None:
        continue
    data.append({k:record.get(k) for k in required})
Path("LX02.js").write_text("globalThis.LX02 = "+json.dumps(data,ensure_ascii=True,allow_nan=False)+";\n",encoding="utf-8")
print(f"Converted {len(data)} rows")
