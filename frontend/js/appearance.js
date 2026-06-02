// Apply user appearance settings (theme + motion) as attributes on <html>.
// Mirrored to localStorage so a returning user sees their theme before settings load.

const STORE_KEY = "riffle.appearance";

export function applyAppearance(settings) {
    const theme = (settings && settings.theme === "dark") ? "dark" : "light";
    const motion = (settings && settings.motion === "off") ? "off" : "on";
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-motion", motion);
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ theme, motion })); } catch { /* ignore */ }
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
