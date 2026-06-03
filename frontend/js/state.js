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

export async function refreshSession() {
    try {
        state.user = await api.me();
    } catch {
        state.user = null;
    }
    if (state.user) {
        try { applyCounts(await api.secondThoughts()); } catch { /* offline */ }
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
