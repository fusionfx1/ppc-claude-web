/**
 * Vercel Deploy (P3 - Diversification)
 * Uses Vercel REST API to deploy a single-file static site.
 */

export async function deploy(content, site, settings) {
    const { vercelToken, vercelTeamId } = settings;
    if (!vercelToken) {
        return { success: false, error: "Missing Vercel Token. Configure in Settings." };
    }

    const name = (site.domain || site.brand || "lp")
        .toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40)
        + "-" + (site.id || "x").slice(0, 4);

    const authH = { Authorization: `Bearer ${vercelToken}` };
    const teamParam = vercelTeamId ? `?teamId=${vercelTeamId}` : "";

    // Prepare files for Vercel API
    let files = [];
    if (typeof content === "string") {
        files = [{ file: "index.html", data: content }];
    } else if (typeof content === "object" && content !== null) {
        files = Object.entries(content).map(([file, data]) => ({ file, data }));
    }

    try {
        // 1. Create a deployment
        const response = await fetch(`https://api.vercel.com/v13/deployments${teamParam}`, {
            method: "POST",
            headers: {
                ...authH,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name,
                // Remove framework: null to allow auto-detection for Astro
                files,
                target: "production",
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: `Vercel API error: ${errorData.error?.message || response.statusText}`
            };
        }

        const data = await response.json();

        // 2. If site has a custom domain, try to add it to the project
        if (site.domain) {
            try {
                await fetch(`https://api.vercel.com/v9/projects/${name}/domains${teamParam}`, {
                    method: "POST",
                    headers: { ...authH, "Content-Type": "application/json" },
                    body: JSON.stringify({ name: site.domain }),
                });
            } catch (e) {
                console.warn("Failed to link domain to Vercel project:", e.message);
            }
        }

        // Vercel deployments can take a few seconds to "ready", but we return the URL immediately
        const url = site.domain ? `https://${site.domain}` : (data.url ? `https://${data.url}` : null);

        return {
            success: true,
            url,
            deployId: data.id,
            target: "vercel"
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Manually add a domain to a Vercel project
 */
export async function addDomain(projectName, domain, settings) {
    const { vercelToken, vercelTeamId } = settings;
    if (!vercelToken) return { success: false, error: "Missing Token" };

    const authH = { Authorization: `Bearer ${vercelToken}` };
    const teamParam = vercelTeamId ? `?teamId=${vercelTeamId}` : "";

    try {
        const res = await fetch(`https://api.vercel.com/v9/projects/${projectName}/domains${teamParam}`, {
            method: "POST",
            headers: { ...authH, "Content-Type": "application/json" },
            body: JSON.stringify({ name: domain }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error?.message || res.statusText };
        return { success: true, data };
    } catch (e) {
        return { success: false, error: e.message };
    }
}
