#!/usr/bin/env python3
"""
Python Utility Service for MenuMini (Mm-Mp)
Port: 5001 (configurable via PYTHON_PORT environment variable)
Provides:
  - Health check: GET /healthz
  - Amharic Fidel Normalization: POST /api/v1/normalize-amharic
  - Menu Draft Import: POST /api/v1/menu/import
  - Menu Draft Export: POST /api/v1/menu/export
"""

import os
import sys
import json
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

from normalizer import normalize_amharic
from import_export import parse_menu_payload, export_menu_to_json, export_menu_to_csv

PORT = int(os.environ.get("PYTHON_PORT", "5001"))
HOST = os.environ.get("PYTHON_HOST", "127.0.0.1")

class MenuUtilityHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep logs concise
        sys.stderr.write(f"[{datetime.now().strftime('%H:%M:%S')}] PythonService: {format % args}\n")

    def _send_json(self, status: int, data: dict, extra_headers: dict = None):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _read_body_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/healthz":
            self._send_json(200, {
                "status": "ok",
                "service": "python-utility-service",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
            return

        self._send_json(404, {"error": "Not Found"})

    def do_POST(self):
        parsed = urlparse(self.path)
        
        # 1. Normalize Amharic
        if parsed.path == "/api/v1/normalize-amharic":
            body = self._read_body_json()
            raw_text = body.get("text")
            if raw_text is None or not isinstance(raw_text, str):
                self._send_json(400, {"error": 'Field "text" must be a string'})
                return
            
            clean = normalize_amharic(raw_text)
            self._send_json(200, {
                "original": raw_text,
                "normalized": clean,
            })
            return

        # 2. Menu Import
        if parsed.path == "/api/v1/menu/import":
            body = self._read_body_json()
            if not body or not isinstance(body.get("items"), list):
                self._send_json(400, {
                    "error": 'Invalid menu import payload. Expected "items" array.'
                })
                return
            try:
                res = parse_menu_payload(body)
                self._send_json(200, res)
            except Exception as e:
                self._send_json(400, {"error": str(e)})
            return

        # 3. Menu Export
        if parsed.path == "/api/v1/menu/export":
            body = self._read_body_json()
            export_format = self.headers.get("Accept", "application/json")
            if "text/csv" in export_format:
                csv_data = export_menu_to_csv(body).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/csv; charset=utf-8")
                self.send_header("Content-Disposition", 'attachment; filename="menu_export.csv"')
                self.send_header("Content-Length", str(len(csv_data)))
                self.end_headers()
                self.wfile.write(csv_data)
                return
            else:
                self._send_json(200, {
                    "exported_at": datetime.now(timezone.utc).isoformat(),
                    "menu": body
                }, extra_headers={"Content-Disposition": 'attachment; filename="menu_export.json"'})
                return

        self._send_json(404, {"error": "Not Found"})


def main():
    server = HTTPServer((HOST, PORT), MenuUtilityHandler)
    print(f"Python Utility Service listening on http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Python Utility Service...")
        server.server_close()
        sys.exit(0)

if __name__ == "__main__":
    main()
