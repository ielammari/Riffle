# Application configuration.
# Needed for TTL, ranking weights, currency, the DummyJSON base URL, and cache settings.

import os
from pathlib import Path

# The SQLite DB lives in instance/ at the root.
BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"


class Config:
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{INSTANCE_DIR / 'app.db'}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    DUMMYJSON_BASE = "https://dummyjson.com"
    REQUEST_TIMEOUT = 10

    SECRET_KEY = os.environ.get("RIFFLE_SECRET_KEY", "dev-insecure-change-me")
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_HTTPONLY = True

    CURRENCY = "$"
    DECK_LIMIT_DEFAULT = 12
    DECK_LIMIT_MAX = 30
    DECK_CANDIDATE_LIMIT = 100

    RANKING_WEIGHTS = {"rating": 0.55, "review": 0.15, "stock": 0.10, "discount": 0.10, "query": 0.10}
    RANKING_RATING_BIAS = 0.15
    RANKING_DISCOUNT_BIAS = 0.10
    RANKING_PRICE_BIAS = 0.10
