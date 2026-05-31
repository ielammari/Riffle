# POST /api/reset (auth): clear decisions + Second-Thoughts tray, keep the cart.

from flask import Blueprint, jsonify

from backend.auth import current_user, login_required
from backend.counts import user_counts
from backend.extensions import db
from backend.models import Decision, SecondThought

bp = Blueprint("reset", __name__, url_prefix="/api")


@bp.post("/reset")
@login_required
def reset():
    user = current_user()
    Decision.query.filter_by(user_id=user.id).delete()
    SecondThought.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"ok": True, **user_counts(user.id)})
