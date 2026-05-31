# Settings endpoints (auth): GET effective settings + schema, PUT to update.

from flask import Blueprint, jsonify, request

from backend import settings as settings_store
from backend.auth import current_user, login_required

bp = Blueprint("settings", __name__, url_prefix="/api")


@bp.get("/settings")
@login_required
def get_settings():
    user = current_user()
    return jsonify({
        "settings": settings_store.get_settings(user.id),
        "schema": settings_store.settings_schema(),
    })


@bp.put("/settings")
@login_required
def update_settings():
    user = current_user()
    patch = request.get_json(silent=True) or {}
    if not isinstance(patch, dict):
        return jsonify(error="invalid_settings"), 400
    return jsonify({
        "settings": settings_store.save_settings(user.id, patch),
        "schema": settings_store.settings_schema(),
    })
