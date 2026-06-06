# GET /api/rates: USD-based FX rates for the supported currencies (public).

from flask import Blueprint, jsonify

from backend import rates as rates_store
from backend.config import Config

bp = Blueprint("rates", __name__, url_prefix="/api")


@bp.get("/rates")
def rates():
    data = rates_store.get_rates()
    table = data["rates"]
    supported = {c: table[c] for c in Config.CURRENCY_OPTIONS if table.get(c)}
    supported["USD"] = 1.0
    return jsonify({"base": "USD", "rates": supported, "source": data["source"], "as_of": data["as_of"]})
