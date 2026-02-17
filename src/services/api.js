const PROD_API_BASE = "https://lp-factory-api.songsawat-w.workers.dev/api";

function resolveApiBase() {
    const fromWindow = typeof window !== "undefined" ? window.__LP_API__ : "";
    const fromEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.VITE_API_BASE : "";
    const isLocalDev = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

    const fallback = isLocalDev ? "/api" : PROD_API_BASE;
    return String(fromWindow || fromEnv || fallback).replace(/\/+$/, "");
}

function buildApiUrl(path) {
    const base = resolveApiBase();
    const cleanPath = String(path || "");

    // Prevent duplicated "/api/api/..." when API_BASE already contains "/api".
    if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
        return `${base}${cleanPath.slice(4)}`;
    }

    if (!cleanPath.startsWith("/")) {
        return `${base}/${cleanPath}`;
    }

    return `${base}${cleanPath}`;
}

async function request(path, opts = {}) {
    const url = buildApiUrl(path);
    let r;

    try {
        r = await fetch(url, opts);
    } catch (e) {
        return {
            error: "NETWORK_ERROR",
            detail: e?.message || "Failed to fetch",
            url,
        };
    }

    if (!r.ok) {
        const text = await r.text().catch(() => '');
        return { error: `HTTP ${r.status}`, detail: text, url };
    }
    return r.json();
}

export const api = {
    get: (path) => request(path),
    post: (path, data) => request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    put: (path, data) => request(path, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    del: (path) => request(path, { method: "DELETE" }),
    patch: (path, data) => request(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    delBody: (path, data) => request(path, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
};
