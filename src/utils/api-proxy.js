/**
 * API Proxy resolver
 *
 * Routes Cloudflare & Multilogin API calls through the existing Worker backend
 * at lp-factory-api.songsawat-w.workers.dev to avoid CORS issues.
 *
 * The Worker has built-in CORS headers, so no separate proxy is needed.
 *
 * Routes:
 *   /api/proxy/cf/*   → api.cloudflare.com/client/v4/*
 *   /api/proxy/mlx/*  → api.multilogin.com/*
 */

const WORKER_BASE = "https://lp-factory-api.songsawat-w.workers.dev";

/**
 * Get Cloudflare API base URL.
 * All environments route through the Worker proxy to avoid CORS.
 *
 * Equivalent to: https://api.cloudflare.com/client/v4
 */
export function getCfApiBase(/* settings */) {
  return `${WORKER_BASE}/api/proxy/cf`;
}

/**
 * Get Multilogin API base URL.
 * All environments route through the Worker proxy to avoid CORS.
 *
 * Equivalent to: https://api.multilogin.com
 */
export function getMlxApiBase(/* settings */) {
  return `${WORKER_BASE}/api/proxy/mlx`;
}
