# Hydrate a DummyJSON product into a Riffle card (correct original_price + specs).

from backend.config import Config


def _original_price(price, discount):
    if discount and 0 < discount < 100:
        return round(price / (1 - discount / 100.0), 2)
    return None


def build_specs(p):
    specs = []

    def add(label, value):
        if value not in (None, "", []):
            specs.append({"label": label, "value": str(value)})

    add("Brand", p.get("brand"))
    dims = p.get("dimensions") or {}
    if dims.get("width") and dims.get("height") and dims.get("depth"):
        add("Dimensions", f"{dims['width']} × {dims['height']} × {dims['depth']} cm")
    add("Weight", p.get("weight"))
    add("Warranty", p.get("warrantyInformation"))
    add("Shipping", p.get("shippingInformation"))
    add("Returns", p.get("returnPolicy"))
    add("Availability", p.get("availabilityStatus"))
    add("SKU", p.get("sku"))
    return specs


def build_card(p, currency=None):
    price = p.get("price") or 0
    discount = p.get("discountPercentage") or 0
    images = p.get("images") or []
    if not images and p.get("thumbnail"):
        images = [p["thumbnail"]]
    return {
        "id": p.get("id"),
        "title": p.get("title"),
        "brand": p.get("brand"),
        "category": p.get("category"),
        "description": p.get("description"),
        "price": price,
        "original_price": _original_price(price, discount),
        "discount_percentage": discount,
        "currency": currency or Config.CURRENCY,
        "rating": p.get("rating"),
        "review_count": len(p.get("reviews") or []),
        "stock": p.get("stock"),
        "availability_status": p.get("availabilityStatus"),
        "images": images,
        "specs": build_specs(p),
    }
