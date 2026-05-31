# GET /api/parse?q=... -> parsed deck spec (transparent/testable). Public.

import requests
from flask import Blueprint, jsonify, request

from backend import dummyjson, query_parser

bp = Blueprint("parse", __name__, url_prefix="/api")

_valid_slugs = None


def _category_slugs():
    global _valid_slugs
    if _valid_slugs is None:
        _valid_slugs = {c["slug"] for c in dummyjson.get_categories()}
    return _valid_slugs


@bp.get("/parse")
def parse():
    q = request.args.get("q", "")
    try:
        valid = _category_slugs()
    except requests.RequestException:
        valid = None
    return jsonify(query_parser.parse_query(q, valid))
