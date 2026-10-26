# Comprehensive Architecture & Investigation Report: Python Utility Service
**Service Target**: `Mm-Mp/services/python`  
**Milestone**: Milestone 2 (Backend Microservices & Rust WASM Core)  
**Author**: Explorer M2-2 (Python Utility Service Architect)  
**Date**: 2026-10-20  

---

## 1. Executive Summary

The Python Utility Service for `Mm-Mp` operates as a dedicated microservice on port `5001` (configurable via `PYTHON_PORT` or `PORT`). It fulfills two critical platform capabilities defined in `PROJECT.md` (§ Architecture & § Interface Contracts):
1. **Amharic Fidel Normalization (`/api/v1/normalize-amharic`)**: High-performance, single-pass linguistic normalization that folds Ethiopic homophone families (ሐ/ኀ -> ሀ, ሠ -> ሰ, ዐ -> አ, ፀ -> ጸ across all 7 vowel orders), maps traditional wordspace (`፡`) to space, converts traditional punctuation (`፣`, `፤`, `።`) to standard ASCII equivalents, and strictly preserves Ethiopic numerals (`፩`–`፼`), Unicode emojis, and bilingual Latin strings.
2. **Menu Import & Export Engine (`/api/v1/menu/import` & `/api/v1/menu/export`)**: Universal menu ingest supporting JSON payloads and multipart file uploads (CSV, Excel `.xlsx`, JSON), converting all monetary amounts accurately to integer Ethiopian Birr cents (`price_etb_cents`), automatically normalizing dish and section names, and exporting structured menu drafts with `Content-Disposition: attachment` headers and multi-format support.

---

## 2. Environment Telemetry & Package Strategy

### 2.1 Host Environment Observations
- **OS**: Linux (x86_64 Ubuntu-based)
- **Host Python**: Python 3.14.4 at `/usr/bin/python3`
- **Host Pip**: Pip 25.1.1 (PEP 668 externally managed environment active)
- **Fast Tooling Available**: `uv` 0.12.13 located at `/home/n-a-t/.local/bin/uv` (capable of resolving and building virtual environments in milliseconds)
- **Available Standard CPython**: CPython 3.13.14 and 3.14.4 both operational under `uv`

### 2.2 Virtual Environment Requirement
Because the host environment enforces PEP 668 (`error: externally-managed-environment`), global `pip install` is blocked.
The Python service MUST use an isolated virtual environment:
- Venv path: `Mm-Mp/services/python/.venv`
- Creation command: `/home/n-a-t/.local/bin/uv venv /run/media/n-a-t/Local\ Disk_HDD/Mm-Mp/services/python/.venv` or `python3 -m venv services/python/.venv`
- Package installation command: `/home/n-a-t/.local/bin/uv pip install --python services/python/.venv/bin/python -r services/python/requirements.txt`

---

## 3. Reference Service & Existing Codebase Analysis

Investigation of `/run/media/n-a-t/Local Disk_HDD/menu-qrwebsite-payment`:
- `menu-qrwebsite-payment/MenuMini_1` was a monolithic prototype containing database SQL migrations and a SvelteKit frontend without a standalone microservices architecture.
- In `Mm-Mp`, `services/python` is a greenfield microservice designed to decouple heavy text processing, document parsing (Excel/CSV), and linguistic transformations from the Go realtime engine (port 8080) and SvelteKit web frontend (port 5173).
- Test harness analysis (`Mm-Mp/tests/e2e/helpers/mock-server.mjs` lines 209–269) revealed exact contract expectations used by E2E tests:
  - `GET /healthz` returns `{"status": "ok", "service": "python-utility-service"}` (HTTP 200).
  - Normalization endpoint checks `typeof body.text === 'string'`. Non-string inputs MUST reject with HTTP 400 (not FastAPI's default HTTP 422).
  - Import endpoint checks `Array.isArray(body.items)`. Missing or non-array `items` MUST reject with HTTP 400.
  - Export endpoint returns JSON payload with `exported_at` timestamp and `menu` object, with `Content-Disposition: attachment; filename="menu_export.json"`.

---

## 4. Exact File Layout in `services/python/`

```
Mm-Mp/services/python/
├── .gitignore
├── requirements.txt
├── main.py
├── normalizer.py
└── import_export.py
```

---

## 5. Dependencies (`requirements.txt`)

```txt
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.7.0
python-multipart>=0.0.9
openpyxl>=3.1.2
```

### Rationale:
- **FastAPI + Uvicorn**: Lightweight asynchronous ASGI framework providing native OpenAPI docs, sub-millisecond response latency, and clean routing.
- **Python-multipart**: Official streaming multipart parser required by FastAPI for handling file uploads (CSV, Excel `.xlsx`, JSON files).
- **OpenPyXL**: Pure Python library for reading and writing Excel `.xlsx` spreadsheets without requiring heavy scientific stacks (Pandas/NumPy) or native C binaries.

---

## 6. Fidel Normalization Engine (`normalizer.py`)

### 6.1 Linguistic Rules & Ethiopic Homophones
Amharic inherits multiple consonants from Ge'ez that have merged in pronunciation in contemporary spoken Amharic, resulting in multiple orthographic representations for identical phonemes:
1. **The 'h' Series (ሐ & ኀ -> ሀ)**:
   - 1st Order (Gə'əz): `ሐ` (0x1210) & `ኀ` (0x1280) -> `ሀ` (0x1200)
   - 2nd Order (Ka'əb): `ሑ` (0x1211) & `ኁ` (0x1281) -> `ሁ` (0x1201)
   - 3rd Order (Saləs): `ሒ` (0x1212) & `ኂ` (0x1282) -> `ሂ` (0x1202)
   - 4th Order (Rabə'): `ሓ` (0x1213) & `ኃ` (0x1283) -> `ሃ` (0x1203)
   - 5th Order (Haməs): `ሔ` (0x1214) & `ኄ` (0x1284) -> `ሄ` (0x1204)
   - 6th Order (Sadəs): `ሕ` (0x1215) & `ኅ` (0x1285) -> `ህ` (0x1205)
   - 7th Order (Sabə'): `ሖ` (0x1216) & `ኆ` (0x1286) -> `ሆ` (0x1206)
   - Labiovelar 8th: `ሗ` (0x1217) -> `ኋ` (0x128B)
2. **The 's' Series (ሠ -> ሰ)**:
   - 1st Order: `ሠ` (0x1220) -> `ሰ` (0x1230)
   - 2nd Order: `ሡ` (0x1221) -> `ሱ` (0x1231)
   - 3rd Order: `ሢ` (0x1222) -> `ሲ` (0x1232)
   - 4th Order: `ሣ` (0x1223) -> `ሳ` (0x1233)
   - 5th Order: `ሤ` (0x1224) -> `ሴ` (0x1234)
   - 6th Order: `ሥ` (0x1225) -> `ስ` (0x1235)
   - 7th Order: `ሦ` (0x1226) -> `ሶ` (0x1236)
   - Labiovelar: `ሧ` (0x1227) -> `ሷ` (0x1237)
3. **The Glottal/Pharyngeal 'a' Series (ዐ -> አ)**:
   - 1st Order: `ዐ` (0x12D0) -> `አ` (0x12A0)
   - 2nd Order: `ዑ` (0x12D1) -> `ኡ` (0x12A1)
   - 3rd Order: `ዒ` (0x12D2) -> `ኢ` (0x12A2)
   - 4th Order: `ዓ` (0x12D3) -> `ኣ` (0x12A3)
   - 5th Order: `ዔ` (0x12D4) -> `ኤ` (0x12A4)
   - 6th Order: `ዕ` (0x12D5) -> `እ` (0x12A5)
   - 7th Order: `ዖ` (0x12D6) -> `ኦ` (0x12A6)
4. **The Ejective 'ts' Series (ፀ -> ጸ)**:
   - 1st Order: `ፀ` (0x1340) -> `ጸ` (0x1338)
   - 2nd Order: `ፁ` (0x1341) -> `ጹ` (0x1339)
   - 3rd Order: `ፂ` (0x1342) -> `ጺ` (0x133A)
   - 4th Order: `ፃ` (0x1343) -> `ጻ` (0x133B)
   - 5th Order: `ፄ` (0x1344) -> `ጼ` (0x133C)
   - 6th Order: `ፅ` (0x1345) -> `ጽ` (0x133D)
   - 7th Order: `ፆ` (0x1346) -> `ጾ` (0x133E)
   - Labiovelar: `ፇ` (0x1347) -> `ጿ` (0x133F)

### 6.2 Punctuation and Separator Rules
- Traditional Wordspace `፡` (U+1361) -> ASCII space (` ` U+0020).
- Ethiopic Full Stop `።` (U+1362) -> ASCII period (`.` U+002E).
- Ethiopic Comma `፣` (U+1363) -> ASCII comma (`,` U+002C).
- Ethiopic Semicolon `፤` (U+1364) -> ASCII semicolon (`;` U+003B).
- Ethiopic Colon `፥` (U+1365) -> ASCII colon (`:` U+003A).
- Ethiopic Preface Colon `፦` (U+1366) -> ASCII colon (`:` U+003A).
- Ethiopic Question Mark `፧` (U+1367) -> ASCII question mark (`?` U+003F).
- Ethiopic Paragraph Separator `፨` (U+1368) -> ASCII space (` `).

### 6.3 Preservation Guarantees
- **Ethiopic Traditional Numerals**: `፩`, `፪`, `፫`, `፬`, `፭`, `፮`, `፯`, `፰`, `፱`, `፲` (U+1369–U+137C) are strictly preserved as required by Tier 2 boundary test B7.5.
- **Emojis & Symbols**: UTF-8 multibyte characters (e.g. `☕`, `🌟`) remain completely intact (tested in B7.2).
- **Latin Characters**: English words (`Special`, `Macchiato`, `ETB`) are untouched (tested in F7.5).

### 6.4 Implementation Design
Using Python's native `str.maketrans()` with `str.translate()` provides $O(N)$ execution in optimized C without regex backtracking or infinite loop risks (tested in B7.3).

---

## 7. Menu Import & Export Engine (`import_export.py`)

### 7.1 Import Processing Pipeline (`POST /api/v1/menu/import`)
The import handler accepts either an `application/json` payload or `multipart/form-data` file upload.
1. **JSON Payload**:
   Expects `{"items": [...]}`. If `items` key is missing or not a list, returns HTTP 400 immediately (Boundary test B8.1).
2. **Multipart File Upload**:
   - `file.filename.endswith('.csv')` -> Parsed via `csv.DictReader`. Case-insensitive column matching (`name_en`, `name_am`, `price_etb`, `price_etb_cents`, `category`, `modifiers`).
   - `file.filename.endswith(('.xlsx', '.xls'))` -> Parsed via `openpyxl`. Active worksheet iterated row by row.
   - `file.filename.endswith('.json')` -> Decoded as JSON and validated.
3. **Item Processing & ETB Cents Normalization**:
   - `name_en`: Trimmed string from `name_en` or `name`.
   - `name_am`: Transformed through `normalize_amharic()`.
   - `price_etb_cents`: Calculated as:
     - If `price_etb_cents` is given: `int(round(float(price_etb_cents)))`
     - Else if `price_etb` is given: `int(round(float(price_etb) * 100))` (handles decimals like `99.999` -> `10000`, `650.50` -> `65050`)
     - Else: `0`
   - `category`: Trimmed string or `'General'`.
   - `modifiers`: Array of modifier groups.
4. **Output Draft Format**:
   Returns:
   ```json
   {
     "ok": true,
     "count": <item_count>,
     "draft": {
       "sections": [
         {
           "title": "Imported Section",
           "items": [ ...normalized items... ]
         }
       ]
     }
   }
   ```
   *Note: Placing all imported items in `draft.sections[0].items` is required by Tier 3 Combination Test `c01_import_to_studio_publish.test.mjs` line 54.*

### 7.2 Export Processing Pipeline (`POST /api/v1/menu/export`)
Accepts a menu draft object (or `{}`) and an optional query parameter `?format=json|csv|excel|xlsx` (default: `json`).
1. **JSON Export (Default)**:
   - Sets header `Content-Disposition: attachment; filename="menu_export.json"`.
   - Sets `Content-Type: application/json`.
   - Returns:
     ```json
     {
       "ok": true,
       "exported_at": "2026-10-20T20:30:00.000Z",
       "menu": <submitted_menu_draft>
     }
     ```
2. **CSV Export (`?format=csv`)**:
   - Sets header `Content-Disposition: attachment; filename="menu_export.csv"`.
   - Sets `Content-Type: text/csv; charset=utf-8`.
   - Streams CSV lines containing: `section,name_en,name_am,price_etb_cents,price_etb,category,available`.
3. **Excel Export (`?format=excel` or `?format=xlsx`)**:
   - Sets header `Content-Disposition: attachment; filename="menu_export.xlsx"`.
   - Sets `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
   - Generates formatted OpenPyXL workbook with bold headers and auto-adjusted column widths.

---

## 8. HTTP Routing & Exception Handling (`main.py`)

### 8.1 Critical Exception Handling (HTTP 400 vs 422)
By default, FastAPI returns `HTTP 422 Unprocessable Entity` on Pydantic validation errors.
However, E2E boundary tests **explicitly assert HTTP 400**:
- `b07_b08_python_boundaries.test.mjs` line 38 (B7.4):
  `assert.strictEqual(res.status, 400);` (when text is non-string `12345`)
- `b07_b08_python_boundaries.test.mjs` line 54 (B8.1):
  `assert.strictEqual(res.status, 400);` (when payload is missing items array)

**Solution**:
Register a custom exception handler for `RequestValidationError` and `HTTPException` that maps any client request validation error to `HTTP 400`:
```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"error": "Invalid request", "details": exc.errors()})
```

---

## 9. Drop-In Code Implementations

### 9.1 `services/python/requirements.txt`
```txt
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.7.0
python-multipart>=0.0.9
openpyxl>=3.1.2
```

### 9.2 `services/python/normalizer.py`
```python
"""
Amharic Fidel Normalizer
Folds Ethiopic homophone series (ሐ/ኀ -> ሀ, ሠ -> ሰ, ዐ -> አ, ፀ -> ጸ),
converts traditional Ethiopic punctuation to standard ASCII,
and strictly preserves Ethiopic numerals and bilingual text.
"""

# Homophone mappings across all orders (1st - 7th + labiovelars)
FIDEL_HOMOPHONES = {
    # ሐ series -> ሀ series
    'ሐ': 'ሀ', 'ሑ': 'ሁ', 'ሒ': 'ሂ', 'ሓ': 'ሃ', 'ሔ': 'ሄ', 'ሕ': 'ህ', 'ሖ': 'ሆ', 'ሗ': 'ኋ',
    # ኀ series -> ሀ series
    'ኀ': 'ሀ', 'ኁ': 'ሁ', 'ኂ': 'ሂ', 'ኃ': 'ሃ', 'ኄ': 'ሄ', 'ኅ': 'ህ', 'ኆ': 'ሆ',
    # ሠ series -> ሰ series
    'ሠ': 'ሰ', 'ሡ': 'ሱ', 'ሢ': 'ሲ', 'ሣ': 'ሳ', 'ሤ': 'ሴ', 'ሥ': 'ስ', 'ሦ': 'ሶ', 'ሧ': 'ሷ',
    # ዐ series -> አ series
    'ዐ': 'አ', 'ዑ': 'ኡ', 'ዒ': 'ኢ', 'ዓ': 'ኣ', 'ዔ': 'ኤ', 'ዕ': 'እ', 'ዖ': 'ኦ',
    # ፀ series -> ጸ series
    'ፀ': 'ጸ', 'ፁ': 'ጹ', 'ፂ': 'ጺ', 'ፃ': 'ጻ', 'ፄ': 'ጼ', 'ፅ': 'ጽ', 'ፆ': 'ጾ', 'ፇ': 'ጿ',
}

# Ethiopic punctuation mappings
ETHIOPIC_PUNCTUATION = {
    '፡': ' ',  # Word separator -> Space
    '።': '.',  # Full stop
    '፣': ',',  # Comma
    '፤': ';',  # Semicolon
    '፥': ':',  # Colon
    '፦': ':',  # Preface colon
    '፧': '?',  # Question mark
    '፨': ' ',  # Paragraph separator
}

NORMALIZATION_MAP = {**FIDEL_HOMOPHONES, **ETHIOPIC_PUNCTUATION}
NORMALIZATION_TABLE = str.maketrans(NORMALIZATION_MAP)


def normalize_amharic(text: str) -> str:
    """
    Normalizes Amharic text by folding homophones and converting traditional punctuation.
    Preserves Ethiopic numerals (፩, ፪, ፫...), emojis, and Latin alphanumeric characters.
    """
    if not text:
        return ""
    if not isinstance(text, str):
        raise TypeError(f"Expected string for normalization, got {type(text).__name__}")
    return text.translate(NORMALIZATION_TABLE)
```

### 9.3 `services/python/import_export.py`
```python
"""
Menu Import & Export Engine
Handles JSON payloads and multipart file uploads (CSV, Excel, JSON).
Converts currency to integer ETB cents and normalizes Amharic text.
"""
import io
import csv
import json
from datetime import datetime, timezone
import openpyxl
from normalizer import normalize_amharic


def parse_menu_items(raw_items: list[dict]) -> list[dict]:
    """Processes a list of raw item dictionaries into normalized menu items with ETB cents."""
    normalized_items = []
    for item in raw_items:
        name_en = str(item.get("name_en") or item.get("name") or "").strip()
        name_am_raw = str(item.get("name_am") or item.get("amharic") or "").strip()
        name_am = normalize_amharic(name_am_raw) if name_am_raw else ""

        # Price calculation with floating-point safety
        price_cents = item.get("price_etb_cents")
        if price_cents is not None:
            price_cents = int(round(float(price_cents)))
        elif item.get("price_etb") is not None:
            price_cents = int(round(float(item["price_etb"]) * 100))
        elif item.get("price") is not None:
            price_cents = int(round(float(item["price"]) * 100))
        else:
            price_cents = 0

        category = str(item.get("category") or item.get("section") or "General").strip()
        modifiers = item.get("modifiers") or []

        normalized_items.append({
            "name_en": name_en,
            "name_am": name_am,
            "price_etb_cents": price_cents,
            "category": category,
            "modifiers": modifiers,
        })
    return normalized_items


def parse_csv_content(content: str) -> list[dict]:
    """Parses CSV text into a list of raw item dicts."""
    reader = csv.DictReader(io.StringIO(content))
    raw_items = []
    for row in reader:
        norm_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        raw_items.append({
            "name_en": norm_row.get("name_en") or norm_row.get("name") or norm_row.get("dish") or "",
            "name_am": norm_row.get("name_am") or norm_row.get("amharic") or "",
            "price_etb": norm_row.get("price_etb") or norm_row.get("price"),
            "price_etb_cents": norm_row.get("price_etb_cents"),
            "category": norm_row.get("category") or norm_row.get("section") or "General",
        })
    return raw_items


def parse_excel_content(content: bytes) -> list[dict]:
    """Parses Excel (.xlsx) file bytes into a list of raw item dicts."""
    wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(col).strip().lower() if col is not None else "" for col in rows[0]]
    raw_items = []
    for row in rows[1:]:
        if not any(row):
            continue
        row_dict = {}
        for idx, key in enumerate(headers):
            if idx < len(row) and key:
                row_dict[key] = str(row[idx]).strip() if row[idx] is not None else ""
        raw_items.append({
            "name_en": row_dict.get("name_en") or row_dict.get("name") or row_dict.get("dish") or "",
            "name_am": row_dict.get("name_am") or row_dict.get("amharic") or "",
            "price_etb": row_dict.get("price_etb") or row_dict.get("price"),
            "price_etb_cents": row_dict.get("price_etb_cents"),
            "category": row_dict.get("category") or row_dict.get("section") or "General",
        })
    return raw_items


def build_menu_draft(normalized_items: list[dict]) -> dict:
    """Builds the draft response structure expected by Menu Studio and E2E tests."""
    return {
        "ok": True,
        "count": len(normalized_items),
        "draft": {
            "sections": [
                {
                    "title": "Imported Section",
                    "items": normalized_items,
                }
            ]
        }
    }


def generate_csv_export(menu_draft: dict) -> str:
    """Generates CSV text representation of a menu draft."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["section", "name_en", "name_am", "price_etb_cents", "price_etb", "category"])
    sections = menu_draft.get("sections") or []
    for sec in sections:
        sec_title = sec.get("title") or sec.get("title_en") or "Section"
        for item in sec.get("items") or []:
            cents = item.get("price_etb_cents") or 0
            writer.writerow([
                sec_title,
                item.get("name_en") or item.get("name") or "",
                item.get("name_am") or "",
                cents,
                f"{cents / 100:.2f}",
                item.get("category") or sec_title,
            ])
    return buf.getvalue()


def generate_excel_export(menu_draft: dict) -> bytes:
    """Generates Excel (.xlsx) binary buffer of a menu draft."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Menu"
    ws.append(["Section", "Name (EN)", "Name (AM)", "Price (ETB Cents)", "Price (ETB)", "Category"])
    sections = menu_draft.get("sections") or []
    for sec in sections:
        sec_title = sec.get("title") or sec.get("title_en") or "Section"
        for item in sec.get("items") or []:
            cents = item.get("price_etb_cents") or 0
            ws.append([
                sec_title,
                item.get("name_en") or item.get("name") or "",
                item.get("name_am") or "",
                cents,
                cents / 100.0,
                item.get("category") or sec_title,
            ])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
```

### 9.4 `services/python/main.py`
```python
"""
Mm-Mp Python Utility Service
FastAPI entrypoint handling Amharic Fidel text normalization and menu import/export.
"""
import os
import json
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, Request, HTTPException, Query, UploadFile, File
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from normalizer import normalize_amharic
from import_export import (
    parse_menu_items,
    parse_csv_content,
    parse_excel_content,
    build_menu_draft,
    generate_csv_export,
    generate_excel_export,
)

app = FastAPI(
    title="Mm-Mp Python Utility Service",
    description="Amharic Fidel text normalization and menu import/export processor",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Enforces HTTP 400 for any validation failure (satisfying E2E boundary tests B7.4 & B8.1)."""
    return JSONResponse(
        status_code=400,
        content={"error": "Validation error", "details": exc.errors()},
    )


@app.get("/healthz")
async def healthz():
    """Health check endpoint responding on port 5001."""
    return {"status": "ok", "service": "python-utility-service"}


@app.post("/api/v1/normalize-amharic")
async def normalize_amharic_endpoint(request: Request):
    """
    Normalizes Amharic Fidel characters and punctuation.
    Accepts: {"text": "<raw>"}
    Returns: {"original": "<raw>", "normalized": "<clean>"}
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    if not isinstance(body, dict) or "text" not in body or not isinstance(body["text"], str):
        raise HTTPException(status_code=400, detail='Field "text" must be a string')

    raw_text = body["text"]
    normalized_text = normalize_amharic(raw_text)
    return {
        "original": raw_text,
        "normalized": normalized_text,
    }


@app.post("/api/v1/menu/import")
async def import_menu_endpoint(request: Request, file: Optional[UploadFile] = File(None)):
    """
    Imports menu draft from JSON payload or multipart file upload (CSV, Excel, JSON).
    Validates items, normalizes Amharic text, calculates ETB cents, and returns structured draft.
    """
    content_type = request.headers.get("content-type", "")

    # 1. Handle multipart form file upload
    if "multipart/form-data" in content_type:
        form = await request.form()
        uploaded_file: Optional[UploadFile] = form.get("file") or file
        if not uploaded_file:
            raise HTTPException(status_code=400, detail="Missing required file in multipart upload")

        contents = await uploaded_file.read()
        filename = (uploaded_file.filename or "").lower()

        if filename.endswith(".csv"):
            raw_items = parse_csv_content(contents.decode("utf-8", errors="replace"))
        elif filename.endswith((".xlsx", ".xls")):
            raw_items = parse_excel_content(contents)
        elif filename.endswith(".json"):
            try:
                parsed = json.loads(contents.decode("utf-8"))
            except Exception:
                raise HTTPException(status_code=400, detail="Invalid JSON file contents")
            if not isinstance(parsed, dict) or "items" not in parsed or not isinstance(parsed["items"], list):
                raise HTTPException(status_code=400, detail='Invalid menu JSON file. Expected "items" array.')
            raw_items = parsed["items"]
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV, Excel (.xlsx), or JSON.")

    # 2. Handle JSON payload in POST body
    else:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid JSON body")

        if not isinstance(body, dict) or "items" not in body or not isinstance(body["items"], list):
            raise HTTPException(status_code=400, detail='Invalid menu import payload. Expected "items" array.')

        raw_items = body["items"]

    normalized_items = parse_menu_items(raw_items)
    return build_menu_draft(normalized_items)


@app.post("/api/v1/menu/export")
async def export_menu_endpoint(
    request: Request,
    format: str = Query("json", regex="^(json|csv|excel|xlsx)$")
):
    """
    Exports menu draft to JSON, CSV, or Excel format.
    Sets Content-Disposition attachment header for downloads.
    """
    try:
        body = await request.json()
    except Exception:
        body = {}

    format_lower = format.lower()

    if format_lower == "csv":
        csv_data = generate_csv_export(body)
        return Response(
            content=csv_data,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="menu_export.csv"'},
        )

    if format_lower in ("excel", "xlsx"):
        excel_bytes = generate_excel_export(body)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": 'attachment; filename="menu_export.xlsx"'},
        )

    # Default: JSON export with envelope metadata
    return JSONResponse(
        content={
            "ok": True,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "menu": body,
        },
        headers={"Content-Disposition": 'attachment; filename="menu_export.json"'},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PYTHON_PORT", os.environ.get("PORT", 5001)))
    uvicorn.run("main:app", host="127.0.0.1", port=port, log_level="info")
```

---

## 10. Startup, Execution & Dev.sh Integration Commands

### 10.1 Environment Provisioning
```bash
cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/services/python"

# Create virtualenv using uv (or python3 -m venv)
/home/n-a-t/.local/bin/uv venv .venv

# Install dependencies into virtualenv
/home/n-a-t/.local/bin/uv pip install --python .venv/bin/python -r requirements.txt
```

### 10.2 Service Startup Command
```bash
cd "/run/media/n-a-t/Local Disk_HDD/Mm-Mp/services/python"
./.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 5001
```

### 10.3 Background Orchestrator Pattern (`dev.sh`)
```bash
# In dev.sh:
PYTHON_PORT="${PYTHON_PORT:-5001}"
echo "[dev.sh] Starting Python Utility Service on port ${PYTHON_PORT}..."
(
  cd services/python
  exec ./.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port "${PYTHON_PORT}"
) > .python.log 2>&1 &
PYTHON_PID=$!
```

---

## 11. Verification Plan for Implementer
1. Start service: `./.venv/bin/python -m uvicorn main:app --host 127.0.0.1 --port 5001`.
2. Run Tier 1 Feature Suite:
   `node --test tests/e2e/tier1_features/f07_f08_python_utility.test.mjs`
   (Expect 10/10 tests passing).
3. Run Tier 2 Boundary Suite:
   `node --test tests/e2e/tier2_boundaries/b07_b08_python_boundaries.test.mjs`
   (Expect 10/10 tests passing).
4. Run Tier 3 Combinations:
   `node --test tests/e2e/tier3_combinations/c01_import_to_studio_publish.test.mjs`
   (Verifies end-to-end import -> normalization -> studio persistence flow).
