/**
 * Cloudflare Workers Sites Deploy (P4)
 *
 * Deploys a Worker script that serves static HTML with edge enhancements.
 * Ref: https://developers.cloudflare.com/api/resources/workers/methods/update/
 *
 * Flow:
 *   1. Build a self-contained Worker module that embeds the HTML
 *   2. Upload via PUT /accounts/{id}/workers/scripts/{name}  (multipart/form-data)
 *   3. Enable *.workers.dev subdomain
 */

import { getCfApiBase } from "../api-proxy.js";

function buildWorkerScript(html) {
  // Escape backticks, backslashes, and $ for embedding in template literal
  const escaped = html.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
  return `
// Auto-generated Worker — serves LP with edge logic
const HTML = \`${escaped}\`;

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/__health") {
      return new Response("ok", { status: 200 });
    }

    // Geo-based headers (available via CF)
    const country = request.cf?.country || "US";
    const region = request.cf?.region || "";

    const headers = new Headers({
      "Content-Type": "text/html;charset=UTF-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Edge-Country": country,
      "X-Edge-Region": region,
    });

    return new Response(HTML, { status: 200, headers });
  }
};
`;
}

export async function deploy(html, site, settings) {
  const cfApiToken = (settings.cfApiToken || "").trim();
  const cfAccountId = (settings.cfAccountId || "").trim();
  if (!cfApiToken || !cfAccountId) {
    return { success: false, error: "Missing Cloudflare API Token or Account ID. Configure in Settings." };
  }
  if (!/^[0-9a-f]{32}$/i.test(cfAccountId)) {
    return { success: false, error: `Invalid Account ID: must be exactly 32 hex characters (got ${cfAccountId.length}). Check Settings.` };
  }

  const slug = (site.domain || site.brand || "lp")
    .toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40);
  const scriptName = `lp-worker-${slug}-${(site.id || "x").slice(0, 6)}`;
  const auth = { Authorization: `Bearer ${cfApiToken}` };
  const cfBase = getCfApiBase();

  try {
    const workerScript = buildWorkerScript(html);

    // ── Upload Worker script (multipart/form-data) ───────────────
    //
    // The Worker upload expects:
    //   - A metadata part (JSON) specifying main_module and compat date
    //   - The worker module part (the actual JS)
    //
    const formData = new FormData();

    // Metadata part — tells CF which file is the entrypoint
    formData.append(
      "metadata",
      new Blob(
        [JSON.stringify({
          main_module: "worker.js",
          compatibility_date: "2024-09-23",
          compatibility_flags: ["nodejs_compat"],
        })],
        { type: "application/json" }
      )
    );

    // Worker module part — must match the main_module name
    formData.append(
      "worker.js",
      new Blob([workerScript], { type: "application/javascript+module" }),
      "worker.js"
    );

    const uploadRes = await fetch(
      `${cfBase}/accounts/${cfAccountId}/workers/scripts/${scriptName}`,
      {
        method: "PUT",
        headers: auth,       // Do NOT set Content-Type — browser sets multipart boundary
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text().catch(() => "");
      let errMsg = `HTTP ${uploadRes.status}`;
      try {
        const j = JSON.parse(errBody);
        errMsg = j.errors?.[0]?.message || errMsg;
      } catch { errMsg = errBody.slice(0, 200) || errMsg; }
      return { success: false, error: `Worker upload failed: ${errMsg}` };
    }

    // ── Enable workers.dev subdomain ─────────────────────────────
    let url = `https://${scriptName}.workers.dev`;

    // First check the account's workers.dev subdomain
    const subdomainCheckRes = await fetch(
      `${cfBase}/accounts/${cfAccountId}/workers/subdomain`,
      { headers: { ...auth, "Content-Type": "application/json" } }
    );
    if (subdomainCheckRes.ok) {
      const subData = await subdomainCheckRes.json();
      const subdomain = subData.result?.subdomain;
      if (subdomain) {
        url = `https://${scriptName}.${subdomain}.workers.dev`;
      }
    }

    // Enable the script on the subdomain
    await fetch(
      `${cfBase}/accounts/${cfAccountId}/workers/scripts/${scriptName}/subdomain`,
      {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      }
    ).catch(() => { }); // Best-effort; deploy already succeeded

    return { success: true, url, deployId: scriptName, target: "cf-workers" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Link a custom domain to a Cloudflare Worker.
 */
export async function addDomain(scriptName, domain, settings) {
  const token = (settings.cfApiToken || "").trim();
  const accountId = (settings.cfAccountId || "").trim();
  if (!token || !accountId) return { success: false, error: "Missing creds" };

  try {
    const res = await fetch(`${getCfApiBase()}/accounts/${accountId}/workers/domains`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        account_id: accountId,
        hostname: domain,
        service: scriptName,
        environment: "production"
      }),
    });

    const data = await res.json();
    if (data.success) return { success: true };
    return { success: false, error: data.errors?.[0]?.message || "Failed" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
