// Thin wrappers over the Riffle /api (same-origin JSON, session cookie).

async function request(method, path, body) {
    const opts = { method, credentials: "same-origin", headers: {} };
    if (body !== undefined) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(`/api${path}`, opts);
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    if (!res.ok) {
        const err = new Error((data && data.error) || res.statusText);
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data;
}

function deckQuery({ q, category, limit } = {}) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (category) p.set("category", category);
    if (limit) p.set("limit", limit);
    const s = p.toString();
    return s ? `?${s}` : "";
}

export const api = {
    me: () => request("GET", "/auth/me"),
    register: (body) => request("POST", "/auth/register", body),
    login: (body) => request("POST", "/auth/login", body),
    logout: () => request("POST", "/auth/logout"),

    categories: () => request("GET", "/categories"),
    parse: (q) => request("GET", `/parse?q=${encodeURIComponent(q)}`),
    deck: (opts) => request("GET", `/deck${deckQuery(opts)}`),

    swipe: (productId, direction) => request("POST", "/swipe", { product_id: productId, direction }),

    cart: () => request("GET", "/cart"),
    cartUpdate: (productId, qty) => request("PATCH", `/cart/${productId}`, { qty }),
    cartRemove: (productId) => request("DELETE", `/cart/${productId}`),

    secondThoughts: () => request("GET", "/second-thoughts"),
    promote: (productId) => request("POST", `/second-thoughts/${productId}/promote`),
    release: (productId) => request("DELETE", `/second-thoughts/${productId}`),

    reset: () => request("POST", "/reset"),
};
