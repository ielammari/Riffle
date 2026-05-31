// Deck view: fetch the deck and drive it by swipe (phones) or side controls (desktop).

import { api } from "./api.js";
import { createCard } from "./card.js";
import { makeSwipeable } from "./swipe.js";
import { applyCounts } from "./state.js";
import { toast } from "./toast.js";

const ICONS = {
    pass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6 18 18M18 6 6 18"/></svg>',
    hold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5 11-12"/></svg>',
};
const DIRECTION = { pass: "left", hold: "down", cart: "right" };
const KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down" };

function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function contextLabel(query) {
    if (query.q) return `Results for “${query.q}”`;
    if (query.category) return query.category.replace(/-/g, " ");
    return "Your deck";
}

function actBtn(kind, label, cls) {
    return (
        `<button type="button" class="act ${cls}" data-kind="${kind}" aria-label="${label}">` +
        `<span class="act__icon">${ICONS[kind]}</span><span class="act__label">${label}</span></button>`
    );
}

function stateBox(title, sub, btnLabel, onClick) {
    const box = document.createElement("div");
    box.className = "deck__state";
    box.innerHTML =
        `<h2 class="deck__state-title">${title}</h2>` +
        `<p class="deck__state-sub">${sub}</p>` +
        `<button type="button" class="btn btn--primary deck__state-btn">${btnLabel}</button>`;
    box.querySelector("button").addEventListener("click", onClick);
    return box;
}

export async function renderDeck(view, query) {
    const deck = document.createElement("section");
    deck.className = "deck";
    deck.innerHTML =
        `<p class="deck__context">${esc(contextLabel(query))}</p>` +
        '<div class="deck__arena">' +
        actBtn("pass", "Pass", "act--pass") +
        '<div class="deck__stack" aria-live="polite"><div class="deck__skeleton"></div><span class="sr-only">Loading deck</span></div>' +
        actBtn("cart", "Add to cart", "act--cart") +
        actBtn("hold", "Second Thoughts", "act--hold") +
        "</div>" +
        '<p class="deck__hint">Swipe the card: right to cart, down to hold, left to pass.</p>';
    view.appendChild(deck);

    const stack = deck.querySelector(".deck__stack");
    const buttons = [...deck.querySelectorAll(".act")];
    const setEnabled = (on) => buttons.forEach((b) => { b.disabled = !on; });
    setEnabled(false);

    let items = [];
    let i = 0;
    let controller = null;

    try {
        const data = await api.deck({ q: query.q, category: query.category, limit: 12 });
        items = (data && data.items) || [];
    } catch {
        stack.innerHTML = "";
        stack.appendChild(stateBox("Could not load the deck",
            "Something went wrong reaching the store. Please try again.",
            "Try again", () => { view.innerHTML = ""; renderDeck(view, query); }));
        return;
    }

    function show() {
        stack.innerHTML = "";
        if (i >= items.length) {
            controller = null;
            setEnabled(false);
            stack.appendChild(stateBox("That is the whole deck",
                "You have seen everything here. Try another search or category.",
                "Browse", () => { location.hash = "#/"; }));
            return;
        }
        const card = createCard(items[i]);
        stack.appendChild(card);
        controller = makeSwipeable(card, onDecision);
        setEnabled(true);
    }

    async function onDecision(dir) {
        const card = items[i];
        if (!card) return;
        setEnabled(false);
        try {
            applyCounts(await api.swipe(card.id, dir));
            i += 1;
        } catch {
            toast("Could not record that. Please try again.", { type: "error" });
        }
        show();
    }

    buttons.forEach((b) =>
        b.addEventListener("click", () => controller && controller.flick(DIRECTION[b.dataset.kind]))
    );

    const onKey = (e) => {
        if (!deck.isConnected) { document.removeEventListener("keydown", onKey); return; }
        const dir = KEYS[e.key];
        if (dir && controller) { e.preventDefault(); controller.flick(dir); }
    };
    document.addEventListener("keydown", onKey);

    show();
}
