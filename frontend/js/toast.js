// Styled toast + confirm modal. Replaces native alert/confirm/prompt.

const ICONS = {
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
};

export function toast(message, { type = "info", duration = 4000, actionLabel, onAction } = {}) {
    const region = document.getElementById("toast-region");
    if (!region) return () => {};

    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.innerHTML =
        `<span class="toast__icon">${ICONS[type] || ICONS.info}</span>` +
        `<span class="toast__msg"></span>` +
        (actionLabel ? `<button class="toast__action" type="button"></button>` : "") +
        `<button class="toast__close" type="button" aria-label="Dismiss">✕</button>`;
    el.querySelector(".toast__msg").textContent = message;
    region.appendChild(el);

    let timer;
    const close = () => {
        clearTimeout(timer);
        el.classList.add("toast--out");
        setTimeout(() => el.remove(), 200);
    };
    if (actionLabel) {
        const action = el.querySelector(".toast__action");
        action.textContent = actionLabel;
        action.addEventListener("click", () => { close(); if (onAction) onAction(); });
    }
    el.querySelector(".toast__close").addEventListener("click", close);
    if (duration) timer = setTimeout(close, duration);
    return close;
}

export function confirmModal({
    title = "Are you sure?",
    message = "",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
} = {}) {
    return new Promise((resolve) => {
        const root = document.getElementById("modal-root");
        const prevFocus = document.activeElement;

        const wrap = document.createElement("div");
        wrap.className = "modal";
        wrap.innerHTML =
            '<div class="modal__scrim" data-close></div>' +
            '<div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
            '<h2 class="modal__title" id="modal-title"></h2>' +
            '<p class="modal__msg"></p>' +
            '<div class="modal__actions">' +
            '<button class="btn btn--ghost" type="button" data-cancel></button>' +
            `<button class="btn ${danger ? "btn--danger" : "btn--primary"}" type="button" data-confirm></button>` +
            "</div></div>";
        wrap.querySelector(".modal__title").textContent = title;
        wrap.querySelector(".modal__msg").textContent = message;
        wrap.querySelector("[data-cancel]").textContent = cancelLabel;
        wrap.querySelector("[data-confirm]").textContent = confirmLabel;
        root.appendChild(wrap);

        const focusable = wrap.querySelectorAll("button");
        const done = (value) => {
            document.removeEventListener("keydown", onKey);
            wrap.classList.remove("modal--in");
            wrap.classList.add("modal--out");
            setTimeout(() => {
                wrap.remove();
                if (prevFocus && prevFocus.focus) prevFocus.focus();
            }, 200);
            resolve(value);
        };
        const onKey = (e) => {
            if (e.key === "Escape") { e.preventDefault(); done(false); }
            else if (e.key === "Tab") {
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };

        wrap.querySelector("[data-confirm]").addEventListener("click", () => done(true));
        wrap.querySelector("[data-cancel]").addEventListener("click", () => done(false));
        wrap.querySelector("[data-close]").addEventListener("click", () => done(false));
        document.addEventListener("keydown", onKey);

        requestAnimationFrame(() => {
            wrap.classList.add("modal--in");
            wrap.querySelector("[data-confirm]").focus();
        });
    });
}
