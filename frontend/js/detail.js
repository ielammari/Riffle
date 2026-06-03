// Product detail spotlight: a centered modal over a dimmed backdrop showing the full product.
// Shared by the deck card (info button), the cart, and Second Thoughts.

import { esc, money } from "./format.js";

const ARROW_L = "M15 18l-6-6 6-6";
const ARROW_R = "M9 6l6 6-6 6";
const STAR = "M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9 6.2 20.9l1.1-6.47L2.6 9.85l6.5-.95z";

let openInstance = null;

// Mono eyebrow above the title: brand if known, else the category slug made readable.
function eyebrow(c) {
    if (c.brand) return c.brand;
    if (c.category) return String(c.category).replace(/-/g, " ");
    return "Product";
}

function ratingHTML(c) {
    const r = c.rating != null ? Number(c.rating).toFixed(2) : "n/a";
    return '<div class="detail__rating" title="Rating">' +
        `<svg class="detail__star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${STAR}"/></svg>` +
        `<span class="detail__rate-val">${r}</span>` +
        `<span class="detail__rate-count">(${c.review_count || 0} reviews)</span></div>`;
}
function priceHTML(c) {
    const cur = esc(c.currency || "");
    const orig = c.original_price && c.original_price > c.price
        ? `<span class="detail__orig">${cur}${money(c.original_price)}</span>` : "";
    const off = c.discount_percentage > 0
        ? `<span class="detail__off">-${Math.round(c.discount_percentage)}%</span>` : "";
    return `<div class="detail__price"><span class="detail__now">${cur}${money(c.price)}</span>${orig}${off}</div>`;
}
function stockHTML(c) {
    const s = c.stock || 0;
    let label, cls;
    if (s <= 0) { label = "Out of stock"; cls = "is-out"; }
    else if (s <= 10) { label = `Low stock, ${s} left`; cls = "is-low"; }
    else { label = c.availability_status || "In stock"; cls = "is-in"; }
    return `<span class="detail__stock ${cls}">${esc(label)}</span>`;
}
function specsHTML(c) {
    const specs = c.specs || [];
    if (!specs.length) return "";
    return '<dl class="detail__specs"><h3 class="detail__specs-title">Details</h3>' +
        specs.map((s) => `<div class="spec"><dt>${esc(s.label)}</dt><dd>${esc(String(s.value))}</dd></div>`).join("") +
        "</dl>";
}

export function openDetail(card) {
    if (openInstance || !card) return;
    const images = Array.isArray(card.images) && card.images.length ? card.images : [];
    let idx = 0;

    const root = document.createElement("div");
    root.className = "detail";
    root.innerHTML =
        '<div class="detail__scrim" data-close></div>' +
        '<div class="detail__dialog" role="dialog" aria-modal="true" aria-label="Product details">' +
        '<button type="button" class="detail__close" data-close aria-label="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6 18 18M18 6 6 18"/></svg></button>' +
        '<div class="detail__media">' +
        `<img class="detail__img" alt="${esc(card.title || "Product image")}" src="${esc(images[0] || "")}" draggable="false" />` +
        (card.discount_percentage > 0 ? `<span class="detail__badge">-${Math.round(card.discount_percentage)}%</span>` : "") +
        "</div>" +
        '<div class="detail__body">' +
        `<p class="detail__eyebrow">${esc(eyebrow(card))}</p>` +
        '<h2 class="detail__title"></h2>' +
        ratingHTML(card) +
        '<div class="detail__meta">' + priceHTML(card) + stockHTML(card) + "</div>" +
        '<p class="detail__desc"></p>' +
        specsHTML(card) +
        "</div></div>";

    root.querySelector(".detail__title").textContent = card.title || "";
    root.querySelector(".detail__desc").textContent = card.description || "No description available.";

    if (images.length > 1) {
        const media = root.querySelector(".detail__media");
        const mkBtn = (dir, label, path) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = `detail__nav detail__nav--${dir}`;
            b.setAttribute("aria-label", label);
            b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
            return b;
        };
        const img = root.querySelector(".detail__img");
        const prev = mkBtn("prev", "Previous image", ARROW_L);
        const next = mkBtn("next", "Next image", ARROW_R);
        const counter = document.createElement("span");
        counter.className = "detail__counter";
        counter.setAttribute("aria-live", "polite");
        const show = (i) => {
            idx = (i + images.length) % images.length;
            img.src = images[idx];
            counter.textContent = `${idx + 1} / ${images.length}`;
        };
        prev.addEventListener("click", () => show(idx - 1));
        next.addEventListener("click", () => show(idx + 1));
        counter.textContent = `1 / ${images.length}`;
        media.append(prev, next, counter);
    }

    document.body.appendChild(root);
    openInstance = root;
    const prevFocus = document.activeElement;

    const close = () => {
        document.removeEventListener("keydown", onKey);
        root.classList.remove("detail--in");
        root.classList.add("detail--out");
        setTimeout(() => {
            root.remove();
            openInstance = null;
            if (prevFocus && prevFocus.focus) prevFocus.focus();
        }, 200);
    };
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); close(); } };
    root.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", close));
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
        root.classList.add("detail--in");
        root.querySelector(".detail__close").focus();
    });
}
