// Small shared formatters used across views.

// Escape text before injecting it into innerHTML.
export function esc(s) {
    return String(s).replace(/[&<>"']/g, (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}
