// Cart page: hydrated line items, qty steppers, remove, subtotal, checkout stub.

import { api } from "./api.js";
import { toast } from "./toast.js";
import { applyCounts } from "./state.js";

const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
const MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
function fmt(n) { return Number(n || 0).toFixed(2); }

export async function renderCart(view) {
    const root = document.createElement("section");
    root.className = "cart";
    root.innerHTML = '<header class="cart__head"><h1 class="cart__title">Your cart</h1></header><div class="cart__skeleton"></div>';
    view.appendChild(root);

    let data;
    try {
        data = await api.cart();
        applyCounts(data);
    } catch {
        root.innerHTML =
            '<div class="cart__state"><h2 class="cart__state-title">Could not load your cart</h2>' +
            '<p class="cart__state-sub">Something went wrong reaching the store. Please try again.</p>' +
            '<button type="button" class="btn btn--primary">Try again</button></div>';
        root.querySelector("button").addEventListener("click", () => { view.innerHTML = ""; renderCart(view); });
        return;
    }

    draw(data);

    function setSummary(d) {
        const sub = root.querySelector(".cart__subtotal-val");
        const cnt = root.querySelector(".cart__count");
        if (sub) sub.textContent = `${d.currency}${fmt(d.subtotal)}`;
        if (cnt) cnt.textContent = `${d.count} item${d.count === 1 ? "" : "s"}`;
    }

    function emptyState() {
        root.innerHTML =
            '<header class="cart__head"><h1 class="cart__title">Your cart</h1></header>' +
            '<div class="cart__state"><h2 class="cart__state-title">Your cart is empty</h2>' +
            '<p class="cart__state-sub">Swipe right on a product, or promote one from Second Thoughts, to add it here.</p>' +
            '<button type="button" class="btn btn--primary cart__browse">Browse</button></div>';
        root.querySelector(".cart__browse").addEventListener("click", () => { location.hash = "#/"; });
    }

    function draw(d) {
        if (!d.items.length) { emptyState(); return; }
        root.innerHTML =
            '<header class="cart__head"><h1 class="cart__title">Your cart</h1><span class="cart__count"></span></header>' +
            '<ul class="cart__list"></ul>' +
            '<footer class="cart__summary">' +
            '<div class="cart__subtotal"><span class="cart__subtotal-label">Subtotal</span><span class="cart__subtotal-val"></span></div>' +
            '<button type="button" class="btn btn--primary cart__checkout">Checkout</button>' +
            '<p class="cart__note">Checkout is a demo stub for now.</p></footer>';
        const list = root.querySelector(".cart__list");
        d.items.forEach((it) => list.appendChild(row(it)));
        setSummary(d);
        root.querySelector(".cart__checkout").addEventListener("click", () => toast("Checkout is a demo stub for now.", { type: "info" }));
    }

    function row(it) {
        const li = document.createElement("li");
        li.className = "cart-item";
        li.dataset.id = it.id;
        li.innerHTML =
            `<div class="cart-item__media"><img src="${esc((it.images && it.images[0]) || "")}" alt="" /></div>` +
            '<div class="cart-item__info"><p class="cart-item__title"></p><p class="cart-item__unit"></p></div>' +
            '<div class="cart-item__controls">' +
            `<div class="cart-item__qty"><button type="button" class="qty-btn" data-act="dec" aria-label="Decrease quantity">${MINUS}</button>` +
            `<span class="qty-val">${it.qty}</span>` +
            `<button type="button" class="qty-btn" data-act="inc" aria-label="Increase quantity">${PLUS}</button></div>` +
            '<div class="cart-item__line"></div>' +
            `<button type="button" class="cart-item__remove" aria-label="Remove from cart">${TRASH}</button></div>`;
        li.querySelector(".cart-item__title").textContent = it.title || "";
        li.querySelector(".cart-item__unit").textContent = `${it.currency}${fmt(it.price)} each`;
        li.querySelector(".cart-item__line").textContent = `${it.currency}${fmt(it.line_total)}`;
        li.querySelector('[data-act="dec"]').disabled = it.qty <= 1;

        li.querySelector('[data-act="inc"]').addEventListener("click", () => changeQty(it.id, li, +1));
        li.querySelector('[data-act="dec"]').addEventListener("click", () => changeQty(it.id, li, -1));
        li.querySelector(".cart-item__remove").addEventListener("click", () => removeItem(it.id, li));
        return li;
    }

    async function changeQty(id, li, delta) {
        const current = parseInt(li.querySelector(".qty-val").textContent, 10) || 1;
        const next = current + delta;
        if (next < 1) return;
        const btns = li.querySelectorAll("button");
        btns.forEach((b) => (b.disabled = true));
        try {
            const d = await api.cartUpdate(id, next);
            applyCounts(d);
            const it = d.items.find((x) => x.id === id);
            if (it) {
                li.querySelector(".qty-val").textContent = it.qty;
                li.querySelector(".cart-item__line").textContent = `${it.currency}${fmt(it.line_total)}`;
            }
            setSummary(d);
        } catch {
            toast("Could not update the quantity.", { type: "error" });
        } finally {
            btns.forEach((b) => (b.disabled = false));
            const q = parseInt(li.querySelector(".qty-val").textContent, 10) || 1;
            li.querySelector('[data-act="dec"]').disabled = q <= 1;
        }
    }

    async function removeItem(id, li) {
        li.querySelectorAll("button").forEach((b) => (b.disabled = true));
        try {
            const d = await api.cartRemove(id);
            applyCounts(d);
            setSummary(d);
            li.classList.add("cart-item--out");
            setTimeout(() => {
                li.remove();
                if (!d.items.length) emptyState();
            }, 220);
            toast("Removed from cart", { type: "info" });
        } catch {
            li.querySelectorAll("button").forEach((b) => (b.disabled = false));
            toast("Could not remove the item.", { type: "error" });
        }
    }
}
