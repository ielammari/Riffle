# DummyJSON client + product_cache read/write.

import requests

from backend.config import Config
from backend.extensions import db
from backend.models import ProductCache, utcnow

BASE_URL = Config.DUMMYJSON_BASE
TIMEOUT = Config.REQUEST_TIMEOUT


def _get(path, params=None):
    resp = requests.get(f"{BASE_URL}{path}", params=params, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _upsert_product(product):
    pid = product.get("id")
    if pid is None:
        return
    row = db.session.get(ProductCache, pid)
    if row is None:
        db.session.add(ProductCache(product_id=pid, data=product, fetched_at=utcnow()))
    else:
        row.data = product
        row.fetched_at = utcnow()


def _cache(products):
    for p in products:
        _upsert_product(p)
    db.session.commit()


def get_categories():
    data = _get("/products/categories")
    return [
        {"slug": c["slug"], "name": c["name"], "url": c.get("url")}
        for c in data
        if isinstance(c, dict) and "slug" in c and "name" in c
    ]


_valid_slugs = None


def valid_category_slugs():
    global _valid_slugs
    if _valid_slugs is None:
        _valid_slugs = {c["slug"] for c in get_categories()}
    return _valid_slugs


def get_by_category(slug, limit=30, skip=0):
    data = _get(f"/products/category/{slug}", {"limit": limit, "skip": skip})
    _cache(data.get("products", []))
    return data


def search(q, limit=30, skip=0):
    data = _get("/products/search", {"q": q, "limit": limit, "skip": skip})
    _cache(data.get("products", []))
    return data


def list_products(limit=30, skip=0):
    data = _get("/products", {"limit": limit, "skip": skip})
    _cache(data.get("products", []))
    return data


def get_product(product_id, refresh=False):
    if not refresh:
        row = db.session.get(ProductCache, product_id)
        if row is not None:
            return row.data
    try:
        product = _get(f"/products/{product_id}")
    except requests.HTTPError as e:
        if e.response is not None and e.response.status_code == 404:
            return None
        raise
    _upsert_product(product)
    db.session.commit()
    return product
