# Live per-user counters for the header (cart units + active Second Thoughts).

from sqlalchemy import func

from backend.extensions import db
from backend.models import CartItem, SecondThought


def user_counts(user_id):
    cart = db.session.query(func.coalesce(func.sum(CartItem.qty), 0)).filter(
        CartItem.user_id == user_id
    ).scalar()
    tray = SecondThought.query.filter_by(user_id=user_id, status="active").count()
    return {"cart_count": int(cart or 0), "second_thoughts_count": tray}
