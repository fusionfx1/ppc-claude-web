/**
 * Deploy Orchestrator
 * Routes to the correct deployer module based on target.
 * Returns standardized result: { success, url, deployId, target, error }
 */

import * as cfPages from "./cf-pages.js";
import * as netlify from "./netlify.js";
import * as cfWorkers from "./cf-workers.js";
import * as s3Cloudfront from "./s3-cloudfront.js";
import * as vpsSsh from "./vps-ssh.js";
import * as vercel from "./vercel.js";

const DEPLOYERS = {
  "cf-pages": cfPages,
  "netlify": netlify,
  "cf-workers": cfWorkers,
  "s3-cloudfront": s3Cloudfront,
  "vps-ssh": vpsSsh,
  "vercel": vercel,
};

export const DEPLOY_TARGETS = [
  { id: "cf-pages", label: "Cloudflare Pages", icon: "☁️", priority: 1, description: "Primary — fast, free, CF integration" },
  { id: "netlify", label: "Netlify", icon: "🔺", priority: 2, description: "Backup — diversify footprint" },
  { id: "cf-workers", label: "CF Workers Sites", icon: "⚡", priority: 4, description: "Edge logic — A/B test, geo-redirect" },
  { id: "s3-cloudfront", label: "S3 + CloudFront", icon: "🪣", priority: 5, description: "AWS — US-focused, low latency" },
  { id: "vercel", label: "Vercel", icon: "▲", priority: 3, description: "Reliable — standard static hosting" },
  { id: "vps-ssh", label: "VPS (SSH)", icon: "🖥️", priority: 6, description: "Self-managed server, full control" },
];

/**
 * Deploy HTML to a specific target.
 * @param {string} target - One of: cf-pages, netlify, cf-workers, s3-cloudfront, vps-ssh
 * @param {string} html - The generated static HTML
 * @param {object} site - Site configuration object
 * @param {object} settings - User settings with API credentials
 * @returns {Promise<{success: boolean, url?: string, deployId?: string, target: string, error?: string}>}
 */
export async function deployTo(target, html, site, settings) {
  const deployer = DEPLOYERS[target];
  if (!deployer) {
    return { success: false, target, error: `Unknown deploy target: ${target}` };
  }

  try {
    const result = await deployer.deploy(html, site, settings);
    return { ...result, target };
  } catch (e) {
    return { success: false, target, error: `Deploy failed: ${e.message}` };
  }
}

/**
 * Check which deploy targets have valid credentials configured.
 */
export function getAvailableTargets(settings) {
  return DEPLOY_TARGETS.map(t => ({
    ...t,
    configured: isTargetConfigured(t.id, settings),
  }));
}

function isTargetConfigured(target, settings) {
  switch (target) {
    case "cf-pages":
    case "cf-workers":
      return !!(settings.cfApiToken && settings.cfAccountId);
    case "netlify":
      return !!settings.netlifyToken;
    case "s3-cloudfront":
      return !!(settings.awsAccessKey && settings.awsSecretKey && settings.s3Bucket);
    case "vps-ssh":
      return !!(settings.vpsHost && settings.vpsUser && settings.vpsPath && (settings.vpsWorkerUrl || settings.workerBaseUrl));
    case "vercel":
      return !!settings.vercelToken;
    default:
      return false;
  }
}
