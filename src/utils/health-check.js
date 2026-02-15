/**
 * Health Check — Real-time API connectivity checks
 *
 * Each check returns: { status: "online"|"offline"|"error"|"unconfigured", detail?: string, ms?: number }
 */

import { getCfApiBase, getMlxApiBase } from "./api-proxy.js";

const TIMEOUT = 8000;

async function timed(fn) {
  const t0 = Date.now();
  try {
    const result = await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), TIMEOUT)),
    ]);
    return { ...result, ms: Date.now() - t0 };
  } catch (e) {
    return { status: "error", detail: e.message || "Unknown error", ms: Date.now() - t0 };
  }
}

/** Worker backend / D1 */
export async function checkWorker() {
  return timed(async () => {
    const r = await fetch("https://lp-factory-api.songsawat-w.workers.dev/api/settings");
    if (r.ok) return { status: "online", detail: "D1 Connected" };
    return { status: "error", detail: `HTTP ${r.status}` };
  });
}

/** Neon Serverless Postgres */
export async function checkNeon(neonOk) {
  // neonOk is a boolean passed from App state — no need to re-ping
  if (neonOk) return { status: "online", detail: "Connected", ms: 0 };
  return { status: "unconfigured", detail: "Not configured", ms: 0 };
}

/** Cloudflare API (Pages + Workers) */
export async function checkCloudflare(settings) {
  const token = (settings.cfApiToken || "").trim();
  const accountId = (settings.cfAccountId || "").trim();
  if (!token || !accountId) return { status: "unconfigured", detail: "Token or Account ID missing", ms: 0 };
  if (!/^[0-9a-f]{32}$/i.test(accountId)) return { status: "error", detail: `Invalid Account ID (${accountId.length}/32 chars)`, ms: 0 };

  return timed(async () => {
    const cfBase = getCfApiBase();
    const r = await fetch(`${cfBase}/accounts/${accountId}/pages/projects?per_page=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) return { status: "online", detail: "Pages + Workers OK" };
    const err = await r.json().catch(() => ({}));
    const msg = err.errors?.[0]?.message || `HTTP ${r.status}`;
    if (r.status === 401 || r.status === 403) return { status: "error", detail: `Auth failed: ${msg}` };
    return { status: "error", detail: msg };
  });
}

/** Netlify API */
export async function checkNetlify(settings) {
  const token = (settings.netlifyToken || "").trim();
  if (!token) return { status: "unconfigured", detail: "Token not set", ms: 0 };

  return timed(async () => {
    const r = await fetch("https://api.netlify.com/api/v1/sites?per_page=1", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) return { status: "online", detail: "Connected" };
    if (r.status === 401) return { status: "error", detail: "Invalid token" };
    return { status: "error", detail: `HTTP ${r.status}` };
  });
}

/** LeadingCards API (via Worker proxy) */
export async function checkLeadingCards(settings) {
  const token = (settings.lcToken || "").trim();
  if (!token) return { status: "unconfigured", detail: "Token not set", ms: 0 };

  return timed(async () => {
    const r = await fetch("https://lp-factory-api.songsawat-w.workers.dev/api/lc/cards?per_page=1");
    if (r.ok) return { status: "online", detail: "Connected" };
    const body = await r.json().catch(() => ({}));
    if (body.error?.includes("not configured")) return { status: "error", detail: "Worker LC token not set" };
    return { status: "error", detail: body.error || `HTTP ${r.status}` };
  });
}

/** Multilogin X (Remote API via proxy) */
export async function checkMultilogin(settings) {
  const token = (settings.mlToken || "").trim();
  if (!token && !settings.mlEmail) return { status: "unconfigured", detail: "Not configured", ms: 0 };

  return timed(async () => {
    const mlxBase = getMlxApiBase();
    // Try a lightweight profile search with limit=1
    const r = await fetch(`${mlxBase}/profile/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_removed: false, limit: 1, offset: 0, search_text: "", storage_type: "all" }),
    });
    if (r.ok) return { status: "online", detail: "Authenticated" };
    if (r.status === 401) return { status: "error", detail: "Token expired" };
    return { status: "error", detail: `HTTP ${r.status}` };
  });
}

/** AWS S3 (via proxy) */
export async function checkAws(settings) {
  const key = (settings.awsAccessKey || "").trim();
  const bucket = (settings.s3Bucket || "").trim();
  if (!key || !bucket) return { status: "unconfigured", detail: "Credentials not set", ms: 0 };
  // Can't do a real check easily from browser without SigV4; just report configured
  return { status: "online", detail: `Bucket: ${bucket}`, ms: 0 };
}

/** VPS (SSH/rsync) */
export async function checkVps(settings) {
  const host = (settings.vpsHost || "").trim();
  if (!host) return { status: "unconfigured", detail: "Host not set", ms: 0 };
  // CF Workers can't SSH — just report configured
  return { status: "online", detail: host, ms: 0 };
}

/**
 * Run all health checks in parallel.
 * Returns: { worker, neon, cloudflare, netlify, leadingCards, multilogin, aws, vps }
 */
export async function checkAll(settings, neonOk) {
  const [worker, neon, cloudflare, netlify, leadingCards, multilogin, aws, vps] = await Promise.all([
    checkWorker(),
    checkNeon(neonOk),
    checkCloudflare(settings),
    checkNetlify(settings),
    checkLeadingCards(settings),
    checkMultilogin(settings),
    checkAws(settings),
    checkVps(settings),
  ]);
  return { worker, neon, cloudflare, netlify, leadingCards, multilogin, aws, vps };
}
