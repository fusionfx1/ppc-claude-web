/**
 * Git Push deployer
 * Queues a deploy by committing generated artifacts into a GitHub repository.
 * For Astro projects, sends all project files. For HTML templates, sends index.html.
 */

const WORKER_BASE = "https://lp-factory-api.songsawat-w.workers.dev";

export async function deploy(content, site, settings) {
  // If content is an object with multiple files (Astro project), use it directly
  // If content is a string (HTML), wrap it as index.html
  let files;

  if (typeof content === "string") {
    files = { "index.html": content };
  } else if (content && typeof content === "object") {
    // Already a files map (from Astro project generator)
    files = content;
    // Ensure index.html exists if it's a multi-file deploy
    if (!files["index.html"]) {
      throw new Error("Deploy requires index.html in generated content");
    }
  } else {
    throw new Error("Invalid deploy content for git-push target");
  }

  const rawGithubToken = String(settings.githubToken || "").trim();
  const githubToken = isMaskedSecret(rawGithubToken) ? "" : rawGithubToken;
  const payload = {
    siteId: site.id,
    domainId: site.id,
    deployRecordId: site._deployRecordId || "",
    domain: site.domain || site.brand || "unknown",
    brand: site.brand || "",
    templateId: site.templateId || "classic",
    environment: site.environment || "production",
    target: "git-push",
    requestedBy: settings.userEmail || "unknown",
    files,
    githubToken,
    repoOwner: settings.githubRepoOwner || "",
    repoName: settings.githubRepoName || "",
    branch: settings.githubRepoBranch || "deploy/auto",
    workflowFile: settings.githubDeployWorkflow || "deploy-sites.yml",
  };

  if (!settings.githubRepoOwner || !settings.githubRepoName) {
    throw new Error("Git push deploy not configured: set GitHub owner/repo in Settings.");
  }

  const res = await fetch(`${WORKER_BASE}/api/ops/deployments/git-push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Git push API error: ${res.status}`);
  }

  return {
    success: !!data.success,
    queued: !!data.queued,
    url: data.url || data.commitUrl || data.workflowUrl || "",
    deployId: data.deployId,
    message: data.message,
    workflowUrl: data.workflowUrl,
    commitUrl: data.commitUrl,
    branch: data.branch,
  };
}

// Legacy function for HTML-only content - kept for compatibility
function normalizeFiles(content) {
  if (typeof content === "string") {
    return { "index.html": content };
  }

  if (content && typeof content === "object") {
    const out = {};
    Object.entries(content).forEach(([path, fileContent]) => {
      const cleanPath = String(path || "").replace(/^\/+/, "");
      if (!cleanPath) return;
      out[cleanPath] = String(fileContent ?? "");
    });
    if (!out["index.html"]) {
      throw new Error("Git push deploy requires index.html in generated content");
    }
    return out;
  }

  throw new Error("Invalid deploy content for git-push target");
}

function isMaskedSecret(value) {
  return /^[•*]+$/.test(String(value || "").trim());
}
