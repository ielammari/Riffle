# POST /api/swipe (auth) -> idempotent decision + side effects; returns counters.

from datetime import timedelta
from flask import Blueprint, jsonify, request

from backend import settings as settings_store
from backend.auth import current_user, login_required
from backend.counts import user_counts
from backend.extensions import db
from backend.models import CartItem, Decision, SecondThought, utcnow

bp = Blueprint("swipe", __name__, url_prefix="/api")

DIRECTIONS = {"right", "down", "left"}


def _add_to_cart(user_id, product_id):
    item = CartItem.query.filter_by(user_id=user_id, product_id=product_id).first()
    if item is None:
        db.session.add(CartItem(user_id=user_id, product_id=product_id, qty=1))
    else:
        item.qty += 1


def _add_second_thought(user_id, product_id):
    now = utcnow()
    ttl = settings_store.get_settings(user_id)["st_seconds"]
    db.session.add(SecondThought(
        user_id=user_id,
        product_id=product_id,
        started_at=now,
        expires_at=now + timedelta(seconds=ttl),
        status="active",
    ))


@bp.post("/swipe")
@login_required
def swipe():
    user = current_user()
    data = request.get_json(silent=True) or {}
    direction = data.get("direction")
    try:
        product_id = int(data.get("product_id"))
    except (TypeError, ValueError):
        return jsonify(error="invalid_swipe"), 400
    if direction not in DIRECTIONS:
        return jsonify(error="invalid_swipe"), 400

    seen = Decision.query.filter_by(user_id=user.id, product_id=product_id).first()
    if seen is None:
        db.session.add(Decision(user_id=user.id, product_id=product_id, direction=direction))
        if direction == "right":
            _add_to_cart(user.id, product_id)
        elif direction == "down":
            _add_second_thought(user.id, product_id)
        db.session.commit()

    return jsonify(user_counts(user.id))
