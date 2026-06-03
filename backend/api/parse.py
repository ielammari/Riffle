# GET /api/parse?q=... -> parsed deck spec (transparent/testable). Public.

import requests
from flask import Blueprint, jsonify, request

from backend import dummyjson, query_parser

bp = Blueprint("parse", __name__, url_prefix="/api")


@bp.get("/parse")
def parse():
    q = request.args.get("q", "")
    try:
        valid = dummyjson.valid_category_slugs()
    except requests.RequestException:
        valid = None
    return jsonify(query_parser.parse_query(q, valid))
