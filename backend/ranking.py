# Deterministic deck ranking. Config-driven weights; parser biases nudge them.

from backend.config import Config


def _review_count(p):
    return len(p.get("reviews") or [])


def _query_match(p, qtokens):
    if not qtokens:
        return 1.0
    text = f"{p.get('title', '')} {p.get('description', '')}".lower()
    hits = sum(1 for t in qtokens if t in text)
    return hits / len(qtokens)


def _score(p, biases, qtokens, pmin, pmax):
    w = Config.RANKING_WEIGHTS
    rating = (p.get("rating") or 0) / 5.0
    review = min(_review_count(p) / 10.0, 1.0)
    in_stock = 1.0 if (p.get("stock") or 0) > 0 else 0.0
    discount = min((p.get("discountPercentage") or 0) / 100.0, 1.0)
    match = _query_match(p, qtokens)

    rating_w = w["rating"] + Config.RANKING_RATING_BIAS * biases.get("rating", 0.0)
    discount_w = w["discount"] + Config.RANKING_DISCOUNT_BIAS * biases.get("discount", 0.0)

    score = (
            rating_w * rating
            + w["review"] * review
            + w["stock"] * in_stock
            + discount_w * discount
            + w["query"] * match
    )

    price_pref = biases.get("price")
    if price_pref and pmax > pmin:
        norm = ((p.get("price") or 0) - pmin) / (pmax - pmin)
        if price_pref == "asc":
            score += Config.RANKING_PRICE_BIAS * (1.0 - norm)
        elif price_pref == "desc":
            score += Config.RANKING_PRICE_BIAS * norm

    return score


def rank(products, spec):
    if not products:
        return []
    biases = (spec or {}).get("biases") or {}
    qtokens = [t for t in ((spec or {}).get("q") or "").lower().split() if t]
    prices = [p.get("price") or 0 for p in products]
    pmin, pmax = min(prices), max(prices)

    scored = [(_score(p, biases, qtokens, pmin, pmax), p) for p in products]

    # An explicit price preference sorts by price first
    price_pref = biases.get("price")
    if price_pref == "asc":
        scored.sort(key=lambda sp: (sp[1].get("price") or 0, -sp[0], -_review_count(sp[1]), sp[1].get("id", 0)))
    elif price_pref == "desc":
        scored.sort(key=lambda sp: (-(sp[1].get("price") or 0), -sp[0], -_review_count(sp[1]), sp[1].get("id", 0)))
    else:
        scored.sort(key=lambda sp: (-sp[0], -_review_count(sp[1]), sp[1].get("id", 0)))
    return [p for _, p in scored]
