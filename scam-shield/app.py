"""Scam Shield — web app that checks links from ads and shops for scam signals.

Run with:  python3 app.py
Then open: http://localhost:5000
"""

from flask import Flask, jsonify, request, send_from_directory

from analyzer import analyze

app = Flask(__name__, static_folder="static", static_url_path="")


@app.get("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.post("/api/check")
def api_check():
    payload = request.get_json(silent=True) or {}
    raw_url = payload.get("url", "")
    try:
        result = analyze(raw_url)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
