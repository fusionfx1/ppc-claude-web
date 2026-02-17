import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { THEME as T, COLORS } from "../constants";
import { LS, uid, now, hsl } from "../utils";
import { makeThemeJson, htmlToZip, astroProjectToZip } from "../utils/lp-generator";
import { generateHtmlByTemplate, generateAstroProjectByTemplate, generateApplyPageByTemplate } from "../utils/template-router";

import { deployTo, DEPLOY_TARGETS, getAvailableTargets } from "../utils/deployers";
import { Card, Inp, Btn, Badge } from "./Atoms";

export function Sites({ sites, del, notify, startCreate, settings, addDeploy }) {
    const [search, setSearch] = useState("");
    const [deploying, setDeploying] = useState(null); // { siteId, target }
    const [deployUrls, setDeployUrls] = useState(() => {
        const stored = LS.get("deployUrls") || {};
        // Migrate legacy flat deployUrls to per-target format
        const migrated = {};
        for (const [key, val] of Object.entries(stored)) {
            if (typeof val === "string") {
                migrated[key] = { netlify: val };
            } else if (val && typeof val === "object") {
                migrated[key] = val;
            }
        }
        return migrated;
    });
    const [preview, setPreview] = useState(null);
    const [openDeploy, setOpenDeploy] = useState(null); // siteId for open deploy dropdown
    const [openDownload, setOpenDownload] = useState(null); // siteId for open download dropdown
    const deployRef = useRef(null);
    const downloadRef = useRef(null);
    const filtered = sites.filter(s => (s.brand + s.domain).toLowerCase().includes(search.toLowerCase()));
    const availableTargets = getAvailableTargets(settings);

    useEffect(() => { LS.set("deployUrls", deployUrls); }, [deployUrls]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (deployRef.current && !deployRef.current.contains(e.target)) setOpenDeploy(null);
            if (downloadRef.current && !downloadRef.current.contains(e.target)) setOpenDownload(null);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleDelete = (site) => {
        if (!confirm(`Delete "${site.brand}"?\nThis will also remove all deploy records.`)) return;
        // Remove deploy URLs for this site
        setDeployUrls(p => {
            const updated = { ...p };
            delete updated[site.id];
            return updated;
        });
        // Delete the site
        del(site.id);
        notify(`Deleted ${site.brand}`);
    };

    const handleDeploy = async (site, target) => {
        setOpenDeploy(null);
        setDeploying({ siteId: site.id, target });
        try {
            const html = generateHtmlByTemplate(site);
            const applyHtml = generateApplyPageByTemplate(site);
            
            // Attach apply.html as extra file for multi-file deploy
            const siteWithFiles = { ...site, _extraFiles: { "/apply.html": applyHtml } };
            
            const result = await deployTo(target, html, siteWithFiles, settings);
            if (result.success) {
                setDeployUrls(p => ({
                    ...p,
                    [site.id]: { ...(p[site.id] || {}), [target]: result.url },
                }));
                if (addDeploy) {
                    addDeploy({
                        id: uid(), siteId: site.id, brand: site.brand,
                        url: result.url, ts: now(), type: "deploy", target,
                    });
                }
                if (result.queued) {
                    notify(`Queued ${DEPLOY_TARGETS.find(t => t.id === target)?.label}. CI is running: ${result.url}`);
                } else {
                    notify(`Deployed to ${DEPLOY_TARGETS.find(t => t.id === target)?.label}! ${result.url}`);
                }
            } else {
                notify(`Deploy failed: ${result.error}`, "danger");
            }
        } catch (e) {
            notify(`Error: ${e.message}`, "danger");
        }
        setDeploying(null);
    };

    const downloadAstroZip = async (site) => {
        try {
            const files = generateAstroProjectByTemplate(site);
            const blob = await astroProjectToZip(files);
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${site.brand.toLowerCase().replace(/\s+/g, "-")}-astro.zip`;
            a.click();
            URL.revokeObjectURL(a.href);
            notify("Downloaded Astro project ZIP");
        } catch (e) {
            notify(`ZIP error: ${e.message}`, "danger");
        }
    };

    const downloadHtmlZip = async (site) => {
        const html = generateHtmlByTemplate(site);
        const blob = await htmlToZip(html);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${site.brand.toLowerCase().replace(/\s+/g, "-")}-lp.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
        notify("Downloaded static HTML ZIP");
    };

    const downloadApplyPage = (site) => {
        const applyHtml = generateApplyPageByTemplate(site);
        const blob = new Blob([applyHtml], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `apply-${site.id}.html`;
        a.click();
        URL.revokeObjectURL(a.href);
        notify(`Downloaded apply-${site.id}.html`);
    };

    const exportJson = (site) => {
        const json = makeThemeJson(site);
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = `theme-${site.id}.json`; a.click(); URL.revokeObjectURL(a.href);
        notify(`Downloaded theme-${site.id}.json`);
    };

    const getDeployedTargets = (siteId) => {
        const urls = deployUrls[siteId];
        if (!urls || typeof urls !== "object") return [];
        return Object.entries(urls).filter(([, url]) => url).map(([target, url]) => ({ target, url }));
    };

    return (
        <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>My Sites</h1>
                    <p style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>Manage & deploy your loan landing pages</p>
                </div>
                <Btn onClick={startCreate}>➕ Create LP</Btn>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                {[
                    { l: "Sites", v: sites.length },
                    { l: "Builds", v: sites.length },
                    { l: "Deployed", v: Object.keys(deployUrls).filter(k => Object.keys(deployUrls[k] || {}).length > 0).length },
                    { l: "Avg Cost", v: sites.length ? `$${(sites.reduce((a, s) => a + (s.cost || 0), 0) / sites.length).toFixed(3)}` : "$0" },
                ].map((m, i) => (
                    <Card key={i} style={{ padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, color: T.muted }}>{m.l}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 1 }}>{m.v}</div>
                    </Card>
                ))}
            </div>

            <Inp value={search} onChange={setSearch} placeholder="Search sites..." style={{ width: 240, marginBottom: 14 }} />

            {filtered.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 50 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🏗️</div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>No sites yet</div>
                    <div style={{ color: T.dim, fontSize: 12, marginTop: 4 }}>Create your first loan LP</div>
                </Card>
            ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {filtered.map(s => {
                        const co = COLORS.find(x => x.id === s.colorId);
                        const deployed = getDeployedTargets(s.id);
                        const isDeploying = deploying?.siteId === s.id;

                        return (
                            <Card key={s.id} style={{ padding: 16, display: "flex", gap: 16, position: "relative" }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 10,
                                    background: co ? hsl(...co.p) : T.primary,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 18, color: "#fff", fontWeight: 700, flexShrink: 0,
                                }}>{s.brand?.[0]}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{s.brand}</div>
                                        <button onClick={() => handleDelete(s)}
                                            style={{ padding: "4px 10px", fontSize: 10, fontWeight: 700, background: "rgba(239,68,68,.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,.3)", borderRadius: 6, cursor: "pointer", transition: "all .15s", letterSpacing: ".3px" }}
                                            onMouseEnter={e => { e.target.style.background = '#ef4444'; e.target.style.color = '#fff'; }}
                                            onMouseLeave={e => { e.target.style.background = 'rgba(239,68,68,.15)'; e.target.style.color = '#ef4444'; }}
                                        >🗑 DELETE</button>
                                    </div>
                                    <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{s.domain || "no domain"}</div>

                                    {/* Deploy URLs */}
                                    {deployed.length > 0 && (
                                        <div style={{ marginTop: 6 }}>
                                            {deployed.map(({ target, url }) => (
                                                <a key={target} href={url} target="_blank" rel="noreferrer"
                                                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.accent, textDecoration: "none", marginBottom: 2 }}>
                                                    <span>{DEPLOY_TARGETS.find(t => t.id === target)?.icon || "🚀"}</span>
                                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                                        <Btn variant="ghost" onClick={() => setPreview(s)} style={{ padding: "6px 10px", fontSize: 10 }}>👁 Preview</Btn>
                                        <Btn
                                            variant="ghost"
                                            onClick={() => startCreate(s)}
                                            style={{ padding: "6px 10px", fontSize: 10 }}
                                        >
                                            🔄 Edit & Redeploy
                                        </Btn>

                                        {/* Download Dropdown */}
                                        <div style={{ position: "relative" }} ref={openDownload === s.id ? downloadRef : null}>
                                            <Btn variant="ghost" onClick={() => setOpenDownload(openDownload === s.id ? null : s.id)} style={{ padding: "6px 10px", fontSize: 10 }}>
                                                📥 Download ▾
                                            </Btn>
                                            {openDownload === s.id && (
                                                <div style={dropdownStyle}>
                                                    <DropdownItem icon="🚀" label="Astro Project (ZIP)" desc="Full source, buildable" onClick={() => { setOpenDownload(null); downloadAstroZip(s); }} />
                                                    <DropdownItem icon="📄" label="Static HTML (ZIP)" desc="Single index.html" onClick={() => { setOpenDownload(null); downloadHtmlZip(s); }} />
                                                    <DropdownItem icon="📝" label="Apply Page (HTML)" desc="Form embed page" onClick={() => { setOpenDownload(null); downloadApplyPage(s); }} />
                                                    <DropdownItem icon="🎨" label="Theme JSON" desc="Design tokens export" onClick={() => { setOpenDownload(null); exportJson(s); }} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Deploy Dropdown */}
                                        <div style={{ position: "relative" }} ref={openDeploy === s.id ? deployRef : null}>
                                            <Btn onClick={() => setOpenDeploy(openDeploy === s.id ? null : s.id)}
                                                disabled={isDeploying}
                                                style={{ padding: "6px 12px", fontSize: 10, background: T.primary }}>
                                                {isDeploying ? `Deploying to ${DEPLOY_TARGETS.find(t => t.id === deploying?.target)?.label || "..."}` : "🚀 Deploy ▾"}
                                            </Btn>
                                            {openDeploy === s.id && !isDeploying && (
                                                <div style={dropdownStyle}>
                                                    {availableTargets.map(t => (
                                                        <DropdownItem
                                                            key={t.id}
                                                            icon={t.icon}
                                                            label={t.label}
                                                            desc={t.configured ? t.description : "⚠ Not configured"}
                                                            disabled={!t.configured}
                                                            active={!!deployUrls[s.id]?.[t.id]}
                                                            onClick={() => t.configured && handleDeploy(s, t.id)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Preview Modal - rendered via portal to ensure proper stacking */}
            {preview && createPortal(
                <div onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 10000, display: "flex", flexDirection: "column", padding: 24, animation: "fadeIn .2s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                        <div style={{ color: "#fff", fontWeight: 700 }}>Preview: {preview.brand}</div>
                        <Btn variant="danger" onClick={() => setPreview(null)} style={{ padding: "4px 12px" }}>Close</Btn>
                    </div>
                    <iframe title="preview" style={{ flex: 1, background: "#fff", borderRadius: 12, border: "none" }} srcDoc={generateHtmlByTemplate(preview)} />
                </div>,
                document.body
            )}

            </div>
    );
}

/* ─── Dropdown Styles & Components ─── */

const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: 4,
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    boxShadow: "0 8px 32px rgba(0,0,0,.4)",
    zIndex: 100,
    minWidth: 220,
    padding: 4,
    animation: "fadeIn .15s ease",
};

function DropdownItem({ icon, label, desc, onClick, disabled, active }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={disabled ? undefined : onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "8px 10px", background: hovered && !disabled ? T.hover : "transparent",
                border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
                textAlign: "left", color: disabled ? T.dim : T.text, opacity: disabled ? 0.5 : 1,
                transition: "background .15s",
            }}
        >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    {label}
                    {active && <span style={{ fontSize: 9, color: T.success, fontWeight: 700 }}>● LIVE</span>}
                </div>
                {desc && <div style={{ fontSize: 10, color: T.dim, marginTop: 1 }}>{desc}</div>}
            </div>
        </button>
    );
}
