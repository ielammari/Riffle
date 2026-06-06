// Currency conversion + formatting. Prices arrive from the API in USD.
// Conversion to the user's chosen currency with live FX rates and format with
// Intl.NumberFormat (correct symbol placement, per-currency decimals, separators).

import { api } from "./api.js";

let RATES = { USD: 1 };
let SOURCE = null;
let loading = null;

async function load() {
    try {
        const d = await api.rates();
        if (d && d.rates) {
            RATES = { ...d.rates, USD: 1 };
            SOURCE = d.source || null;
        }
    } catch { /* keep whatever we have (defaults to USD-only) */ }
}

// Load rates once; callers await this before rendering prices.
export function ratesReady() {
    return (loading ||= load());
}

export function ratesSource() {
    return SOURCE;
}

// Convert a USD amount to `code` and format it. Never mutates the base value.
export function formatMoney(usd, code) {
    const cur = code || "USD";
    const rate = RATES[cur] ?? 1;
    const amount = (Number(usd) || 0) * rate;
    try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: cur }).format(amount);
    } catch {
        // Unknown/unsupported code
        return `${amount.toFixed(2)} ${cur}`;
    }
}
