// Landing: hero, search (primary CTA), category chips, how-it-works explainer.

import { api } from "./api.js";
import * as router from "./router.js";
import { setDeckSpec } from "./state.js";

const SWIPES = [
    { label: "Swipe right", action: "Add to cart", cls: "is-right", arrow: "M5 12h14M13 6l6 6-6 6" },
    { label: "Swipe down", action: "Second Thoughts", cls: "is-down", arrow: "M12 5v14M6 13l6 6 6-6" },
    { label: "Swipe left", action: "Pass", cls: "is-left", arrow: "M19 12H5M11 6l-6 6 6 6" },
];

const CONCEPTS = [
    { title: "Second Thoughts", body: "Not sure? Swipe down to hold it on a countdown. Promote it to the cart before time runs out, or let it go." },
    { title: "Seen once", body: "Every product appears a single time. Make the call and move on. No noise, no endless backtracking." },
    { title: "Ranked deck", body: "Best first. The deck is rule-ranked by rating and relevance, and depletes until it’s empty." },
];

function categorySpec(slug) {
    return { categories: [slug], q: "", min_price: null, max_price: null, min_rating: null, biases: { rating: 0, discount: 0, price: null } };
}

export function renderLanding(view) {
    const root = document.createElement("section");
    root.className = "landing";
    root.innerHTML =
        '<div class="hero">' +
            '<div class="hero__glow" aria-hidden="true"></div>' +
            '<h1 class="hero__title">RIFFLE</h1>' +
            '<p class="hero__tagline">decide as you go</p>' +
            '<p class="hero__pitch">One product at a time. Swipe right to cart, down to reconsider, left to pass. Every item seen once, best first.</p>' +
            '<form class="hero__search" role="search">' +
                '<input class="hero__input" type="search" name="q" autocomplete="off" placeholder="Try “cheap wireless headphones under 50”" aria-label="Search products" />' +
                '<button class="hero__go btn btn--primary" type="submit" aria-label="Search">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
                "</button>" +
            "</form>" +
            '<div class="chips" id="landing-chips" aria-label="Browse categories"><span class="chips__loading">Loading categories…</span></div>' +
        "</div>" +
        '<section class="how" aria-label="How it works">' +
            '<h2 class="how__heading">How Riffle works</h2>' +
            '<div class="swipes">' +
            SWIPES.map((s) =>
                `<div class="swipe-card ${s.cls}">` +
                `<svg class="swipe-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${s.arrow}"/></svg>` +
                `<span class="swipe-card__label">${s.label}</span><span class="swipe-card__action">${s.action}</span></div>`
            ).join("") +
            "</div>" +
            '<div class="concepts">' +
            CONCEPTS.map((c) => `<div class="concept"><h3 class="concept__title">${c.title}</h3><p class="concept__body">${c.body}</p></div>`).join("") +
            "</div>" +
        "</section>";
    view.appendChild(root);

    root.querySelector(".hero__search").addEventListener("submit", async (e) => {
        e.preventDefault();
        const q = root.querySelector(".hero__input").value.trim();
        if (!q) return;
        try { setDeckSpec(await api.parse(q)); } catch { setDeckSpec(null); }
        router.navigate(`#/deck?q=${encodeURIComponent(q)}`);
    });

    loadChips(root.querySelector("#landing-chips"));
}

async function loadChips(container) {
    try {
        const cats = await api.categories();
        container.innerHTML = "";
        cats.forEach((c) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip";
            chip.textContent = c.name;
            chip.addEventListener("click", () => {
                setDeckSpec(categorySpec(c.slug));
                router.navigate(`#/deck?category=${encodeURIComponent(c.slug)}`);
            });
            container.appendChild(chip);
        });
    } catch {
        container.innerHTML = '<span class="chips__loading">Categories unavailable right now.</span>';
    }
}
