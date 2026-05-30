# Auth: signed-session login, werkzeug password hashing, login_required guard.

from functools import wraps
from flask import Blueprint, jsonify, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from backend.extensions import db
from backend.models import User

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def serialize_user(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def current_user():
    uid = session.get("user_id")
    return db.session.get(User, uid) if uid is not None else None


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if current_user() is None:
            return jsonify(error="auth_required"), 401
        return view(*args, **kwargs)

    return wrapped


@bp.post("/register")
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip() or None
    password = data.get("password") or ""
    if not username or not password:
        return jsonify(error="username_and_password_required"), 400
    if User.query.filter_by(username=username).first():
        return jsonify(error="username_taken"), 409
    if email and User.query.filter_by(email=email).first():
        return jsonify(error="email_taken"), 409

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()
    session.clear()
    session["user_id"] = user.id
    return jsonify(serialize_user(user)), 201


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    user = User.query.filter_by(username=username).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify(error="invalid_credentials"), 401
    session.clear()
    session["user_id"] = user.id
    return jsonify(serialize_user(user))


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify(ok=True)


@bp.get("/me")
def me():
    user = current_user()
    return jsonify(serialize_user(user) if user else None)
