# SQLAlchemy models (made for user state only).
#Tables: user, decision (see-once ledger), cart_item, second_thought, product_cache.

from datetime import datetime, timezone

from backend.extensions import db


def utcnow():
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(255), unique=True, nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)


class Decision(db.Model):
    """The decision a user has made acting on a product (user, product)."""

    __tablename__ = "decision"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, nullable=False)  # DummyJSON product id
    direction = db.Column(db.String(8), nullable=False)  # right | down | left
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "product_id", name="uq_decision_user_product"),
    )


class CartItem(db.Model):
    __tablename__ = "cart_item"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, nullable=False)
    qty = db.Column(db.Integer, nullable=False, default=1)
    added_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "product_id", name="uq_cart_user_product"),
    )


class SecondThought(db.Model):
    __tablename__ = "second_thought"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, nullable=False)
    started_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    # active | promoted | released | expired
    status = db.Column(db.String(16), nullable=False, default="active")


class ProductCache(db.Model):
    """Performance cache only. Data is fetched directly from DummyJSON."""

    __tablename__ = "product_cache"

    product_id = db.Column(db.Integer, primary_key=True)  # DummyJSON product id
    data = db.Column(db.JSON, nullable=False)
    fetched_at = db.Column(db.DateTime, default=utcnow, nullable=False)


class UserSettings(db.Model):
    # Per-user preferences (limits, ranking, currency, appearance). Defaults in config.
    __tablename__ = "user_settings"

    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), primary_key=True)
    data = db.Column(db.JSON, nullable=False, default=dict)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)
