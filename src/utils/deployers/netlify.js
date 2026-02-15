/**
 * Netlify Deploy (P2 - Secondary)
 * Extracted from Sites.jsx into standalone deployer module.
 */

export async function deploy(html, site, settings) {
  const { netlifyToken } = settings;
  if (!netlifyToken) {
    return { success: false, error: "Missing Netlify token. Configure in Settings." };
  }

  const slug = (site.domain || site.brand || "lp")
    .toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40)
    + "-" + (site.id || "x").slice(0, 4);
  const authH = { Authorization: `Bearer ${netlifyToken}` };

  try {
    // 1. Create or find site
    let siteData;
    const createRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: { ...authH, "Content-Type": "application/json" },
      body: JSON.stringify({ name: slug }),
    });

    if (!createRes.ok) {
      const existing = await fetch(
        `https://api.netlify.com/api/v1/sites?name=${slug}&per_page=1`,
        { headers: authH }
      );
      const exData = await existing.json();
      if (exData.length > 0) {
        siteData = exData[0];
      } else {
        return { success: false, error: "Failed to create or find Netlify site" };
      }
    } else {
      siteData = await createRes.json();
    }

    // 2. Prepare files for Netlify API
    let filesMap = {}; // path -> sha1
    let filesData = {}; // sha1 -> Uint8Array
    const encoder = new TextEncoder();

    const inputFiles = typeof content === "string" ? { "index.html": content } : content;

    for (const [path, body] of Object.entries(inputFiles)) {
      const data = encoder.encode(body);
      const hashBuf = await crypto.subtle.digest("SHA-1", data);
      const sha1 = Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, "0")).join("");

      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      filesMap[normalizedPath] = sha1;
      filesData[sha1] = data;
    }

    // 4. Create deploy with file digest
    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteData.id}/deploys`,
      {
        method: "POST",
        headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({ files: filesMap }),
      }
    );
    if (!deployRes.ok) {
      const err = await deployRes.json().catch(() => ({}));
      return { success: false, error: `Netlify deploy creation failed: ${err.message || deployRes.statusText}` };
    }
    const deployData = await deployRes.json();

    // 5. Upload required files
    if (deployData.required && deployData.required.length > 0) {
      for (const sha1 of deployData.required) {
        const data = filesData[sha1];
        // We need to find the path for this sha1 to use the correct upload endpoint if needed, 
        // but Netlify API actually prefers PUT /deploys/{id}/files/{path}
        const path = Object.keys(filesMap).find(k => filesMap[k] === sha1);

        const uploadRes = await fetch(
          `https://api.netlify.com/api/v1/deploys/${deployData.id}/files${path}`,
          {
            method: "PUT",
            headers: { ...authH, "Content-Type": "application/octet-stream" },
            body: data,
          }
        );
        if (!uploadRes.ok) {
          return { success: false, error: `Netlify file upload failed for ${path}` };
        }
      }
    }

    return { success: true, url, deployId: deployData.id, target: "netlify" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Link a custom domain to a Netlify site.
 */
export async function addDomain(siteId, domain, settings) {
  const { netlifyToken } = settings;
  if (!netlifyToken) return { success: false, error: "Missing token" };

  try {
    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/custom_domains`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: domain }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || res.statusText };
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
