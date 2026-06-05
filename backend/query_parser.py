# Rule-based free-text query to deck-spec. Categories validated against actual DummyJSON slugs.

import re

PRICE_CHEAP_CAP = 50.0
PRICE_PREMIUM_FLOOR = 100.0
QUALITY_MIN_RATING = 4.0

_NUM = r"\$?\s*(\d+(?:\.\d+)?)"

_CATEGORY_PHRASES = [
    ("desk lamp", ["home-decoration", "furniture"]),
    ("skin care", ["skin-care"]),
    ("t shirt", ["tops"]),
    ("t-shirt", ["tops"]),
]

_CATEGORY_WORDS = {
    "smartphone": ["smartphones"], "smartphones": ["smartphones"],
    "phone": ["smartphones"], "phones": ["smartphones"],
    "iphone": ["smartphones"], "android": ["smartphones"],
    "laptop": ["laptops"], "laptops": ["laptops"], "notebook": ["laptops"], "macbook": ["laptops"],
    "tablet": ["tablets"], "tablets": ["tablets"], "ipad": ["tablets"],
    "headphone": ["mobile-accessories"], "headphones": ["mobile-accessories"],
    "earbuds": ["mobile-accessories"], "earphones": ["mobile-accessories"], "headset": ["mobile-accessories"],
    "perfume": ["fragrances"], "cologne": ["fragrances"],
    "fragrance": ["fragrances"], "fragrances": ["fragrances"],
    "lipstick": ["beauty"], "mascara": ["beauty"], "makeup": ["beauty"], "cosmetics": ["beauty"],
    "skincare": ["skin-care"], "moisturizer": ["skin-care"], "moisturiser": ["skin-care"],
    "sneakers": ["mens-shoes", "womens-shoes"], "sneaker": ["mens-shoes", "womens-shoes"],
    "shoes": ["mens-shoes", "womens-shoes"], "shoe": ["mens-shoes", "womens-shoes"],
    "dress": ["womens-dresses"], "dresses": ["womens-dresses"],
    "shirt": ["mens-shirts", "tops"], "shirts": ["mens-shirts", "tops"],
    "tee": ["tops"], "tshirt": ["tops"], "blouse": ["tops"], "top": ["tops"], "tops": ["tops"],
    "handbag": ["womens-bags"], "handbags": ["womens-bags"], "purse": ["womens-bags"],
    "bag": ["womens-bags"], "bags": ["womens-bags"],
    "sunglasses": ["sunglasses"], "shades": ["sunglasses"],
    "jewellery": ["womens-jewellery"], "jewelry": ["womens-jewellery"],
    "necklace": ["womens-jewellery"], "ring": ["womens-jewellery"], "earrings": ["womens-jewellery"],
    "watch": ["mens-watches", "womens-watches"], "watches": ["mens-watches", "womens-watches"],
    "lamp": ["home-decoration", "furniture"], "lighting": ["home-decoration"],
    "furniture": ["furniture"], "sofa": ["furniture"], "couch": ["furniture"],
    "chair": ["furniture"], "table": ["furniture"],
    "grocery": ["groceries"], "groceries": ["groceries"], "food": ["groceries"],
    "kitchen": ["kitchen-accessories"],
    "motorcycle": ["motorcycle"], "motorbike": ["motorcycle"],
    "vehicle": ["vehicle"], "car": ["vehicle"], "truck": ["vehicle"],
    "sports": ["sports-accessories"], "sport": ["sports-accessories"],
}

_PRICE_ASC = ["lowest price", "lowest-price", "price low to high", "low to high", "cheapest", "least expensive"]
_PRICE_DESC = ["highest price", "highest-price", "price high to low", "high to low", "most expensive", "dearest"]

_QUALITY = ["highly rated", "top rated", "top-rated", "well rated", "best", "great", "excellent", "good"]
_DEAL = ["on sale", "deals", "deal", "sale", "discounted", "discounts", "discount", "clearance", "bargain", "promo", "promotion"]
_CHEAP = ["low cost", "low-cost", "cheap", "budget", "affordable", "inexpensive", "economical"]
_PREMIUM = ["high end", "high-end", "premium", "expensive", "luxury", "luxurious"]

_STOPWORDS = {"a", "an", "the", "for", "with", "and", "of", "in", "on", "to",
              "me", "some", "any", "please", "show", "find", "want"}


def _strip(pattern, s):
    return re.sub(pattern, " ", s)


def _extract_price(s):
    min_price = max_price = None

    m = re.search(r"\bbetween\s+" + _NUM + r"\s+and\s+" + _NUM, s)
    if m:
        min_price, max_price = float(m.group(1)), float(m.group(2))
        s = _strip(r"\bbetween\s+" + _NUM + r"\s+and\s+" + _NUM, s)
    else:
        m = re.search(r"\$" + r"\s*(\d+(?:\.\d+)?)\s*[-–]\s*\$\s*(\d+(?:\.\d+)?)", s)
        if m:
            min_price, max_price = float(m.group(1)), float(m.group(2))
            s = _strip(r"\$\s*\d+(?:\.\d+)?\s*[-–]\s*\$\s*\d+(?:\.\d+)?", s)

    m = re.search(r"\b(?:under|below|less than|cheaper than|up to|at most)\s+" + _NUM, s)
    if m:
        max_price = float(m.group(1))
        s = _strip(r"\b(?:under|below|less than|cheaper than|up to|at most)\s+" + _NUM, s)

    m = re.search(r"\b(?:over|above|more than|at least|minimum|min)\s+" + _NUM, s)
    if m:
        min_price = float(m.group(1))
        s = _strip(r"\b(?:over|above|more than|at least|minimum|min)\s+" + _NUM, s)

    return min_price, max_price, s


def parse_query(raw, valid_slugs=None):
    biases = {"rating": 0.0, "discount": 0.0, "price": None}
    min_rating = None

    s = " " + (raw or "").lower().strip() + " "
    min_price, max_price, s = _extract_price(s)

    # Explicit price-sort phrases first, stripped before the keyword rules so subwords
    for phrase in _PRICE_ASC:
        if re.search(r"\b" + re.escape(phrase) + r"\b", s):
            biases["price"] = "asc"
            s = _strip(r"\b" + re.escape(phrase) + r"\b", s)

    for phrase in _PRICE_DESC:
        if re.search(r"\b" + re.escape(phrase) + r"\b", s):
            biases["price"] = "desc"
            s = _strip(r"\b" + re.escape(phrase) + r"\b", s)

    for phrase in _CHEAP:
        if re.search(r"\b" + re.escape(phrase) + r"\b", s):
            biases["price"] = "asc"
            biases["discount"] += 0.5
            if max_price is None:
                max_price = PRICE_CHEAP_CAP
            s = _strip(r"\b" + re.escape(phrase) + r"\b", s)

    for phrase in _PREMIUM:
        if re.search(r"\b" + re.escape(phrase) + r"\b", s):
            biases["price"] = "desc"
            if min_price is None:
                min_price = PRICE_PREMIUM_FLOOR
            s = _strip(r"\b" + re.escape(phrase) + r"\b", s)

    for phrase in _QUALITY:
        if re.search(r"\b" + re.escape(phrase) + r"\b", s):
            min_rating = QUALITY_MIN_RATING
            biases["rating"] += 1.0
            s = _strip(r"\b" + re.escape(phrase) + r"\b", s)

    for phrase in _DEAL:
        if re.search(r"\b" + re.escape(phrase) + r"\b", s):
            biases["discount"] += 1.0
            s = _strip(r"\b" + re.escape(phrase) + r"\b", s)

    categories = []

    def add(slugs):
        for slug in slugs:
            if slug not in categories:
                categories.append(slug)

    for phrase, slugs in _CATEGORY_PHRASES:
        if re.search(r"\b" + re.escape(phrase) + r"\b", s):
            add(slugs)
            s = _strip(r"\b" + re.escape(phrase) + r"\b", s)

    leftover = []
    for tok in re.findall(r"[a-z0-9]+", s):
        if tok in _CATEGORY_WORDS:
            add(_CATEGORY_WORDS[tok])
        elif tok not in _STOPWORDS:
            leftover.append(tok)

    if valid_slugs is not None:
        categories = [c for c in categories if c in valid_slugs]

    return {
        "categories": categories,
        "q": " ".join(leftover).strip(),
        "min_price": min_price,
        "max_price": max_price,
        "min_rating": min_rating,
        "biases": biases,
    }
