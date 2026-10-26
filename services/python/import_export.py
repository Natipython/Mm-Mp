"""
Menu Draft Import and Export Utility for MenuMini
Supports JSON, CSV, and tabular data conversion.
"""

import io
import csv
import json
from typing import Dict, Any, List
from normalizer import normalize_amharic

def parse_menu_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates and normalizes raw menu payload into clean MenuMini draft format.
    """
    raw_items = payload.get("items", [])
    if not isinstance(raw_items, list):
        raise ValueError("Field 'items' must be a list of menu items")

    normalized_items = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        
        name_en = str(item.get("name_en") or item.get("name") or "").strip()
        name_am_raw = str(item.get("name_am") or "").strip()
        name_am = normalize_amharic(name_am_raw)

        # Price parsing
        price_etb_cents = item.get("price_etb_cents")
        if price_etb_cents is None:
            price_etb = float(item.get("price_etb") or item.get("price") or 0.0)
            price_etb_cents = int(round(price_etb * 100))
        else:
            price_etb_cents = int(price_etb_cents)

        category = str(item.get("category") or "General").strip()
        modifiers = item.get("modifiers") or []

        normalized_items.append({
            "name_en": name_en,
            "name_am": name_am,
            "price_etb_cents": price_etb_cents,
            "category": category,
            "modifiers": modifiers,
        })

    # Group into single section for imported items
    return {
        "ok": True,
        "count": len(normalized_items),
        "draft": {
            "sections": [
                {"title": "Imported Items", "items": normalized_items}
            ]
        }
    }

def export_menu_to_json(draft: Dict[str, Any]) -> str:
    """Exports menu draft to pretty-printed JSON."""
    return json.dumps(draft, ensure_ascii=False, indent=2)

def export_menu_to_csv(draft: Dict[str, Any]) -> str:
    """Exports menu draft sections to flat CSV format."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Section", "Name English", "Name Amharic", "Price ETB", "Price ETB Cents", "Modifiers"])

    sections = draft.get("sections", [])
    for sec in sections:
        sec_title = sec.get("title", "General")
        for item in sec.get("items", []):
            name_en = item.get("name_en", "")
            name_am = item.get("name_am", "")
            cents = item.get("price_etb_cents", 0)
            price_etb = f"{cents / 100:.2f}"
            mods = json.dumps(item.get("modifiers", []), ensure_ascii=False)
            writer.writerow([sec_title, name_en, name_am, price_etb, cents, mods])

    return output.getvalue()
