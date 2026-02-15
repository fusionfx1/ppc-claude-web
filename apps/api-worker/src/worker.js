// LP Factory V2 — Cloudflare Workers API
// Binds to D1 database "ppc-gen-claude"
// Origin: https://github.com/songsawat-w/ppc-gen-cfca

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function uid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

function md5(str) {
  function safeAdd(x, y) { const l = (x & 0xFFFF) + (y & 0xFFFF); return ((x >> 16) + (y >> 16) + (l >> 16)) << 16 | l & 0xFFFF; }
  function bitRol(n, c) { return (n << c) | (n >>> (32 - c)); }
  function md5cmn(q, a, b, x, s, t) { return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
  function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
  function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }
  function binlMD5(x, len) {
    x[len >> 5] |= 0x80 << (len % 32);
    x[((len + 64) >>> 9 << 4) + 14] = len;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const oa = a, ob = b, oc = c, od = d;
      a = md5ff(a, b, c, d, x[i], 7, -680876936); d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819); b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897); d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341); b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416); d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063); b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682); d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290); b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = md5gg(a, b, c, d, x[i + 1], 5, -165796510); d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5gg(c, d, a, b, x[i + 11], 14, 643717713); b = md5gg(b, c, d, a, x[i], 20, -373897302);
      a = md5gg(a, b, c, d, x[i + 5], 5, -701558691); d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5gg(c, d, a, b, x[i + 15], 14, -660478335); b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5gg(a, b, c, d, x[i + 9], 5, 568446438); d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5gg(c, d, a, b, x[i + 3], 14, -187363961); b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467); d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473); b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = md5hh(a, b, c, d, x[i + 5], 4, -378558); d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562); b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060); d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = md5hh(c, d, a, b, x[i + 7], 16, -155497632); b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5hh(a, b, c, d, x[i + 13], 4, 681279174); d = md5hh(d, a, b, c, x[i], 11, -358537222);
      c = md5hh(c, d, a, b, x[i + 3], 16, -722521979); b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5hh(a, b, c, d, x[i + 9], 4, -640364487); d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = md5hh(c, d, a, b, x[i + 15], 16, 530742520); b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = md5ii(a, b, c, d, x[i], 6, -198630844); d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905); b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571); d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = md5ii(c, d, a, b, x[i + 10], 15, -1051523); b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359); d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380); b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = md5ii(a, b, c, d, x[i + 4], 6, -145523070); d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = md5ii(c, d, a, b, x[i + 2], 15, 718787259); b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
      a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
    }
    return [a, b, c, d];
  }
  function rstrMD5(s) {
    const bin = binlMD5(str2binl(s), s.length * 8);
    let r = "";
    for (let i = 0; i < bin.length * 32; i += 8)
      r += String.fromCharCode((bin[i >> 5] >>> (i % 32)) & 0xFF);
    return r;
  }
  function str2binl(s) {
    const bin = [];
    for (let i = 0; i < s.length * 8; i += 8)
      bin[i >> 5] |= (s.charCodeAt(i / 8) & 0xFF) << (i % 32);
    return bin;
  }
  function hexMD5(s) {
    const hex = "0123456789abcdef";
    const raw = rstrMD5(s);
    let r = "";
    for (let i = 0; i < raw.length; i++)
      r += hex.charAt((raw.charCodeAt(i) >>> 4) & 0x0F) + hex.charAt(raw.charCodeAt(i) & 0x0F);
    return r;
  }
  return hexMD5(str);
}

async function getLcSettings(db) {
  const rows = await db.prepare("SELECT key, value FROM settings WHERE key IN ('lcToken', 'lcTeamUuid')").all();
  const s = {};
  rows.results.forEach(r => { s[r.key] = r.value; });
  return s;
}

async function getMlSettings(db) {
  const rows = await db.prepare("SELECT key, value FROM settings WHERE key IN ('mlToken', 'mlEmail', 'mlPassword', 'mlFolderId')").all();
  const s = {};
  rows.results.forEach(r => { s[r.key] = r.value; });
  return s;
}

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Column whitelists for PUT endpoints (SQL injection protection)
const ALLOWED_COLS = {
  accounts: new Set(['label', 'email', 'paymentId', 'budget', 'status', 'cardUuid', 'cardLast4', 'cardStatus', 'profileId', 'proxyIp', 'monthlySpend']),
  profiles: new Set(['name', 'proxyIp', 'browserType', 'os', 'status', 'mlProfileId', 'mlFolderId', 'proxyHost', 'proxyPort', 'proxyUser', 'fingerprintOs']),
  payments: new Set(['label', 'type', 'last4', 'bankName', 'status', 'lcCardUuid', 'lcBinUuid', 'cardLimit', 'cardExpiry', 'totalSpend']),
  domains: new Set(['domain', 'registrar', 'accountId', 'profileId', 'cfAccountId', 'status', 'zoneId', 'nameservers', 'cfStatus', 'registrarAccountId']),
};

// Secret keys that should never be returned in API responses
const SECRET_KEYS = new Set(['apiKey', 'geminiKey', 'netlifyToken', 'lcToken', 'mlToken', 'mlPassword']);

function redactSettings(obj) {
  const safe = {};
  for (const [k, v] of Object.entries(obj)) {
    safe[k] = SECRET_KEYS.has(k) ? (v ? '••••' : '') : v;
  }
  return safe;
}

// Convert snake_case DB columns to camelCase for frontend
function snakeToCamel(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camel] = value;
  }
  return result;
}

// ═══════════════════════════════════════════
// PROXY HANDLER — forwards requests to external APIs
// Handles CORS by proxying through the Worker
// ═══════════════════════════════════════════
const PROXY_TARGETS = {
  '/api/proxy/cf/': 'https://api.cloudflare.com/client/v4/',
  '/api/proxy/mlx/': 'https://api.multilogin.com/',
  '/api/proxy/netlify/': 'https://api.netlify.com/api/v1/',
  '/api/proxy/porkbun/': 'https://api.porkbun.com/',
  '/api/proxy/internetbs/': 'https://api.internet.bs/',
};

async function handleProxy(request, url) {
  let targetBase = null;
  let strippedPath = url.pathname;

  for (const [prefix, base] of Object.entries(PROXY_TARGETS)) {
    if (url.pathname.startsWith(prefix)) {
      targetBase = base;
      strippedPath = url.pathname.slice(prefix.length);
      break;
    }
  }

  // Check for generic pass-through: /api/proxy/pass?url=<encoded-target>
  if (!targetBase && url.pathname === '/api/proxy/pass') {
    const passUrl = url.searchParams.get('url');
    if (!passUrl) return json({ error: 'Missing ?url= parameter' }, 400);
    // Only allow HTTPS targets
    if (!passUrl.startsWith('https://')) return json({ error: 'Only HTTPS targets allowed' }, 400);
    const targetUrl = passUrl;
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.delete('host');
    proxyHeaders.delete('origin');
    proxyHeaders.delete('referer');
    try {
      const proxyRes = await fetch(targetUrl, {
        method: request.method,
        headers: proxyHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'follow',
      });
      const responseHeaders = new Headers(proxyRes.headers);
      for (const [k, v] of Object.entries(corsHeaders)) {
        responseHeaders.set(k, v);
      }
      return new Response(proxyRes.body, {
        status: proxyRes.status,
        statusText: proxyRes.statusText,
        headers: responseHeaders,
      });
    } catch (e) {
      return json({ error: e.message }, 502);
    }
  }

  if (!targetBase) return null; // not a proxy route

  const targetUrl = `${targetBase}${strippedPath}${url.search}`;

  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.delete('host');
  proxyHeaders.delete('origin');
  proxyHeaders.delete('referer');

  try {
    const proxyRes = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });

    const responseHeaders = new Headers(proxyRes.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      responseHeaders.set(k, v);
    }

    return new Response(proxyRes.body, {
      status: proxyRes.status,
      statusText: proxyRes.statusText,
      headers: responseHeaders,
    });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ═══ PROXY ROUTES (no auth required — proxy forwards auth headers) ═══
    if (path.startsWith('/api/proxy/')) {
      const proxyRes = await handleProxy(request, url);
      if (proxyRes) return proxyRes;
    }

    // ═══ VPS DEPLOY (SSH via Worker — limited, returns instructions) ═══
    if (path === '/api/deploy/vps' && method === 'POST') {
      // CF Workers cannot open SSH connections.
      // This endpoint writes the HTML to a KV/R2 download link,
      // then returns instructions for the user to rsync it manually.
      try {
        const body = await request.json();
        const { html, host, user, remotePath, siteName } = body;
        if (!html) return json({ error: 'Missing html in body' }, 400);

        // Store HTML temporarily in D1 for download
        const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        await env.DB.prepare(
          'INSERT OR REPLACE INTO vps_deploys (id, html, host, created_at) VALUES (?, ?, ?, ?)'
        ).bind(id, html, host || 'unknown', new Date().toISOString()).run().catch(() => { });

        const downloadUrl = `${url.origin}/api/deploy/vps/download/${id}`;
        const sshCmd = `curl -sL "${downloadUrl}" -o /tmp/index.html && scp /tmp/index.html ${user}@${host}:${remotePath}/index.html`;

        return json({
          success: true,
          url: `http://${host}${remotePath?.endsWith('/') ? remotePath : (remotePath || '/') + '/'}`,
          downloadUrl,
          sshCommand: sshCmd,
          note: 'CF Workers cannot SSH directly. Use the download URL or command above.',
        });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // VPS deploy download endpoint
    if (path.startsWith('/api/deploy/vps/download/') && method === 'GET') {
      const id = path.split('/').pop();
      try {
        const row = await env.DB.prepare('SELECT html FROM vps_deploys WHERE id = ?').bind(id).first();
        if (!row) return json({ error: 'Not found or expired' }, 404);
        return new Response(row.html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
        });
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    // Auth check — if API_SECRET is set, require Bearer token
    if (env.API_SECRET) {
      const auth = request.headers.get('Authorization');
      if (!auth || auth !== `Bearer ${env.API_SECRET}`) {
        return json({ error: 'Unauthorized' }, 401);
      }
    }

    const db = env.DB;

    try {
      // ═══ SITES ═══
      if (path === '/api/sites' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM sites ORDER BY created_at DESC').all();
        return json(results);
      }

      if (path === '/api/sites' && method === 'POST') {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare(`
          INSERT INTO sites (id, brand, domain, tagline, email, loan_type, amount_min, amount_max,
            apr_min, apr_max, color_id, font_id, layout, radius, h1, badge, cta, sub,
            gtm_id, network, redirect_url, conversion_id, conversion_label,
            copy_id, sections, compliance, status, cost, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, body.brand || '', body.domain || '', body.tagline || '', body.email || '',
          body.loanType || 'personal', body.amountMin || 100, body.amountMax || 5000,
          body.aprMin || 5.99, body.aprMax || 35.99,
          body.colorId || 'ocean', body.fontId || 'dm-sans', body.layout || 'hero-left',
          body.radius || 'rounded', body.h1 || '', body.badge || '', body.cta || '', body.sub || '',
          body.gtmId || '', body.network || 'LeadsGate', body.redirectUrl || '',
          body.conversionId || '', body.conversionLabel || '',
          body.copyId || '', body.sections || 'default', body.compliance || 'standard',
          body.status || 'completed', body.cost || 0, body.createdBy || ''
        ).run();
        return json({ id, success: true }, 201);
      }

      if (path.match(/^\/api\/sites\/[\w-]+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        await db.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();
        return json({ success: true });
      }

      // ═══ DEPLOYS ═══
      if (path === '/api/deploys' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM deploys ORDER BY created_at DESC LIMIT 100').all();
        return json(results);
      }

      if (path === '/api/deploys' && method === 'POST') {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare(`
          INSERT INTO deploys (id, site_id, brand, url, type, deployed_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(id, body.siteId || '', body.brand || '', body.url || '', body.type || 'new', body.deployedBy || '').run();
        return json({ id, success: true }, 201);
      }

      if (path.startsWith('/api/deploys/') && method === 'DELETE') {
        const id = path.split('/')[3];
        await db.prepare('DELETE FROM deploys WHERE id = ?').bind(id).run();
        return json({ success: true });
      }

      // ═══ VARIANTS ═══
      if (path === '/api/variants' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM variants ORDER BY created_at DESC').all();
        return json(results);
      }

      if (path === '/api/variants' && method === 'POST') {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare(`
          INSERT INTO variants (id, color_id, font_id, layout, radius, copy_id, sections, compliance, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, body.colorId || 'ocean', body.fontId || 'dm-sans', body.layout || 'hero-left',
          body.radius || 'rounded', body.copyId || 'smart', body.sections || 'default',
          body.compliance || 'standard', body.createdBy || ''
        ).run();
        return json({ id, success: true }, 201);
      }

      if (path === '/api/variants/batch' && method === 'POST') {
        const body = await request.json();
        const items = body.variants || [];
        const stmt = db.prepare(`
          INSERT INTO variants (id, color_id, font_id, layout, radius, copy_id, sections, compliance, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const batch = items.map(v => stmt.bind(
          v.id || uid(), v.colorId, v.fontId, v.layout, v.radius, v.copyId, v.sections, v.compliance, v.createdBy || ''
        ));
        await db.batch(batch);
        return json({ success: true, count: items.length }, 201);
      }

      if (path.match(/^\/api\/variants\/[\w-]+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        await db.prepare('DELETE FROM variants WHERE id = ?').bind(id).run();
        return json({ success: true });
      }

      // ═══ OPS: DOMAINS ═══
      if (path === '/api/ops/domains' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM ops_domains ORDER BY created_at DESC').all();
        return json(results);
      }
      if (path === '/api/ops/domains' && method === 'POST') {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare('INSERT INTO ops_domains (id, domain, registrar, account_id, profile_id, cf_account_id, status, zone_id, nameservers, cf_status, registrar_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, body.domain || '', body.registrar || '', body.accountId || '', body.profileId || '', body.cfAccountId || '', body.status || 'active',
            body.zoneId || '', body.nameservers || '[]', body.cfStatus || '', body.registrarAccountId || '').run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Added domain: ${body.domain}`).run();
        return json({ id, success: true }, 201);
      }
      if (path.match(/^\/api\/ops\/domains\/[\w-]+$/) && method === 'PUT') {
        const id = path.split('/').pop();
        const body = await request.json();
        const allowed = ['domain', 'registrar', 'account_id', 'profile_id', 'cf_account_id', 'status', 'zone_id', 'nameservers', 'cf_status'];
        const sets = [];
        const vals = [];
        for (const [key, value] of Object.entries(body)) {
          const col = camelToSnake(key);
          if (!allowed.includes(col)) continue;
          sets.push(`${col} = ?`);
          vals.push(value);
        }
        if (sets.length === 0) return json({ error: 'No fields to update' }, 400);
        vals.push(id);
        await db.prepare(`UPDATE ops_domains SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
        return json({ success: true });
      }
      if (path.match(/^\/api\/ops\/domains\/[\w-]+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        const item = await db.prepare('SELECT domain FROM ops_domains WHERE id = ?').bind(id).first();
        await db.prepare('DELETE FROM ops_domains WHERE id = ?').bind(id).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Deleted domain: ${item?.domain || id}`).run();
        return json({ success: true });
      }

      // ═══ OPS: ACCOUNTS ═══
      if (path === '/api/ops/accounts' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM ops_accounts ORDER BY created_at DESC').all();
        return json(results);
      }
      if (path === '/api/ops/accounts' && method === 'POST') {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare('INSERT INTO ops_accounts (id, label, email, payment_id, budget, status, card_uuid, card_last4, card_status, profile_id, proxy_ip, monthly_spend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, body.label || '', body.email || '', body.paymentId || '', body.budget || '', body.status || 'active',
            body.cardUuid || '', body.cardLast4 || '', body.cardStatus || '', body.profileId || '', body.proxyIp || '', body.monthlySpend || 0).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Added account: ${body.label}`).run();
        return json({ id, success: true }, 201);
      }
      if (path.match(/^\/api\/ops\/accounts\/[\w-]+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        const item = await db.prepare('SELECT label FROM ops_accounts WHERE id = ?').bind(id).first();
        await db.prepare('DELETE FROM ops_accounts WHERE id = ?').bind(id).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Deleted account: ${item?.label || id}`).run();
        return json({ success: true });
      }
      if (path.match(/^\/api\/ops\/accounts\/[\w-]+$/) && method === 'PUT') {
        const id = path.split('/').pop();
        const body = await request.json();
        const sets = [];
        const vals = [];
        for (const [key, value] of Object.entries(body)) {
          if (key === 'id' || key === 'createdAt') continue;
          if (!ALLOWED_COLS.accounts.has(key)) continue;
          sets.push(`${camelToSnake(key)} = ?`);
          vals.push(value);
        }
        if (sets.length === 0) return json({ error: 'No fields to update' }, 400);
        vals.push(id);
        await db.prepare(`UPDATE ops_accounts SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Updated account: ${id}`).run();
        return json({ success: true });
      }

      // ═══ OPS: PROFILES ═══
      if (path === '/api/ops/profiles' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM ops_profiles ORDER BY created_at DESC').all();
        return json(results);
      }
      if (path === '/api/ops/profiles' && method === 'POST') {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare('INSERT INTO ops_profiles (id, name, proxy_ip, browser_type, os, status, ml_profile_id, ml_folder_id, proxy_host, proxy_port, proxy_user, fingerprint_os) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, body.name || '', body.proxyIp || '', body.browserType || '', body.os || '', body.status || 'active',
            body.mlProfileId || '', body.mlFolderId || '', body.proxyHost || '', body.proxyPort || '', body.proxyUser || '', body.fingerprintOs || '').run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Added profile: ${body.name}`).run();
        return json({ id, success: true }, 201);
      }
      if (path.match(/^\/api\/ops\/profiles\/[\w-]+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        const item = await db.prepare('SELECT name FROM ops_profiles WHERE id = ?').bind(id).first();
        await db.prepare('DELETE FROM ops_profiles WHERE id = ?').bind(id).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Deleted profile: ${item?.name || id}`).run();
        return json({ success: true });
      }
      if (path.match(/^\/api\/ops\/profiles\/[\w-]+$/) && method === 'PUT') {
        const id = path.split('/').pop();
        const body = await request.json();
        const sets = [];
        const vals = [];
        for (const [key, value] of Object.entries(body)) {
          if (key === 'id' || key === 'createdAt') continue;
          if (!ALLOWED_COLS.profiles.has(key)) continue;
          sets.push(`${camelToSnake(key)} = ?`);
          vals.push(value);
        }
        if (sets.length === 0) return json({ error: 'No fields to update' }, 400);
        vals.push(id);
        await db.prepare(`UPDATE ops_profiles SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Updated profile: ${id}`).run();
        return json({ success: true });
      }

      // ═══ OPS: PAYMENTS ═══
      if (path === '/api/ops/payments' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM ops_payments ORDER BY created_at DESC').all();
        return json(results);
      }
      if (path === '/api/ops/payments' && method === 'POST') {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare('INSERT INTO ops_payments (id, label, type, last4, bank_name, status, lc_card_uuid, lc_bin_uuid, card_limit, card_expiry, total_spend) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(id, body.label || '', body.type || '', body.last4 || '', body.bankName || '', body.status || 'active',
            body.lcCardUuid || '', body.lcBinUuid || '', body.cardLimit || 0, body.cardExpiry || '', body.totalSpend || 0).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Added payment: ${body.label}`).run();
        return json({ id, success: true }, 201);
      }
      if (path.match(/^\/api\/ops\/payments\/[\w-]+$/) && method === 'DELETE') {
        const id = path.split('/').pop();
        const item = await db.prepare('SELECT label FROM ops_payments WHERE id = ?').bind(id).first();
        await db.prepare('DELETE FROM ops_payments WHERE id = ?').bind(id).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Deleted payment: ${item?.label || id}`).run();
        return json({ success: true });
      }
      if (path.match(/^\/api\/ops\/payments\/[\w-]+$/) && method === 'PUT') {
        const id = path.split('/').pop();
        const body = await request.json();
        const sets = [];
        const vals = [];
        for (const [key, value] of Object.entries(body)) {
          if (key === 'id' || key === 'createdAt') continue;
          if (!ALLOWED_COLS.payments.has(key)) continue;
          sets.push(`${camelToSnake(key)} = ?`);
          vals.push(value);
        }
        if (sets.length === 0) return json({ error: 'No fields to update' }, 400);
        vals.push(id);
        await db.prepare(`UPDATE ops_payments SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Updated payment: ${id}`).run();
        return json({ success: true });
      }

      // ═══ OPS: LOGS ═══
      if (path === '/api/ops/logs' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM ops_logs ORDER BY created_at DESC LIMIT 200').all();
        return json(results);
      }

      // ═══ SETTINGS ═══
      if (path === '/api/settings' && method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM settings').all();
        const obj = {};
        results.forEach(r => { obj[r.key] = r.value; });
        return json(obj);
      }

      if (path === '/api/settings' && method === 'POST') {
        const body = await request.json();
        for (const [key, value] of Object.entries(body)) {
          await db.prepare(`
            INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
          `).bind(key, String(value), String(value)).run();
        }
        return json({ success: true });
      }

      // ═══ AI: GENERATION ═══
      if (path === "/api/ai/generate-copy" && method === "POST") {
        const body = await request.json();
        const settingsRow = await db.prepare("SELECT * FROM settings WHERE key = 'geminiKey'").first();
        const key = settingsRow?.value;
        if (!key) return json({ error: "Gemini Key not configured" }, 400);

        const prompt = `Generate high-converting loan landing page copy.
          Brand: "${body.brand}"
          Loan Type: "${body.loanType}"
          Amount Range: $${body.amountMin}-$${body.amountMax}
          Language: ${body.lang || "English"}
          Format: Strict JSON object only. No markdown.
          Structure: {"h1":"","badge":"","cta":"","sub":"","tagline":"","trust_msg":""}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const d = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/```json|```/g, "").trim();
        try {
          return json(JSON.parse(text));
        } catch {
          return json({ error: "AI Format Error", raw: text }, 500);
        }
      }

      if (path === "/api/ai/generate-assets" && method === "POST") {
        const body = await request.json();
        const settingsRes = await db.prepare("SELECT * FROM settings WHERE key = 'geminiKey'").first();
        const key = settingsRes?.value;
        if (!key) return json({ error: "Gemini Key not configured" }, 400);

        const type = body.type || "logo";
        const promptGen = `Act as an expert AI prompt engineer. Create a highly detailed, professional prompt for an image generator (DALL-E 3 style).
          Brand: "${body.brand}"
          Context: "${type === 'logo' ? 'Fintech logo design' : 'High-converting hero background for loan site'}"
          Style: "${body.style || 'Modern & Clean'}"
          Requirements: ${type === 'logo' ? 'Flat vector, minimalist, white background, no text except brand' : 'Photorealistic, soft lighting, lots of copy space, 16:9'}
          Output: ONLY the refined prompt text. No chatter.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: promptGen }] }] })
        });
        const d = await res.json();
        const refinedPrompt = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Modern fintech visual";

        const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(refinedPrompt)}?width=${type === 'logo' ? 512 : 1280}&height=${type === 'logo' ? 512 : 720}&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

        return json({ url: imageUrl, prompt: refinedPrompt });
      }

      // ═══ CF ACCOUNTS ═══
      if (path === "/api/cf-accounts" && method === "GET") {
        const { results } = await db.prepare("SELECT * FROM cf_accounts ORDER BY label ASC").all();
        return json(results);
      }
      if (path === "/api/cf-accounts" && method === "POST") {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare("INSERT INTO cf_accounts (id, email, api_key, label, account_id, api_token) VALUES (?, ?, ?, ?, ?, ?)")
          .bind(id, body.email || "", body.apiKey || "", body.label || "", body.accountId || "", body.apiToken || "").run();
        return json({ id, success: true }, 201);
      }
      if (path.match(/^\/api\/cf-accounts\/[\w-]+$/) && method === "PUT") {
        const id = path.split("/").pop();
        const body = await request.json();
        const allowed = ['label', 'email', 'api_key', 'account_id', 'api_token'];
        const sets = [];
        const vals = [];
        for (const [key, value] of Object.entries(body)) {
          const col = camelToSnake(key);
          if (!allowed.includes(col)) continue;
          sets.push(`${col} = ?`);
          vals.push(value);
        }
        if (sets.length === 0) return json({ error: 'No fields to update' }, 400);
        vals.push(id);
        await db.prepare(`UPDATE cf_accounts SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
        return json({ success: true });
      }
      // Get a single CF account with full token (not redacted)
      if (path.match(/^\/api\/cf-accounts\/[\w-]+\/token$/) && method === "GET") {
        const id = path.split("/")[3];
        const row = await db.prepare("SELECT api_token, account_id FROM cf_accounts WHERE id = ?").bind(id).first();
        if (!row) return json({ error: "Not found" }, 404);
        return json({ apiToken: row.api_token, accountId: row.account_id });
      }
      if (path.match(/^\/api\/cf-accounts\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/").pop();
        await db.prepare("DELETE FROM cf_accounts WHERE id = ?").bind(id).run();
        return json({ success: true });
      }

      // ═══ REGISTRAR ACCOUNTS ═══
      if (path === "/api/registrar-accounts" && method === "GET") {
        const { results } = await db.prepare("SELECT * FROM registrar_accounts ORDER BY label ASC").all();
        return json(results);
      }
      if (path === "/api/registrar-accounts" && method === "POST") {
        const body = await request.json();
        const id = body.id || uid();
        await db.prepare("INSERT INTO registrar_accounts (id, provider, label, api_key, secret_key, account_id, api_token, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(id, body.provider || "", body.label || "", body.apiKey || "", body.secretKey || "", body.accountId || "", body.apiToken || "", body.status || "active").run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Added registrar account: ${body.label} (${body.provider})`).run();
        return json({ id, success: true }, 201);
      }
      if (path.match(/^\/api\/registrar-accounts\/[\w-]+$/) && method === "PUT") {
        const id = path.split("/").pop();
        const body = await request.json();
        const allowed = ['provider', 'label', 'api_key', 'secret_key', 'account_id', 'api_token', 'status'];
        const sets = [];
        const vals = [];
        for (const [key, value] of Object.entries(body)) {
          const col = camelToSnake(key);
          if (!allowed.includes(col)) continue;
          sets.push(`${col} = ?`);
          vals.push(value);
        }
        if (sets.length === 0) return json({ error: 'No fields to update' }, 400);
        vals.push(id);
        await db.prepare(`UPDATE registrar_accounts SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
        return json({ success: true });
      }
      if (path.match(/^\/api\/registrar-accounts\/[\w-]+$/) && method === "DELETE") {
        const id = path.split("/").pop();
        const item = await db.prepare("SELECT label FROM registrar_accounts WHERE id = ?").bind(id).first();
        await db.prepare("DELETE FROM registrar_accounts WHERE id = ?").bind(id).run();
        await db.prepare('INSERT INTO ops_logs (id, msg) VALUES (?, ?)').bind(uid(), `Deleted registrar account: ${item?.label || id}`).run();
        return json({ success: true });
      }

      // ═══ STATS (computed) ═══
      if (path === '/api/stats' && method === 'GET') {
        const sites = await db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(cost),0) as spend FROM sites').first();
        const deploys = await db.prepare('SELECT COUNT(*) as count FROM deploys').first();
        const domains = await db.prepare('SELECT COUNT(*) as count FROM ops_domains').first();
        return json({
          builds: sites.count,
          spend: sites.spend,
          deployed: deploys.count,
          domains: domains.count,
        });
      }

      // ═══ ALL DATA (initial load) ═══
      if (path === '/api/init' && method === 'GET') {
        const [sites, deploys, variants, domains, accounts, profiles, payments, logs, settingsRows, stats, cfAccountsResults, registrarAccountsResults] = await Promise.all([
          db.prepare('SELECT * FROM sites ORDER BY created_at DESC').all(),
          db.prepare('SELECT * FROM deploys ORDER BY created_at DESC LIMIT 100').all(),
          db.prepare('SELECT * FROM variants ORDER BY created_at DESC').all(),
          db.prepare('SELECT * FROM ops_domains ORDER BY created_at DESC').all(),
          db.prepare('SELECT * FROM ops_accounts ORDER BY created_at DESC').all(),
          db.prepare('SELECT * FROM ops_profiles ORDER BY created_at DESC').all(),
          db.prepare('SELECT * FROM ops_payments ORDER BY created_at DESC').all(),
          db.prepare('SELECT * FROM ops_logs ORDER BY created_at DESC LIMIT 200').all(),
          db.prepare('SELECT * FROM settings').all(),
          db.prepare('SELECT COUNT(*) as builds, COALESCE(SUM(cost),0) as spend FROM sites').first(),
          db.prepare('SELECT * FROM cf_accounts ORDER BY label ASC').all(),
          db.prepare('SELECT * FROM registrar_accounts ORDER BY label ASC').all().catch(() => ({ results: [] })),
        ]);

        const settingsObj = {};
        settingsRows.results.forEach(r => { settingsObj[r.key] = r.value; });

        return json({
          sites: sites.results.map(snakeToCamel),
          deploys: deploys.results.map(snakeToCamel),
          variants: variants.results.map(snakeToCamel),
          ops: {
            domains: domains.results.map(snakeToCamel),
            accounts: accounts.results.map(snakeToCamel),
            profiles: profiles.results.map(snakeToCamel),
            payments: payments.results.map(snakeToCamel),
            logs: logs.results.map(snakeToCamel),
          },
          cfAccounts: cfAccountsResults.results.map(r => {
            const c = snakeToCamel(r);
            // Redact sensitive tokens — show last 4 chars only
            if (c.apiToken) c.apiTokenHint = '••••' + c.apiToken.slice(-4);
            if (c.apiKey) c.apiKeyHint = '••••' + c.apiKey.slice(-4);
            // Keep full tokens so frontend can use them for API calls
            return c;
          }),
          registrarAccounts: (registrarAccountsResults.results || []).map(r => {
            const c = snakeToCamel(r);
            // Redact sensitive keys
            if (c.apiKey) c.apiKeyHint = '••••' + c.apiKey.slice(-4);
            if (c.secretKey) c.secretKeyHint = '••••' + c.secretKey.slice(-4);
            if (c.apiToken) c.apiTokenHint = '••••' + c.apiToken.slice(-4);
            return c;
          }),
          settings: redactSettings(settingsObj),
          stats: { builds: stats.builds, spend: stats.spend },
          integrations: {
            lcConfigured: !!settingsObj.lcToken,
            mlConfigured: !!settingsObj.mlToken,
            netlifyConfigured: !!settingsObj.netlifyToken,
          },
        });
      }

      // ═══ LEADINGCARDS PROXY ═══
      if (path === '/api/lc/cards' && method === 'GET') {
        const lc = await getLcSettings(db);
        if (!lc.lcToken) return json({ error: 'LeadingCards token not configured' }, 400);
        const params = new URLSearchParams(url.search);
        if (lc.lcTeamUuid) params.set('team_uuid', lc.lcTeamUuid);
        const res = await fetch(`https://app.leadingcards.media/v1/cards/?${params.toString()}`, {
          headers: { 'Authorization': `Token ${lc.lcToken}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        return json(data, res.status);
      }

      if (path === '/api/lc/cards' && method === 'POST') {
        const lc = await getLcSettings(db);
        if (!lc.lcToken) return json({ error: 'LeadingCards token not configured' }, 400);
        const body = await request.json();
        if (lc.lcTeamUuid) body.team_uuid = lc.lcTeamUuid;
        const res = await fetch('https://app.leadingcards.media/v1/cards/', {
          method: 'POST',
          headers: { 'Authorization': `Token ${lc.lcToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return json(data, res.status);
      }

      if (path.match(/^\/api\/lc\/cards\/[\w-]+\/(block|activate)$/) && method === 'PUT') {
        const lc = await getLcSettings(db);
        if (!lc.lcToken) return json({ error: 'LeadingCards token not configured' }, 400);
        const parts = path.split('/');
        const action = parts.pop();
        const uuid = parts.pop();
        const res = await fetch(`https://app.leadingcards.media/v1/cards/${uuid}/${action}/`, {
          method: 'PUT',
          headers: { 'Authorization': `Token ${lc.lcToken}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        return json(data, res.status);
      }

      if (path.match(/^\/api\/lc\/cards\/[\w-]+\/change_limit$/) && method === 'PUT') {
        const lc = await getLcSettings(db);
        if (!lc.lcToken) return json({ error: 'LeadingCards token not configured' }, 400);
        const parts = path.split('/');
        parts.pop(); // change_limit
        const uuid = parts.pop();
        const body = await request.json();
        const res = await fetch(`https://app.leadingcards.media/v1/cards/${uuid}/change_limit/`, {
          method: 'PUT',
          headers: { 'Authorization': `Token ${lc.lcToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return json(data, res.status);
      }

      if (path.match(/^\/api\/lc\/(bins|billing|tags|transactions|teams)$/) && method === 'GET') {
        const lc = await getLcSettings(db);
        if (!lc.lcToken) return json({ error: 'LeadingCards token not configured' }, 400);
        const resource = path.split('/').pop();
        const apiMap = { bins: 'cards/bins', billing: 'billing_addresses', tags: 'tags', transactions: 'transactions', teams: 'teams' };
        const endpoint = apiMap[resource];
        const params = new URLSearchParams(url.search);
        const res = await fetch(`https://app.leadingcards.media/v1/${endpoint}/?${params.toString()}`, {
          headers: { 'Authorization': `Token ${lc.lcToken}`, 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        return json(data, res.status);
      }

      if (path === '/api/lc/billing' && method === 'POST') {
        const lc = await getLcSettings(db);
        if (!lc.lcToken) return json({ error: 'LeadingCards token not configured' }, 400);
        const body = await request.json();
        const res = await fetch('https://app.leadingcards.media/v1/billing_addresses/', {
          method: 'POST',
          headers: { 'Authorization': `Token ${lc.lcToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return json(data, res.status);
      }

      // ═══ MULTILOGIN PROXY ═══
      if (path === '/api/ml/signin' && method === 'POST') {
        const ml = await getMlSettings(db);
        if (!ml.mlEmail || !ml.mlPassword) return json({ error: 'Multilogin email/password not configured' }, 400);
        const res = await fetch('https://api.multilogin.com/user/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ml.mlEmail, password: md5(ml.mlPassword) }),
        });
        const data = await res.json();
        if (data.data?.token) {
          await db.prepare(`
            INSERT INTO settings (key, value, updated_at) VALUES ('mlToken', ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
          `).bind(data.data.token, data.data.token).run();
        }
        return json(data, res.status);
      }

      if (path === '/api/ml/refresh-token' && method === 'POST') {
        const ml = await getMlSettings(db);
        if (!ml.mlToken) return json({ error: 'Multilogin token not configured' }, 400);
        const res = await fetch('https://api.multilogin.com/user/refresh_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ml.mlToken}` },
        });
        const data = await res.json();
        if (data.data?.token) {
          await db.prepare(`
            INSERT INTO settings (key, value, updated_at) VALUES ('mlToken', ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
          `).bind(data.data.token, data.data.token).run();
        }
        return json(data, res.status);
      }

      if (path === '/api/ml/profiles' && method === 'GET') {
        const ml = await getMlSettings(db);
        if (!ml.mlToken) return json({ error: 'Multilogin token not configured' }, 400);
        const params = new URLSearchParams(url.search);
        const res = await fetch(`https://api.multilogin.com/profile/list?${params.toString()}`, {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ml.mlToken}` },
        });
        const data = await res.json();
        return json(data, res.status);
      }

      if (path === '/api/ml/profiles' && method === 'POST') {
        const ml = await getMlSettings(db);
        if (!ml.mlToken) return json({ error: 'Multilogin token not configured' }, 400);
        const body = await request.json();
        const res = await fetch('https://api.multilogin.com/profile/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ml.mlToken}` },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        return json(data, res.status);
      }

      if (path.match(/^\/api\/ml\/profiles\/[\w-]+\/(start|stop)$/) && method === 'POST') {
        const ml = await getMlSettings(db);
        if (!ml.mlToken) return json({ error: 'Multilogin token not configured' }, 400);
        const parts = path.split('/');
        const action = parts.pop();
        const profileId = parts.pop();
        const res = await fetch(`https://api.multilogin.com/profile/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ml.mlToken}` },
          body: JSON.stringify({ profile_id: profileId }),
        });
        const data = await res.json();
        return json(data, res.status);
      }

      if (path.match(/^\/api\/ml\/profiles\/[\w-]+\/clone$/) && method === 'POST') {
        const ml = await getMlSettings(db);
        if (!ml.mlToken) return json({ error: 'Multilogin token not configured' }, 400);
        const parts = path.split('/');
        parts.pop(); // clone
        const profileId = parts.pop();
        const res = await fetch('https://api.multilogin.com/profile/clone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ml.mlToken}` },
          body: JSON.stringify({ profile_id: profileId }),
        });
        const data = await res.json();
        return json(data, res.status);
      }

      return json({ error: 'Not found' }, 404);

    } catch (err) {
      console.error(err);
      return json({ error: err.message }, 500);
    }
  },
};
