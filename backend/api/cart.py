# Cart endpoints (auth): GET list+subtotal, PATCH qty, DELETE item. Hydrated from cache/DummyJSON.

import requests
from flask import Blueprint, jsonify, request

from backend import cards, dummyjson, settings as settings_store
from backend.auth import current_user, login_required
from backend.extensions import db
from backend.models import CartItem

bp = Blueprint("cart", __name__, url_prefix="/api")


def _cart_payload(user_id):
    currency = settings_store.get_settings(user_id)["currency"]
    rows = CartItem.query.filter_by(user_id=user_id).order_by(CartItem.added_at).all()
    items, subtotal, count = [], 0.0, 0
    for row in rows:
        product = dummyjson.get_product(row.product_id)
        if product is None:
            continue
        card = cards.build_card(product, currency=currency)
        card["qty"] = row.qty
        card["line_total"] = round((card["price"] or 0) * row.qty, 2)
        items.append(card)
        subtotal += card["line_total"]
        count += row.qty
    return {"items": items, "subtotal": round(subtotal, 2), "currency": currency, "count": count}


@bp.get("/cart")
@login_required
def get_cart():
    try:
        return jsonify(_cart_payload(current_user().id))
    except requests.RequestException:
        return jsonify(error="upstream_unavailable"), 502


@bp.patch("/cart/<int:product_id>")
@login_required
def update_cart(product_id):
    user = current_user()
    data = request.get_json(silent=True) or {}
    try:
        qty = int(data.get("qty"))
    except (TypeError, ValueError):
        return jsonify(error="invalid_qty"), 400
    if qty < 1:
        return jsonify(error="invalid_qty"), 400

    item = CartItem.query.filter_by(user_id=user.id, product_id=product_id).first()
    if item is None:
        return jsonify(error="not_in_cart"), 404
    item.qty = qty
    db.session.commit()
    try:
        return jsonify(_cart_payload(user.id))
    except requests.RequestException:
        return jsonify(error="upstream_unavailable"), 502


@bp.delete("/cart/<int:product_id>")
@login_required
def remove_cart(product_id):
    user = current_user()
    item = CartItem.query.filter_by(user_id=user.id, product_id=product_id).first()
    if item is None:
        return jsonify(error="not_in_cart"), 404
    db.session.delete(item)
    db.session.commit()
    try:
        return jsonify(_cart_payload(user.id))
    except requests.RequestException:
        return jsonify(error="upstream_unavailable"), 502
