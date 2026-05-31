// Settings page: per-user preferences (deck size, ranking, timer, currency, accent, motion).
// Functional knobs persist on Save; appearance previews live so the change is visible.

import { api } from "./api.js";
import { toast } from "./toast.js";
import { setSettings } from "./state.js";
import { applyAppearance, accentList } from "./appearance.js";

function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function fmtDur(s) {
    s = Number(s) || 0;
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return r ? `${m}m ${r}s` : `${m}m`;
}

export async function renderSettings(view) {
    const root = document.createElement("section");
    root.className = "settings";
    root.innerHTML =
        '<header class="settings__head"><h1 class="settings__title">Settings</h1>' +
        '<p class="settings__sub">Tune Riffle to your taste. Changes apply to your account.</p></header>' +
        '<div class="settings__skeleton"></div>';
    view.appendChild(root);

    let data;
    try {
        data = await api.settings();
    } catch {
        root.innerHTML =
            '<header class="settings__head"><h1 class="settings__title">Settings</h1></header>' +
            '<div class="settings__state"><h2 class="settings__state-title">Could not load settings</h2>' +
            '<p class="settings__state-sub">Please try again.</p>' +
            '<button type="button" class="btn btn--primary">Try again</button></div>';
        root.querySelector("button").addEventListener("click", () => { view.innerHTML = ""; renderSettings(view); });
        return;
    }

    const schema = data.schema;
    const current = { ...data.settings };
    setSettings(current);

    const rankOpts = schema.ranking.options
        .map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("");
    const curOpts = schema.currency.options
        .map((o) => `<option value="${esc(o)}">${esc(o)}</option>`).join("");
    const swatches = accentList()
        .map((a) => `<button type="button" class="swatch" data-accent="${esc(a.value)}" aria-label="${esc(a.label)}" title="${esc(a.label)}"><span class="swatch__dot" style="background:${esc(a.color)}"></span><span class="swatch__name">${esc(a.label)}</span></button>`).join("");

    root.innerHTML =
        '<header class="settings__head"><h1 class="settings__title">Settings</h1>' +
        '<p class="settings__sub">Tune Riffle to your taste. Changes apply to your account.</p></header>' +

        '<section class="settings__group"><h2 class="settings__group-title">Deck</h2>' +
        '<div class="setting">' +
        '<div class="setting__label"><span>Deck size</span><span class="setting__hint">How many cards each search or category serves.</span></div>' +
        `<div class="setting__control range"><input type="range" id="set-deck" min="${schema.deck_limit.min}" max="${schema.deck_limit.max}" step="1" value="${current.deck_limit}" /><output class="range__out" id="out-deck">${current.deck_limit}</output></div>` +
        "</div>" +
        '<div class="setting">' +
        '<div class="setting__label"><span>Ranking</span><span class="setting__hint">How the deck is ordered, on top of your search.</span></div>' +
        `<div class="setting__control"><select id="set-rank" class="select">${rankOpts}</select></div>` +
        "</div></section>" +

        '<section class="settings__group"><h2 class="settings__group-title">Second Thoughts</h2>' +
        '<div class="setting">' +
        '<div class="setting__label"><span>Hold timer</span><span class="setting__hint">How long a held item stays before it expires.</span></div>' +
        `<div class="setting__control range"><input type="range" id="set-ttl" min="${schema.st_seconds.min}" max="${schema.st_seconds.max}" step="5" value="${current.st_seconds}" /><output class="range__out" id="out-ttl">${fmtDur(current.st_seconds)}</output></div>` +
        "</div></section>" +

        '<section class="settings__group"><h2 class="settings__group-title">Display</h2>' +
        '<div class="setting">' +
        '<div class="setting__label"><span>Currency</span><span class="setting__hint">Symbol shown on prices.</span></div>' +
        `<div class="setting__control"><select id="set-cur" class="select">${curOpts}</select></div>` +
        "</div></section>" +

        '<section class="settings__group"><h2 class="settings__group-title">Appearance</h2>' +
        '<div class="setting">' +
        '<div class="setting__label"><span>Accent</span><span class="setting__hint">The glow color across the app.</span></div>' +
        `<div class="setting__control swatches" id="set-accent">${swatches}</div>` +
        "</div>" +
        '<div class="setting">' +
        '<div class="setting__label"><span>Motion</span><span class="setting__hint">Turn off animated transitions and the swipe fling.</span></div>' +
        '<div class="setting__control toggle" id="set-motion" role="group" aria-label="Motion">' +
        '<button type="button" class="toggle__opt" data-motion="on">On</button>' +
        '<button type="button" class="toggle__opt" data-motion="off">Off</button>' +
        "</div></div></section>" +

        '<footer class="settings__actions">' +
        '<button type="button" class="btn btn--ghost" id="set-cancel">Discard changes</button>' +
        '<button type="button" class="btn btn--primary" id="set-save">Save changes</button>' +
        "</footer>";

    const deck = root.querySelector("#set-deck");
    const outDeck = root.querySelector("#out-deck");
    const ttl = root.querySelector("#set-ttl");
    const outTtl = root.querySelector("#out-ttl");
    const rank = root.querySelector("#set-rank");
    const cur = root.querySelector("#set-cur");
    const save = root.querySelector("#set-save");

    rank.value = current.ranking;
    cur.value = current.currency;

    function markAccent() {
        root.querySelectorAll(".swatch").forEach((b) =>
            b.classList.toggle("is-active", b.dataset.accent === current.accent));
    }
    function markMotion() {
        root.querySelectorAll("#set-motion .toggle__opt").forEach((b) =>
            b.classList.toggle("is-active", b.dataset.motion === current.motion));
    }
    markAccent();
    markMotion();

    deck.addEventListener("input", () => { current.deck_limit = Number(deck.value); outDeck.textContent = deck.value; });
    ttl.addEventListener("input", () => { current.st_seconds = Number(ttl.value); outTtl.textContent = fmtDur(ttl.value); });
    rank.addEventListener("change", () => { current.ranking = rank.value; });
    cur.addEventListener("change", () => { current.currency = cur.value; });

    root.querySelectorAll(".swatch").forEach((b) =>
        b.addEventListener("click", () => {
            current.accent = b.dataset.accent;
            markAccent();
            applyAppearance(current); // live preview
        }));
    root.querySelectorAll("#set-motion .toggle__opt").forEach((b) =>
        b.addEventListener("click", () => {
            current.motion = b.dataset.motion;
            markMotion();
            applyAppearance(current); // live preview
        }));

    root.querySelector("#set-cancel").addEventListener("click", () => {
        Object.assign(current, data.settings);
        applyAppearance(current);
        view.innerHTML = "";
        renderSettings(view);
    });

    save.addEventListener("click", async () => {
        save.disabled = true;
        const original = save.textContent;
        save.textContent = "Saving…";
        try {
            const res = await api.settingsUpdate(current);
            setSettings(res.settings);
            applyAppearance(res.settings);
            data.settings = { ...res.settings };
            Object.assign(current, res.settings);
            toast("Settings saved", { type: "success" });
        } catch {
            toast("Could not save settings. Please try again.", { type: "error" });
        } finally {
            save.disabled = false;
            save.textContent = original;
        }
    });
}
