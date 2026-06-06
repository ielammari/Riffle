# Live USD-based FX rates, cached ~daily, with fallbacks so prices never break.
# Prices are stored/served in USD; the client converts for display.

import time

import requests

from backend.config import Config

_TTL_SECONDS = 24 * 3600

# Last-resort static rates (approximate) used only if every source is unreachable
# on a cold start. Keeps the app usable offline; refreshed as soon as a source works.
_STATIC = {
    "USD": 1.0, "EUR": 0.92, "GBP": 0.79, "JPY": 155.0,
    "MAD": 10.0, "KRW": 1370.0, "CAD": 1.36, "AUD": 1.52, "INR": 83.0,
}

_cache = {"rates": None, "ts": 0.0, "source": None}


def _fetch_primary():
    # ExchangeRate-API open endpoint
    r = requests.get("https://open.er-api.com/v6/latest/USD", timeout=Config.REQUEST_TIMEOUT)
    r.raise_for_status()
    data = r.json()
    if data.get("result") == "success" and isinstance(data.get("rates"), dict):
        return data["rates"], "ExchangeRate-API"
    raise ValueError("unexpected primary rates response")


def _fetch_fallback():
    # Frankfurter (ECB data)
    r = requests.get("https://api.frankfurter.dev/v2/latest?base=USD", timeout=Config.REQUEST_TIMEOUT)
    r.raise_for_status()
    data = r.json()
    rates = data.get("rates")
    if isinstance(rates, dict) and rates:
        return rates, "Frankfurter"
    raise ValueError("unexpected fallback rates response")


def get_rates(force=False):
    """
    Served from cache for ~a day. On a miss, try primary then fallback; if both fail,
    keep the last cached rates, or the static table if there is nothing cached yet.
    """
    now = time.time()
    if not force and _cache["rates"] and now - _cache["ts"] < _TTL_SECONDS:
        return {"rates": _cache["rates"], "source": _cache["source"], "as_of": _cache["ts"]}

    for fetch in (_fetch_primary, _fetch_fallback):
        try:
            rates, source = fetch()
            rates = dict(rates)
            rates["USD"] = 1.0
            _cache.update(rates=rates, ts=now, source=source)
            break
        except (requests.RequestException, ValueError):
            continue

    if _cache["rates"] is None:
        _cache.update(rates=dict(_STATIC), ts=now, source="static fallback")

    return {"rates": _cache["rates"], "source": _cache["source"], "as_of": _cache["ts"]}
