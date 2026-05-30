# Debug GET /api/products/<id>, hydrated product, cached on fetch.

import requests
from flask import Blueprint, jsonify

import backend.dummyjson as dummyjson

bp = Blueprint("products", __name__, url_prefix="/api")


@bp.get("/products/<int:product_id>")
def product(product_id):
    try:
        data = dummyjson.get_product(product_id)
    except requests.RequestException:
        return jsonify(error="upstream_unavailable"), 502
    if data is None:
        return jsonify(error="not_found"), 404
    return jsonify(data)
