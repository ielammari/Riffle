// Login / register view: validation, password toggle, submit feedback.

import { api } from "./api.js";
import * as router from "./router.js";
import { toast } from "./toast.js";
import { refreshSession } from "./state.js";

let intended = null;

export function setIntended(hash) {
    intended = hash;
}

const FRIENDLY = {
    invalid_credentials: "Incorrect username or password.",
    username_taken: "That username is already taken.",
    email_taken: "That email is already registered.",
    username_and_password_required: "Enter a username and password.",
};

export function renderAuth(view) {
    let mode = "login";
    const root = document.createElement("section");
    root.className = "auth";
    view.appendChild(root);
    draw();

    function draw() {
        const login = mode === "login";
        root.innerHTML =
            '<aside class="auth__aside" aria-hidden="true">' +
            '<span class="auth__aside-eyebrow">Join us</span>' +
            '<p class="auth__aside-headline">Decide as you go</p>' +
            '<p class="auth__aside-note">One Swipe at a time.</p>' +
            "</aside>" +
            '<div class="auth__card">' +
            `<h1 class="auth__title">${login ? "Welcome back" : "Join Riffle"}</h1>` +
            `<p class="auth__sub">${login ? "Sign in to keep swiping." : "Create an account to start swiping."}</p>` +
            '<form class="auth__form" novalidate>' +
            '<div class="field"><label for="au-username">Username</label>' +
            '<input id="au-username" name="username" type="text" autocomplete="username" required /></div>' +
            (login ? "" :
                '<div class="field"><label for="au-email">Email <span class="field__opt">(optional)</span></label>' +
                '<input id="au-email" name="email" type="email" autocomplete="email" /></div>') +
            '<div class="field"><label for="au-password">Password</label>' +
            '<div class="field__pw"><input id="au-password" name="password" type="password" ' +
            `autocomplete="${login ? "current-password" : "new-password"}" required />` +
            '<button type="button" class="pw-toggle" aria-label="Show password" aria-pressed="false">Show</button></div></div>' +
            '<p class="auth__error" role="alert" aria-live="assertive" hidden></p>' +
            `<button type="submit" class="btn btn--primary auth__submit">${login ? "Log in" : "Create account"}</button>` +
            "</form>" +
            '<p class="auth__switch">' +
            (login ? "New to Riffle? " : "Already have an account? ") +
            `<button type="button" class="linkbtn" data-toggle>${login ? "Create an account" : "Log in"}</button></p>` +
            "</div>";
        wire(login);
    }

    function wire(login) {
        const form = root.querySelector("form");
        const errorEl = root.querySelector(".auth__error");
        const submit = root.querySelector(".auth__submit");
        const pw = root.querySelector("#au-password");
        const pwToggle = root.querySelector(".pw-toggle");

        root.querySelector("[data-toggle]").addEventListener("click", () => {
            mode = login ? "register" : "login";
            draw();
        });

        pwToggle.addEventListener("click", () => {
            const reveal = pw.type === "password";
            pw.type = reveal ? "text" : "password";
            pwToggle.textContent = reveal ? "Hide" : "Show";
            pwToggle.setAttribute("aria-pressed", String(reveal));
            pwToggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
        });

        form.querySelectorAll("input[required]").forEach((inp) => {
            inp.addEventListener("blur", () => {
                inp.classList.toggle("is-invalid", !inp.value.trim());
            });
        });

        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            errorEl.hidden = true;
            const data = Object.fromEntries(new FormData(form).entries());
            const username = (data.username || "").trim();
            const password = data.password || "";
            const email = (data.email || "").trim();
            if (!username || !password) {
                errorEl.textContent = "Enter a username and password.";
                errorEl.hidden = false;
                return;
            }

            const original = submit.textContent;
            submit.disabled = true;
            submit.classList.add("is-loading");
            submit.textContent = login ? "Signing in…" : "Creating…";
            try {
                const user = login
                    ? await api.login({ username, password })
                    : await api.register({ username, email: email || undefined, password });
                await refreshSession();
                toast(`Welcome, ${user.username}`, { type: "success" });
                const dest = intended || "#/deck";
                intended = null;
                router.navigate(dest);
            } catch (err) {
                errorEl.textContent = FRIENDLY[err.message] || "Something went wrong. Please try again.";
                errorEl.hidden = false;
                submit.disabled = false;
                submit.classList.remove("is-loading");
                submit.textContent = original;
            }
        });
    }
}
