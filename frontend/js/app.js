// App bootstrap: header + account menu, guarded routes, auth, session, router.

import { api } from "./api.js";
import * as router from "./router.js";
import { toast, confirmModal } from "./toast.js";
import { getState, subscribe, setUser, applyCounts } from "./state.js";
import { renderAuth, setIntended } from "./auth.js";

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

    menu.querySelector("[data-logout]").addEventListener("click", async () => {
        closeMenu();
        try { await api.logout(); } catch { /* ignore */ }
        setUser(null);
        applyCounts({ cart_count: 0, second_thoughts_count: 0 });
        toast("Signed out", { type: "info" });
        router.navigate("#/");
    });
    menu.querySelector("[data-reset]").addEventListener("click", () => {
        closeMenu();
        toast("Reset Swipes arrives in Step 18", { type: "info" });
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

router.register("/", (v) => placeholder(v, "RIFFLE", "decide as you go", "swipe-to-decide storefront"));
router.register("/login", (v) => {
    if (getState().user) { router.navigate("#/"); return; }
    renderAuth(v);
});
router.register("/deck", guard((v) => placeholder(v, "Deck", "The swipe deck lands here.", "Step 15")));
router.register("/cart", guard((v) => placeholder(v, "Cart", "Your cart lands here.", "Step 17")));
router.setDefault((v) => placeholder(v, "Not found", "That page doesn’t exist."));

document.getElementById("nav-cart").addEventListener("click", () => router.navigate("#/cart"));
document.getElementById("nav-tray").addEventListener("click", () =>
    toast("Second Thoughts drawer coming soon", { type: "info" })
);

window.riffle = { api, toast, confirmModal, state: getState() };

subscribe(renderHeader);
renderHeader(getState());

(async () => {
    try { setUser(await api.me()); } catch { setUser(null); }
    router.start();
    if (getState().user) api.secondThoughts().then(applyCounts).catch(() => {});
})();
