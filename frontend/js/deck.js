// Deck view: buffered card stack (top + 2 rear), swipe/controls/keyboard, refill on low.

import { api } from "./api.js";
import { createCard } from "./card.js";
import { makeSwipeable } from "./swipe.js";
import { applyCounts } from "./state.js";
import { toast } from "./toast.js";
import { esc } from "./format.js";
import { ratesReady } from "./currency.js";

const ICONS = {
    pass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6 18 18M18 6 6 18"/></svg>',
    hold: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5 11-12"/></svg>',
};
const DIRECTION = { pass: "left", hold: "down", cart: "right" };
const KEYS = { ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down" };
const WINDOW = 3;
const REFILL_AT = 3;

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
    let slots = []; // index 0 = top card; objects { el, item, controller }
    let refilling = false;
    let exhausted = false;
    let cap = Infinity; // deck-size: max cards in this set

    try {
        const data = await api.deck({ q: query.q, category: query.category });
        items = (data && data.items) || [];
        cap = (data && data.limit) || items.length;
        await ratesReady();
    } catch {
        stack.innerHTML = "";
        stack.appendChild(stateBox("Could not load the deck",
            "Something went wrong reaching the store. Please try again.",
            "Try again", () => { view.innerHTML = ""; renderDeck(view, query); }));
        return;
    }

    function newCard(item, pos) {
        const el = createCard(item);
        let controller = null;
        if (pos === 0) {
            controller = makeSwipeable(el, onDecision);
        } else {
            el.classList.add("card--rear", `card--pos-${pos}`);
            el.inert = true;
        }
        stack.appendChild(el);
        return { el, item, controller };
    }

    function renderEnd() {
        slots = [];
        stack.innerHTML = "";
        setEnabled(false);
        if (refilling) {
            const sk = document.createElement("div");
            sk.className = "deck__skeleton";
            stack.appendChild(sk);
        } else {
            stack.appendChild(stateBox("That is the whole deck",
                "You have seen everything here. Try another search or category.",
                "Browse", () => { location.hash = "#/"; }));
        }
    }

    function backfill() {
        while (slots.length < WINDOW && i + slots.length < items.length) {
            slots.push(newCard(items[i + slots.length], slots.length));
        }
    }

    function mount() {
        stack.innerHTML = "";
        slots = [];
        if (i >= items.length) { renderEnd(); return; }
        const n = Math.min(WINDOW, items.length - i);
        for (let p = n - 1; p >= 0; p--) slots[p] = newCard(items[i + p], p);
        setEnabled(true);
    }

    function promote() {
        const flung = slots.shift();
        if (flung && flung.el) flung.el.remove();
        slots.forEach((slot, idx) => {
            slot.el.classList.remove("card--rear", "card--pos-1", "card--pos-2");
            if (idx === 0) {
                slot.el.inert = false;
                if (!slot.controller) slot.controller = makeSwipeable(slot.el, onDecision);
            } else {
                slot.el.classList.add("card--rear", `card--pos-${idx}`);
            }
        });
        if (slots.length === 0 && i < items.length) slots[0] = newCard(items[i], 0);
        backfill();
        if (slots.length === 0) renderEnd();
        else setEnabled(true);
    }

    async function onDecision(dir) {
        const top = slots[0];
        if (!top) return;
        setEnabled(false);
        try {
            applyCounts(await api.swipe(top.item.id, dir));
            i += 1;
            promote();
            maybeRefill();
        } catch {
            toast("Could not record that. Please try again.", { type: "error" });
            mount();
        }
    }

    async function maybeRefill() {
        if (exhausted || refilling || items.length - i > REFILL_AT) return;
        // Deck size is the cap for the set: never grow past it, so the deck depletes at 'cap'
        if (items.length >= cap) { exhausted = true; return; }
        refilling = true;
        try {
            const data = await api.deck({ q: query.q, category: query.category });
            const have = new Set(items.map((x) => x.id));
            const fresh = ((data && data.items) || []).filter((x) => !have.has(x.id));
            const add = fresh.slice(0, Math.max(0, cap - items.length));
            if (!add.length) exhausted = true;
            else {
                items.push(...add);
                backfill();
                if (slots.length) setEnabled(true);
            }
        } catch { /* will retry on next decision */ }
        refilling = false;
        if (!slots.length) (i < items.length ? mount() : renderEnd());
    }

    buttons.forEach((b) =>
        b.addEventListener("click", () => slots[0] && slots[0].controller && slots[0].controller.flick(DIRECTION[b.dataset.kind]))
    );

    const onKey = (e) => {
        if (!deck.isConnected) { document.removeEventListener("keydown", onKey); return; }
        const dir = KEYS[e.key];
        if (dir && slots[0] && slots[0].controller) { e.preventDefault(); slots[0].controller.flick(dir); }
    };
    document.addEventListener("keydown", onKey);

    mount();
}
