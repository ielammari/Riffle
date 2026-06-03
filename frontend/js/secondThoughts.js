// Second Thoughts drawer: slide-over with live countdown rings, promote / let go, expiry fade.

import { api } from "./api.js";
import { toast } from "./toast.js";
import { applyCounts } from "./state.js";
import { openDetail } from "./detail.js";
import { esc, money } from "./format.js";

const RADIUS = 20;
const CIRC = 2 * Math.PI * RADIUS;
const CART_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5 11-12"/></svg>';
const X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6 18 18M18 6 6 18"/></svg>';

let openInstance = null;

function emptyHTML() {
    return '<div class="tray-empty"><p class="tray-empty__title">No second thoughts</p>' +
        '<p class="tray-empty__sub">Swipe a card down to hold it here on a countdown.</p></div>';
}

function makeRow(item) {
    const li = document.createElement("li");
    li.className = "tray-item";
    li.innerHTML =
        '<div class="tray-ring"><svg viewBox="0 0 48 48">' +
        `<circle class="tray-ring__bg" cx="24" cy="24" r="${RADIUS}"/>` +
        `<circle class="tray-ring__fg" cx="24" cy="24" r="${RADIUS}" stroke-dasharray="${CIRC}" stroke-dashoffset="0" transform="rotate(-90 24 24)"/>` +
        '</svg><span class="tray-ring__secs">--</span></div>' +
        `<button type="button" class="tray-item__open" aria-label="View details for ${esc(item.title || "product")}">` +
        `<span class="tray-item__media"><img src="${esc((item.images && item.images[0]) || "")}" alt="" /></span>` +
        '<span class="tray-item__info"><span class="tray-item__title"></span><span class="tray-item__price"></span></span></button>' +
        '<div class="tray-item__actions">' +
        `<button type="button" class="tray-act tray-act--promote" aria-label="Promote to cart">${CART_ICON}</button>` +
        `<button type="button" class="tray-act tray-act--release" aria-label="Let go">${X_ICON}</button></div>`;
    li.querySelector(".tray-item__title").textContent = item.title || "";
    li.querySelector(".tray-item__price").textContent = `${item.currency || ""}${money(item.price)}`;
    li.querySelector(".tray-item__open").addEventListener("click", () => openDetail(item));
    return {
        el: li,
        item,
        expiresMs: Date.parse(item.expires_at),
        secs: li.querySelector(".tray-ring__secs"),
        ring: li.querySelector(".tray-ring__fg"),
        promoteBtn: li.querySelector(".tray-act--promote"),
        releaseBtn: li.querySelector(".tray-act--release"),
        done: false,
    };
}

export async function openTray() {
    if (openInstance) return;

    const root = document.createElement("div");
    root.className = "drawer";
    root.innerHTML =
        '<div class="drawer__scrim" data-close></div>' +
        '<aside class="drawer__panel" role="dialog" aria-modal="true" aria-label="Second Thoughts">' +
        '<header class="drawer__head"><h2 class="drawer__title">Second Thoughts</h2>' +
        '<button type="button" class="drawer__close" data-close aria-label="Close">✕</button></header>' +
        '<div class="drawer__body" aria-live="polite"><div class="tray-empty"><p class="tray-empty__sub">Loading…</p></div></div>' +
        "</aside>";
    document.body.appendChild(root);
    openInstance = root;

    const body = root.querySelector(".drawer__body");
    const prevFocus = document.activeElement;
    let raf = null;

    const close = () => {
        if (raf) cancelAnimationFrame(raf);
        document.removeEventListener("keydown", onKey);
        root.classList.remove("drawer--in");
        root.classList.add("drawer--out");
        setTimeout(() => {
            root.remove();
            openInstance = null;
            if (prevFocus && prevFocus.focus) prevFocus.focus();
        }, 220);
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    root.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", close));
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => {
        root.classList.add("drawer--in");
        root.querySelector(".drawer__close").focus();
    });

    let serverNowMs = 0;
    let fetchedAt = 0;
    let ttl = 120;
    let rows = [];
    try {
        const data = await api.secondThoughts();
        serverNowMs = Date.parse(data.server_now);
        fetchedAt = performance.now();
        ttl = data.ttl || 120;
        rows = data.items || [];
        applyCounts(data);
    } catch {
        body.innerHTML = '<div class="tray-empty"><p class="tray-empty__sub">Could not load your Second Thoughts.</p></div>';
        return;
    }

    if (!rows.length) { body.innerHTML = emptyHTML(); return; }

    const list = document.createElement("ul");
    list.className = "tray-list";
    const entries = rows.map(makeRow);
    entries.forEach((e) => list.appendChild(e.el));
    body.innerHTML = "";
    body.appendChild(list);

    const activeCount = () => entries.filter((e) => !e.done).length;
    const syncCount = () => applyCounts({ second_thoughts_count: activeCount() });
    const maybeEmpty = () => { if (activeCount() === 0) setTimeout(() => { if (openInstance) body.innerHTML = emptyHTML(); }, 280); };

    function finishRow(e) {
        e.done = true;
        e.el.classList.add("tray-item--out");
        setTimeout(() => e.el.remove(), 240);
        syncCount();
        maybeEmpty();
    }

    function expire(e) {
        if (e.done) return;
        e.done = true;
        e.el.classList.add("tray-item--expired");
        e.secs.textContent = "0";
        e.promoteBtn.disabled = true;
        e.releaseBtn.disabled = true;
        syncCount();
        setTimeout(() => {
            if (!e.el.isConnected) return;
            e.el.classList.add("tray-item--out");
            setTimeout(() => e.el.remove(), 240);
            maybeEmpty();
        }, 1100);
    }

    entries.forEach((e) => {
        e.promoteBtn.addEventListener("click", async () => {
            e.promoteBtn.disabled = true; e.releaseBtn.disabled = true;
            try {
                applyCounts(await api.promote(e.item.id));
                toast(`Added “${e.item.title}” to cart`, { type: "success" });
                finishRow(e);
            } catch (err) {
                if (err.status === 409) { toast("That item already expired", { type: "error" }); expire(e); }
                else { toast("Could not promote. Please try again.", { type: "error" }); e.promoteBtn.disabled = false; e.releaseBtn.disabled = false; }
            }
        });
        e.releaseBtn.addEventListener("click", async () => {
            e.promoteBtn.disabled = true; e.releaseBtn.disabled = true;
            try {
                applyCounts(await api.release(e.item.id));
                toast("Let go", { type: "info" });
                finishRow(e);
            } catch (err) {
                if (err.status === 409) { toast("That item already expired", { type: "error" }); expire(e); }
                else { toast("Could not let go. Please try again.", { type: "error" }); e.promoteBtn.disabled = false; e.releaseBtn.disabled = false; }
            }
        });
    });

    function tick() {
        const now = serverNowMs + (performance.now() - fetchedAt);
        for (const e of entries) {
            if (e.done) continue;
            const remaining = e.expiresMs - now;
            if (remaining <= 0) { expire(e); continue; }
            e.secs.textContent = String(Math.ceil(remaining / 1000));
            const frac = Math.max(0, Math.min(1, remaining / (ttl * 1000)));
            e.ring.style.strokeDashoffset = String(CIRC * (1 - frac));
            e.ring.style.stroke = frac > 0.5 ? "var(--color-accent)" : frac > 0.2 ? "var(--color-hold)" : "var(--color-reject)";
        }
        raf = requestAnimationFrame(tick);
    }
    tick();
}
