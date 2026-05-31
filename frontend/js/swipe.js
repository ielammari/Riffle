// Pointer swipe: drag-follow + rotation, threshold fling vs spring-back, direction cues.
// Works for touch, mouse and pen. Buttons/keyboard call controller.flick(direction).

const CUES = {
    right: { cls: "is-right", text: "ADD TO CART" },
    left: { cls: "is-left", text: "PASS" },
    down: { cls: "is-down", text: "SECOND THOUGHTS" },
};

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function makeSwipeable(card, onDecision) {
    const layer = document.createElement("div");
    layer.className = "card__cues";
    const cues = {};
    ["right", "left", "down"].forEach((dir) => {
        const c = document.createElement("div");
        c.className = `card__cue ${CUES[dir].cls}`;
        c.textContent = CUES[dir].text;
        layer.appendChild(c);
        cues[dir] = c;
    });
    card.appendChild(layer);

    let startX = 0, startY = 0, dx = 0, dy = 0, t0 = 0;
    let dragging = false;
    let decided = false;
    const width = () => card.offsetWidth || 320;

    function setCues(dir, p) {
        ["right", "left", "down"].forEach((d) => {
            cues[d].style.opacity = d === dir ? String(Math.min(p, 1)) : "0";
        });
    }

    function onMove(e) {
        if (!dragging) return;
        dx = e.clientX - startX;
        dy = e.clientY - startY;
        const rot = Math.max(-15, Math.min(15, dx / 14));
        card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
        if (Math.abs(dx) > Math.abs(dy)) setCues(dx > 0 ? "right" : "left", Math.abs(dx) / (width() * 0.5));
        else if (dy > 0) setCues("down", dy / (width() * 0.6));
        else setCues(null, 0);
    }

    function decide(dir) {
        if (decided) return;
        decided = true;
        card.style.pointerEvents = "none";
        setCues(dir, 1);
        const fling = reduced()
            ? "none"
            : dir === "right" ? "translate(140vw, -40px) rotate(22deg)"
            : dir === "left" ? "translate(-140vw, -40px) rotate(-22deg)"
            : "translate(0, 140vh) rotate(6deg)";
        card.style.transition = `transform ${reduced() ? 120 : 340}ms var(--ease-fling), opacity ${reduced() ? 120 : 300}ms ease`;
        card.style.opacity = "0";
        if (fling !== "none") card.style.transform = fling;
        let done = false;
        const finish = () => { if (done) return; done = true; onDecision(dir); };
        card.addEventListener("transitionend", finish, { once: true });
        setTimeout(finish, 520);
    }

    function springBack() {
        card.style.transition = "transform 300ms var(--ease-spring)";
        card.style.transform = "translate(0,0) rotate(0)";
        setCues(null, 0);
        card.addEventListener("transitionend", () => { card.style.transition = ""; }, { once: true });
    }

    function onDown(e) {
        if (decided || e.target.closest(".card__nav")) return;
        dragging = true;
        startX = e.clientX; startY = e.clientY; dx = 0; dy = 0;
        t0 = performance.now();
        card.style.transition = "none";
        card.classList.add("is-grabbing");
        try { card.setPointerCapture(e.pointerId); } catch { /* noop */ }
    }

    function onUp(e) {
        if (!dragging) return;
        dragging = false;
        card.classList.remove("is-grabbing");
        try { card.releasePointerCapture(e.pointerId); } catch { /* noop */ }
        const dt = Math.max(1, performance.now() - t0);
        const vx = dx / dt, vy = dy / dt;
        const thresh = width() * 0.28;
        let dir = null;
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > thresh || vx > 0.6) dir = "right";
            else if (dx < -thresh || vx < -0.6) dir = "left";
        } else if (dy > thresh || vy > 0.6) {
            dir = "down";
        }
        if (dir) decide(dir);
        else springBack();
    }

    card.addEventListener("pointerdown", onDown);
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerup", onUp);
    card.addEventListener("pointercancel", onUp);

    return {
        flick(dir) { if (!decided && card.isConnected) decide(dir); },
        get done() { return decided; },
    };
}
