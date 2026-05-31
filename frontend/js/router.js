// Tiny hash router (#/path?query). Renders the matched view into #app-view.

const routes = new Map();
let fallback = null;

export function register(path, handler) {
    routes.set(path, handler);
}

export function setDefault(handler) {
    fallback = handler;
}

export function navigate(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
}

function parse() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, qs = ""] = raw.split("?");
    return { path: path || "/", query: Object.fromEntries(new URLSearchParams(qs)) };
}

async function render() {
    const { path, query } = parse();
    const handler = routes.get(path) || fallback;
    const view = document.getElementById("app-view");
    view.classList.remove("view-enter");
    view.innerHTML = "";
    if (handler) await handler(view, query);
    void view.offsetWidth;
    view.classList.add("view-enter");
    view.focus({ preventScroll: true });
}

export function start() {
    window.addEventListener("hashchange", render);
    render();
}
