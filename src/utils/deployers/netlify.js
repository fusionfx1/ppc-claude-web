/**
 * Netlify Deploy (P2 - Secondary)
 * Extracted from Sites.jsx into standalone deployer module.
 */

import { updateDnsAfterDeploy } from "../../services/cloudflare-dns.js";

export async function deploy(content, site, settings) {
  const { netlifyToken, netlifyTeamSlug, cfAccountId, cfApiToken } = settings;
  if (!netlifyToken) {
    return { success: false, error: "Missing Netlify token. Configure in Settings." };
  }

  // Normalize content: string → single file, object → multi-file
  const fileEntries = typeof content === "string"
    ? { "/index.html": content }
    : Object.fromEntries(
        Object.entries(content).map(([k, v]) => [k.startsWith("/") ? k : `/${k}`, v])
      );

  const slugBase = (site.domain || site.brand || "lp")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const siteIdPart = String(site.id || "x")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const primarySlug = `${slugBase}-${siteIdPart.slice(0, 8) || "x"}`.slice(0, 63);
  const legacySlug = `${slugBase}-${siteIdPart.slice(0, 4) || "x"}`.slice(0, 63);
  const slugCandidates = Array.from(new Set([primarySlug, legacySlug]));
  const authH = { Authorization: `Bearer ${netlifyToken}` };
  const teamSlug = String(netlifyTeamSlug || "").trim();
  const withTeam = (url) => {
    if (!teamSlug) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}account_slug=${encodeURIComponent(teamSlug)}`;
  };

  try {
    // 1. Find existing site by slug candidates first
    let siteData;
    let activeSlug = slugCandidates[0];
    const findBySlug = async (slug) => {
      const existing = await fetch(
        withTeam(`https://api.netlify.com/api/v1/sites/${encodeURIComponent(slug)}`),
        { headers: authH }
      );
      if (!existing.ok) return null;
      return existing.json();
    };

    for (const candidate of slugCandidates) {
      const found = await findBySlug(candidate);
      if (found) {
        console.log(`[Netlify] Found existing site: ${candidate} (${found.id})`);
        siteData = found;
        activeSlug = candidate;
        break;
      }
    }

    // Only create if absolutely no existing site found
    if (!siteData) {
      console.log(`[Netlify] No existing site found, creating new: ${activeSlug}`);
      const createWithName = async (name) => fetch(withTeam("https://api.netlify.com/api/v1/sites"), {
        method: "POST",
        headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      let createRes = await createWithName(activeSlug);
      if (createRes.ok) {
        siteData = await createRes.json();
      } else {
        const createErr = await createRes.text().catch(() => "");

        // Race-safe re-check: site may have been created in parallel
        siteData = await findBySlug(activeSlug);

        // If slug is globally taken by another account/team, retry with unique slug
        if (!siteData && /must be unique/i.test(createErr)) {
          const uniqueSuffix = Date.now().toString(36).slice(-6);
          const retrySlug = `${slugBase}-${siteIdPart.slice(0, 8) || "x"}-${uniqueSuffix}`.slice(0, 63);
          activeSlug = retrySlug;

          createRes = await createWithName(retrySlug);
          if (createRes.ok) {
            siteData = await createRes.json();
          } else {
            const retryErr = await createRes.text().catch(() => "");
            siteData = await findBySlug(retrySlug);
            if (!siteData) {
              return {
                success: false,
                error: `Failed to create/find Netlify site${teamSlug ? ` in team '${teamSlug}'` : ""}: ${retryErr || createErr || "Unknown Netlify API error"}`,
              };
            }
          }
        }

        if (!siteData) {
          return {
            success: false,
            error: `Failed to create/find Netlify site${teamSlug ? ` in team '${teamSlug}'` : ""}: ${createErr || "Unknown Netlify API error"}`,
          };
        }
      }
    }

    console.log(`[Netlify] Starting deploy for site:`, {
      brand: site.brand,
      domain: site.domain,
      siteId: site.id,
      activeSlug: activeSlug,
      siteDataId: siteData?.id
    });

    // 2. Prepare file data & compute SHA1 hashes
    const encoder = new TextEncoder();
    const computeSha1 = async (buf) => {
      const hash = await crypto.subtle.digest("SHA-1", buf);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    };

    // Build files map from fileEntries
    const filesToDeploy = {};
    for (const [filePath, fileContent] of Object.entries(fileEntries)) {
      const fileData = encoder.encode(fileContent);
      filesToDeploy[filePath] = { data: fileData, sha1: await computeSha1(fileData) };
    }

    // Build digest map for deploy creation
    const filesDigest = {};
    for (const [path, file] of Object.entries(filesToDeploy)) {
      filesDigest[path] = file.sha1;
    }
    console.log(`[Netlify] Files to deploy:`, Object.keys(filesDigest));

    // 3. Create deploy with file digests
    const deployRes = await fetch(
      withTeam(`https://api.netlify.com/api/v1/sites/${siteData.id}/deploys`),
      {
        method: "POST",
        headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({ files: filesDigest }),
      }
    );
    if (!deployRes.ok) {
      const errText = await deployRes.text().catch(() => "");
      console.error(`[Netlify] Deploy creation failed:`, errText);
      return { success: false, error: `Netlify deploy creation failed: ${errText || "Unknown error"}` };
    }
    const deployData = await deployRes.json();
    console.log(`[Netlify] Deploy created:`, { id: deployData.id, required: deployData.required });

    // 4. Upload required files (use raw binary body, NOT FormData)
    if (deployData.required && deployData.required.length > 0) {
      for (const [filePath, file] of Object.entries(filesToDeploy)) {
        if (!deployData.required.includes(file.sha1)) continue;

        const uploadUrl = `https://api.netlify.com/api/v1/deploys/${deployData.id}/files${filePath}`;
        console.log(`[Netlify] Uploading ${filePath} to:`, uploadUrl);

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            ...authH,
            "Content-Type": "application/octet-stream",
          },
          body: file.data,
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => "");
          console.error(`[Netlify] Upload failed for ${filePath}:`, uploadRes.status, errText);
          return { success: false, error: `Netlify upload failed for ${filePath}: ${uploadRes.status} ${errText}` };
        }
        console.log(`[Netlify] Uploaded ${filePath} OK`);
      }
    }

    // 6. Link custom domain to the Netlify site (non-fatal if it already exists)
    let domainLinked = false;
    let domainLinkError = null;
    const requestedDomain = String(site.domain || "").trim().toLowerCase();

    if (requestedDomain && !requestedDomain.endsWith(".netlify.app")) {
      try {
        const linkAttempts = [
          {
            label: "POST /sites/:id/domains {name}",
            run: () => fetch(withTeam(`https://api.netlify.com/api/v1/sites/${siteData.id}/domains`), {
              method: "POST",
              headers: { ...authH, "Content-Type": "application/json" },
              body: JSON.stringify({ name: requestedDomain }),
            }),
          },
          {
            label: "POST /sites/:id/domains {domain}",
            run: () => fetch(withTeam(`https://api.netlify.com/api/v1/sites/${siteData.id}/domains`), {
              method: "POST",
              headers: { ...authH, "Content-Type": "application/json" },
              body: JSON.stringify({ domain: requestedDomain }),
            }),
          },
          {
            label: "PATCH /sites/:id {custom_domain}",
            run: () => fetch(withTeam(`https://api.netlify.com/api/v1/sites/${siteData.id}`), {
              method: "PATCH",
              headers: { ...authH, "Content-Type": "application/json" },
              body: JSON.stringify({ custom_domain: requestedDomain }),
            }),
          },
        ];

        const errors = [];
        for (const attempt of linkAttempts) {
          const domainRes = await attempt.run();
          if (domainRes.ok) {
            domainLinked = true;
            break;
          }

          const errText = await domainRes.text().catch(() => "");
          const errMessage = `${attempt.label} -> ${domainRes.status}${errText ? `: ${errText}` : ""}`;

          // Treat already-attached cases as success to keep deploy idempotent
          if (/already|exists|taken|in use/i.test(errText)) {
            domainLinked = true;
            break;
          }
          errors.push(errMessage);
        }

        if (!domainLinked) {
          domainLinkError = errors.join(" | ") || "Failed to link domain to Netlify site";
        }
      } catch (e) {
        domainLinkError = e.message;
      }
    }

    const url = domainLinked && requestedDomain
      ? `https://${requestedDomain}`
      : (siteData.ssl_url || siteData.url || `https://${siteData.name || activeSlug}.netlify.app`);

    // ═════════════════════════════════════════════════════════════════════
    // Step 7: Update DNS records if custom domain is configured
    // ═════════════════════════════════════════════════════════════════════
    let dnsUpdated = false;
    let dnsError = null;

    if (site.domain && cfAccountId && cfApiToken) {
      try {
        const dnsResult = await updateDnsAfterDeploy({
          domain: site.domain,
          cfAccountId,
          cfApiToken,
          deployTarget: "netlify",
          deployUrl: url,
          proxied: true,
        });
        dnsUpdated = dnsResult.success;
        dnsError = dnsResult.error;
      } catch (e) {
        dnsError = e.message;
      }
    }

    return {
      success: true,
      url,
      deployId: deployData.id,
      target: "netlify",
      domainLinked,
      domainLinkError,
      dnsUpdated,
      dnsError,
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
