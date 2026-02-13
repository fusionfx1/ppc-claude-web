/**
 * Neon Serverless Postgres — Data Access Layer
 * Uses @neondatabase/serverless HTTP driver (works in browsers).
 *
 * Tables:
 *   settings  (key TEXT PK, value JSONB, updated_at)
 *   sites     (id TEXT PK, data JSONB, created_at, updated_at)
 *   deploy_history (id TEXT PK, site_id TEXT FK, target, url, status, brand, created_at)
 */

import { neon } from "@neondatabase/serverless";

let sql = null;

/**
 * Initialize the Neon connection. Call once on app start.
 * @param {string} connectionString - Neon pooler connection string
 */
export function initNeon(connectionString) {
  if (!connectionString) return false;
  try {
    sql = neon(connectionString);
    return true;
  } catch {
    sql = null;
    return false;
  }
}

/** Check if Neon is connected */
export function isNeonReady() {
  return sql !== null;
}

/** Test connectivity */
export async function ping() {
  if (!sql) return false;
  try {
    const rows = await sql`SELECT 1 as ok`;
    return rows?.[0]?.ok === 1;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════

/** Load all settings as a flat object */
export async function loadSettings() {
  if (!sql) return null;
  try {
    const rows = await sql`SELECT key, value FROM settings`;
    const result = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  } catch (e) {
    console.warn("[neon] loadSettings error:", e.message);
    return null;
  }
}

/** Save one or more settings (upsert) */
export async function saveSettings(obj) {
  if (!sql) return false;
  try {
    for (const [key, value] of Object.entries(obj)) {
      await sql`
        INSERT INTO settings (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(value)}, now())
        ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = now()
      `;
    }
    return true;
  } catch (e) {
    console.warn("[neon] saveSettings error:", e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// SITES
// ═══════════════════════════════════════════════════════

/** Load all sites */
export async function loadSites() {
  if (!sql) return null;
  try {
    const rows = await sql`SELECT id, data, created_at FROM sites ORDER BY created_at DESC`;
    return rows.map(r => ({ ...r.data, id: r.id, _createdAt: r.created_at }));
  } catch (e) {
    console.warn("[neon] loadSites error:", e.message);
    return null;
  }
}

/** Upsert a site */
export async function saveSite(site) {
  if (!sql) return false;
  try {
    const { id, ...data } = site;
    await sql`
      INSERT INTO sites (id, data, created_at, updated_at)
      VALUES (${id}, ${JSON.stringify(data)}, now(), now())
      ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(data)}, updated_at = now()
    `;
    return true;
  } catch (e) {
    console.warn("[neon] saveSite error:", e.message);
    return false;
  }
}

/** Delete a site */
export async function deleteSite(id) {
  if (!sql) return false;
  try {
    await sql`DELETE FROM sites WHERE id = ${id}`;
    return true;
  } catch (e) {
    console.warn("[neon] deleteSite error:", e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// DEPLOY HISTORY
// ═══════════════════════════════════════════════════════

/** Load recent deploys (last 100) */
export async function loadDeploys() {
  if (!sql) return null;
  try {
    const rows = await sql`
      SELECT id, site_id, target, url, status, brand, created_at
      FROM deploy_history ORDER BY created_at DESC LIMIT 100
    `;
    return rows.map(r => ({
      id: r.id,
      siteId: r.site_id,
      target: r.target,
      url: r.url,
      status: r.status,
      brand: r.brand,
      ts: r.created_at,
    }));
  } catch (e) {
    console.warn("[neon] loadDeploys error:", e.message);
    return null;
  }
}

/** Save a deploy record */
export async function saveDeploy(deploy) {
  if (!sql) return false;
  try {
    await sql`
      INSERT INTO deploy_history (id, site_id, target, url, status, brand, created_at)
      VALUES (${deploy.id}, ${deploy.siteId}, ${deploy.target || "netlify"}, ${deploy.url || ""}, ${deploy.status || "success"}, ${deploy.brand || ""}, ${deploy.ts || new Date().toISOString()})
      ON CONFLICT (id) DO NOTHING
    `;
    return true;
  } catch (e) {
    console.warn("[neon] saveDeploy error:", e.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// BULK SYNC (localStorage -> Neon)
// ═══════════════════════════════════════════════════════

/**
 * One-time sync: push localStorage data into Neon.
 * Called on first connection when Neon tables are empty.
 */
export async function syncFromLocal(localSettings, localSites, localDeploys) {
  if (!sql) return;
  try {
    // Settings
    if (localSettings && Object.keys(localSettings).length > 0) {
      await saveSettings(localSettings);
    }
    // Sites
    if (localSites?.length > 0) {
      for (const site of localSites) {
        await saveSite(site);
      }
    }
    // Deploys
    if (localDeploys?.length > 0) {
      for (const d of localDeploys) {
        await saveDeploy(d);
      }
    }
  } catch (e) {
    console.warn("[neon] syncFromLocal error:", e.message);
  }
}
