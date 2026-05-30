# GET /api/categories, real DummyJSON categories.

import requests
from flask import Blueprint, jsonify

import backend.dummyjson as dummyjson

bp = Blueprint("categories", __name__, url_prefix="/api")


@bp.get("/categories")
def categories():
    try:
        return jsonify(dummyjson.get_categories())
    except requests.RequestException:
        return jsonify(error="upstream_unavailable"), 502
