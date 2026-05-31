# Second Thoughts (auth): list with server_now + lazy expiry, promote to cart, release.

from datetime import datetime, timezone
import requests
from flask import Blueprint, jsonify

from backend import cards, dummyjson
from backend.auth import current_user, login_required
from backend.config import Config
from backend.counts import user_counts
from backend.extensions import db
from backend.models import CartItem, SecondThought

bp = Blueprint("second_thoughts", __name__, url_prefix="/api")


def _naive_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _to_naive_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _iso(dt):
    dt = _to_naive_utc(dt)
    return dt.isoformat() + "Z" if dt is not None else None


def _expire_if_due(item, now):
    if item.status == "active" and _to_naive_utc(item.expires_at) <= now:
        item.status = "expired"
        return True
    return False


def _get_actionable(user_id, product_id):
    item = SecondThought.query.filter_by(user_id=user_id, product_id=product_id).first()
    if item is None:
        return None, (jsonify(error="not_in_tray"), 404)
    if _expire_if_due(item, _naive_now()):
        db.session.commit()
    if item.status != "active":
        code = "item_expired" if item.status == "expired" else "already_resolved"
        return None, (jsonify(error=code), 409)
    return item, None


@bp.get("/second-thoughts")
@login_required
def list_tray():
    user = current_user()
    now = _naive_now()
    rows = SecondThought.query.filter_by(user_id=user.id).order_by(SecondThought.started_at).all()

    changed = False
    active = []
    for r in rows:
        if _expire_if_due(r, now):
            changed = True
        if r.status == "active":
            active.append(r)
    if changed:
        db.session.commit()

    try:
        items = []
        for r in active:
            product = dummyjson.get_product(r.product_id)
            if product is None:
                continue
            card = cards.build_card(product)
            card["status"] = r.status
            card["started_at"] = _iso(r.started_at)
            card["expires_at"] = _iso(r.expires_at)
            items.append(card)
    except requests.RequestException:
        return jsonify(error="upstream_unavailable"), 502

    return jsonify({
        "server_now": _iso(now),
        "ttl": Config.SECOND_THOUGHTS_TTL_SECONDS,
        "items": items,
        **user_counts(user.id),
    })


@bp.post("/second-thoughts/<int:product_id>/promote")
@login_required
def promote(product_id):
    user = current_user()
    item, err = _get_actionable(user.id, product_id)
    if err:
        return err
    item.status = "promoted"
    cart = CartItem.query.filter_by(user_id=user.id, product_id=product_id).first()
    if cart is None:
        db.session.add(CartItem(user_id=user.id, product_id=product_id, qty=1))
    else:
        cart.qty += 1
    db.session.commit()
    return jsonify({"status": "promoted", **user_counts(user.id)})


@bp.delete("/second-thoughts/<int:product_id>")
@login_required
def release(product_id):
    user = current_user()
    item, err = _get_actionable(user.id, product_id)
    if err:
        return err
    item.status = "released"
    db.session.commit()
    return jsonify({"status": "released", **user_counts(user.id)})
