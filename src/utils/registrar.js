/**
 * Domain Registrar Service
 *
 * Adapters for domain registration, availability checking, NS management.
 *
 * Supported Registrars:
 *   - Porkbun (primary)  — JSON REST, cheap, clean API
 *   - Cloudflare Registrar — already in CF ecosystem
 *
 * All external calls route through the Worker proxy to avoid CORS.
 */
import { getPorkbunApiBase, getCfApiBase, getInternetBsApiBase } from "./api-proxy";

// ─── Porkbun Adapter ─────────────────────────────────────────────────────────
// Porkbun API v3: https://porkbun.com/api/json/v3/documentation
// All calls use POST with JSON body containing apikey + secretapikey.

const porkbun = {
  /** Test connectivity (ping) */
  async ping(creds) {
    try {
      const r = await fetch(`${getPorkbunApiBase()}/api/json/v3/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: creds.apiKey, secretapikey: creds.secretKey }),
      });
      const data = await r.json();
      return { success: data.status === "SUCCESS", ip: data.yourIp, error: data.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Get TLD pricing (no auth needed) */
  async getPricing() {
    try {
      const r = await fetch(`${getPorkbunApiBase()}/api/json/v3/pricing/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await r.json();
      if (data.status === "SUCCESS") return { success: true, pricing: data.pricing };
      return { success: false, error: data.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Check domain availability + pricing */
  async checkDomain(domain, creds) {
    try {
      const r = await fetch(`${getPorkbunApiBase()}/api/json/v3/domain/checkDomain/${encodeURIComponent(domain)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: creds.apiKey, secretapikey: creds.secretKey }),
      });
      const data = await r.json();
      if (data.status === "SUCCESS") {
        const resp = data.response || {};
        return {
          success: true,
          available: resp.avail === "yes",
          price: resp.price ? parseFloat(resp.price) : null,
          regularPrice: resp.regularPrice ? parseFloat(resp.regularPrice) : null,
          firstYearPromo: resp.firstYearPromo === "yes",
          premium: resp.premium === "yes",
          renewal: resp.additional?.renewal?.price ? parseFloat(resp.additional.renewal.price) : null,
          transfer: resp.additional?.transfer?.price ? parseFloat(resp.additional.transfer.price) : null,
          minDuration: resp.minDuration || 1,
          costPennies: resp.price ? Math.round(parseFloat(resp.price) * 100) : null,
        };
      }
      return { success: false, available: false, error: data.message };
    } catch (e) {
      return { success: false, available: false, error: e.message };
    }
  },

  /** Register a domain
   * Prerequisites: account must have balance, verified email + phone, at least 1 prior domain.
   * Cost is in pennies = price * minDuration * 100.
   */
  async registerDomain(domain, costPennies, creds) {
    try {
      const r = await fetch(`${getPorkbunApiBase()}/api/json/v3/domain/create/${encodeURIComponent(domain)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: creds.apiKey,
          secretapikey: creds.secretKey,
          cost: costPennies,
          agreeToTerms: "yes",
        }),
      });
      const data = await r.json();
      if (data.status === "SUCCESS") {
        return {
          success: true,
          domain: data.domain,
          cost: data.cost,
          orderId: data.orderId,
          balance: data.balance,
        };
      }
      return { success: false, error: data.message || "Registration failed" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Update nameservers for a domain */
  async updateNameservers(domain, nameservers, creds) {
    try {
      const r = await fetch(`${getPorkbunApiBase()}/api/json/v3/domain/updateNs/${encodeURIComponent(domain)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: creds.apiKey,
          secretapikey: creds.secretKey,
          ns: nameservers,
        }),
      });
      const data = await r.json();
      return { success: data.status === "SUCCESS", error: data.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Get current nameservers */
  async getNameservers(domain, creds) {
    try {
      const r = await fetch(`${getPorkbunApiBase()}/api/json/v3/domain/getNs/${encodeURIComponent(domain)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apikey: creds.apiKey, secretapikey: creds.secretKey }),
      });
      const data = await r.json();
      if (data.status === "SUCCESS") return { success: true, ns: data.ns || [] };
      return { success: false, error: data.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** List all domains in account */
  async listDomains(creds, start = 0) {
    try {
      const r = await fetch(`${getPorkbunApiBase()}/api/json/v3/domain/listAll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: creds.apiKey,
          secretapikey: creds.secretKey,
          start: String(start),
        }),
      });
      const data = await r.json();
      if (data.status === "SUCCESS") return { success: true, domains: data.domains || [] };
      return { success: false, error: data.message, domains: [] };
    } catch (e) {
      return { success: false, error: e.message, domains: [] };
    }
  },

  /** Toggle auto-renew */
  async updateAutoRenew(domain, status, creds) {
    try {
      const r = await fetch(`${getPorkbunApiBase()}/api/json/v3/domain/updateAutoRenew/${encodeURIComponent(domain)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apikey: creds.apiKey,
          secretapikey: creds.secretKey,
          status: status ? "on" : "off",
        }),
      });
      const data = await r.json();
      return { success: data.status === "SUCCESS", error: data.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
};

// ─── Cloudflare Registrar Adapter ────────────────────────────────────────────
// CF Registrar: domains already in Cloudflare don't need NS changes.

const cloudflareRegistrar = {
  /** List domains available for registration via CF Registrar (account domains) */
  async listDomains(creds) {
    try {
      const r = await fetch(`${getCfApiBase()}/accounts/${creds.accountId}/registrar/domains`, {
        headers: { Authorization: `Bearer ${creds.apiToken}`, "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (data.success) return { success: true, domains: data.result || [] };
      return { success: false, error: data.errors?.[0]?.message, domains: [] };
    } catch (e) {
      return { success: false, error: e.message, domains: [] };
    }
  },

  /** Get domain details */
  async getDomain(domain, creds) {
    try {
      const r = await fetch(`${getCfApiBase()}/accounts/${creds.accountId}/registrar/domains/${encodeURIComponent(domain)}`, {
        headers: { Authorization: `Bearer ${creds.apiToken}`, "Content-Type": "application/json" },
      });
      const data = await r.json();
      if (data.success) return { success: true, domain: data.result };
      return { success: false, error: data.errors?.[0]?.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Update domain registrar settings (auto-renew, privacy, etc.) */
  async updateDomain(domain, settings, creds) {
    try {
      const r = await fetch(`${getCfApiBase()}/accounts/${creds.accountId}/registrar/domains/${encodeURIComponent(domain)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${creds.apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await r.json();
      return { success: data.success, error: data.errors?.[0]?.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Test account connectivity */
  async ping(creds) {
    try {
      const r = await fetch(`${getCfApiBase()}/accounts/${creds.accountId}/registrar/domains?per_page=1`, {
        headers: { Authorization: `Bearer ${creds.apiToken}`, "Content-Type": "application/json" },
      });
      if (r.ok) return { success: true };
      const data = await r.json().catch(() => ({}));
      return { success: false, error: data.errors?.[0]?.message || `HTTP ${r.status}` };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
};

// ─── Internet.bs Adapter ─────────────────────────────────────────────────────
// Internet.bs API: https://internetbs.net/ResellerRegistrarDomainNameAPI/
// All calls use POST with form-encoded ApiKey + Password + responseformat=JSON.
// Base URL: https://api.internet.bs  (test: https://testapi.internet.bs)

const internetbs = {
  /** Build common POST body with auth + JSON response format */
  _body(creds, extra = {}) {
    const params = new URLSearchParams({
      ApiKey: creds.apiKey,
      Password: creds.password,
      responseformat: "JSON",
      ...extra,
    });
    return params.toString();
  },

  /** Test connectivity — get account balance */
  async ping(creds) {
    try {
      const r = await fetch(`${getInternetBsApiBase()}/Account/Balance/Get`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: this._body(creds),
      });
      const data = await r.json();
      if (data.status?.toLowerCase() === "success") {
        const bal = data.balance;
        const summary = Array.isArray(bal) ? bal.map(b => `${b.currency} ${b.amount}`).join(", ") : JSON.stringify(bal);
        return { success: true, detail: `Balance: ${summary}` };
      }
      return { success: false, error: data.message || "Authentication failed" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Get pricing list */
  async getPricing(creds, currency = "USD") {
    try {
      const r = await fetch(`${getInternetBsApiBase()}/Account/PriceList/Get`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: this._body(creds, { Currency: currency, version: "1" }),
      });
      const data = await r.json();
      if (data.status?.toLowerCase() !== "failure") return { success: true, products: data.product || [] };
      return { success: false, error: data.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Check domain availability */
  async checkDomain(domain, creds) {
    try {
      const r = await fetch(`${getInternetBsApiBase()}/Domain/Check`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: this._body(creds, { Domain: domain }),
      });
      const data = await r.json();
      const available = data.status?.toLowerCase() === "available";
      const unavailable = data.status?.toLowerCase() === "unavailable";

      if (available || unavailable) {
        // Internet.bs returns pricing info via Account/PriceList/Get, not in check response
        // We'll fetch price for common TLDs or set null
        let price = null;
        let renewal = null;

        // Try to get price from pricing API
        try {
          const tld = domain.split(".").slice(1).join(".");
          const pRes = await this.getPricing(creds);
          if (pRes.success && pRes.products) {
            const product = pRes.products.find(p => p.name?.toLowerCase() === `.${tld.toLowerCase()}` || p.name?.toLowerCase() === tld.toLowerCase());
            if (product) {
              price = parseFloat(product.registrationPrice || product.price1) || null;
              renewal = parseFloat(product.renewalPrice || product.price2) || null;
            }
          }
        } catch (_) { /* pricing lookup is best-effort */ }

        return {
          success: true,
          available,
          price,
          renewal,
          minDuration: data.minregperiod ? parseInt(data.minregperiod) : 1,
          maxDuration: data.maxregperiod ? parseInt(data.maxregperiod) : 10,
          registrarLock: data.registrarlock?.toLowerCase() === "enabled",
          privateWhois: data.privatewhois?.toLowerCase() !== "disabled",
          costPennies: price ? Math.round(price * 100) : null,
        };
      }
      return { success: false, available: false, error: data.message || `Status: ${data.status}` };
    } catch (e) {
      return { success: false, available: false, error: e.message };
    }
  },

  /** Register a domain
   * Requires: contact details or CloneContactsFromDomain
   * @param {string} domain
   * @param {number} costPennies - unused for IBS (billed from balance)
   * @param {object} creds - { apiKey, password, cloneContactsFromDomain? }
   */
  async registerDomain(domain, costPennies, creds) {
    try {
      const extra = {
        Domain: domain,
        Period: "1Y",
      };

      // Clone contacts from an existing domain (simplest approach)
      if (creds.cloneContactsFromDomain) {
        extra.CloneContactsFromDomain = creds.cloneContactsFromDomain;
      } else {
        // Minimal contacts — the account must have default contacts set up
        // Internet.bs requires full contact info for registration
        // We use CloneContactsFromDomain as the recommended approach
        return {
          success: false,
          error: "Internet.bs requires contact details. Set 'Default Domain for Contact Clone' in your registrar account settings.",
        };
      }

      const r = await fetch(`${getInternetBsApiBase()}/Domain/Create`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: this._body(creds, extra),
      });
      const data = await r.json();
      if (data.status?.toLowerCase() === "success") {
        const product = data.product?.[0] || {};
        return {
          success: true,
          domain: product.domain || domain,
          orderId: data.transactid || "N/A",
          expiration: product.expiration || product.newexpiration,
        };
      }
      return { success: false, error: data.message || "Registration failed" };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Update nameservers using Domain/Update with Ns_list */
  async updateNameservers(domain, nameservers, creds) {
    try {
      const r = await fetch(`${getInternetBsApiBase()}/Domain/Update`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: this._body(creds, { Domain: domain, Ns_list: nameservers.join(",") }),
      });
      const data = await r.json();
      const ok = data.status?.toLowerCase() !== "failure";
      return { success: ok, error: ok ? null : data.message };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** Get current nameservers via Domain/Info */
  async getNameservers(domain, creds) {
    try {
      const r = await fetch(`${getInternetBsApiBase()}/Domain/Info`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: this._body(creds, { Domain: domain }),
      });
      const data = await r.json();
      // NS are in data.nameserver_* keys or data.nameserver array
      const nsList = [];
      for (let i = 0; i < 20; i++) {
        const ns = data[`nameserver_${i}`] || data[`nameserver${i}`];
        if (ns) nsList.push(ns);
      }
      return { success: true, ns: nsList };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  /** List all domains in account */
  async listDomains(creds) {
    try {
      const r = await fetch(`${getInternetBsApiBase()}/Domain/List`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: this._body(creds, { CompactList: "no" }),
      });
      const data = await r.json();
      if (data.status?.toLowerCase() === "failure") {
        return { success: false, error: data.message, domains: [] };
      }
      // data.domain is an array of { name, expiration, status, registrarlock, privatewhois, ... }
      const raw = Array.isArray(data.domain) ? data.domain : (data.domain ? [data.domain] : []);
      const domains = raw.map(d => ({
        domain: d.name || d,
        status: d.status || "ACTIVE",
        expireDate: d.expiration || null,
        autoRenew: d.autorenew?.toLowerCase() === "yes",
      }));
      return { success: true, domains };
    } catch (e) {
      return { success: false, error: e.message, domains: [] };
    }
  },

  /** Get domain info */
  async getDomainInfo(domain, creds) {
    try {
      const r = await fetch(`${getInternetBsApiBase()}/Domain/Info`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: this._body(creds, { Domain: domain }),
      });
      const data = await r.json();
      if (data.status?.toLowerCase() === "failure") {
        return { success: false, error: data.message };
      }
      return { success: true, info: data };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },
};

// ─── Namecheap Adapter (Placeholder — XML API + IP Whitelist) ────────────────
// Namecheap requires server IP to be whitelisted, which is complex for Worker proxies.
// This adapter provides basic support for future expansion.

const namecheap = {
  async ping() {
    return { success: false, error: "Namecheap requires IP whitelisting — use Porkbun or Cloudflare Registrar for automated registration." };
  },
  async checkDomain() {
    return { success: false, error: "Not implemented — Namecheap uses XML API with IP whitelisting requirement." };
  },
};

// ─── Unified Interface ───────────────────────────────────────────────────────

const ADAPTERS = {
  porkbun: porkbun,
  cloudflare: cloudflareRegistrar,
  internetbs: internetbs,
  namecheap: namecheap,
};

/**
 * Get the adapter for a registrar provider.
 * @param {string} provider - "porkbun" | "cloudflare" | "internetbs" | "namecheap"
 */
export function getAdapter(provider) {
  return ADAPTERS[provider] || null;
}

/**
 * Resolve registrar credentials from stored accounts.
 * @param {string} registrarAccountId - The ID of the registrar account in ops.registrarAccounts
 * @param {Array} registrarAccounts - Array of registrar account objects
 * @returns {{ provider: string, apiKey: string, secretKey?: string, accountId?: string, apiToken?: string } | null}
 */
export function resolveRegistrarCreds(registrarAccountId, registrarAccounts = []) {
  const acct = registrarAccounts.find(a => a.id === registrarAccountId);
  if (!acct) return null;

  switch (acct.provider) {
    case "porkbun":
      if (!acct.apiKey || !acct.secretKey) return null;
      return { provider: "porkbun", apiKey: acct.apiKey, secretKey: acct.secretKey };
    case "cloudflare":
      if (!acct.apiToken || !acct.accountId) return null;
      return { provider: "cloudflare", apiToken: acct.apiToken, accountId: acct.accountId };
    case "internetbs":
      if (!acct.apiKey || !acct.secretKey) return null;
      return {
        provider: "internetbs", apiKey: acct.apiKey, password: acct.secretKey,
        cloneContactsFromDomain: acct.accountId || "", // reuse accountId field for clone domain
      };
    default:
      return null;
  }
}

/**
 * Full E2E domain registration flow:
 *   1. Check availability
 *   2. Register domain
 *   3. Update nameservers to Cloudflare
 *   4. (Caller then triggers: addZone → applyLpPreset → autoCreatePagesDns)
 *
 * @param {string} domain
 * @param {object} registrarCreds - resolved creds from resolveRegistrarCreds
 * @param {string[]} [cloudflareNs] - Cloudflare nameservers to set (optional, set after zone creation)
 * @param {function} onProgress - callback({ step, status, detail })
 */
export async function registerAndSetup(domain, registrarCreds, cloudflareNs, onProgress) {
  const adapter = getAdapter(registrarCreds.provider);
  if (!adapter) return { success: false, error: `Unknown provider: ${registrarCreds.provider}` };

  const results = { check: null, register: null, ns: null };

  // Step 1: Check availability
  onProgress?.({ step: "check", status: "running", detail: "Checking availability..." });
  if (registrarCreds.provider === "porkbun") {
    const check = await adapter.checkDomain(domain, registrarCreds);
    results.check = check;
    if (!check.success) {
      onProgress?.({ step: "check", status: "error", detail: check.error });
      return { success: false, error: check.error, results };
    }
    if (!check.available) {
      onProgress?.({ step: "check", status: "error", detail: "Domain not available" });
      return { success: false, error: "Domain not available", results };
    }
    onProgress?.({ step: "check", status: "done", detail: `Available — $${check.price}` });

    // Step 2: Register
    onProgress?.({ step: "register", status: "running", detail: "Registering domain..." });
    const reg = await adapter.registerDomain(domain, check.costPennies, registrarCreds);
    results.register = reg;
    if (!reg.success) {
      onProgress?.({ step: "register", status: "error", detail: reg.error });
      return { success: false, error: reg.error, results };
    }
    onProgress?.({ step: "register", status: "done", detail: `Registered! Order #${reg.orderId}` });

    // Step 3: Update NS (if provided)
    if (cloudflareNs && cloudflareNs.length > 0) {
      onProgress?.({ step: "ns", status: "running", detail: "Setting Cloudflare nameservers..." });
      const nsRes = await adapter.updateNameservers(domain, cloudflareNs, registrarCreds);
      results.ns = nsRes;
      if (!nsRes.success) {
        onProgress?.({ step: "ns", status: "error", detail: nsRes.error });
        // Non-fatal — domain is registered but NS not yet updated
      } else {
        onProgress?.({ step: "ns", status: "done", detail: "Nameservers updated to Cloudflare" });
      }
    }
  } else if (registrarCreds.provider === "internetbs") {
    const check = await adapter.checkDomain(domain, registrarCreds);
    results.check = check;
    if (!check.success) {
      onProgress?.({ step: "check", status: "error", detail: check.error });
      return { success: false, error: check.error, results };
    }
    if (!check.available) {
      onProgress?.({ step: "check", status: "error", detail: "Domain not available" });
      return { success: false, error: "Domain not available", results };
    }
    onProgress?.({ step: "check", status: "done", detail: `Available${check.price ? ` — $${check.price}` : ""}` });

    // Step 2: Register
    onProgress?.({ step: "register", status: "running", detail: "Registering domain..." });
    const reg = await adapter.registerDomain(domain, check.costPennies, registrarCreds);
    results.register = reg;
    if (!reg.success) {
      onProgress?.({ step: "register", status: "error", detail: reg.error });
      return { success: false, error: reg.error, results };
    }
    onProgress?.({ step: "register", status: "done", detail: `Registered! TX: ${reg.orderId}` });

    // Step 3: Update NS (if provided)
    if (cloudflareNs && cloudflareNs.length > 0) {
      onProgress?.({ step: "ns", status: "running", detail: "Setting Cloudflare nameservers..." });
      const nsRes = await adapter.updateNameservers(domain, cloudflareNs, registrarCreds);
      results.ns = nsRes;
      if (!nsRes.success) {
        onProgress?.({ step: "ns", status: "error", detail: nsRes.error });
      } else {
        onProgress?.({ step: "ns", status: "done", detail: "Nameservers updated to Cloudflare" });
      }
    }
  } else if (registrarCreds.provider === "cloudflare") {
    // CF Registrar: domain must already have a zone in CF
    onProgress?.({ step: "check", status: "done", detail: "Cloudflare Registrar — zone-based" });
    onProgress?.({ step: "register", status: "done", detail: "Use Cloudflare Dashboard for CF Registrar registration" });
  }

  return { success: true, results };
}

// Export adapters for direct use
export { porkbun, cloudflareRegistrar, internetbs, namecheap };
