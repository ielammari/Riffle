// Apply user appearance settings (accent color + motion) by writing CSS variables on :root.
// Mirrored to localStorage so a returning user sees their accent before settings load.

const ACCENTS = {
    cyan:    { label: "Cyan",    base: "#00fff3", hover: "#1afff4", press: "#00ccc2", rgb: "0,255,243" },
    violet:  { label: "Violet",  base: "#a78bfa", hover: "#c4b5fd", press: "#8b5cf6", rgb: "167,139,250" },
    magenta: { label: "Magenta", base: "#ff5db1", hover: "#ff85c6", press: "#e6359a", rgb: "255,93,177" },
    lime:    { label: "Lime",    base: "#c6ff4d", hover: "#d7ff80", press: "#a6e600", rgb: "198,255,77" },
};

const STORE_KEY = "riffle.appearance";

export function accentList() {
    return Object.entries(ACCENTS).map(([value, a]) => ({ value, label: a.label, color: a.base }));
}

export function applyAppearance(settings) {
    const name = (settings && ACCENTS[settings.accent]) ? settings.accent : "cyan";
    const motion = (settings && settings.motion === "off") ? "off" : "on";
    const a = ACCENTS[name];
    const root = document.documentElement;
    root.style.setProperty("--color-accent", a.base);
    root.style.setProperty("--color-accent-hover", a.hover);
    root.style.setProperty("--color-accent-press", a.press);
    root.style.setProperty("--color-accent-soft", `rgba(${a.rgb},0.14)`);
    root.style.setProperty("--color-focus", a.base);
    root.style.setProperty("--glow-accent", `0 0 0 3px rgba(${a.rgb},0.30)`);
    root.style.setProperty("--glow-accent-lg", `0 0 24px rgba(${a.rgb},0.35)`);
    root.setAttribute("data-motion", motion);
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ accent: name, motion })); } catch { /* ignore */ }
}

export function applyStoredAppearance() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) applyAppearance(JSON.parse(raw));
    } catch { /* ignore */ }
}

export function clearStoredAppearance() {
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    applyAppearance(null);
}
