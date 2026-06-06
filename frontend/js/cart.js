// Cart page: selectable line items, qty steppers, remove+undo, partial checkout.

import { api } from "./api.js";
import { toast } from "./toast.js";
import {
    applyCounts,
    syncCartSelection, isCartSelected, setCartSelected, selectAllCart,
    dropCartSelection, restoreCartSelection,
} from "./state.js";
import { openDetail } from "./detail.js";
import { esc } from "./format.js";
import { formatMoney, ratesReady } from "./currency.js";

const TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
const MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

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

    await ratesReady();
    draw();

    function ids() { return data.items.map((it) => it.id); }
    function selected() { return data.items.filter((it) => isCartSelected(it.id)); }

    function refreshCount() {
        const cnt = root.querySelector(".cart__count");
        if (cnt) cnt.textContent = `${data.count} item${data.count === 1 ? "" : "s"}`;
    }

    // Checkout total/CTA reflect ONLY the selected items.
    function refreshSummary() {
        const sel = selected();
        const totalUSD = sel.reduce((s, it) => s + (it.line_total || 0), 0);
        const label = root.querySelector(".cart__subtotal-label");
        const val = root.querySelector(".cart__subtotal-val");
        const btn = root.querySelector(".cart__checkout");
        if (label) label.textContent = `Subtotal · ${sel.length} item${sel.length === 1 ? "" : "s"}`;
        if (val) val.textContent = formatMoney(totalUSD, data.currency);
        if (btn) btn.disabled = sel.length === 0;
    }

    function refreshSelectAll() {
        const box = root.querySelector("#cart-select-all");
        if (!box) return;
        const total = data.items.length;
        const sel = selected().length;
        box.checked = sel > 0 && sel === total;
        box.indeterminate = sel > 0 && sel < total;
    }

    function emptyState() {
        root.innerHTML =
            '<header class="cart__head"><h1 class="cart__title">Your cart</h1></header>' +
            '<div class="cart__state"><h2 class="cart__state-title">Your cart is empty</h2>' +
            '<p class="cart__state-sub">Swipe right on a product, or promote one from Second Thoughts, to add it here.</p>' +
            '<button type="button" class="btn btn--primary cart__browse">Browse</button></div>';
        root.querySelector(".cart__browse").addEventListener("click", () => { location.hash = "#/"; });
    }

    function draw() {
        if (!data.items.length) { emptyState(); return; }
        syncCartSelection(ids());   // new items default selected; gone ids drop out
        root.innerHTML =
            '<header class="cart__head"><h1 class="cart__title">Your cart</h1><span class="cart__count"></span></header>' +
            '<div class="cart__selectall"><input type="checkbox" class="cart-check" id="cart-select-all" />' +
            '<label for="cart-select-all" class="cart__selectall-label">Select all</label></div>' +
            '<ul class="cart__list"></ul>' +
            '<footer class="cart__summary">' +
            '<div class="cart__subtotal"><span class="cart__subtotal-label"></span><span class="cart__subtotal-val"></span></div>' +
            '<button type="button" class="btn btn--primary cart__checkout">Checkout</button>' +
            '<p class="cart__note">Checkout is a demo stub for now.</p></footer>';
        const list = root.querySelector(".cart__list");
        data.items.forEach((it) => list.appendChild(row(it)));
        refreshCount();
        refreshSummary();
        refreshSelectAll();

        const selectAll = root.querySelector("#cart-select-all");
        selectAll.addEventListener("change", () => {
            selectAllCart(ids(), selectAll.checked);
            root.querySelectorAll(".cart-item__check").forEach((cb) => {
                cb.checked = isCartSelected(Number(cb.dataset.id));
            });
            refreshSummary();
            refreshSelectAll();
        });
        root.querySelector(".cart__checkout").addEventListener("click", checkout);
    }

    function row(it) {
        const li = document.createElement("li");
        li.className = "cart-item";
        li.dataset.id = it.id;
        li.innerHTML =
            `<input type="checkbox" class="cart-check cart-item__check" data-id="${it.id}" aria-label="Select ${esc(it.title || "product")}" />` +
            `<button type="button" class="cart-item__open" aria-label="View details for ${esc(it.title || "product")}">` +
            `<span class="cart-item__media"><img src="${esc((it.images && it.images[0]) || "")}" alt="" /></span>` +
            '<span class="cart-item__info"><span class="cart-item__title"></span><span class="cart-item__unit"></span></span></button>' +
            '<div class="cart-item__controls">' +
            `<div class="cart-item__qty"><button type="button" class="qty-btn" data-act="dec" aria-label="Decrease quantity">${MINUS}</button>` +
            `<span class="qty-val">${it.qty}</span>` +
            `<button type="button" class="qty-btn" data-act="inc" aria-label="Increase quantity">${PLUS}</button></div>` +
            '<div class="cart-item__line"></div>' +
            `<button type="button" class="cart-item__remove" aria-label="Remove from cart">${TRASH}</button></div>`;
        li.querySelector(".cart-item__title").textContent = it.title || "";
        li.querySelector(".cart-item__unit").textContent = `${formatMoney(it.price, it.currency)} each`;
        li.querySelector(".cart-item__line").textContent = formatMoney(it.line_total, it.currency);

        const check = li.querySelector(".cart-item__check");
        check.checked = isCartSelected(it.id);
        check.addEventListener("change", () => {
            setCartSelected(it.id, check.checked);
            refreshSummary();
            refreshSelectAll();
        });

        li.querySelector(".cart-item__open").addEventListener("click", () => openDetail(it));
        li.querySelector('[data-act="inc"]').addEventListener("click", () => changeQty(it.id, li, +1));
        // At qty 1 the minus stays clickable and removes the item (same remove path).
        li.querySelector('[data-act="dec"]').addEventListener("click", () => {
            const q = parseInt(li.querySelector(".qty-val").textContent, 10) || 1;
            if (q <= 1) removeItem(it, li);
            else changeQty(it.id, li, -1);
        });
        li.querySelector(".cart-item__remove").addEventListener("click", () => removeItem(it, li));
        return li;
    }

    async function changeQty(id, li, delta) {
        const current = parseInt(li.querySelector(".qty-val").textContent, 10) || 1;
        const next = current + delta;
        if (next < 1) return;
        const btns = li.querySelectorAll("button");
        btns.forEach((b) => (b.disabled = true));
        try {
            data = await api.cartUpdate(id, next);
            applyCounts(data);
            const it = data.items.find((x) => x.id === id);
            if (it) {
                li.querySelector(".qty-val").textContent = it.qty;
                li.querySelector(".cart-item__line").textContent = formatMoney(it.line_total, it.currency);
            }
            refreshCount();
            refreshSummary();
        } catch {
            toast("Could not update the quantity.", { type: "error" });
        } finally {
            btns.forEach((b) => (b.disabled = false));
        }
    }

    async function removeItem(it, li) {
        const qty = parseInt(li.querySelector(".qty-val").textContent, 10) || it.qty || 1;
        li.querySelectorAll("button").forEach((b) => (b.disabled = true));
        const cb = li.querySelector(".cart-item__check");
        if (cb) cb.disabled = true;
        try {
            data = await api.cartRemove(it.id);
        } catch {
            li.querySelectorAll("button").forEach((b) => (b.disabled = false));
            if (cb) cb.disabled = false;
            toast("Could not remove the item.", { type: "error" });
            return;
        }
        const wasSelected = dropCartSelection(it.id);   // drop from selection, remember for undo
        applyCounts(data);
        li.classList.add("cart-item--out");
        setTimeout(() => {
            li.remove();
            if (!data.items.length) emptyState();
        }, 220);
        refreshCount();
        refreshSummary();
        refreshSelectAll();
        toast("Removed from cart", {
            type: "info",
            duration: 6000,
            actionLabel: "Undo",
            onAction: () => undoRemove(it, qty, wasSelected),
        });
    }

    async function undoRemove(it, qty, wasSelected) {
        try {
            const restored = await api.cartAdd(it.id, qty, it.added_at);
            data = restored;
            applyCounts(data);
            restoreCartSelection(it.id, wasSelected);   // bring back its prior selection state
            draw();
        } catch {
            toast("Could not undo. Please try again.", { type: "error" });
        }
    }

    async function checkout() {
        const sel = selected().map((it) => it.id);
        if (!sel.length) return;
        const btn = root.querySelector(".cart__checkout");
        btn.disabled = true;
        try {
            data = await api.checkout(sel);   // removes only the selected items server-side
            applyCounts(data);
            sel.forEach(dropCartSelection);
            toast(`Checked out ${sel.length} item${sel.length === 1 ? "" : "s"}`, { type: "success" });
            draw();
        } catch {
            btn.disabled = false;
            toast("Checkout failed. Please try again.", { type: "error" });
        }
    }
}
