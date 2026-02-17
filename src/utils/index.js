export const LS = {
    get(k) {
        try { return JSON.parse(localStorage.getItem("lpf2-" + k)); }
        catch { return null; }
    },
    set(k, v) {
        try { localStorage.setItem("lpf2-" + k, JSON.stringify(v)); }
        catch { }
    },
};

export function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    }
    // Fallback for environments without crypto.randomUUID
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10)).slice(0, 16);
}

export function now() {
    return new Date().toISOString();
}

export function hsl(h, s, l) {
    return `hsl(${h},${s}%,${l}%)`;
}
