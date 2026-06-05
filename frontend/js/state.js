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
    notify();
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
