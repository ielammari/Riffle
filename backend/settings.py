# Per-user settings: load (defaults + stored overrides), validate, persist.
# Also exposes the option ranges so the UI never hardcodes them.

import copy

from backend.config import Config
from backend.extensions import db
from backend.models import UserSettings


def _clamp_int(value, lo, hi, fallback):
    try:
        return max(lo, min(int(value), hi))
    except (TypeError, ValueError):
        return fallback


def _validate(patch, base):
    out = dict(base)
    if "deck_limit" in patch:
        out["deck_limit"] = _clamp_int(patch["deck_limit"], Config.DECK_LIMIT_MIN, Config.DECK_LIMIT_MAX, base["deck_limit"])
    if "st_seconds" in patch:
        out["st_seconds"] = _clamp_int(patch["st_seconds"], Config.ST_TTL_MIN, Config.ST_TTL_MAX, base["st_seconds"])
    if "ranking" in patch and patch["ranking"] in Config.RANKING_PRESETS:
        out["ranking"] = patch["ranking"]
    if "currency" in patch and patch["currency"] in Config.CURRENCY_OPTIONS:
        out["currency"] = patch["currency"]
    if "theme" in patch and patch["theme"] in Config.THEME_OPTIONS:
        out["theme"] = patch["theme"]
    if "motion" in patch and patch["motion"] in ("on", "off"):
        out["motion"] = patch["motion"]
    return out


def get_settings(user_id):
    base = copy.deepcopy(Config.SETTINGS_DEFAULTS)
    row = db.session.get(UserSettings, user_id)
    if row and isinstance(row.data, dict):
        base = _validate(row.data, base)
    return base


def save_settings(user_id, patch):
    merged = _validate(patch or {}, get_settings(user_id))
    row = db.session.get(UserSettings, user_id)
    if row is None:
        db.session.add(UserSettings(user_id=user_id, data=merged))
    else:
        row.data = merged
    db.session.commit()
    return merged


def settings_schema():
    # Ranges/options the Settings page renders controls from.
    return {
        "deck_limit": {"min": Config.DECK_LIMIT_MIN, "max": Config.DECK_LIMIT_MAX},
        "st_seconds": {"min": Config.ST_TTL_MIN, "max": Config.ST_TTL_MAX},
        "ranking": {"options": [
            {"value": "balanced", "label": "Balanced"},
            {"value": "top_rated", "label": "Top rated"},
            {"value": "best_deals", "label": "Best deals"},
            {"value": "low_price", "label": "Lowest price"},
        ]},
        "currency": {"options": Config.CURRENCY_OPTIONS},
        "theme": {"options": Config.THEME_OPTIONS},
        "motion": {"options": ["on", "off"]},
    }


def apply_ranking_preset(spec, preset):
    # Overlay a ranking preset onto a resolved deck spec (adds to query intent, never erases it).
    rule = Config.RANKING_PRESETS.get(preset)
    if not rule:
        return spec
    biases = dict(spec.get("biases") or {})
    if "rating" in rule:
        biases["rating"] = (biases.get("rating") or 0.0) + rule["rating"]
    if "discount" in rule:
        biases["discount"] = (biases.get("discount") or 0.0) + rule["discount"]
    if rule.get("price") and not biases.get("price"):
        biases["price"] = rule["price"]
    spec["biases"] = biases
    if rule.get("min_rating") is not None:
        cur = spec.get("min_rating")
        spec["min_rating"] = rule["min_rating"] if cur is None else max(cur, rule["min_rating"])
    return spec
