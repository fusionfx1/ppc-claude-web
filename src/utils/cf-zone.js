/**
 * Cloudflare Zone & DNS Management Service
 *
 * All functions accept a `creds` object: { apiToken, accountId }
 * resolved from the per-account CF Accounts in Ops Center.
 *
 * Routes through existing Worker proxy: /api/proxy/cf → api.cloudflare.com/client/v4
 */
import { getCfApiBase } from "./api-proxy";

const cfBase = () => getCfApiBase();
const auth = (token) => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" });

// ─── Credential Resolution ──────────────────────────────────────────────────
/**
 * Resolve CF API credentials from the selected CF Account, falling back to global settings.
 * @param {string} cfAccountRef - The ID reference to a CF Account in ops.cfAccounts
 * @param {Array} cfAccounts - The list of CF Accounts from Ops Center
 * @param {object} globalSettings - The global settings object
 * @returns {{ apiToken: string, accountId: string } | null}
 */
export function resolveCredentials(cfAccountRef, cfAccounts = [], globalSettings = {}) {
  const acct = cfAccounts.find(a => a.id === cfAccountRef);
  if (acct?.apiToken && acct?.accountId) {
    return { apiToken: acct.apiToken, accountId: acct.accountId };
  }
  if (globalSettings.cfApiToken && globalSettings.cfAccountId) {
    return { apiToken: globalSettings.cfApiToken, accountId: globalSettings.cfAccountId };
  }
  return null;
}

// ─── Zone Operations ────────────────────────────────────────────────────────

/** Check if a zone already exists for a domain in the account */
export async function checkZoneExists(domain, creds) {
  const r = await fetch(`${cfBase()}/zones?name=${encodeURIComponent(domain)}&account.id=${creds.accountId}`, {
    headers: auth(creds.apiToken),
  });
  const data = await r.json();
  if (data.success && data.result?.length > 0) {
    const zone = data.result[0];
    return { exists: true, zoneId: zone.id, status: zone.status, nameservers: zone.name_servers || [] };
  }
  return { exists: false };
}

/** Create a new zone (add domain to Cloudflare) */
export async function createZone(domain, creds) {
  const r = await fetch(`${cfBase()}/zones`, {
    method: "POST",
    headers: auth(creds.apiToken),
    body: JSON.stringify({ name: domain, account: { id: creds.accountId }, jump_start: true }),
  });
  const data = await r.json();
  if (data.success) {
    return {
      success: true,
      zoneId: data.result.id,
      status: data.result.status,
      nameservers: data.result.name_servers || [],
    };
  }
  // Handle error 1061: zone already exists
  const errCode = data.errors?.[0]?.code;
  if (errCode === 1061) {
    // Try to fetch existing zone
    const existing = await checkZoneExists(domain, creds);
    if (existing.exists) {
      return { success: true, zoneId: existing.zoneId, status: existing.status, nameservers: existing.nameservers, linked: true };
    }
  }
  return { success: false, error: data.errors?.[0]?.message || "Failed to create zone" };
}

/** Get zone details (status, nameservers) */
export async function getZone(zoneId, creds) {
  const r = await fetch(`${cfBase()}/zones/${zoneId}`, {
    headers: auth(creds.apiToken),
  });
  const data = await r.json();
  if (data.success) {
    return { success: true, status: data.result.status, nameservers: data.result.name_servers || [], paused: data.result.paused };
  }
  return { success: false, error: data.errors?.[0]?.message || "Failed to get zone" };
}

/** Delete a zone */
export async function deleteZone(zoneId, creds) {
  const r = await fetch(`${cfBase()}/zones/${zoneId}`, {
    method: "DELETE",
    headers: auth(creds.apiToken),
  });
  const data = await r.json();
  return { success: data.success, error: data.errors?.[0]?.message };
}

// ─── Zone Settings (Auto Wizard) ────────────────────────────────────────────

/** Apply a single zone setting */
async function patchSetting(zoneId, settingName, value, creds) {
  const r = await fetch(`${cfBase()}/zones/${zoneId}/settings/${settingName}`, {
    method: "PATCH",
    headers: auth(creds.apiToken),
    body: JSON.stringify({ value }),
  });
  const data = await r.json();
  return { success: data.success, error: data.errors?.[0]?.message };
}

/** LP-optimized settings preset */
const LP_SETTINGS = [
  { key: "ssl", value: "full", label: "SSL/TLS Full" },
  { key: "always_use_https", value: "on", label: "Always HTTPS" },
  { key: "min_tls_version", value: "1.2", label: "TLS 1.2 Minimum" },
  { key: "brotli", value: "on", label: "Brotli Compression" },
  { key: "minify", value: { html: "on", css: "on", js: "on" }, label: "Auto Minify" },
  { key: "early_hints", value: "on", label: "Early Hints" },
  { key: "browser_cache_ttl", value: 14400, label: "Browser Cache (4hr)" },
  { key: "security_level", value: "medium", label: "Security Level" },
  { key: "email_obfuscation", value: "on", label: "Email Obfuscation" },
  { key: "hotlink_protection", value: "on", label: "Hotlink Protection" },
  { key: "rocket_loader", value: "off", label: "Rocket Loader OFF" },
];

/**
 * Apply LP-optimized settings to a zone.
 * @param {string} zoneId
 * @param {object} creds - { apiToken, accountId }
 * @param {function} onProgress - callback({ index, total, label, status, error })
 * @returns {Array} results with { key, label, success, error }
 */
export async function applyLpPreset(zoneId, creds, onProgress) {
  const results = [];
  for (let i = 0; i < LP_SETTINGS.length; i++) {
    const s = LP_SETTINGS[i];
    if (onProgress) onProgress({ index: i, total: LP_SETTINGS.length, label: s.label, status: "applying" });
    try {
      const res = await patchSetting(zoneId, s.key, s.value, creds);
      results.push({ key: s.key, label: s.label, success: res.success, error: res.error });
      if (onProgress) onProgress({ index: i, total: LP_SETTINGS.length, label: s.label, status: res.success ? "done" : "error", error: res.error });
    } catch (e) {
      results.push({ key: s.key, label: s.label, success: false, error: e.message });
      if (onProgress) onProgress({ index: i, total: LP_SETTINGS.length, label: s.label, status: "error", error: e.message });
    }
  }
  return results;
}

export { LP_SETTINGS };

// ─── DNS Record Operations ──────────────────────────────────────────────────

/** List all DNS records for a zone */
export async function listDnsRecords(zoneId, creds) {
  const r = await fetch(`${cfBase()}/zones/${zoneId}/dns_records?per_page=100`, {
    headers: auth(creds.apiToken),
  });
  const data = await r.json();
  if (data.success) return { success: true, records: data.result || [] };
  return { success: false, error: data.errors?.[0]?.message, records: [] };
}

/** Create a DNS record */
export async function createDnsRecord(zoneId, record, creds) {
  const r = await fetch(`${cfBase()}/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers: auth(creds.apiToken),
    body: JSON.stringify({
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl || 1, // 1 = Auto
      proxied: record.proxied ?? true,
      ...(record.priority !== undefined ? { priority: record.priority } : {}),
    }),
  });
  const data = await r.json();
  if (data.success) return { success: true, record: data.result };
  return { success: false, error: data.errors?.[0]?.message || "Failed to create record" };
}

/** Update a DNS record */
export async function updateDnsRecord(zoneId, recordId, record, creds) {
  const r = await fetch(`${cfBase()}/zones/${zoneId}/dns_records/${recordId}`, {
    method: "PUT",
    headers: auth(creds.apiToken),
    body: JSON.stringify({
      type: record.type,
      name: record.name,
      content: record.content,
      ttl: record.ttl || 1,
      proxied: record.proxied ?? true,
      ...(record.priority !== undefined ? { priority: record.priority } : {}),
    }),
  });
  const data = await r.json();
  if (data.success) return { success: true, record: data.result };
  return { success: false, error: data.errors?.[0]?.message || "Failed to update record" };
}

/** Delete a DNS record */
export async function deleteDnsRecord(zoneId, recordId, creds) {
  const r = await fetch(`${cfBase()}/zones/${zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
    headers: auth(creds.apiToken),
  });
  const data = await r.json();
  return { success: data.success, error: data.errors?.[0]?.message };
}

/** Auto-create DNS records for a Pages project */
export async function autoCreatePagesDns(zoneId, domain, pagesProject, creds) {
  const results = [];

  // Root CNAME → pages.dev
  const rootRes = await createDnsRecord(zoneId, {
    type: "CNAME",
    name: "@",
    content: `${pagesProject}.pages.dev`,
    proxied: true,
    ttl: 1,
  }, creds);
  results.push({ label: `CNAME @ → ${pagesProject}.pages.dev`, ...rootRes });

  // www CNAME → root
  const wwwRes = await createDnsRecord(zoneId, {
    type: "CNAME",
    name: "www",
    content: domain,
    proxied: true,
    ttl: 1,
  }, creds);
  results.push({ label: `CNAME www → ${domain}`, ...wwwRes });

  return results;
}

/** Test a CF account's API token validity */
export async function testAccount(creds) {
  try {
    const r = await fetch(`${cfBase()}/accounts/${creds.accountId}/pages/projects?per_page=1`, {
      headers: auth(creds.apiToken),
    });
    if (r.ok) return { success: true, detail: "Connected" };
    const data = await r.json().catch(() => ({}));
    return { success: false, detail: data.errors?.[0]?.message || `HTTP ${r.status}` };
  } catch (e) {
    return { success: false, detail: e.message };
  }
}
