import React, { useMemo, useState, useEffect, useCallback } from "react";
import { THEME as T, COLORS } from "../constants";
import { hsl } from "../utils";
import { detectRisks } from "../utils/risk-engine";
import { checkAll } from "../utils/health-check";
import { Card, Btn, Badge, Dot } from "./Atoms";

const STATUS_COLOR = { online: T.success, error: T.danger, offline: T.danger, unconfigured: T.dim };
const STATUS_LABEL = { online: "Online", error: "Error", offline: "Offline", unconfigured: "Not Set" };

export function Dashboard({ sites, stats, ops, setPage, startCreate, settings = {}, apiOk, neonOk }) {
    const recent = sites.slice(0, 5);
    const risks = useMemo(() => detectRisks(ops), [ops]);
    const [health, setHealth] = useState(null);
    const [checking, setChecking] = useState(false);

    const runChecks = useCallback(async () => {
        setChecking(true);
        try {
            const result = await checkAll(settings, neonOk);
            setHealth(result);
        } catch { /* ignore */ }
        setChecking(false);
    }, [settings, neonOk]);

    // Auto-check on mount
    useEffect(() => { runChecks(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div style={{ animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Dashboard</h1>
                    <p style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>LP portfolio overview — Elastic Credits Engine</p>
                </div>
                <Btn onClick={startCreate}>➕ Create New LP</Btn>
            </div>

            {/* Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, marginBottom: 24 }}>
                {[
                    { l: "Total Sites", v: sites.length, c: T.primary, icon: "🌐" },
                    { l: "Active", v: sites.filter(s => s.status === "completed").length, c: T.success, icon: "✅" },
                    { l: "Builds", v: stats.builds, c: T.accent, icon: "🔨" },
                    { l: "API Spend", v: `$${stats.spend.toFixed(2)}`, c: T.warning, icon: "💰" },
                    { l: "Ops Domains", v: ops.domains.length, c: "#a78bfa", icon: "🏢" },
                    { l: "Active Cards", v: ops.payments?.filter(p => p.status === "active" || p.cardStatus === "active").length || 0, c: T.success, icon: "💳" },
                ].map((m, i) => (
                    <Card key={i} style={{ padding: "16px", position: "relative" }}>
                        <div style={{ fontSize: 11, color: T.muted }}>{m.l}</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: m.c, marginTop: 2 }}>{m.v}</div>
                        <div style={{ position: "absolute", right: 14, top: 14, fontSize: 18, opacity: .5 }}>{m.icon}</div>
                    </Card>
                ))}
            </div>

            {/* Risk Alert */}
            {risks.length > 0 && (
                <Card style={{ padding: "14px 18px", marginBottom: 16, borderColor: `${T.danger}44` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.danger, marginBottom: 6 }}>⚠ Correlation Risks Detected</div>
                    {risks.slice(0, 3).map((r, i) => (
                        <div key={i} style={{ fontSize: 12, color: T.muted, padding: "3px 0" }}>
                            <Badge color={T.danger}>{r.level}</Badge> <span style={{ marginLeft: 6 }}>{r.msg}</span>
                        </div>
                    ))}
                    <button onClick={() => setPage("ops")} style={{ fontSize: 11, color: T.primary, background: "none", border: "none", cursor: "pointer", marginTop: 6 }}>View Ops Center →</button>
                </Card>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* Recent */}
                    <Card style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>🕐 Recent Sites</h3>
                        {recent.length === 0 ? (
                            <div style={{ textAlign: "center", padding: 32, color: T.dim }}>
                                <div style={{ fontSize: 28, marginBottom: 6 }}>🚀</div>
                                <div style={{ fontSize: 13 }}>No sites yet</div>
                            </div>
                        ) : recent.map(s => {
                            const c = COLORS.find(x => x.id === s.colorId);
                            return (
                                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 8, background: c ? hsl(...c.p) : T.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>{s.brand?.[0]}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.brand}</div>
                                        <div style={{ fontSize: 11, color: T.dim }}>{s.domain || "no domain"}</div>
                                    </div>
                                    <Badge color={T.success}>Active</Badge>
                                </div>
                            );
                        })}
                        <Btn variant="ghost" onClick={() => setPage("sites")} style={{ width: "100%", marginTop: 12, fontSize: 11 }}>View All Sites →</Btn>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>⚡ Quick Actions</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            {[
                                { l: "Build New", icon: "➕", fn: startCreate },
                                { l: "AI Assets", icon: "✨", fn: () => setPage("variant") },
                                { l: "Ops Center", icon: "🏢", fn: () => setPage("ops") },
                                { l: "Settings", icon: "⚙", fn: () => setPage("settings") },
                            ].map((a, i) => (
                                <button key={i} onClick={a.fn} style={{
                                    display: "flex", alignItems: "center", gap: 10, padding: "12px", background: T.input,
                                    border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", color: T.text, transition: "all .2s"
                                }} onMouseEnter={e => e.currentTarget.style.borderColor = T.primary} onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                                    <span style={{ fontSize: 16 }}>{a.icon}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{a.l}</span>
                                </button>
                            ))}
                        </div>
                    </Card>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* AI Insight Card */}
                    <Card style={{ background: T.grad, color: "#fff", border: "none" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>✨ AI Performance Hack</h3>
                        <p style={{ fontSize: 12, lineHeight: 1.6, opacity: 0.9 }}>
                            {sites.length > 0 ?
                                `Your brand "${recent[0]?.brand}" can improve CTR by 15% by using a "Limited Time" badge in the copy step.` :
                                "Ready to scale? Gemini AI can generate high-converting copy in 5+ languages automatically."
                            }
                        </p>
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Action: Enable Micro-Conversions
                        </div>
                    </Card>

                    {/* Infrastructure Health — Live Checks */}
                    <Card>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: T.muted, margin: 0, textTransform: "uppercase" }}>System Health</h3>
                            <button onClick={runChecks} disabled={checking} style={{
                                background: "none", border: `1px solid ${T.border}`, borderRadius: 5, padding: "3px 8px",
                                color: checking ? T.dim : T.muted, cursor: checking ? "wait" : "pointer", fontSize: 10, fontWeight: 600,
                            }}>{checking ? "Checking..." : "↻ Refresh"}</button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {[
                                { key: "worker", label: "Worker / D1", icon: "⚡" },
                                { key: "neon", label: "Neon DB", icon: "🐘" },
                                { key: "cloudflare", label: "Cloudflare", icon: "☁️" },
                                { key: "netlify", label: "Netlify", icon: "🔺" },
                                { key: "leadingCards", label: "LeadingCards", icon: "💳" },
                                { key: "multilogin", label: "Multilogin X", icon: "👤" },
                                { key: "aws", label: "AWS S3", icon: "📦" },
                                { key: "vps", label: "VPS / SSH", icon: "🖥️" },
                            ].map(svc => {
                                const h = health?.[svc.key];
                                const st = h?.status || "unconfigured";
                                const c = STATUS_COLOR[st] || T.dim;
                                const lbl = h ? (h.detail || STATUS_LABEL[st]) : (checking ? "..." : "—");
                                return (
                                    <div key={svc.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                                        <span style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                            <span style={{ fontSize: 13 }}>{svc.icon}</span> {svc.label}
                                        </span>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            {h?.ms > 0 && <span style={{ fontSize: 9, color: T.dim, fontFamily: "monospace" }}>{h.ms}ms</span>}
                                            <Dot c={c} label={lbl} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {health && (() => {
                            const vals = Object.values(health);
                            const online = vals.filter(v => v.status === "online").length;
                            const errors = vals.filter(v => v.status === "error").length;
                            const total = vals.length;
                            return (
                                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                                    <span style={{ color: T.muted }}>{online}/{total} online</span>
                                    {errors > 0 && <span style={{ color: T.danger, fontWeight: 600 }}>{errors} error{errors > 1 ? "s" : ""}</span>}
                                </div>
                            );
                        })()}
                    </Card>
                </div>
            </div>
        </div>
    );
}
