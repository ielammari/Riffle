// Renders a full product card (steppable image carousel on a light tile + details).

const ARROW_L = "M15 18l-6-6 6-6";
const ARROW_R = "M9 6l6 6-6 6";
const STAR = "M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.9 6.2 20.9l1.1-6.47L2.6 9.85l6.5-.95z";

function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function money(n) {
    return Number(n || 0).toFixed(2);
}

function navBtn(dir, label, path) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `card__nav card__nav--${dir}`;
    b.setAttribute("aria-label", label);
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg>`;
    return b;
}

function ratingHTML(c) {
    const r = c.rating != null ? Number(c.rating).toFixed(2) : "n/a";
    return (
        '<div class="card__rating" title="Rating">' +
        `<svg class="card__star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${STAR}"/></svg>` +
        `<span class="card__rate-val">${r}</span>` +
        `<span class="card__rate-count">(${c.review_count || 0})</span>` +
        "</div>"
    );
}

function priceHTML(c) {
    const cur = esc(c.currency || "");
    const orig =
        c.original_price && c.original_price > c.price
            ? `<span class="card__orig">${cur}${money(c.original_price)}</span>`
            : "";
    return `<div class="card__price"><span class="card__now">${cur}${money(c.price)}</span>${orig}</div>`;
}

function stockHTML(c) {
    const s = c.stock || 0;
    let label, cls;
    if (s <= 0) { label = "Out of stock"; cls = "is-out"; }
    else if (s <= 10) { label = `Low stock, ${s} left`; cls = "is-low"; }
    else { label = c.availability_status || "In stock"; cls = "is-in"; }
    return `<span class="card__stock ${cls}">${esc(label)}</span>`;
}

function specsHTML(c) {
    const specs = c.specs || [];
    if (!specs.length) return "";
    return (
        '<dl class="card__specs">' +
        specs.map((s) => `<div class="spec"><dt>${esc(s.label)}</dt><dd>${esc(String(s.value))}</dd></div>`).join("") +
        "</dl>"
    );
}

export function createCard(c) {
    const images = Array.isArray(c.images) && c.images.length ? c.images : [];
    let idx = 0;

    const article = document.createElement("article");
    article.className = "card";
    article.dataset.id = c.id;

    const media = document.createElement("div");
    media.className = "card__media";

    const img = document.createElement("img");
    img.className = "card__img";
    img.alt = c.title || "Product image";
    img.src = images[0] || "";
    img.draggable = false;
    media.appendChild(img);

    if (c.discount_percentage > 0) {
        const badge = document.createElement("span");
        badge.className = "card__discount";
        badge.textContent = `-${Math.round(c.discount_percentage)}%`;
        media.appendChild(badge);
    }

    if (images.length > 1) {
        const prev = navBtn("prev", "Previous image", ARROW_L);
        const next = navBtn("next", "Next image", ARROW_R);
        const counter = document.createElement("span");
        counter.className = "card__counter";
        counter.setAttribute("aria-live", "polite");
        const show = (i) => {
            idx = (i + images.length) % images.length;
            const im = new Image();
            im.src = images[idx];
            img.src = images[idx];
            counter.textContent = `${idx + 1} / ${images.length}`;
        };
        prev.addEventListener("click", () => show(idx - 1));
        next.addEventListener("click", () => show(idx + 1));
        counter.textContent = `1 / ${images.length}`;
        media.append(prev, next, counter);
    }

    const body = document.createElement("div");
    body.className = "card__body";
    body.innerHTML =
        '<div class="card__head"><h2 class="card__title"></h2>' + ratingHTML(c) + "</div>" +
        '<div class="card__meta">' + priceHTML(c) + stockHTML(c) + "</div>" +
        '<p class="card__desc"></p>' +
        specsHTML(c);
    body.querySelector(".card__title").textContent = c.title || "";
    body.querySelector(".card__desc").textContent = c.description || "";

    article.append(media, body);
    return article;
}
