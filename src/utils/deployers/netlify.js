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

    // 2. Prepare file data
    const encoder = new TextEncoder();
    const data = encoder.encode(html);

    // 3. Compute SHA1 hash
    const hashBuf = await crypto.subtle.digest("SHA-1", data);
    const sha1 = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, "0")).join("");

    // 4. Create deploy with file digest
    const deployRes = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteData.id}/deploys`,
      {
        method: "POST",
        headers: { ...authH, "Content-Type": "application/json" },
        body: JSON.stringify({ files: { "/index.html": sha1 } }),
      }
    );
    if (!deployRes.ok) {
      return { success: false, error: "Netlify deploy creation failed" };
    }
    const deployData = await deployRes.json();

    // 5. Upload file if required
    if (deployData.required && deployData.required.includes(sha1)) {
      const uploadRes = await fetch(
        `https://api.netlify.com/api/v1/deploys/${deployData.id}/files/index.html`,
        {
          method: "PUT",
          headers: { ...authH, "Content-Type": "application/octet-stream" },
          body: data,
        }
      );
      if (!uploadRes.ok) {
        return { success: false, error: "Netlify file upload failed" };
      }
    }

    const url = siteData.ssl_url || siteData.url || `https://${siteData.name || slug}.netlify.app`;
    return { success: true, url, deployId: deployData.id, target: "netlify" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
