# Flask app that serves the existing frontend prototype same-origin and exposes a health check.
from pathlib import Path
from flask import Flask, jsonify, send_from_directory

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

# static_url_path="" serves every file under frontend/ at the site root, so
# /css/style.css, /js/script.js, etc. resolve directly. "/" is handled below.
app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")


@app.get("/api/health")
def health():
    return jsonify(ok=True)


@app.get("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
