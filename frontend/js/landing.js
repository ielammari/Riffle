// Landing: two-column hero with a mock deck, value strip, how-it-works,
// alternating feature sections (CSS/SVG mocks), and a closing call to action.

import { api } from "./api.js";
import * as router from "./router.js";
import { setDeckSpec } from "./state.js";

const BOX_GLYPH = "M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5";

const SWIPES = [
    { label: "Swipe right", action: "Add to cart", cls: "is-right", arrow: "M5 12h14M13 6l6 6-6 6" },
    { label: "Swipe down", action: "Second Thoughts", cls: "is-down", arrow: "M12 5v14M6 13l6 6 6-6" },
    { label: "Swipe left", action: "Pass", cls: "is-left", arrow: "M19 12H5M11 6l-6 6 6 6" },
];

const VALUES = ["No recommendation AI", "Seen once per user", "Server-timed holds", "Live product data"];

const CONCEPTS = [
    { title: "Second Thoughts", body: "Not sure? Swipe down to hold it on a countdown. Promote it to the cart before time runs out, or let it go." },
    { title: "Seen once", body: "Every product appears a single time. Make the call and move on. No noise, no endless backtracking." },
    { title: "Ranked deck", body: "Best first. The deck is rule-ranked by rating and relevance, and depletes until it is empty." },
];

const FEATURES = [
    {
        kicker: "The deck",
        title: "One card at a time",
        body: "No grid, no infinite scroll. Riffle hands you a single product, full-screen. Swipe on a phone, or use the controls and arrow keys on a desktop. Decide, and the next card slides up.",
        media: mockDeck(),
    },
    {
        kicker: "Second Thoughts",
        title: "A timed holding area",
        body: "On the fence? Send a card down to Second Thoughts. It waits on a live countdown that the server keeps honest. Promote it to your cart before it runs out, or let it expire.",
        media: mockRing(),
    },
    {
        kicker: "Ranked and fair",
        title: "Best first, seen once",
        body: "The deck is rule-ranked by rating, reviews, stock and your search intent, then filtered so you never see the same product twice. Reset your swipes anytime to start the deck over while keeping your cart.",
        media: mockRank(),
    },
];

function categorySpec(slug) {
    return { categories: [slug], q: "", min_price: null, max_price: null, min_rating: null, biases: { rating: 0, discount: 0, price: null } };
}

function mockDeck() {
    return '<div class="mock-deck" aria-hidden="true">' +
        '<div class="mock-card mock-card--b2"></div>' +
        '<div class="mock-card mock-card--b1"></div>' +
        '<div class="mock-card mock-card--top">' +
        `<div class="mock-card__img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${BOX_GLYPH}"/></svg></div>` +
        '<div class="mock-card__meta"><span class="mock-bar mock-bar--title"></span>' +
        '<div class="mock-card__row"><span class="mock-price">$129</span><span class="mock-rate">★ 4.8</span></div></div>' +
        "</div>" +
        '<span class="mock-cue mock-cue--left">PASS</span>' +
        '<span class="mock-cue mock-cue--down">SECOND&nbsp;THOUGHTS</span>' +
        '<span class="mock-cue mock-cue--right">ADD&nbsp;TO&nbsp;CART</span>' +
        "</div>";
}

function mockRing() {
    return '<div class="mock-ring" aria-hidden="true">' +
        '<svg viewBox="0 0 80 80">' +
        '<circle class="mock-ring__bg" cx="40" cy="40" r="32"/>' +
        '<circle class="mock-ring__fg" cx="40" cy="40" r="32" stroke-dasharray="201" stroke-dashoffset="74" transform="rotate(-90 40 40)"/>' +
        "</svg><span class=\"mock-ring__secs\">48</span><span class=\"mock-ring__label\">holding</span></div>";
}

function mockRank() {
    const rows = [1, 2, 3, 4].map((n) =>
        `<div class="mock-rankrow${n === 1 ? " is-top" : ""}"><span class="mock-rankrow__n">${n}</span>` +
        '<span class="mock-bar"></span></div>').join("");
    return `<div class="mock-rank" aria-hidden="true">${rows}</div>`;
}

export function renderLanding(view) {
    const root = document.createElement("section");
    root.className = "landing";
    root.innerHTML =
        '<div class="hero">' +
            '<div class="hero__copy">' +
                '<p class="hero__eyebrow">Swipe-to-decide storefront</p>' +
                '<h1 class="hero__title">RIFFLE</h1>' +
                '<p class="hero__tagline">decide as you go</p>' +
                '<p class="hero__pitch">One product at a time. Swipe right to cart, down to reconsider, left to pass. Every item seen once, best first.</p>' +
                '<form class="hero__search" role="search">' +
                    '<input class="hero__input" type="search" name="q" autocomplete="off" placeholder="Try cheap wireless headphones under 50" aria-label="Search products" />' +
                    '<button class="hero__go btn btn--primary" type="submit" aria-label="Search">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>' +
                    "</button>" +
                "</form>" +
                '<div class="chips" id="landing-chips" aria-label="Browse categories"><span class="chips__loading">Loading categories...</span></div>' +
            "</div>" +
            '<div class="hero__stage">' +
                '<div class="hero__glow" aria-hidden="true"></div>' +
                mockDeck() +
            "</div>" +
        "</div>" +

        '<ul class="values" aria-label="What makes Riffle different">' +
        VALUES.map((v) => `<li class="value">${v}</li>`).join("") +
        "</ul>" +

        '<section class="how" aria-label="How it works">' +
            '<h2 class="how__heading">How Riffle works</h2>' +
            '<div class="swipes">' +
            SWIPES.map((s) =>
                `<div class="swipe-card ${s.cls}">` +
                `<svg class="swipe-card__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${s.arrow}"/></svg>` +
                `<span class="swipe-card__label">${s.label}</span><span class="swipe-card__action">${s.action}</span></div>`
            ).join("") +
            "</div>" +
        "</section>" +

        '<section class="features" aria-label="Features">' +
        FEATURES.map((f, i) =>
            `<article class="feature${i % 2 ? " feature--reverse" : ""}">` +
            `<div class="feature__media">${f.media}</div>` +
            '<div class="feature__text">' +
            `<p class="feature__kicker">${f.kicker}</p>` +
            `<h3 class="feature__title">${f.title}</h3>` +
            `<p class="feature__body">${f.body}</p></div></article>`
        ).join("") +
        "</section>" +

        '<section class="concepts" aria-label="In short">' +
        CONCEPTS.map((c) => `<div class="concept"><h3 class="concept__title">${c.title}</h3><p class="concept__body">${c.body}</p></div>`).join("") +
        "</section>" +

        '<section class="cta">' +
            '<div class="cta__glow" aria-hidden="true"></div>' +
            '<h2 class="cta__title">Ready to decide?</h2>' +
            '<p class="cta__sub">Start a deck. Swipe through what is in stock, hold your maybes, and check out when you are done.</p>' +
            '<button type="button" class="btn btn--primary cta__btn">Start swiping</button>' +
        "</section>";

    view.appendChild(root);

    root.querySelector(".hero__search").addEventListener("submit", async (e) => {
        e.preventDefault();
        const q = root.querySelector(".hero__input").value.trim();
        if (!q) return;
        try { setDeckSpec(await api.parse(q)); } catch { setDeckSpec(null); }
        router.navigate(`#/deck?q=${encodeURIComponent(q)}`);
    });

    root.querySelector(".cta__btn").addEventListener("click", () => router.navigate("#/deck"));

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
