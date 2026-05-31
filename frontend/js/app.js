// App bootstrap: header wiring, placeholder routes, session + router start.

import { api } from "./api.js";
import * as router from "./router.js";
import { toast, confirmModal } from "./toast.js";
import { getState, subscribe, refreshSession } from "./state.js";

function setBadge(node, n) {
    if (n > 0) { node.textContent = n; node.hidden = false; }
    else { node.hidden = true; }
}

function renderHeader(state) {
    setBadge(document.getElementById("cart-badge"), state.counts.cart_count);
    setBadge(document.getElementById("tray-badge"), state.counts.second_thoughts_count);

    const account = document.getElementById("account");
    account.innerHTML = "";
    if (state.user) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "account__btn";
        btn.textContent = state.user.username;
        account.appendChild(btn); // full account menu arrives in Step 12
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

router.register("/", (v) => placeholder(v, "RIFFLE", "decide as you go", "swipe-to-decide storefront"));
router.register("/deck", (v) => placeholder(v, "Deck", "The swipe deck lands here.", "Step 15"));
router.register("/cart", (v) => placeholder(v, "Cart", "Your cart lands here.", "Step 17"));
router.register("/login", (v) => placeholder(v, "Login", "Sign in / register lands here.", "Step 12"));
router.setDefault((v) => placeholder(v, "Not found", "That page doesn’t exist."));

document.getElementById("nav-cart").addEventListener("click", () => router.navigate("#/cart"));
document.getElementById("nav-tray").addEventListener("click", () =>
    toast("Second Thoughts drawer coming soon", { type: "info" })
);

subscribe(renderHeader);
renderHeader(getState());
router.start();
refreshSession();

// Dev/testing handle (used by Step 11 validation; superseded by real UI later).
window.riffle = { api, toast, confirmModal, state: getState() };
