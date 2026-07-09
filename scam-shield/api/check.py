"""Vercel serverless endpoint for Scam Shield (POST /api/check).

Wraps the same analyzer used by the local Flask app (app.py) in the
BaseHTTPRequestHandler format Vercel's Python runtime expects.
"""

import json
import os
import sys
from http.server import BaseHTTPRequestHandler

sys.path.append(os.path.dirname(__file__))

from _analyzer import analyze  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("content-length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            payload = {}

        try:
            result = analyze(payload.get("url", ""))
            status, body = 200, result
        except ValueError as exc:
            status, body = 400, {"error": str(exc)}
        except Exception:
            status, body = 500, {"error": "The check failed unexpectedly. "
                                          "Please try again."}

        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
