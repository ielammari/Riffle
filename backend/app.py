# Flask app that serves the existing frontend prototype same-origin and exposes a health check.
# App factory / entry point.

import os
from pathlib import Path
from flask import Flask, jsonify, send_from_directory

from backend import models  # noqa: F401  (import registers models on db.metadata for create_all)
from backend.api import register_api
from backend.config import INSTANCE_DIR, Config
from backend.extensions import db

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


def create_app():
    # static_url_path="" serves every file under frontend/ at the site root,
    # so /css/style.css, /js/script.js, etc. resolve directly. "/" is handled below.
    app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
    app.config.from_object(Config)

    db.init_app(app)
    os.makedirs(INSTANCE_DIR, exist_ok=True)
    with app.app_context():
        db.create_all()

    register_api(app)

    @app.get("/api/health")
    def health():
        return jsonify(ok=True)

    @app.get("/")
    def index():
        return send_from_directory(FRONTEND_DIR, "index.html")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
