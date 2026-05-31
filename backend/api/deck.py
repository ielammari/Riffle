# GET /api/deck (auth) to ranked, see-once-filtered, hydrated cards.

import requests
from flask import Blueprint, jsonify, request

from backend import cards, dummyjson, query_parser, ranking
from backend.auth import current_user, login_required
from backend.config import Config
from backend.models import CartItem, Decision, SecondThought

bp = Blueprint("deck", __name__, url_prefix="/api")


def _spec_for_category(category):
    return {
        "categories": [category],
        "q": "",
        "min_price": None,
        "max_price": None,
        "min_rating": None,
        "biases": {"rating": 0.0, "discount": 0.0, "price": None},
    }


def _resolve_candidates(q, category):
    cand_limit = Config.DECK_CANDIDATE_LIMIT
    if category:
        data = dummyjson.get_by_category(category, limit=cand_limit)
        return data.get("products", []), _spec_for_category(category)

    try:
        valid = dummyjson.valid_category_slugs()
    except requests.RequestException:
        valid = None
    spec = query_parser.parse_query(q or "", valid)

    products = []
    if spec["categories"]:
        seen = set()
        for slug in spec["categories"]:
            for p in dummyjson.get_by_category(slug, limit=cand_limit).get("products", []):
                if p["id"] not in seen:
                    seen.add(p["id"])
                    products.append(p)
        if spec["q"]:
            ids = {p["id"] for p in dummyjson.search(spec["q"], limit=cand_limit).get("products", [])}
            inter = [p for p in products if p["id"] in ids]
            if inter:
                products = inter
    elif spec["q"]:
        products = dummyjson.search(spec["q"], limit=cand_limit).get("products", [])
    else:
        products = dummyjson.list_products(limit=cand_limit).get("products", [])
    return products, spec


def _passes(p, spec):
    price = p.get("price") or 0
    if spec.get("min_price") is not None and price < spec["min_price"]:
        return False
    if spec.get("max_price") is not None and price > spec["max_price"]:
        return False
    if spec.get("min_rating") is not None and (p.get("rating") or 0) < spec["min_rating"]:
        return False
    return True


def _excluded_ids(user_id):
    dec = {d.product_id for d in Decision.query.filter_by(user_id=user_id).all()}
    cart = {c.product_id for c in CartItem.query.filter_by(user_id=user_id).all()}
    tray = {s.product_id for s in SecondThought.query.filter_by(user_id=user_id, status="active").all()}
    return dec | cart | tray


def build_deck(user_id, q=None, category=None, limit=12):
    products, spec = _resolve_candidates(q, category)
    excluded = _excluded_ids(user_id)
    pool = [p for p in products if p.get("id") not in excluded and _passes(p, spec)]
    ranked = ranking.rank(pool, spec)
    return [cards.build_card(p) for p in ranked[:limit]]


@bp.get("/deck")
@login_required
def deck():
    user = current_user()
    q = request.args.get("q")
    category = request.args.get("category")
    try:
        limit = int(request.args.get("limit", Config.DECK_LIMIT_DEFAULT))
    except (TypeError, ValueError):
        limit = Config.DECK_LIMIT_DEFAULT
    limit = max(1, min(limit, Config.DECK_LIMIT_MAX))

    try:
        items = build_deck(user.id, q=q, category=category, limit=limit)
    except requests.RequestException:
        return jsonify(error="upstream_unavailable"), 502
    return jsonify({"items": items, "count": len(items)})
