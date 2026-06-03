// App bootstrap: header + account menu, guarded routes, auth, session, router.

import { api } from "./api.js";
import * as router from "./router.js";
import { toast, confirmModal } from "./toast.js";
import { getState, subscribe, setUser, applyCounts } from "./state.js";
import { renderAuth, setIntended } from "./auth.js";
import { renderLanding } from "./landing.js";
import { renderDeck } from "./deck.js";
import { openTray } from "./secondThoughts.js";
import { renderCart } from "./cart.js";
import { renderSettings } from "./settings.js";
import { applyAppearance, applyStoredAppearance, clearStoredAppearance } from "./appearance.js";
import { toggleCategories, closeCategories } from "./categories.js";

applyStoredAppearance();

function setBadge(node, n) {
    if (n > 0) { node.textContent = n; node.hidden = false; }
    else { node.hidden = true; }
}

function accountMenu(username) {
    const frag = document.createDocumentFragment();
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "account__btn";
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = username;

    const menu = document.createElement("div");
    menu.className = "account__menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    menu.innerHTML =
        '<div class="account__menu-head">Signed in as <strong></strong></div>' +
        '<button type="button" class="account__item" role="menuitem" data-settings>Settings</button>' +
        '<button type="button" class="account__item" role="menuitem" data-reset>Reset Swipes</button>' +
        '<button type="button" class="account__item account__item--danger" role="menuitem" data-logout>Logout</button>';
    menu.querySelector("strong").textContent = username;

    const onOutside = (e) => {
        if (e.target !== btn && !btn.contains(e.target) && !menu.contains(e.target)) closeMenu();
    };
    const onKey = (e) => { if (e.key === "Escape") { closeMenu(); btn.focus(); } };
    function openMenu() {
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        document.addEventListener("click", onOutside);
        document.addEventListener("keydown", onKey);
    }
    function closeMenu() {
        menu.hidden = true;
        btn.setAttribute("aria-expanded", "false");
        document.removeEventListener("click", onOutside);
        document.removeEventListener("keydown", onKey);
    }
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.hidden ? openMenu() : closeMenu();
    });

    menu.querySelector("[data-settings]").addEventListener("click", () => {
        closeMenu();
        router.navigate("#/settings");
    });
    menu.querySelector("[data-logout]").addEventListener("click", async () => {
        closeMenu();
        try { await api.logout(); } catch { /* ignore */ }
        setUser(null);
        clearStoredAppearance();
        applyCounts({ cart_count: 0, second_thoughts_count: 0 });
        toast("Signed out", { type: "info" });
        router.navigate("#/");
    });
    menu.querySelector("[data-reset]").addEventListener("click", async () => {
        closeMenu();
        const ok = await confirmModal({
            title: "Reset swipes?",
            message: "This clears your deck history and Second Thoughts, so products you passed or held can show up again. Your cart is kept.",
            confirmLabel: "Reset swipes",
            cancelLabel: "Cancel",
        });
        if (!ok) return;
        try {
            applyCounts(await api.reset());
            router.navigate("#/");
            toast("Swipes Reset", { type: "success" });
        } catch {
            toast("Could not reset right now. Please try again.", { type: "error" });
        }
    });

    frag.append(btn, menu);
    return frag;
}

function renderHeader(state) {
    setBadge(document.getElementById("cart-badge"), state.counts.cart_count);
    setBadge(document.getElementById("tray-badge"), state.counts.second_thoughts_count);

    const account = document.getElementById("account");
    account.innerHTML = "";
    if (state.user) {
        account.appendChild(accountMenu(state.user.username));
    } else {
        const a = document.createElement("a");
        a.href = "#/login";
        a.className = "account__login";
        a.textContent = "Log in";
        account.appendChild(a);
    }
}

function placeholder(view, title, sub, chip) {
    const section = document.createElement("section");
    section.className = "placeholder";
    const h = document.createElement("h1");
    h.className = "placeholder__title";
    h.textContent = title;
    const p = document.createElement("p");
    p.className = "placeholder__sub";
    p.textContent = sub;
    section.append(h, p);
    if (chip) {
        const c = document.createElement("span");
        c.className = "placeholder__chip";
        c.textContent = chip;
        section.appendChild(c);
    }
    view.appendChild(section);
}

function guard(handler) {
    return (view, query) => {
        if (!getState().user) {
            setIntended(location.hash || "#/deck");
            router.navigate("#/login");
            return;
        }
        return handler(view, query);
    };
}

router.register("/", (v) => renderLanding(v));
router.register("/login", (v) => {
    if (getState().user) { router.navigate("#/"); return; }
    renderAuth(v);
});
router.register("/deck", guard((v, query) => renderDeck(v, query)));
router.register("/cart", guard((v) => renderCart(v)));
router.register("/settings", guard((v) => renderSettings(v)));
router.setDefault((v) => placeholder(v, "Not found", "That page doesn’t exist."));

const browseBtn = document.getElementById("nav-browse");
if (browseBtn) {
    browseBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleCategories(browseBtn); });
    // Close the category panel whenever the route changes.
    window.addEventListener("hashchange", () => closeCategories(browseBtn));
}
document.getElementById("nav-cart").addEventListener("click", () => router.navigate("#/cart"));
document.getElementById("nav-tray").addEventListener("click", () => {
    if (getState().user) openTray();
    else router.navigate("#/login");
});

document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-social]");
    if (s) toast("Social links are placeholders in this demo.", { type: "info" });
});

subscribe(renderHeader);
renderHeader(getState());

(async () => {
    try { setUser(await api.me()); } catch { setUser(null); }
    router.start();
    if (getState().user) {
        api.secondThoughts().then(applyCounts).catch(() => {});
        api.settings().then((d) => applyAppearance(d.settings)).catch(() => {});
    }
})();
