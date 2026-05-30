# Application configuration.
# Needed for TTL, ranking weights, currency, the DummyJSON base URL, and cache settings.

from pathlib import Path

# The SQLite DB lives in instance/ at the root.
BASE_DIR = Path(__file__).resolve().parent.parent
INSTANCE_DIR = BASE_DIR / "instance"


class Config:
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{INSTANCE_DIR / 'app.db'}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    DUMMYJSON_BASE = "https://dummyjson.com"
    REQUEST_TIMEOUT = 10
