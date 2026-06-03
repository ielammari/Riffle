// Category browser: a slide-down panel of plain category titles (no pills),
// opened from the header "Browse" button. Titles fade in one after another.

import { api } from "./api.js";
import * as router from "./router.js";
import { esc } from "./format.js";

let panel = null;
let cache = null;

export function toggleCategories(btn) {
    if (panel) { closeCategories(); return; }
    openCategories(btn);
}

async function openCategories(btn) {
    const root = document.createElement("div");
    root.className = "cat-overlay";
    root.innerHTML =
        '<div class="cat-overlay__scrim" data-close></div>' +
        '<section class="cat-panel" id="cat-panel" role="dialog" aria-modal="true" aria-label="Browse categories">' +
        '<p class="cat-panel__eyebrow">Browse</p>' +
        '<ul class="cat-list"><li class="cat-list__loading">Loading categories...</li></ul>' +
        "</section>";
    document.body.appendChild(root);
    panel = root;
    if (btn) btn.setAttribute("aria-expanded", "true");

    const onKey = (e) => { if (e.key === "Escape") closeCategories(btn); };
    root.querySelector("[data-close]").addEventListener("click", () => closeCategories(btn));
    document.addEventListener("keydown", onKey);
    root._onKey = onKey;
    root._btn = btn;

    requestAnimationFrame(() => root.classList.add("cat-overlay--in"));

    const list = root.querySelector(".cat-list");
    try {
        if (!cache) cache = await api.categories();
    } catch {
        list.innerHTML = '<li class="cat-list__loading">Categories unavailable right now.</li>';
        return;
    }
    if (!panel) return; // closed while loading

    list.innerHTML = "";
    cache.forEach((c, i) => {
        const li = document.createElement("li");
        li.className = "cat-list__item";
        li.style.setProperty("--i", i);
        const a = document.createElement("button");
        a.type = "button";
        a.className = "cat-link";
        a.innerHTML = `<span class="cat-link__index">${String(i + 1).padStart(2, "0")}</span><span class="cat-link__name">${esc(c.name)}</span>`;
        a.addEventListener("click", () => {
            closeCategories(btn);
            router.navigate(`#/deck?category=${encodeURIComponent(c.slug)}`);
        });
        li.appendChild(a);
        list.appendChild(li);
    });
}

export function closeCategories(btn) {
    if (!panel) return;
    const root = panel;
    panel = null;
    document.removeEventListener("keydown", root._onKey);
    (btn || root._btn)?.setAttribute("aria-expanded", "false");
    root.classList.remove("cat-overlay--in");
    root.classList.add("cat-overlay--out");
    setTimeout(() => root.remove(), 300);
}
