import React, { useState } from "react";
import { THEME as T } from "../constants";
import { APP_VERSION } from "../constants";

const CHANGELOG = [
    {
        version: "2.1.0",
        date: "2026-02-16",
        changes: [
            "🔧 Fix read-only DNS deletion — auto-removes domain from CF Workers / Vercel before retrying",
            "🌐 Update Vercel IP from 76.76.21.21 → 216.198.79.1 (new recommended)",
            "🔗 Netlify link now adds both @ and www CNAME records for DNS verification",
            "⚡ PageSpeed: rAF slider, deferred modals, CSS containment, content-visibility",
            "🏷️ Added OG, canonical, robots, referrer, format-detection meta tags to LP template",
            "📋 Added changelog version display",
        ],
    },
    {
        version: "2.0.0",
        date: "2026-02-15",
        changes: [
            "🚀 Launched LP Factory V2 — all-in-one PPC landing page platform",
            "🏢 Ops Center: manage domains, DNS, registrars, deployers",
            "🎨 Variant Studio: A/B test color, font, layout combos",
            "☁️ Multi-deployer: CF Workers, CF Pages, Vercel, Netlify",
            "💾 Neon DB: cloud persistence for settings, sites, deploys",
            "📡 API Worker proxy for CORS-free Vercel / Cloudflare API calls",
            "🔐 Internet.bs registrar integration + NS sync",
        ],
    },
    {
        version: "1.0.0",
        date: "2026-01-18",
        changes: [
            "🎉 Initial release — single-page LP generator",
            "📝 Wizard: brand, colors, fonts, loan config",
            "📦 ZIP download + deploy to Cloudflare Workers",
        ],
    },
];

export function Sidebar({ page, setPage, siteCount, startCreate, collapsed, toggle }) {
    const [showLog, setShowLog] = useState(false);

    const items = [
        { id: "dashboard", icon: "📊", label: "Dashboard" },
        { id: "sites", icon: "🌐", label: "My Sites", badge: siteCount },
        { id: "template-editor", icon: "🎨", label: "Template Editor" },
        { id: "create", icon: "⚡", label: "Astro Wizard", action: startCreate },
        { id: "variant", icon: "🧪", label: "Variant Studio" },
        { id: "ops", icon: "🏢", label: "Ops Center" },
        { id: "deploys", icon: "🚀", label: "Deploys" },
        { id: "docs", icon: "📚", label: "API Docs", external: true, href: "/docs" },
        { id: "settings", icon: "⚙️", label: "Settings" },
    ];

    return (
        <>
            <div style={{
                width: collapsed ? 64 : 220, position: "fixed", top: 0, left: 0, bottom: 0,
                background: T.card, borderRight: `1px solid ${T.border}`,
                display: "flex", flexDirection: "column", zIndex: 100, transition: "width .2s",
                overflow: "hidden",
            }}>
                <div style={{ padding: collapsed ? "16px 12px" : "16px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                    <div onClick={toggle} style={{
                        width: 32, height: 32, borderRadius: 8, background: T.grad, display: "flex",
                        alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer", flexShrink: 0,
                    }}>⚡</div>
                    {!collapsed && <div>
                        <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>LP Factory</div>
                        <div style={{ fontSize: 10, color: T.dim, cursor: "pointer" }} onClick={() => setShowLog(true)} title="View Changelog">
                            v{APP_VERSION} — All-in-One
                        </div>
                    </div>}
                </div>

                <nav style={{ padding: "8px 6px", flex: 1 }}>
                    {items.map(it => {
                        const active = page === it.id;
                        const ButtonWrapper = it.external ? 'a' : 'button';
                        const buttonProps = it.external ? { href: it.href, target: "_blank", rel: "noopener noreferrer" } : {};
                        return (
                            <ButtonWrapper key={it.id} onClick={() => {
                                if (it.external) return;
                                // Interaction debug
                                console.log("Sidebar click:", it.id);
                                if (it.action) {
                                    it.action();
                                } else {
                                    setPage(it.id);
                                }
                            }} {...buttonProps} style={{
                                width: "100%", display: "flex", alignItems: "center", gap: 10,
                                padding: collapsed ? "10px 0" : "9px 12px", justifyContent: collapsed ? "center" : "flex-start",
                                marginBottom: 2, border: "none", borderRadius: 7,
                                background: active ? `${T.primary}18` : "transparent",
                                color: active ? T.primaryH : T.muted, cursor: "pointer",
                                fontSize: 13, fontWeight: active ? 600 : 500,
                                borderLeft: active ? `3px solid ${T.primary}` : "3px solid transparent",
                                transition: "all .15s", textDecoration: "none",
                            }}>
                                <span style={{ fontSize: 15, flexShrink: 0, width: 20, textAlign: "center" }}>{it.icon}</span>
                                {!collapsed && <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap" }}>{it.label}</span>}
                                {!collapsed && it.badge > 0 && <span style={{
                                    background: T.primary, color: "#fff", fontSize: 10, fontWeight: 700,
                                    padding: "1px 6px", borderRadius: 8, minWidth: 18, textAlign: "center",
                                }}>{it.badge}</span>}
                                {it.external && !collapsed && <span style={{ fontSize: 10, opacity: 0.5 }}>↗</span>}
                            </ButtonWrapper>
                        );
                    })}
                </nav>

                {!collapsed && <div style={{
                    padding: "10px 14px", borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.dim,
                    cursor: "pointer", transition: "color .15s",
                }} onClick={() => setShowLog(true)}
                    onMouseEnter={e => e.currentTarget.style.color = T.primary}
                    onMouseLeave={e => e.currentTarget.style.color = T.dim}>
                    📋 v{APP_VERSION} • View Changelog
                </div>}
            </div>

            {/* Changelog Modal */}
            {showLog && <div onClick={e => { if (e.target === e.currentTarget) setShowLog(false); }} style={{
                position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.5)",
                backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
                animation: "fadeIn .2s",
            }}>
                <div style={{
                    background: T.card, borderRadius: 16, width: "90%", maxWidth: 560, maxHeight: "80vh",
                    display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,.3)",
                    border: `1px solid ${T.border}`, animation: "slideIn .25s",
                }}>
                    {/* Header */}
                    <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 20px", borderBottom: `1px solid ${T.border}`,
                    }}>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>📋 Changelog</div>
                            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>LP Factory v{APP_VERSION}</div>
                        </div>
                        <button onClick={() => setShowLog(false)} style={{
                            width: 30, height: 30, borderRadius: "50%", border: "none",
                            background: `${T.border}`, cursor: "pointer", fontSize: 16,
                            display: "flex", alignItems: "center", justifyContent: "center", color: T.muted,
                        }}>✕</button>
                    </div>

                    {/* Body */}
                    <div style={{ overflowY: "auto", padding: "16px 20px" }}>
                        {CHANGELOG.map((release, i) => (
                            <div key={release.version} style={{ marginBottom: i < CHANGELOG.length - 1 ? 24 : 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                    <span style={{
                                        background: i === 0 ? T.primary : `${T.primary}30`,
                                        color: i === 0 ? "#fff" : T.primary,
                                        fontSize: 11, fontWeight: 700, padding: "3px 10px",
                                        borderRadius: 6,
                                    }}>v{release.version}</span>
                                    <span style={{ fontSize: 11, color: T.dim }}>{release.date}</span>
                                    {i === 0 && <span style={{
                                        fontSize: 9, fontWeight: 700, color: "#22c55e",
                                        background: "#22c55e18", padding: "2px 8px", borderRadius: 4,
                                        textTransform: "uppercase", letterSpacing: ".5px",
                                    }}>Latest</span>}
                                </div>
                                <ul style={{ margin: 0, padding: "0 0 0 4px", listStyle: "none" }}>
                                    {release.changes.map((change, j) => (
                                        <li key={j} style={{
                                            fontSize: 12, color: T.text, padding: "4px 0",
                                            borderLeft: `2px solid ${i === 0 ? T.primary : T.border}`,
                                            paddingLeft: 12, marginLeft: 4, lineHeight: 1.5,
                                        }}>{change}</li>
                                    ))}
                                </ul>
                                {i < CHANGELOG.length - 1 && <div style={{
                                    borderBottom: `1px solid ${T.border}`, marginTop: 16,
                                }} />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>}
        </>
    );
}
