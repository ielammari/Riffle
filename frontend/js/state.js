// Shared client state: session user + live header counters.

import { api } from "./api.js";
import { applyAppearance, clearStoredAppearance } from "./appearance.js";

const state = {
    user: null,
    counts: { cart_count: 0, second_thoughts_count: 0 },
};

const subscribers = new Set();

export function getState() {
    return state;
}

export function subscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

function notify() {
    subscribers.forEach((fn) => fn(state));
}

export function setUser(user) {
    state.user = user;
    clearCartSelection();
    notify();
}

// ---- Cart selection: which items will be checked out. Default is "buy everything". ----
const cartSelection = new Set();   // product ids currently selected
const cartSeen = new Set();        // ids already accounted for, so new ones can default to selected

export function clearCartSelection() {
    cartSelection.clear();
    cartSeen.clear();
}

// Reconcile against the current cart: drop ids no longer present, and start any
// newly-added item selected (keeps the default of all-selected).
export function syncCartSelection(ids) {
    const present = new Set(ids);
    for (const id of cartSeen) {
        if (!present.has(id)) { cartSeen.delete(id); cartSelection.delete(id); }
    }
    for (const id of ids) {
        if (!cartSeen.has(id)) { cartSeen.add(id); cartSelection.add(id); }
    }
}

export function isCartSelected(id) { return cartSelection.has(id); }

export function setCartSelected(id, on) {
    if (on) cartSelection.add(id); else cartSelection.delete(id);
}

export function selectAllCart(ids, on) {
    for (const id of ids) { if (on) cartSelection.add(id); else cartSelection.delete(id); }
}

// Removal drops the id; returns whether it was selected (for undo to restore).
export function dropCartSelection(id) {
    const was = cartSelection.has(id);
    cartSelection.delete(id);
    cartSeen.delete(id);
    return was;
}

// Undo: re-account the id and restore its exact prior selection state.
export function restoreCartSelection(id, wasSelected) {
    cartSeen.add(id);
    if (wasSelected) cartSelection.add(id); else cartSelection.delete(id);
}

// Accepts any payload that may carry counters (swipe/cart/tray/reset responses).
export function applyCounts(payload) {
    if (!payload) return;
    if ("cart_count" in payload) state.counts.cart_count = payload.cart_count;
    else if ("count" in payload) state.counts.cart_count = payload.count;
    if ("second_thoughts_count" in payload) {
        state.counts.second_thoughts_count = payload.second_thoughts_count;
    }
    notify();
}

// App-level Second-Thoughts expiry watch
let stTimer = null;
let stSyncing = false;

function clearStTimer() {
    if (stTimer) { clearTimeout(stTimer); stTimer = null; }
}

function scheduleSecondThoughts(data) {
    clearStTimer();
    const serverNow = Date.parse(data && data.server_now);
    let soonest = Infinity;
    for (const it of (data && data.items) || []) {
        const exp = Date.parse(it.expires_at);
        if (exp) soonest = Math.min(soonest, exp);
    }
    if (!serverNow || soonest === Infinity) return;
    // Both timestamps are server-clock, so the gap is skew-free
    stTimer = setTimeout(syncSecondThoughts, Math.max(0, soonest - serverNow) + 250);
}

export async function syncSecondThoughts() {
    stTimer = null;
    if (stSyncing) return;
    stSyncing = true;
    try {
        const data = await api.secondThoughts();
        applyCounts(data);
        scheduleSecondThoughts(data);
    } catch { /* will retry on the next state change */ }
    finally { stSyncing = false; }
}

// Start the watch when items exist but nothing is scheduled.
subscribe((s) => {
    if (!s.user || s.counts.second_thoughts_count <= 0) { clearStTimer(); return; }
    if (!stTimer && !stSyncing) syncSecondThoughts();
});

export async function refreshSession() {
    try {
        state.user = await api.me();
    } catch {
        state.user = null;
    }
    if (state.user) {
        try { await syncSecondThoughts(); } catch { /* offline */ }
        try {
            const d = await api.settings();
            applyAppearance(d.settings);
        } catch { /* offline */ }
    } else {
        state.counts = { cart_count: 0, second_thoughts_count: 0 };
        clearStoredAppearance();
    }
    notify();
}
