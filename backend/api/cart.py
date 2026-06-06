# Cart endpoints (auth): GET list+subtotal, PATCH qty, DELETE item. Hydrated from cache/DummyJSON.

from datetime import datetime

import requests
from flask import Blueprint, jsonify, request

from backend import cards, dummyjson, settings as settings_store
from backend.auth import current_user, login_required
from backend.extensions import db
from backend.models import CartItem

bp = Blueprint("cart", __name__, url_prefix="/api")


def _parse_dt(value):
    try:
        return datetime.fromisoformat(value) if value else None
    except (TypeError, ValueError):
        return None


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
        card["added_at"] = row.added_at.isoformat() if row.added_at else None
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


@bp.post("/cart")
@login_required
def add_cart():
    # Add / restore a cart item (used by the cart's Undo). Upsert keeps the
    # UNIQUE(user, product) row in sync; an optional added_at preserves list order.
    user = current_user()
    data = request.get_json(silent=True) or {}
    try:
        product_id = int(data.get("product_id"))
    except (TypeError, ValueError):
        return jsonify(error="invalid_product"), 400
    try:
        qty = max(1, int(data.get("qty", 1)))
    except (TypeError, ValueError):
        qty = 1

    item = CartItem.query.filter_by(user_id=user.id, product_id=product_id).first()
    if item is None:
        item = CartItem(user_id=user.id, product_id=product_id, qty=qty)
        added_at = _parse_dt(data.get("added_at"))
        if added_at is not None:
            item.added_at = added_at
        db.session.add(item)
    else:
        item.qty = qty
    db.session.commit()
    try:
        return jsonify(_cart_payload(user.id))
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


@bp.post("/cart/checkout")
@login_required
def checkout():
    # Partial checkout: removes only the selected items (purchased), leaving the rest.
    user = current_user()
    data = request.get_json(silent=True) or {}
    raw = data.get("product_ids")
    if not isinstance(raw, list) or not raw:
        return jsonify(error="no_items_selected"), 400
    ids = []
    for x in raw:
        try:
            ids.append(int(x))
        except (TypeError, ValueError):
            pass
    if ids:
        CartItem.query.filter(
            CartItem.user_id == user.id, CartItem.product_id.in_(ids)
        ).delete(synchronize_session=False)
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
