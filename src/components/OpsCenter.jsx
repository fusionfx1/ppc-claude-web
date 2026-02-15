import React, { useState, useMemo, useEffect, useCallback } from "react";
import { THEME as T, REGISTRARS, REGISTRAR_PROVIDERS } from "../constants";
import { uid, now } from "../utils";
import { Card, Btn, Badge, Inp, Dot } from "./Atoms";
import { leadingCardsApi } from "../services/leadingCards";
import { multiloginApi } from "../services/multilogin";
import { detectRisks, RISK_ICONS, RISK_COLORS } from "../utils/risk-engine";
import * as cfZone from "../utils/cf-zone";
import * as registrar from "../utils/registrar";
import * as vercel from "../utils/deployers/vercel";
import * as netlify from "../utils/deployers/netlify";
import * as cfPages from "../utils/deployers/cf-pages";
import * as cfWorkers from "../utils/deployers/cf-workers";

/* ─── Shared inline styles ───────────────────────────────────────────── */
const S = {
    overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
    label: { fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, color: T.text },
    select: { width: "100%", padding: 9, borderRadius: 7, background: T.input, border: `1px solid ${T.border}`, color: T.text, fontSize: 12, boxSizing: "border-box" },
    fieldWrap: { marginBottom: 12 },
    row: { display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: T.card2, borderRadius: 7, marginBottom: 4, fontSize: 12 },
    btnRow: { display: "flex", gap: 8, justifyContent: "flex-end" },
    miniBtn: { fontSize: 10, padding: "2px 8px" },
    sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 10, color: T.text },
    emptyState: { textAlign: "center", padding: 32, color: T.dim },
    filterBtn: (active) => ({
        padding: "4px 12px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${active ? T.primary : T.border}`,
        background: active ? `${T.primary}18` : "transparent", color: active ? T.text : T.muted,
    }),
};

/* ─── Helper: toast-like inline status ───────────────────────────────── */
function StatusMsg({ msg, type }) {
    if (!msg) return null;
    const c = type === "success" ? T.success : type === "error" ? T.danger : T.primary;
    return (
        <div style={{ padding: "8px 14px", borderRadius: 7, marginBottom: 10, background: `${c}12`, border: `1px solid ${c}44`, color: c, fontSize: 12, fontWeight: 600, animation: "fadeIn .2s" }}>
            {msg}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   OpsCenter — Tasks 7, 8, 9, 11, 12
   ═══════════════════════════════════════════════════════════════════════ */
export function OpsCenter({ data, add, del, upd, settings }) {
    /* ─── Core state ─────────────────────────────────────────────────── */
    const [tab, setTab] = useState("overview");
    const [modal, setModal] = useState(null);
    const [lcCards, setLcCards] = useState([]);
    const [lcBins, setLcBins] = useState([]);
    const [lcAddresses, setLcAddresses] = useState([]);
    const [mlProfiles, setMlProfiles] = useState([]);
    const [lcLoading, setLcLoading] = useState(false);
    const [mlLoading, setMlLoading] = useState(false);

    /* ─── New state (Tasks 7-12) ─────────────────────────────────────── */
    const [lcFilter, setLcFilter] = useState("");
    const [lcTransactions, setLcTransactions] = useState([]);
    const [changingLimit, setChangingLimit] = useState(null);   // { uuid, value }
    const [suspending, setSuspending] = useState(null);          // account id string
    const [wizardStep, setWizardStep] = useState(0);
    const [wizardData, setWizardData] = useState({});
    const [statusMsg, setStatusMsg] = useState(null);            // { msg, type }
    const [syncing, setSyncing] = useState(false);

    /* ─── Flash a status message for 3s ──────────────────────────────── */
    const flash = (msg, type = "success") => {
        setStatusMsg({ msg, type });
        setTimeout(() => setStatusMsg(null), 3000);
    };

    /* ─── Sync MLX token from settings ──────────────────────────────── */
    useEffect(() => {
        if (settings.mlToken) multiloginApi.setToken(settings.mlToken);
    }, [settings.mlToken]);

    /* ─── Data fetching (direct MLX API) ─────────────────────────────── */
    useEffect(() => {
        let cancelled = false;

        if (tab === "payments" || tab === "overview") {
            setLcLoading(true);
            Promise.all([
                leadingCardsApi.getCards(),
                leadingCardsApi.getBins(),
                leadingCardsApi.getBillingAddresses()
            ]).then(([cardsRes, binsRes, addrRes]) => {
                if (cancelled) return;
                setLcCards(Array.isArray(cardsRes?.results) ? cardsRes.results : []);
                setLcBins(Array.isArray(binsRes) ? binsRes : Array.isArray(binsRes?.results) ? binsRes.results : []);
                setLcAddresses(Array.isArray(addrRes?.results) ? addrRes.results : []);
            }).catch(() => { })
                .finally(() => { if (!cancelled) setLcLoading(false); });
        }
        if (tab === "profiles" || tab === "overview") {
            setMlLoading(true);
            multiloginApi.getProfiles()
                .then(res => { if (!cancelled) setMlProfiles(Array.isArray(res?.data?.profiles) ? res.data.profiles : Array.isArray(res) ? res : []); })
                .catch(() => { })
                .finally(() => { if (!cancelled) setMlLoading(false); });
        }

        return () => { cancelled = true; };
    }, [tab]);

    useEffect(() => {
        if (tab !== "profiles") return;
        const poll = setInterval(() => {
            multiloginApi.getActiveProfiles()
                .then(res => {
                    const activeList = Array.isArray(res) ? res : (res?.data || []);
                    const activeIds = activeList.map(p => p.mlProfileId || p.uuid || p.id);
                    // Update mlProfiles status based on active list
                    setMlProfiles(prev => prev.map(p => {
                        const pid = p.uuid || p.id;
                        const isActive = activeIds.includes(pid);
                        return { ...p, status: isActive ? "running" : (p.status === "running" ? "stopped" : p.status) };
                    }));
                })
                .catch(() => { });
        }, 30000);
        return () => clearInterval(poll);
    }, [tab]);

    /* ─── Refresh helpers ────────────────────────────────────────────── */
    const refreshCards = () => leadingCardsApi.getCards().then(res => setLcCards(Array.isArray(res?.results) ? res.results : []));
    const refreshProfiles = () => multiloginApi.getProfiles().then(res => setMlProfiles(Array.isArray(res?.data?.profiles) ? res.data.profiles : Array.isArray(res) ? res : []));

    /* ─── Risk detection via engine ──────────────────────────────────── */
    const risks = useMemo(() => detectRisks({
        accounts: data.accounts,
        payments: data.payments,
        profiles: data.profiles,
        domains: data.domains,
        lcCards,
    }), [data, lcCards]);

    /* ─── Tabs ───────────────────────────────────────────────────────── */
    const tabs = [
        { id: "overview", label: "Overview", icon: "🏠" },
        { id: "domains", label: "Domains", icon: "🌐", count: data.domains.length },
        { id: "accounts", label: "Ads Accounts", icon: "💰", count: data.accounts.length },
        { id: "cf", label: "CF Accounts", icon: "☁️", count: data.cfAccounts?.length || 0 },
        { id: "registrars", label: "Registrars", icon: "🐷", count: data.registrarAccounts?.length || 0 },
        { id: "profiles", label: "Profiles", icon: "👤", count: data.profiles.length },
        { id: "payments", label: "Payment Methods", icon: "💳", count: lcCards.length },
        { id: "risks", label: "Risks", icon: "⚠️" },
        { id: "logs", label: "Audit Logs", icon: "📋" },
    ];

    /* ─── Filtered cards (Task 7) ────────────────────────────────────── */
    const filteredCards = useMemo(() => {
        if (!lcFilter) return lcCards;
        return lcCards.filter(c => c.status === lcFilter);
    }, [lcCards, lcFilter]);

    /* ─────────────────────────────────────────────────────────────────
       SHARED COMPONENTS — AddModal, ListTable
       ───────────────────────────────────────────────────────────────── */
    const AddModal = ({ title, coll, fields, onSubmit }) => {
        const [form, setForm] = useState({});
        return (
            <div style={S.overlay}>
                <Card style={{ width: 440, padding: 24, animation: "fadeIn .2s" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{title}</h3>
                    {fields.map(f => (
                        <div key={f.key} style={S.fieldWrap}>
                            <label style={S.label}>{f.label}</label>
                            {f.options ? (
                                <select value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={S.select}>
                                    <option value="">Select...</option>
                                    {f.options.map(o => <option key={o.id || o.value || o.uuid || o} value={o.id || o.value || o.uuid || o}>{o.displayLabel || o.label || o.name || o}</option>)}
                                </select>
                            ) : f.type === "textarea" ? (
                                <textarea value={form[f.key] || ""} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph} rows={3}
                                    style={{ ...S.select, resize: "vertical", minHeight: 60 }} />
                            ) : (
                                <Inp value={form[f.key] || ""} onChange={v => setForm({ ...form, [f.key]: v })} placeholder={f.ph} type={f.type || "text"} />
                            )}
                        </div>
                    ))}
                    <div style={S.btnRow}>
                        <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                        <Btn onClick={() => {
                            if (onSubmit) { onSubmit(form); }
                            else { add(coll, { id: uid(), ...form, status: "active", createdAt: now() }); }
                            setModal(null);
                        }}>Add</Btn>
                    </div>
                </Card>
            </div>
        );
    };

    const ListTable = ({ items, coll, cols, noDelete }) => (
        <div style={{ marginTop: 12 }}>
            {!items || items.length === 0
                ? <div style={S.emptyState}>No items yet</div>
                : items.map(item => (
                    <div key={item.id || item.uuid} style={S.row}>
                        {cols.map((col, ci) => (
                            <div key={ci} style={{ flex: col.flex || 1, color: ci === 0 ? T.text : T.muted, fontWeight: ci === 0 ? 600 : 400, fontSize: ci === 0 ? 12 : 11 }}>
                                {col.render ? col.render(item) : item[col.key] || "\u2014"}
                            </div>
                        ))}
                        {!noDelete && <button onClick={() => del(coll, item.id)} style={{ background: `${T.danger}22`, border: "none", borderRadius: 5, padding: "4px 8px", color: T.danger, cursor: "pointer", fontSize: 10 }}>\u2715</button>}
                    </div>
                ))}
        </div>
    );

    /* ─────────────────────────────────────────────────────────────────
       TASK 12 — Account Ban / Suspend Flow
       ───────────────────────────────────────────────────────────────── */
    const handleSuspend = async (account) => {
        if (!confirm(`Suspend account "${account.label}"? This will block the card and stop the profile.`)) return;
        setSuspending(account.id);
        try {
            // 1. Block card if linked
            if (account.cardUuid) {
                await leadingCardsApi.blockCard(account.cardUuid);
            }
            // 2. Stop profile if linked
            if (account.profileId) {
                const prof = data.profiles.find(p => p.id === account.profileId);
                if (prof && prof.mlProfileId) {
                    await multiloginApi.stopProfile(prof.mlProfileId);
                }
            }
            // 3. Update local state + persist to API
            upd("accounts", account.id, { status: "suspended", cardStatus: "BLOCKED" });
            await refreshCards();
            flash(`Account "${account.label}" suspended successfully`, "success");
        } catch (e) {
            flash(`Suspend failed: ${e.message}`, "error");
        } finally {
            setSuspending(null);
        }
    };

    /* ═════════════════════════════════════════════════════════════════
       CF ACCOUNTS TAB COMPONENT
       ═════════════════════════════════════════════════════════════════ */
    const CfAccountsTab = ({ data, add, del, modal, setModal, flash }) => {
        const [testing, setTesting] = useState(null); // account id being tested
        const [testResult, setTestResult] = useState({}); // { id: { success, detail } }

        const handleTest = async (acct) => {
            setTesting(acct.id);
            const creds = { apiToken: acct.apiToken, accountId: acct.accountId };
            if (!creds.apiToken || !creds.accountId) {
                setTestResult(p => ({ ...p, [acct.id]: { success: false, detail: "Missing Token or Account ID" } }));
                setTesting(null);
                return;
            }
            const res = await cfZone.testAccount(creds);
            setTestResult(p => ({ ...p, [acct.id]: res }));
            setTesting(null);
        };

        return <>
            <Btn onClick={() => setModal("cf")} style={{ marginBottom: 12 }}>+ Add Cloudflare Account</Btn>

            {/* CF Account List */}
            <div style={{ marginTop: 12 }}>
                {!data.cfAccounts || data.cfAccounts.length === 0
                    ? <div style={S.emptyState}>No CF accounts yet</div>
                    : <>
                        {/* Header */}
                        <div style={{ display: "flex", padding: "6px 12px", fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            <div style={{ flex: 2 }}>Label</div>
                            <div style={{ flex: 2 }}>Email</div>
                            <div style={{ flex: 1.5 }}>Account ID</div>
                            <div style={{ flex: 1 }}>Token</div>
                            <div style={{ flex: 1 }}>Status</div>
                            <div style={{ flex: 1, textAlign: "right" }}>Actions</div>
                        </div>
                        {data.cfAccounts.map(acct => {
                            const tr = testResult[acct.id];
                            return (
                                <div key={acct.id} style={S.row}>
                                    <div style={{ flex: 2, fontWeight: 600, fontSize: 12 }}>{acct.label || "\u2014"}</div>
                                    <div style={{ flex: 2, fontSize: 11, color: T.muted }}>{acct.email || "\u2014"}</div>
                                    <div style={{ flex: 1.5, fontSize: 10, color: T.muted, fontFamily: "monospace" }}>
                                        {acct.accountId ? `${acct.accountId.slice(0, 8)}...${acct.accountId.slice(-4)}` : <span style={{ color: T.dim }}>Not set</span>}
                                    </div>
                                    <div style={{ flex: 1, fontSize: 10, color: T.muted }}>
                                        {acct.apiToken ? (acct.apiTokenHint || `\u2022\u2022\u2022\u2022${acct.apiToken.slice(-4)}`) : <span style={{ color: T.dim }}>None</span>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        {tr ? (
                                            <Dot c={tr.success ? T.success : T.danger} label={tr.detail || (tr.success ? "OK" : "Failed")} />
                                        ) : (
                                            <span style={{ fontSize: 10, color: T.dim }}>\u2014</span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                        <button onClick={() => handleTest(acct)} disabled={testing === acct.id}
                                            style={{ ...S.miniBtn, background: `${T.primary}22`, border: "none", borderRadius: 5, color: T.primary, cursor: testing === acct.id ? "wait" : "pointer" }}>
                                            {testing === acct.id ? "..." : "Test"}
                                        </button>
                                        <button onClick={() => del("cf-accounts", acct.id)}
                                            style={{ background: `${T.danger}22`, border: "none", borderRadius: 5, padding: "4px 8px", color: T.danger, cursor: "pointer", fontSize: 10 }}>{"\u2715"}</button>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                }
            </div>

            {/* Add CF Account Modal */}
            {modal === "cf" && (() => {
                const CfAddModal = () => {
                    const [form, setForm] = useState({ label: "", email: "", accountId: "", apiToken: "" });
                    const idValid = !form.accountId || /^[0-9a-f]{32}$/i.test(form.accountId.trim());
                    return (
                        <div style={S.overlay}>
                            <Card style={{ width: 480, padding: 24, animation: "fadeIn .2s" }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Cloudflare Account</h3>
                                <div style={S.fieldWrap}>
                                    <label style={S.label}>Label</label>
                                    <Inp value={form.label} onChange={v => setForm({ ...form, label: v })} placeholder="Main Account" />
                                </div>
                                <div style={S.fieldWrap}>
                                    <label style={S.label}>Login Email</label>
                                    <Inp value={form.email} onChange={v => setForm({ ...form, email: v })} placeholder="user@example.com" />
                                </div>
                                <div style={S.fieldWrap}>
                                    <label style={S.label}>Account ID <span style={{ fontWeight: 400, color: T.dim }}>(32 hex chars — find in CF Dashboard URL)</span></label>
                                    <Inp value={form.accountId} onChange={v => setForm({ ...form, accountId: v })} placeholder="1fb3e5c12523d33fdc95bc29bc3dd996" />
                                    {form.accountId && (
                                        <div style={{ fontSize: 10, marginTop: 3, color: idValid ? T.success : T.danger }}>
                                            {idValid ? `\u2713 ${form.accountId.trim().length} chars` : `\u2717 ${form.accountId.trim().length}/32 chars`}
                                        </div>
                                    )}
                                </div>
                                <div style={S.fieldWrap}>
                                    <label style={S.label}>API Token <span style={{ fontWeight: 400, color: T.dim }}>(Zone:Edit + DNS:Edit permissions)</span></label>
                                    <Inp value={form.apiToken} onChange={v => setForm({ ...form, apiToken: v })} placeholder="Bearer token" type="password" />
                                </div>
                                <div style={S.btnRow}>
                                    <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                                    <Btn disabled={!form.label || !form.accountId || !form.apiToken || !idValid}
                                        onClick={() => {
                                            add("cf-accounts", {
                                                id: uid(), label: form.label, email: form.email,
                                                accountId: form.accountId.trim(), apiToken: form.apiToken.trim(),
                                                status: "active", createdAt: now(),
                                            });
                                            setModal(null);
                                            flash("CF Account added");
                                        }}>Add</Btn>
                                </div>
                            </Card>
                        </div>
                    );
                };
                return <CfAddModal />;
            })()}
        </>;
    };

    /* ═════════════════════════════════════════════════════════════════
       DOMAINS TAB COMPONENT (with Zone + DNS + Auto Wizard)
       ═════════════════════════════════════════════════════════════════ */
    const DomainsTab = ({ data, add, del, upd, settings, modal, setModal, flash }) => {
        const [dnsOpen, setDnsOpen] = useState(null);       // domain id currently showing DNS
        const [dnsRecords, setDnsRecords] = useState([]);
        const [dnsLoading, setDnsLoading] = useState(false);
        const [refreshing, setRefreshing] = useState(null);  // domain id being refreshed
        const [addingRecord, setAddingRecord] = useState(false);
        const [newRecord, setNewRecord] = useState({ type: "CNAME", name: "", content: "", ttl: 1, proxied: true });
        const [editingRecord, setEditingRecord] = useState(null); // record id being edited
        const [editContent, setEditContent] = useState("");

        // Resolve creds for a domain
        const getCreds = useCallback((domain) => {
            return cfZone.resolveCredentials(domain.cfAccountId, data.cfAccounts || [], settings);
        }, [data.cfAccounts, settings]);

        // Refresh zone status for a domain
        const refreshStatus = async (domain) => {
            if (!domain.zoneId) return;
            const creds = getCreds(domain);
            if (!creds) { flash("No CF credentials for this account", "error"); return; }
            setRefreshing(domain.id);
            const res = await cfZone.getZone(domain.zoneId, creds);
            if (res.success) {
                upd("domains", domain.id, { cfStatus: res.status, nameservers: JSON.stringify(res.nameservers) });
                flash(`${domain.domain}: ${res.status}`);
            } else {
                flash(`Refresh failed: ${res.error}`, "error");
            }
            setRefreshing(null);
        };

        // Open DNS panel for a domain
        const openDns = async (domain) => {
            if (dnsOpen === domain.id) { setDnsOpen(null); return; }
            setDnsOpen(domain.id);
            setDnsLoading(true);
            const creds = getCreds(domain);
            if (!creds) { setDnsLoading(false); flash("No CF credentials", "error"); return; }
            const res = await cfZone.listDnsRecords(domain.zoneId, creds);
            setDnsRecords(res.records || []);
            setDnsLoading(false);
        };

        // Add DNS record
        const handleAddRecord = async (domain) => {
            const creds = getCreds(domain);
            if (!creds) return;
            setAddingRecord(true);
            const res = await cfZone.createDnsRecord(domain.zoneId, newRecord, creds);
            if (res.success) {
                setDnsRecords(p => [...p, res.record]);
                setNewRecord({ type: "CNAME", name: "", content: "", ttl: 1, proxied: true });
                flash("Record created");
            } else {
                flash(`Failed: ${res.error}`, "error");
            }
            setAddingRecord(false);
        };

        // Delete DNS record
        const handleDeleteRecord = async (domain, recordId) => {
            if (!confirm("Delete this DNS record?")) return;
            const creds = getCreds(domain);
            if (!creds) return;
            const res = await cfZone.deleteDnsRecord(domain.zoneId, recordId, creds);
            if (res.success) {
                setDnsRecords(p => p.filter(r => r.id !== recordId));
                flash("Record deleted");
            } else {
                flash(`Failed: ${res.error}`, "error");
            }
        };

        // Save edited record
        const handleSaveRecord = async (domain, record) => {
            const creds = getCreds(domain);
            if (!creds) return;
            const res = await cfZone.updateDnsRecord(domain.zoneId, record.id, { ...record, content: editContent }, creds);
            if (res.success) {
                setDnsRecords(p => p.map(r => r.id === record.id ? res.record : r));
                setEditingRecord(null);
                flash("Record updated");
            } else {
                flash(`Failed: ${res.error}`, "error");
            }
        };

        // Link domain to Vercel
        const handleVercelLink = async (domain) => {
            const suggested = domain.domain.replace(/\./g, "-").slice(0, 40);
            const projectName = prompt("Enter Vercel Project Name to link:", suggested);
            if (!projectName) return;
            flash("Linking to Vercel...");
            const res = await vercel.addDomain(projectName, domain.domain, settings);
            if (res.success) {
                flash("Domain linked to Vercel project!");
                if (domain.zoneId) {
                    const creds = getCreds(domain);
                    if (creds) {
                        flash("Adding DNS records to Cloudflare...");
                        const dnsRes = await cfZone.createDnsRecord(domain.zoneId, {
                            type: "CNAME", name: "@", content: "cname.vercel-dns.com", proxied: false, ttl: 1
                        }, creds);
                        if (dnsRes.success) flash("Vercel linked + DNS configured!", "success");
                        if (dnsOpen === domain.id) openDns(domain);
                    }
                }
            } else flash(`Vercel error: ${res.error}`, "error");
        };

        // Link domain to Netlify
        const handleNetlifyLink = async (domain) => {
            const suggested = domain.domain.replace(/\./g, "-").slice(0, 40);
            const siteName = prompt("Enter Netlify Site Name (slug) to link:", suggested);
            if (!siteName) return;
            flash("Linking to Netlify...");
            const res = await netlify.addDomain(siteName, domain.domain, settings);
            if (res.success) {
                flash("Domain linked to Netlify!");
                if (domain.zoneId) {
                    const creds = getCreds(domain);
                    if (creds) {
                        flash("Adding DNS records to Cloudflare...");
                        const dnsRes = await cfZone.createDnsRecord(domain.zoneId, {
                            type: "CNAME", name: "@", content: `${siteName}.netlify.app`, proxied: true, ttl: 1
                        }, creds);
                        if (dnsRes.success) flash("Netlify linked + DNS configured!", "success");
                        if (dnsOpen === domain.id) openDns(domain);
                    }
                }
            } else flash(`Netlify error: ${res.error}`, "error");
        };

        // Link domain to CF Pages
        const handleCfPagesLink = async (domain) => {
            const suggested = `lp-${domain.domain.replace(/\./g, "-")}`.slice(0, 40);
            const projectName = prompt("Enter CF Pages Project Name:", suggested);
            if (!projectName) return;
            flash("Linking to CF Pages...");
            const res = await cfPages.addDomain(projectName, domain.domain, settings);
            if (res.success) {
                flash("Domain linked to CF Pages!");
                if (domain.zoneId) {
                    const creds = getCreds(domain);
                    if (creds) {
                        flash("Adding DNS records to Cloudflare...");
                        const dnsRes = await cfZone.createDnsRecord(domain.zoneId, {
                            type: "CNAME", name: "@", content: `${projectName}.pages.dev`, proxied: true, ttl: 1
                        }, creds);
                        if (dnsRes.success) flash("Pages linked + DNS configured!", "success");
                        if (dnsOpen === domain.id) openDns(domain);
                    }
                }
            } else flash(`CF Pages error: ${res.error}`, "error");
        };

        // Link domain to CF Workers
        const handleCfWorkersLink = async (domain) => {
            const suggested = `lp-worker-${domain.domain.replace(/\./g, "-")}`.slice(0, 40);
            const scriptName = prompt("Enter Worker Script Name:", suggested);
            if (!scriptName) return;
            flash("Linking to Worker...");
            const res = await cfWorkers.addDomain(scriptName, domain.domain, settings);
            if (res.success) {
                flash("Worker Custom Domain configured!", "success");
            } else flash(`Worker error: ${res.error}`, "error");
        };

        // Refresh all statuses
        const refreshAll = async () => {
            const domainsWithZone = data.domains.filter(d => d.zoneId);
            for (const d of domainsWithZone) {
                await refreshStatus(d);
            }
        };

        return <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <Btn onClick={() => setModal("domain")}>+ Add Domain</Btn>
                {(data.registrarAccounts || []).some(a => ["porkbun", "internetbs"].includes(a.provider)) && (
                    <Btn onClick={() => setModal("register-domain")} style={{ background: `${T.success}22`, color: T.success, border: `1px solid ${T.success}44` }}>
                        🌐 Register New Domain
                    </Btn>
                )}
                {data.domains.some(d => d.zoneId) && (
                    <Btn variant="ghost" onClick={refreshAll} style={{ fontSize: 11 }}>↻ Refresh All Status</Btn>
                )}
            </div>

            {/* Domain List */}
            <div style={{ marginTop: 12 }}>
                {!data.domains || data.domains.length === 0
                    ? <div style={S.emptyState}>No domains yet</div>
                    : <>
                        {/* Header */}
                        <div style={{ display: "flex", padding: "6px 12px", fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            <div style={{ flex: 2.5 }}>Domain</div>
                            <div style={{ flex: 1 }}>Registrar</div>
                            <div style={{ flex: 1.2 }}>CF Account</div>
                            <div style={{ flex: 0.8 }}>CF Status</div>
                            <div style={{ flex: 1.5 }}>Nameservers</div>
                            <div style={{ flex: 1.5, textAlign: "right" }}>Actions</div>
                        </div>

                        {data.domains.map(d => {
                            const cfAcct = data.cfAccounts?.find(c => c.id === d.cfAccountId);
                            const ns = (() => { try { return JSON.parse(d.nameservers || "[]"); } catch { return []; } })();
                            const cfSt = d.cfStatus || (d.zoneId ? "unknown" : "");
                            const stColor = cfSt === "active" ? T.success : cfSt === "pending" ? "#f59e0b" : T.dim;
                            const isDnsOpen = dnsOpen === d.id;
                            return (
                                <div key={d.id}>
                                    <div style={{ ...S.row, background: isDnsOpen ? `${T.primary}0a` : S.row.background }}>
                                        <div style={{ flex: 2.5, fontWeight: 600, fontSize: 12 }}>{d.domain}</div>
                                        <div style={{ flex: 1, fontSize: 11, color: T.muted }}>{d.registrar || "\u2014"}</div>
                                        <div style={{ flex: 1.2, fontSize: 11, color: T.muted }}>{cfAcct?.label || "\u2014"}</div>
                                        <div style={{ flex: 0.8 }}>
                                            {cfSt ? <Badge color={stColor}>{cfSt}</Badge> : <span style={{ fontSize: 10, color: T.dim }}>\u2014</span>}
                                        </div>
                                        <div style={{ flex: 1.5, fontSize: 9, color: T.muted, fontFamily: "monospace" }}>
                                            {ns.length > 0 ? ns.map(n => n.split(".")[0]).join(", ") : "\u2014"}
                                        </div>
                                        <div style={{ flex: 1.5, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                            {d.zoneId && (
                                                <>
                                                    <button onClick={() => openDns(d)}
                                                        style={{ ...S.miniBtn, background: isDnsOpen ? `${T.primary}33` : `${T.primary}22`, border: "none", borderRadius: 5, color: T.primary, cursor: "pointer" }}>
                                                        DNS
                                                    </button>
                                                    <button onClick={() => refreshStatus(d)} disabled={refreshing === d.id}
                                                        style={{ ...S.miniBtn, background: "transparent", border: "none", color: T.muted, cursor: refreshing === d.id ? "wait" : "pointer" }}>
                                                        {refreshing === d.id ? "..." : "↻"}
                                                    </button>
                                                </>
                                            )}
                                            <button onClick={() => {
                                                if (d.zoneId) {
                                                    if (confirm(`Delete "${d.domain}"? This removes it from the system.\n\nTo also remove the zone from Cloudflare, delete it via the DNS panel first.`)) {
                                                        del("domains", d.id);
                                                    }
                                                } else {
                                                    del("domains", d.id);
                                                }
                                            }} style={{ background: `${T.danger}22`, border: "none", borderRadius: 5, padding: "4px 8px", color: T.danger, cursor: "pointer", fontSize: 10 }}>{"\u2715"}</button>
                                        </div>
                                    </div>

                                    {/* DNS Panel (inline expandable) */}
                                    {isDnsOpen && d.zoneId && (
                                        <Card style={{ margin: "0 0 8px 0", padding: 16, borderLeft: `3px solid ${T.primary}`, borderRadius: "0 7px 7px 7px" }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                                <h4 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>DNS Records — {d.domain}</h4>
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    {/* Quick presets */}
                                                    {settings.vercelToken && (
                                                        <Btn onClick={() => {
                                                            setNewRecord({ type: "CNAME", name: "@", content: "cname.vercel-dns.com", ttl: 1, proxied: false });
                                                            if (confirm("Link this domain to a Vercel Project now?")) handleVercelLink(d);
                                                        }}
                                                            style={{ fontSize: 9, padding: "3px 8px", background: `${T.primary}11`, color: T.primary, fontWeight: 700 }}>
                                                            ▲ Vercel Link
                                                        </Btn>
                                                    )}
                                                    {settings.netlifyToken && (
                                                        <Btn onClick={() => {
                                                            if (confirm("Link this domain to a Netlify Site now?")) handleNetlifyLink(d);
                                                        }}
                                                            style={{ fontSize: 9, padding: "3px 8px", background: "#25c2a022", color: "#25c2a0", fontWeight: 700 }}>
                                                            ◈ Netlify Link
                                                        </Btn>
                                                    )}
                                                    {(settings.cfApiToken && settings.cfAccountId) && (
                                                        <>
                                                            <Btn onClick={() => {
                                                                if (confirm("Link this domain to a Cloudflare Pages project?")) handleCfPagesLink(d);
                                                            }}
                                                                style={{ fontSize: 9, padding: "3px 8px", background: "#f3802022", color: "#f38020", fontWeight: 700 }}>
                                                                ☁ Pages Link
                                                            </Btn>
                                                            <Btn onClick={() => {
                                                                if (confirm("Link this domain to a Cloudflare Worker Custom Domain?")) handleCfWorkersLink(d);
                                                            }}
                                                                style={{ fontSize: 9, padding: "3px 8px", background: "#f3802022", color: "#f38020", fontWeight: 700 }}>
                                                                ⚡ Worker Link
                                                            </Btn>
                                                        </>
                                                    )}
                                                    <Btn variant="ghost" onClick={() => setNewRecord({ type: "A", name: "@", content: "", ttl: 1, proxied: true })} style={{ fontSize: 9, padding: "3px 8px" }}>IP</Btn>
                                                    <Btn variant="ghost" onClick={() => setNewRecord({ type: "TXT", name: "@", content: "", ttl: 1, proxied: false })} style={{ fontSize: 9, padding: "3px 8px" }}>TXT</Btn>
                                                </div>
                                            </div>

                                            {dnsLoading ? <div style={{ textAlign: "center", padding: 16, color: T.dim }}>Loading records...</div> : (
                                                <>
                                                    {/* Records table header */}
                                                    <div style={{ display: "flex", padding: "4px 8px", fontSize: 9, fontWeight: 700, color: T.dim, textTransform: "uppercase" }}>
                                                        <div style={{ flex: 0.6 }}>Type</div>
                                                        <div style={{ flex: 2 }}>Name</div>
                                                        <div style={{ flex: 3 }}>Content</div>
                                                        <div style={{ flex: 0.5 }}>TTL</div>
                                                        <div style={{ flex: 0.5 }}>Proxy</div>
                                                        <div style={{ flex: 1, textAlign: "right" }}>Actions</div>
                                                    </div>

                                                    {/* Records */}
                                                    {dnsRecords.length === 0
                                                        ? <div style={{ textAlign: "center", padding: 12, color: T.dim, fontSize: 11 }}>No DNS records</div>
                                                        : dnsRecords.map(rec => (
                                                            <div key={rec.id} style={{ display: "flex", alignItems: "center", padding: "5px 8px", fontSize: 11, borderBottom: `1px solid ${T.border}22` }}>
                                                                <div style={{ flex: 0.6 }}>
                                                                    <Badge color={rec.type === "A" ? "#60a5fa" : rec.type === "CNAME" ? "#a78bfa" : rec.type === "TXT" ? "#f59e0b" : T.muted}>
                                                                        {rec.type}
                                                                    </Badge>
                                                                </div>
                                                                <div style={{ flex: 2, fontFamily: "monospace", fontSize: 10, color: T.text }}>{rec.name}</div>
                                                                <div style={{ flex: 3, fontSize: 10, color: T.muted, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                                    {editingRecord === rec.id ? (
                                                                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                                            <input value={editContent} onChange={e => setEditContent(e.target.value)}
                                                                                style={{ flex: 1, padding: "2px 6px", fontSize: 10, borderRadius: 3, border: `1px solid ${T.border}`, background: T.input, color: T.text }}
                                                                                onKeyDown={e => { if (e.key === "Enter") handleSaveRecord(d, rec); if (e.key === "Escape") setEditingRecord(null); }}
                                                                                autoFocus />
                                                                            <button onClick={() => handleSaveRecord(d, rec)}
                                                                                style={{ background: T.success, border: "none", color: "#fff", borderRadius: 3, padding: "2px 6px", fontSize: 9, cursor: "pointer" }}>OK</button>
                                                                        </div>
                                                                    ) : (
                                                                        <span onClick={() => { setEditingRecord(rec.id); setEditContent(rec.content); }}
                                                                            style={{ cursor: "pointer" }} title="Click to edit">
                                                                            {rec.content}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div style={{ flex: 0.5, fontSize: 9, color: T.dim }}>{rec.ttl === 1 ? "Auto" : rec.ttl}</div>
                                                                <div style={{ flex: 0.5 }}>
                                                                    {rec.proxiable !== false && (
                                                                        <span style={{ fontSize: 11, color: rec.proxied ? "#f97316" : T.dim }}>{rec.proxied ? "\u2601" : "\u2601"}</span>
                                                                    )}
                                                                </div>
                                                                <div style={{ flex: 1, display: "flex", gap: 3, justifyContent: "flex-end" }}>
                                                                    <button onClick={() => handleDeleteRecord(d, rec.id)}
                                                                        style={{ background: `${T.danger}22`, border: "none", borderRadius: 3, padding: "2px 6px", color: T.danger, cursor: "pointer", fontSize: 9 }}>{"\u2715"}</button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    }

                                                    {/* Add new record form */}
                                                    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", marginTop: 10, padding: "8px 0", borderTop: `1px solid ${T.border}33` }}>
                                                        <div style={{ flex: 0.6 }}>
                                                            <select value={newRecord.type} onChange={e => setNewRecord({ ...newRecord, type: e.target.value })}
                                                                style={{ ...S.select, padding: 4, fontSize: 10 }}>
                                                                {["A", "AAAA", "CNAME", "MX", "TXT", "NS"].map(t => <option key={t}>{t}</option>)}
                                                            </select>
                                                        </div>
                                                        <div style={{ flex: 2 }}>
                                                            <input value={newRecord.name} onChange={e => setNewRecord({ ...newRecord, name: e.target.value })}
                                                                placeholder="@ or subdomain" style={{ width: "100%", padding: "4px 6px", fontSize: 10, borderRadius: 4, border: `1px solid ${T.border}`, background: T.input, color: T.text, boxSizing: "border-box" }} />
                                                        </div>
                                                        <div style={{ flex: 3 }}>
                                                            <input value={newRecord.content} onChange={e => setNewRecord({ ...newRecord, content: e.target.value })}
                                                                placeholder="IP or target" style={{ width: "100%", padding: "4px 6px", fontSize: 10, borderRadius: 4, border: `1px solid ${T.border}`, background: T.input, color: T.text, boxSizing: "border-box" }} />
                                                        </div>
                                                        <div style={{ flex: 0.5 }}>
                                                            <label style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3, cursor: "pointer", color: T.muted }}>
                                                                <input type="checkbox" checked={newRecord.proxied} onChange={e => setNewRecord({ ...newRecord, proxied: e.target.checked })} />
                                                                <span style={{ color: newRecord.proxied ? "#f97316" : T.dim }}>{"\u2601"}</span>
                                                            </label>
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <Btn disabled={!newRecord.name || !newRecord.content || addingRecord}
                                                                onClick={() => handleAddRecord(d)} style={{ fontSize: 10, padding: "4px 10px" }}>
                                                                {addingRecord ? "..." : "+ Add"}
                                                            </Btn>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </Card>
                                    )}
                                </div>
                            );
                        })}
                    </>
                }
            </div>

            {/* ─── Add Domain Modal (with CF Zone Creation + Auto Wizard) ── */}
            {modal === "domain" && (() => {
                const AddDomainModal = () => {
                    const [form, setForm] = useState({ domain: "", registrar: "", cfAccountId: "", accountId: "", profileId: "" });
                    const [addToCf, setAddToCf] = useState(true);
                    const [step, setStep] = useState("form"); // form | creating | wizard | result
                    const [error, setError] = useState(null);
                    const [wizardProgress, setWizardProgress] = useState([]);
                    const [wizardResults, setWizardResults] = useState(null);
                    const [nsResult, setNsResult] = useState(null);
                    const [dnsResults, setDnsResults] = useState(null);

                    const handleSubmit = async () => {
                        if (!form.domain) { setError("Domain is required"); return; }
                        setError(null);

                        if (!addToCf) {
                            // Just save metadata
                            add("domains", { id: uid(), ...form, status: "active", createdAt: now() });
                            setModal(null);
                            flash("Domain added (metadata only)");
                            return;
                        }

                        // Resolve CF credentials
                        const creds = cfZone.resolveCredentials(form.cfAccountId, data.cfAccounts || [], settings);
                        if (!creds) { setError("No CF credentials. Select a CF Account or configure in Settings."); return; }
                        if (!/^[0-9a-f]{32}$/i.test(creds.accountId)) { setError(`Invalid Account ID: ${creds.accountId.length}/32 chars`); return; }

                        setStep("creating");

                        // 1. Create zone
                        const zoneRes = await cfZone.createZone(form.domain, creds);
                        if (!zoneRes.success) { setError(zoneRes.error); setStep("form"); return; }

                        // Save domain with zone data
                        const domainItem = {
                            id: uid(), ...form,
                            zoneId: zoneRes.zoneId,
                            nameservers: JSON.stringify(zoneRes.nameservers),
                            cfStatus: zoneRes.status || "pending",
                            status: "active",
                            createdAt: now(),
                        };
                        add("domains", domainItem);

                        setNsResult({ nameservers: zoneRes.nameservers, linked: zoneRes.linked, status: zoneRes.status });

                        // 2. Run Auto Wizard (LP settings)
                        setStep("wizard");
                        const settingsResults = await cfZone.applyLpPreset(zoneRes.zoneId, creds, (p) => {
                            setWizardProgress(prev => {
                                const next = [...prev];
                                next[p.index] = p;
                                return next;
                            });
                        });
                        setWizardResults(settingsResults);

                        // 3. Auto-create DNS (if Pages project might exist)
                        const pagesProject = form.domain.replace(/\./g, "-");
                        const dnsRes = await cfZone.autoCreatePagesDns(zoneRes.zoneId, form.domain, pagesProject, creds);
                        setDnsResults(dnsRes);

                        setStep("result");
                    };

                    // Form step
                    if (step === "form") return (
                        <div style={S.overlay}>
                            <Card style={{ width: 480, padding: 24, animation: "fadeIn .2s" }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Domain</h3>
                                {error && <div style={{ padding: 8, marginBottom: 12, borderRadius: 6, background: `${T.danger}12`, border: `1px solid ${T.danger}44`, color: T.danger, fontSize: 12 }}>{error}</div>}

                                <div style={S.fieldWrap}>
                                    <label style={S.label}>Domain</label>
                                    <Inp value={form.domain} onChange={v => setForm({ ...form, domain: v })} placeholder="loanbridge.com" />
                                </div>
                                <div style={S.fieldWrap}>
                                    <label style={S.label}>Registrar</label>
                                    <select value={form.registrar} onChange={e => setForm({ ...form, registrar: e.target.value })} style={S.select}>
                                        <option value="">Select...</option>
                                        {REGISTRARS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div style={S.fieldWrap}>
                                    <label style={S.label}>Cloudflare Account</label>
                                    <select value={form.cfAccountId} onChange={e => setForm({ ...form, cfAccountId: e.target.value })} style={S.select}>
                                        <option value="">Select...</option>
                                        {(data.cfAccounts || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "8px 12px", background: `${T.primary}08`, borderRadius: 6, border: `1px solid ${T.primary}22` }}>
                                    <input type="checkbox" checked={addToCf} onChange={e => setAddToCf(e.target.checked)} id="add-to-cf" />
                                    <label htmlFor="add-to-cf" style={{ fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                        Add to Cloudflare + Auto Configure LP Settings
                                    </label>
                                </div>

                                <div style={S.btnRow}>
                                    <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                                    <Btn onClick={handleSubmit} disabled={!form.domain}>
                                        {addToCf ? "Add & Configure" : "Add Domain"}
                                    </Btn>
                                </div>
                            </Card>
                        </div>
                    );

                    // Creating step (zone creation spinner)
                    if (step === "creating") return (
                        <div style={S.overlay}>
                            <Card style={{ width: 420, padding: 32, textAlign: "center", animation: "fadeIn .2s" }}>
                                <div style={{ fontSize: 32, marginBottom: 12, animation: "pulse 1.5s infinite" }}>☁️</div>
                                <div style={{ fontSize: 14, fontWeight: 700 }}>Adding {form.domain} to Cloudflare...</div>
                                <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Creating zone and configuring settings</div>
                            </Card>
                        </div>
                    );

                    // Wizard step (settings being applied)
                    if (step === "wizard") return (
                        <div style={S.overlay}>
                            <Card style={{ width: 480, padding: 24, animation: "fadeIn .2s" }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Configuring {form.domain}...</h3>

                                {/* Progress bar */}
                                <div style={{ height: 4, background: T.border, borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
                                    <div style={{
                                        height: "100%", background: T.primary, borderRadius: 2, transition: "width .3s",
                                        width: `${((wizardProgress.filter(p => p?.status === "done" || p?.status === "error").length) / cfZone.LP_SETTINGS.length) * 100}%`
                                    }} />
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                    {cfZone.LP_SETTINGS.map((s, i) => {
                                        const p = wizardProgress[i];
                                        const icon = !p ? "\u2022" : p.status === "done" ? "\u2713" : p.status === "error" ? "\u2717" : "\u2022\u2022\u2022";
                                        const color = !p ? T.dim : p.status === "done" ? T.success : p.status === "error" ? T.danger : T.primary;
                                        return (
                                            <div key={s.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                                                <span>{s.label}</span>
                                                <span style={{ color, fontWeight: 600, fontSize: 11 }}>{icon}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ fontSize: 11, color: T.dim, marginTop: 12, textAlign: "center" }}>
                                    Setting up DNS records...
                                </div>
                            </Card>
                        </div>
                    );

                    // Result step
                    if (step === "result") return (
                        <div style={S.overlay}>
                            <Card style={{ width: 520, padding: 24, animation: "fadeIn .2s", maxHeight: "85vh", overflowY: "auto" }}>
                                <div style={{ textAlign: "center", marginBottom: 16 }}>
                                    <div style={{ fontSize: 36, marginBottom: 8 }}>{"\u2705"}</div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{form.domain} configured!</h3>
                                    {nsResult?.linked && <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Linked to existing zone</div>}
                                </div>

                                {/* Nameservers */}
                                {nsResult?.nameservers?.length > 0 && (
                                    <Card style={{ padding: 14, marginBottom: 12, background: `${T.primary}08`, border: `1px solid ${T.primary}22` }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Update your nameservers at {form.registrar || "your registrar"}:</div>
                                        {nsResult.nameservers.map((ns, i) => (
                                            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontFamily: "monospace", fontSize: 12 }}>
                                                <span>{ns}</span>
                                                <button onClick={() => { navigator.clipboard?.writeText(ns); flash("Copied!"); }}
                                                    style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 3, padding: "2px 8px", color: T.muted, cursor: "pointer", fontSize: 9 }}>Copy</button>
                                            </div>
                                        ))}
                                    </Card>
                                )}

                                {/* Settings results */}
                                {wizardResults && (
                                    <Card style={{ padding: 14, marginBottom: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>LP Settings Applied</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                                            {wizardResults.map(r => (
                                                <div key={r.key} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                                    <span style={{ color: r.success ? T.success : T.danger }}>{r.success ? "\u2713" : "\u2717"}</span>
                                                    <span style={{ color: r.success ? T.text : T.muted }}>{r.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* DNS results */}
                                {dnsResults && (
                                    <Card style={{ padding: 14, marginBottom: 12 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>DNS Records Created</div>
                                        {dnsResults.map((r, i) => (
                                            <div key={i} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, padding: "3px 0" }}>
                                                <span style={{ color: r.success ? T.success : T.danger }}>{r.success ? "\u2713" : "\u2717"}</span>
                                                <span>{r.label}</span>
                                                {!r.success && r.error && <span style={{ color: T.dim, fontSize: 9 }}>({r.error})</span>}
                                            </div>
                                        ))}
                                    </Card>
                                )}

                                <div style={S.btnRow}>
                                    <Btn onClick={() => setModal(null)}>Done</Btn>
                                </div>
                            </Card>
                        </div>
                    );
                };
                return <AddDomainModal />;
            })()}

            {/* ─── Register Domain Wizard (E2E: check → register → NS → zone → LP settings) ── */}
            {modal === "register-domain" && (() => {
                const RegisterDomainWizard = () => {
                    const [step, setStep] = useState("search"); // search | confirm | registering | ns | zone | result
                    const [domain, setDomain] = useState("");
                    const [regAcctId, setRegAcctId] = useState((data.registrarAccounts || []).find(a => ["porkbun", "internetbs"].includes(a.provider))?.id || "");
                    const [cfAcctId, setCfAcctId] = useState((data.cfAccounts || [])[0]?.id || "");
                    const [checkResult, setCheckResult] = useState(null);
                    const [checking, setChecking] = useState(false);
                    const [error, setError] = useState(null);
                    const [progress, setProgress] = useState([]);
                    const [finalResult, setFinalResult] = useState(null);

                    const registrarAccounts = (data.registrarAccounts || []).filter(a => ["porkbun", "internetbs"].includes(a.provider));
                    const selectedAcct = registrarAccounts.find(a => a.id === regAcctId);
                    const selectedProv = REGISTRAR_PROVIDERS.find(p => p.id === selectedAcct?.provider);

                    const handleCheck = async () => {
                        if (!domain) return;
                        setChecking(true);
                        setCheckResult(null);
                        setError(null);
                        const creds = registrar.resolveRegistrarCreds(regAcctId, data.registrarAccounts || []);
                        if (!creds) { setError("Select a registrar account with valid credentials"); setChecking(false); return; }
                        const adapter = registrar.getAdapter(creds.provider);
                        const res = await adapter.checkDomain(domain, creds);
                        if (res.success) {
                            setCheckResult(res);
                        } else {
                            setError(res.error || "Check failed");
                        }
                        setChecking(false);
                    };

                    const handleRegister = async () => {
                        setStep("registering");
                        setProgress([]);
                        setError(null);

                        const regCreds = registrar.resolveRegistrarCreds(regAcctId, data.registrarAccounts || []);
                        if (!regCreds) { setError("Missing registrar credentials"); setStep("confirm"); return; }

                        const cfCreds = cfZone.resolveCredentials(cfAcctId, data.cfAccounts || [], settings);

                        const steps = [];

                        // Step 1: Register domain
                        steps.push({ id: "register", label: "Register Domain", status: "running" });
                        setProgress([...steps]);

                        const adapter = registrar.getAdapter(regCreds.provider);
                        const regRes = await adapter.registerDomain(domain, checkResult.costPennies, regCreds);
                        steps[0].status = regRes.success ? "done" : "error";
                        steps[0].detail = regRes.success
                            ? `Order ${regRes.orderId}${regRes.balance ? ` — Balance: $${(regRes.balance / 100).toFixed(2)}` : (regRes.expiration ? ` — Exp: ${regRes.expiration}` : "")}`
                            : regRes.error;
                        setProgress([...steps]);

                        if (!regRes.success) { setError(regRes.error); setStep("confirm"); return; }

                        // Step 2: Add zone to Cloudflare (if CF account selected)
                        let zoneRes = null;
                        let nsToSet = [];
                        if (cfCreds) {
                            steps.push({ id: "zone", label: "Add Zone to Cloudflare", status: "running" });
                            setProgress([...steps]);

                            zoneRes = await cfZone.createZone(domain, cfCreds);
                            const zi = steps.length - 1;
                            steps[zi].status = zoneRes.success ? "done" : "error";
                            steps[zi].detail = zoneRes.success ? `Zone: ${zoneRes.zoneId?.slice(0, 12)}...` : zoneRes.error;
                            setProgress([...steps]);

                            if (zoneRes.success) {
                                nsToSet = zoneRes.nameservers || [];
                            }
                        }

                        // Step 3: Update nameservers at registrar → Cloudflare
                        if (nsToSet.length > 0) {
                            steps.push({ id: "ns", label: `Set CF Nameservers at ${selectedProv?.name || "Registrar"}`, status: "running" });
                            setProgress([...steps]);

                            const nsRes = await adapter.updateNameservers(domain, nsToSet, regCreds);
                            const ni = steps.length - 1;
                            steps[ni].status = nsRes.success ? "done" : "error";
                            steps[ni].detail = nsRes.success ? nsToSet.join(", ") : nsRes.error;
                            setProgress([...steps]);
                        }

                        // Step 4: Apply LP settings (if zone was created)
                        let wizardResults = null;
                        if (zoneRes?.success && cfCreds) {
                            steps.push({ id: "settings", label: "Apply LP Settings", status: "running" });
                            setProgress([...steps]);

                            wizardResults = await cfZone.applyLpPreset(zoneRes.zoneId, cfCreds, (p) => {
                                const si = steps.length - 1;
                                const done = (p.index + 1);
                                steps[si].detail = `${done}/${cfZone.LP_SETTINGS.length} — ${p.label}`;
                                setProgress([...steps]);
                            });
                            const si = steps.length - 1;
                            const allOk = wizardResults.every(r => r.success);
                            steps[si].status = allOk ? "done" : "error";
                            steps[si].detail = `${wizardResults.filter(r => r.success).length}/${wizardResults.length} settings applied`;
                            setProgress([...steps]);
                        }

                        // Step 5: Auto-create DNS records (Pages CNAME)
                        let dnsResults = null;
                        if (zoneRes?.success && cfCreds) {
                            steps.push({ id: "dns", label: "Create DNS Records", status: "running" });
                            setProgress([...steps]);

                            const pagesProject = domain.replace(/\./g, "-");
                            dnsResults = await cfZone.autoCreatePagesDns(zoneRes.zoneId, domain, pagesProject, cfCreds);
                            const di = steps.length - 1;
                            steps[di].status = "done";
                            steps[di].detail = `${dnsResults.filter(r => r.success).length} records created`;
                            setProgress([...steps]);
                        }

                        // Save domain to D1
                        add("domains", {
                            id: uid(), domain, registrar: selectedProv?.name || "Unknown",
                            cfAccountId: cfAcctId,
                            registrarAccountId: regAcctId,
                            zoneId: zoneRes?.zoneId || "",
                            nameservers: JSON.stringify(nsToSet),
                            cfStatus: zoneRes?.status || "",
                            status: "active",
                            createdAt: now(),
                        });

                        setFinalResult({
                            domain, registered: true,
                            orderId: regRes.orderId,
                            balance: regRes.balance,
                            nameservers: nsToSet,
                            zoneId: zoneRes?.zoneId,
                            wizardResults,
                            dnsResults,
                        });
                        setStep("result");
                    };

                    // Search step
                    if (step === "search") return (
                        <div style={S.overlay}>
                            <Card style={{ width: 520, padding: 24, animation: "fadeIn .2s" }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{selectedProv?.icon || "🌐"} Register New Domain</h3>
                                <p style={{ fontSize: 11, color: T.muted, marginBottom: 20 }}>Search, register, and auto-configure in one step</p>

                                {error && <div style={{ padding: 8, marginBottom: 12, borderRadius: 6, background: `${T.danger}12`, border: `1px solid ${T.danger}44`, color: T.danger, fontSize: 12 }}>{error}</div>}

                                <div style={S.fieldWrap}>
                                    <label style={S.label}>Domain Name</label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <Inp value={domain} onChange={v => setDomain(v.toLowerCase().trim())} placeholder="example.com"
                                            style={{ flex: 1 }} onKeyDown={e => { if (e.key === "Enter") handleCheck(); }} />
                                        <Btn onClick={handleCheck} disabled={!domain || checking}>
                                            {checking ? "Checking..." : "Check"}
                                        </Btn>
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Registrar Account</label>
                                        <select value={regAcctId} onChange={e => { setRegAcctId(e.target.value); setCheckResult(null); }} style={S.select}>
                                            {registrarAccounts.map(a => {
                                                const p = REGISTRAR_PROVIDERS.find(pr => pr.id === a.provider);
                                                return <option key={a.id} value={a.id}>{p?.icon || "?"} {a.label} ({p?.name})</option>;
                                            })}
                                        </select>
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Cloudflare Account <span style={{ fontWeight: 400, color: T.dim }}>(auto-zone)</span></label>
                                        <select value={cfAcctId} onChange={e => setCfAcctId(e.target.value)} style={S.select}>
                                            <option value="">None (manual)</option>
                                            {(data.cfAccounts || []).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Check result */}
                                {checkResult && (
                                    <Card style={{ padding: 14, marginTop: 8, background: checkResult.available ? `${T.success}08` : `${T.danger}08`, border: `1px solid ${checkResult.available ? T.success : T.danger}33` }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: checkResult.available ? T.success : T.danger }}>
                                                    {checkResult.available ? "\u2713 Available" : "\u2717 Not Available"}
                                                </div>
                                                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{domain}</div>
                                            </div>
                                            {checkResult.available && (
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>
                                                        {checkResult.price ? `$${checkResult.price}` : "From balance"}
                                                        {checkResult.firstYearPromo && <span style={{ fontSize: 10, color: T.success, marginLeft: 4 }}>PROMO</span>}
                                                    </div>
                                                    <div style={{ fontSize: 9, color: T.dim }}>
                                                        {checkResult.renewal ? `Renewal: $${checkResult.renewal}/yr` : ""}
                                                        {checkResult.premium && <span style={{ color: T.warning }}> • PREMIUM</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                )}

                                <div style={{ ...S.btnRow, marginTop: 16 }}>
                                    <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                                    {checkResult?.available && (
                                        <Btn onClick={() => setStep("confirm")} style={{ background: T.success, color: "#fff" }}>
                                            Register {checkResult.price ? `$${checkResult.price}` : domain}
                                        </Btn>
                                    )}
                                </div>
                            </Card>
                        </div>
                    );

                    // Confirm step
                    if (step === "confirm") return (
                        <div style={S.overlay}>
                            <Card style={{ width: 480, padding: 24, animation: "fadeIn .2s" }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Confirm Registration</h3>
                                {error && <div style={{ padding: 8, marginBottom: 12, borderRadius: 6, background: `${T.danger}12`, border: `1px solid ${T.danger}44`, color: T.danger, fontSize: 12 }}>{error}</div>}

                                <Card style={{ padding: 14, background: T.card2, marginBottom: 16 }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                                        <div><span style={{ color: T.dim, fontSize: 10 }}>Domain</span><div style={{ fontWeight: 700 }}>{domain}</div></div>
                                        <div><span style={{ color: T.dim, fontSize: 10 }}>Price</span><div style={{ fontWeight: 700, color: T.success }}>{checkResult?.price ? `$${checkResult.price}` : "From balance"}</div></div>
                                        <div><span style={{ color: T.dim, fontSize: 10 }}>Registrar</span><div>{selectedProv?.icon} {selectedProv?.name || "Unknown"}</div></div>
                                        <div><span style={{ color: T.dim, fontSize: 10 }}>CF Account</span><div>{cfAcctId ? (data.cfAccounts || []).find(c => c.id === cfAcctId)?.label || "Selected" : "None"}</div></div>
                                    </div>
                                </Card>

                                <div style={{ fontSize: 11, color: T.muted, marginBottom: 16, padding: "8px 12px", background: `${T.primary}08`, borderRadius: 6 }}>
                                    <strong>What will happen:</strong>
                                    <ol style={{ margin: "6px 0 0 16px", padding: 0, lineHeight: 1.8 }}>
                                        <li>Register {domain} at {selectedProv?.name || "registrar"} {checkResult?.price ? `($${checkResult.price})` : "(from balance)"}</li>
                                        {cfAcctId && <li>Add zone to Cloudflare (auto)</li>}
                                        {cfAcctId && <li>Set Cloudflare nameservers at {selectedProv?.name || "registrar"}</li>}
                                        {cfAcctId && <li>Apply LP-optimized settings (11 configs)</li>}
                                        {cfAcctId && <li>Create Pages DNS records (CNAME)</li>}
                                    </ol>
                                </div>

                                <div style={S.btnRow}>
                                    <Btn variant="ghost" onClick={() => setStep("search")}>Back</Btn>
                                    <Btn onClick={handleRegister} style={{ background: T.success, color: "#fff" }}>
                                        Confirm & Register
                                    </Btn>
                                </div>
                            </Card>
                        </div>
                    );

                    // Registering step (progress)
                    if (step === "registering") return (
                        <div style={S.overlay}>
                            <Card style={{ width: 500, padding: 24, animation: "fadeIn .2s" }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Registering {domain}...</h3>

                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {progress.map((s, i) => {
                                        const icon = s.status === "done" ? "\u2713" : s.status === "error" ? "\u2717" : "\u2022\u2022\u2022";
                                        const color = s.status === "done" ? T.success : s.status === "error" ? T.danger : T.primary;
                                        return (
                                            <div key={s.id} style={{ padding: "8px 12px", background: T.card2, borderRadius: 6, borderLeft: `3px solid ${color}` }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                                                    <span style={{ color, fontWeight: 700, fontSize: 12 }}>{icon}</span>
                                                </div>
                                                {s.detail && <div style={{ fontSize: 10, color: T.muted, marginTop: 3 }}>{s.detail}</div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ fontSize: 11, color: T.dim, marginTop: 16, textAlign: "center", animation: "pulse 1.5s infinite" }}>
                                    Please wait...
                                </div>
                            </Card>
                        </div>
                    );

                    // Result step
                    if (step === "result" && finalResult) return (
                        <div style={S.overlay}>
                            <Card style={{ width: 540, padding: 24, animation: "fadeIn .2s", maxHeight: "85vh", overflowY: "auto" }}>
                                <div style={{ textAlign: "center", marginBottom: 16 }}>
                                    <div style={{ fontSize: 36, marginBottom: 8 }}>{"\u2705"}</div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{finalResult.domain} Registered!</h3>
                                    <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Order #{finalResult.orderId}</div>
                                </div>

                                {/* Steps completed */}
                                <Card style={{ padding: 14, marginBottom: 12 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Completed Steps</div>
                                    {progress.map((s, i) => (
                                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0", borderBottom: i < progress.length - 1 ? `1px solid ${T.border}22` : "none" }}>
                                            <span>{s.label}</span>
                                            <span style={{ color: s.status === "done" ? T.success : T.danger, fontWeight: 600 }}>{s.status === "done" ? "\u2713" : "\u2717"} {s.detail?.slice(0, 40)}</span>
                                        </div>
                                    ))}
                                </Card>

                                {/* Nameservers */}
                                {finalResult.nameservers?.length > 0 && (
                                    <Card style={{ padding: 14, marginBottom: 12, background: `${T.success}08`, border: `1px solid ${T.success}22` }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>\u2713 Nameservers configured automatically</div>
                                        <div style={{ fontFamily: "monospace", fontSize: 10, color: T.muted }}>
                                            {finalResult.nameservers.join(" / ")}
                                        </div>
                                    </Card>
                                )}

                                {/* Balance */}
                                {finalResult.balance !== undefined && (
                                    <div style={{ fontSize: 11, color: T.dim, textAlign: "center", marginBottom: 12 }}>
                                        Porkbun Balance: ${(finalResult.balance / 100).toFixed(2)}
                                    </div>
                                )}

                                <div style={S.btnRow}>
                                    <Btn onClick={() => setModal(null)}>Done</Btn>
                                </div>
                            </Card>
                        </div>
                    );

                    return null;
                };
                return <RegisterDomainWizard />;
            })()}
        </>;
    };

    /* ═════════════════════════════════════════════════════════════════
       REGISTRAR ACCOUNTS TAB COMPONENT
       ═════════════════════════════════════════════════════════════════ */
    const RegistrarAccountsTab = ({ data, add, del, modal, setModal, flash }) => {
        const [testing, setTesting] = useState(null);
        const [testResult, setTestResult] = useState({});
        const [importLoading, setImportLoading] = useState(null);
        const [importedDomains, setImportedDomains] = useState([]);

        const handleTest = async (acct) => {
            setTesting(acct.id);
            const creds = registrar.resolveRegistrarCreds(acct.id, data.registrarAccounts || []);
            if (!creds) {
                setTestResult(p => ({ ...p, [acct.id]: { success: false, detail: "Missing credentials" } }));
                setTesting(null);
                return;
            }
            const adapter = registrar.getAdapter(creds.provider);
            if (!adapter) {
                setTestResult(p => ({ ...p, [acct.id]: { success: false, detail: `No adapter for ${creds.provider}` } }));
                setTesting(null);
                return;
            }
            const res = await adapter.ping(creds);
            setTestResult(p => ({ ...p, [acct.id]: { success: res.success, detail: res.success ? (res.ip ? `OK — IP: ${res.ip}` : "Connected") : res.error } }));
            setTesting(null);
        };

        const handleImportDomains = async (acct) => {
            const creds = registrar.resolveRegistrarCreds(acct.id, data.registrarAccounts || []);
            if (!creds) { flash("Missing credentials", "error"); return; }
            const adapter = registrar.getAdapter(creds.provider);
            if (!adapter?.listDomains) { flash("Provider doesn't support domain listing", "error"); return; }
            setImportLoading(acct.id);
            const res = await adapter.listDomains(creds);
            if (res.success) {
                setImportedDomains(res.domains);
                flash(`Found ${res.domains.length} domains`);
            } else {
                flash(`Import failed: ${res.error}`, "error");
            }
            setImportLoading(null);
        };

        return <>
            <Btn onClick={() => setModal("registrar")} style={{ marginBottom: 12 }}>+ Add Registrar Account</Btn>

            {/* Provider info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, marginBottom: 16 }}>
                {REGISTRAR_PROVIDERS.map(p => (
                    <Card key={p.id} style={{ padding: 12, opacity: p.hasApi ? 1 : 0.5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 16 }}>{p.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</span>
                            {p.hasApi && <Badge color={T.success}>API</Badge>}
                        </div>
                        <div style={{ fontSize: 10, color: T.muted }}>{p.pricingNote}</div>
                        <div style={{ fontSize: 9, color: T.dim, marginTop: 2 }}>{p.apiType}</div>
                    </Card>
                ))}
            </div>

            {/* Account List */}
            <div style={{ marginTop: 12 }}>
                {!data.registrarAccounts || data.registrarAccounts.length === 0
                    ? <div style={S.emptyState}>No registrar accounts yet. Add a Porkbun or Cloudflare Registrar account to enable automated domain registration.</div>
                    : <>
                        <div style={{ display: "flex", padding: "6px 12px", fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            <div style={{ flex: 0.5 }}>Provider</div>
                            <div style={{ flex: 2 }}>Label</div>
                            <div style={{ flex: 1.5 }}>API Key</div>
                            <div style={{ flex: 1 }}>Status</div>
                            <div style={{ flex: 1.5, textAlign: "right" }}>Actions</div>
                        </div>
                        {data.registrarAccounts.map(acct => {
                            const prov = REGISTRAR_PROVIDERS.find(p => p.id === acct.provider);
                            const tr = testResult[acct.id];
                            return (
                                <div key={acct.id} style={S.row}>
                                    <div style={{ flex: 0.5, fontSize: 14 }}>{prov?.icon || "?"}</div>
                                    <div style={{ flex: 2, fontWeight: 600, fontSize: 12 }}>{acct.label || "\u2014"}</div>
                                    <div style={{ flex: 1.5, fontSize: 10, color: T.muted, fontFamily: "monospace" }}>
                                        {acct.apiKey ? (acct.apiKeyHint || `\u2022\u2022\u2022\u2022${acct.apiKey.slice(-4)}`) : "\u2014"}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        {tr ? (
                                            <Dot c={tr.success ? T.success : T.danger} label={tr.detail || (tr.success ? "OK" : "Failed")} />
                                        ) : (
                                            <span style={{ fontSize: 10, color: T.dim }}>\u2014</span>
                                        )}
                                    </div>
                                    <div style={{ flex: 1.5, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                        <button onClick={() => handleTest(acct)} disabled={testing === acct.id}
                                            style={{ ...S.miniBtn, background: `${T.primary}22`, border: "none", borderRadius: 5, color: T.primary, cursor: testing === acct.id ? "wait" : "pointer" }}>
                                            {testing === acct.id ? "..." : "Test"}
                                        </button>
                                        {prov?.features?.includes("listDomains") && (
                                            <button onClick={() => handleImportDomains(acct)} disabled={importLoading === acct.id}
                                                style={{ ...S.miniBtn, background: `${T.success}22`, border: "none", borderRadius: 5, color: T.success, cursor: importLoading === acct.id ? "wait" : "pointer" }}>
                                                {importLoading === acct.id ? "..." : "Import"}
                                            </button>
                                        )}
                                        <button onClick={() => del("registrar-accounts", acct.id)}
                                            style={{ background: `${T.danger}22`, border: "none", borderRadius: 5, padding: "4px 8px", color: T.danger, cursor: "pointer", fontSize: 10 }}>{"\u2715"}</button>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                }
            </div>

            {/* Imported domains panel */}
            {importedDomains.length > 0 && (
                <Card style={{ marginTop: 16, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>Imported Domains ({importedDomains.length})</div>
                        <Btn variant="ghost" onClick={() => setImportedDomains([])} style={{ fontSize: 10 }}>{"\u2715"} Close</Btn>
                    </div>
                    <div style={{ maxHeight: 240, overflowY: "auto" }}>
                        {importedDomains.map((d, i) => (
                            <div key={d.domain || i} style={{ ...S.row, fontSize: 11 }}>
                                <div style={{ flex: 3, fontWeight: 600 }}>{d.domain}</div>
                                <div style={{ flex: 1 }}><Badge color={d.status === "ACTIVE" ? T.success : T.warning}>{d.status}</Badge></div>
                                <div style={{ flex: 1.5, fontSize: 9, color: T.dim }}>Exp: {d.expireDate?.slice(0, 10) || "\u2014"}</div>
                                <div style={{ flex: 1 }}>
                                    {!data.domains.some(dd => dd.domain === d.domain) ? (
                                        <Btn onClick={() => {
                                            add("domains", { id: uid(), domain: d.domain, registrar: "Porkbun", status: d.status?.toLowerCase() === "active" ? "active" : "paused", createdAt: now() });
                                            flash(`Added ${d.domain}`);
                                        }} style={{ ...S.miniBtn, fontSize: 9 }}>+ Add</Btn>
                                    ) : (
                                        <span style={{ fontSize: 9, color: T.success }}>\u2713 Added</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Add Registrar Account Modal */}
            {modal === "registrar" && (() => {
                const RegAddModal = () => {
                    const [provider, setProvider] = useState("porkbun");
                    const [form, setForm] = useState({ label: "", apiKey: "", secretKey: "", apiToken: "", accountId: "" });
                    const prov = REGISTRAR_PROVIDERS.find(p => p.id === provider);
                    const apiProviders = REGISTRAR_PROVIDERS.filter(p => p.hasApi);

                    return (
                        <div style={S.overlay}>
                            <Card style={{ width: 480, padding: 24, animation: "fadeIn .2s" }}>
                                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Registrar Account</h3>

                                <div style={S.fieldWrap}>
                                    <label style={S.label}>Provider</label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {apiProviders.map(p => (
                                            <button key={p.id} onClick={() => { setProvider(p.id); setForm({ label: "", apiKey: "", secretKey: "", apiToken: "", accountId: "" }); }}
                                                style={{
                                                    flex: 1, padding: "10px 8px", borderRadius: 8, cursor: "pointer",
                                                    border: `2px solid ${provider === p.id ? T.primary : T.border}`,
                                                    background: provider === p.id ? `${T.primary}12` : "transparent",
                                                    color: T.text, textAlign: "center",
                                                }}>
                                                <div style={{ fontSize: 20, marginBottom: 4 }}>{p.icon}</div>
                                                <div style={{ fontSize: 11, fontWeight: 600 }}>{p.name}</div>
                                                <div style={{ fontSize: 9, color: T.dim, marginTop: 2 }}>{p.pricingNote}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={S.fieldWrap}>
                                    <label style={S.label}>Label</label>
                                    <Inp value={form.label} onChange={v => setForm({ ...form, label: v })} placeholder={`My ${prov?.name || "Registrar"} Account`} />
                                </div>

                                {/* Dynamic fields based on provider */}
                                {prov?.fields?.map(f => (
                                    <div key={f.key} style={S.fieldWrap}>
                                        <label style={S.label}>{f.label}</label>
                                        <Inp value={form[f.key] || ""} onChange={v => setForm({ ...form, [f.key]: v })}
                                            placeholder={f.placeholder} type={f.type || "text"} />
                                        {f.validate && form[f.key] && (
                                            <div style={{ fontSize: 10, marginTop: 3, color: f.validate.test(form[f.key].trim()) ? T.success : T.danger }}>
                                                {f.validate.test(form[f.key].trim()) ? "\u2713 Valid" : "\u2717 Invalid format"}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {prov && (
                                    <div style={{ fontSize: 10, color: T.dim, marginBottom: 12, padding: "6px 10px", background: `${T.primary}08`, borderRadius: 6 }}>
                                        Docs: <a href={prov.docsUrl} target="_blank" rel="noopener noreferrer" style={{ color: T.primary }}>{prov.docsUrl}</a>
                                    </div>
                                )}

                                <div style={S.btnRow}>
                                    <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                                    <Btn disabled={!form.label || (!form.apiKey && !form.apiToken)}
                                        onClick={() => {
                                            add("registrar-accounts", {
                                                id: uid(), provider, label: form.label,
                                                apiKey: form.apiKey?.trim() || "", secretKey: form.secretKey?.trim() || "",
                                                apiToken: form.apiToken?.trim() || "", accountId: form.accountId?.trim() || "",
                                                status: "active", createdAt: now(),
                                            });
                                            setModal(null);
                                            flash(`${prov?.name || "Registrar"} account added`);
                                        }}>Add Account</Btn>
                                </div>
                            </Card>
                        </div>
                    );
                };
                return <RegAddModal />;
            })()}
        </>;
    };

    /* ═════════════════════════════════════════════════════════════════
       RENDER
       ═════════════════════════════════════════════════════════════════ */
    return (
        <div style={{ animation: "fadeIn .3s ease" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 16px" }}>🏢 Ops Center</h1>

            {/* ─── Tab Bar ────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: "6px 14px", background: tab === t.id ? `${T.primary}18` : "transparent",
                        border: `1px solid ${tab === t.id ? T.primary : T.border}`, borderRadius: 6,
                        color: tab === t.id ? T.text : T.muted, fontSize: 12, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 5,
                    }}>
                        <span style={{ fontSize: 13 }}>{t.icon}</span> {t.label}
                        {t.count !== undefined && <span style={{ fontSize: 10, background: T.card2, padding: "1px 5px", borderRadius: 4 }}>{t.count}</span>}
                    </button>
                ))}
            </div>

            <StatusMsg msg={statusMsg?.msg} type={statusMsg?.type} />

            {/* ═══════════════════════════════════════════════════════════
                TAB: OVERVIEW
                ═══════════════════════════════════════════════════════════ */}
            {tab === "overview" && <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 16 }}>
                    {[
                        { l: "Domains", v: data.domains.length, c: "#60a5fa" },
                        { l: "Ads Accounts", v: data.accounts.length, c: T.success },
                        { l: "Profiles", v: data.profiles.length, c: "#a78bfa" },
                        { l: "Payments", v: lcCards.length, c: T.warning },
                        { l: "Risks", v: risks.length, c: risks.length > 0 ? T.danger : T.success },
                    ].map((m, i) => (
                        <Card key={i} style={{ padding: 14 }}>
                            <div style={{ fontSize: 10, color: T.muted }}>{m.l}</div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: m.c }}>{m.v}</div>
                        </Card>
                    ))}
                </div>

                {/* Risks summary */}
                {risks.length > 0 && <Card style={{ marginBottom: 16, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.danger, marginBottom: 8 }}>⚠ Active Risks</div>
                    {risks.slice(0, 5).map((r, i) => (
                        <div key={i} style={{ padding: "4px 0", fontSize: 12, color: T.muted }}>
                            <span style={{ marginRight: 6 }}>{RISK_ICONS[r.category] || "⚠️"}</span>
                            <Badge color={RISK_COLORS[r.level] || T.warning}>{r.level}</Badge>
                            <span style={{ marginLeft: 8 }}>{r.msg}</span>
                        </div>
                    ))}
                    {risks.length > 5 && <div style={{ fontSize: 11, color: T.dim, marginTop: 6 }}>+{risks.length - 5} more — see Risks tab</div>}
                </Card>}

                {/* Task 11 — New Account (E2E) wizard launch */}
                <Card style={{ padding: 16, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>Quick Actions</div>
                            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Create a full account stack end-to-end</div>
                        </div>
                        <Btn onClick={() => { setWizardStep(0); setWizardData({}); setModal("wizard"); }}>+ New Account (E2E)</Btn>
                    </div>
                </Card>
            </>}

            {/* ═══════════════════════════════════════════════════════════
                TAB: DOMAINS (with Cloudflare Zone + DNS Management)
                ═══════════════════════════════════════════════════════════ */}
            {tab === "domains" && <DomainsTab
                data={data} add={add} del={del} upd={upd} settings={settings}
                modal={modal} setModal={setModal} flash={flash}
            />}

            {/* ═══════════════════════════════════════════════════════════
                TAB: ACCOUNTS (Task 9 + Task 12)
                ═══════════════════════════════════════════════════════════ */}
            {tab === "accounts" && <>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <Btn onClick={() => setModal("account")}>+ Add Account</Btn>
                </div>

                {/* Account rows */}
                <div style={{ marginTop: 12 }}>
                    {data.accounts.length === 0
                        ? <div style={S.emptyState}>No accounts yet</div>
                        : data.accounts.map(acct => {
                            const linkedCard = lcCards.find(c => c.uuid === acct.cardUuid);
                            const linkedProfile = data.profiles.find(p => p.id === acct.profileId);
                            const isSuspending = suspending === acct.id;
                            return (
                                <div key={acct.id} style={{ ...S.row, padding: "10px 14px" }}>
                                    {/* Label */}
                                    <div style={{ flex: 2, fontWeight: 600, fontSize: 12 }}>{acct.label || "\u2014"}</div>
                                    {/* Email */}
                                    <div style={{ flex: 2, fontSize: 11, color: T.muted }}>{acct.email || "\u2014"}</div>
                                    {/* Linked card */}
                                    <div style={{ flex: 1.5, fontSize: 11 }}>
                                        {acct.cardUuid ? (
                                            <span>
                                                💳 ****{acct.cardLast4 || linkedCard?.card_last_4 || "?"}{" "}
                                                <Badge color={
                                                    (acct.cardStatus || linkedCard?.status) === "ACTIVE" ? T.success
                                                        : (acct.cardStatus || linkedCard?.status) === "BLOCKED" ? T.danger : T.warning
                                                }>{acct.cardStatus || linkedCard?.status || "?"}</Badge>
                                            </span>
                                        ) : <span style={{ color: T.dim }}>No card</span>}
                                    </div>
                                    {/* Linked profile */}
                                    <div style={{ flex: 1.5, fontSize: 11, color: T.muted }}>
                                        {linkedProfile ? linkedProfile.name : acct.profileId ? acct.profileId : "\u2014"}
                                    </div>
                                    {/* Monthly spend */}
                                    <div style={{ flex: 1, fontSize: 11, color: T.muted }}>
                                        {acct.monthlySpend ? `$${acct.monthlySpend}` : "\u2014"}
                                    </div>
                                    {/* Status badge + quick change */}
                                    <div style={{ flex: 1 }}>
                                        <select
                                            value={acct.status || "active"}
                                            onChange={e => {
                                                const newStatus = e.target.value;
                                                if (newStatus === "suspended") {
                                                    handleSuspend(acct);
                                                } else {
                                                    upd("accounts", acct.id, { status: newStatus });
                                                }
                                            }}
                                            style={{ ...S.select, padding: 4, fontSize: 10, width: "auto", minWidth: 80 }}
                                        >
                                            <option value="active">Active</option>
                                            <option value="paused">Paused</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                    {/* Actions */}
                                    <div style={{ display: "flex", gap: 4 }}>
                                        <button onClick={() => setModal({ type: "edit-account", account: { ...acct } })} style={{ ...S.miniBtn, background: `${T.primary}22`, border: "none", borderRadius: 5, color: T.primary, cursor: "pointer" }}>Edit</button>
                                        <button onClick={() => handleSuspend(acct)} disabled={isSuspending || acct.status === "suspended"}
                                            style={{ ...S.miniBtn, background: `${T.danger}22`, border: "none", borderRadius: 5, color: T.danger, cursor: isSuspending ? "wait" : "pointer", opacity: acct.status === "suspended" ? 0.4 : 1 }}>
                                            {isSuspending ? "..." : "Suspend"}
                                        </button>
                                        <button onClick={() => del("accounts", acct.id)} style={{ background: `${T.danger}22`, border: "none", borderRadius: 5, padding: "4px 8px", color: T.danger, cursor: "pointer", fontSize: 10 }}>{"\u2715"}</button>
                                    </div>
                                </div>
                            );
                        })}
                </div>

                {/* ─── Add Account Modal (Task 9) ─────────────────────── */}
                {modal === "account" && (() => {
                    const cardOptions = lcCards.map(c => ({
                        id: c.uuid,
                        value: c.uuid,
                        displayLabel: `**** ${c.card_last_4} (${c.brand || "VCC"})`,
                    }));
                    const profileOptions = data.profiles.map(p => ({
                        id: p.id,
                        value: p.id,
                        displayLabel: p.name || p.id,
                    }));
                    return <AddModal title="Add Ads Account" coll="accounts" fields={[
                        { key: "label", label: "Account Name", ph: "Google Ads #1" },
                        { key: "email", label: "Email", ph: "account@domain.com" },
                        { key: "cardUuid", label: "Linked Card", options: cardOptions },
                        { key: "profileId", label: "Linked Profile", options: profileOptions },
                        { key: "budget", label: "Daily Budget ($)", type: "number", ph: "50" },
                    ]} onSubmit={(form) => {
                        const selectedCard = lcCards.find(c => c.uuid === form.cardUuid);
                        add("accounts", {
                            id: uid(),
                            ...form,
                            cardLast4: selectedCard?.card_last_4 || "",
                            cardStatus: selectedCard?.status || "",
                            status: "active",
                            createdAt: now(),
                        });
                    }} />;
                })()}

                {/* ─── Edit Account Modal (Task 9) ────────────────────── */}
                {modal && modal.type === "edit-account" && (() => {
                    const acct = modal.account;
                    const EditAccountModal = () => {
                        const [form, setForm] = useState({
                            label: acct.label || "",
                            email: acct.email || "",
                            cardUuid: acct.cardUuid || "",
                            profileId: acct.profileId || "",
                            budget: acct.budget || "",
                            status: acct.status || "active",
                        });
                        const cardOptions = lcCards.map(c => ({
                            value: c.uuid,
                            displayLabel: `**** ${c.card_last_4} (${c.brand || "VCC"})`,
                        }));
                        const profileOptions = data.profiles.map(p => ({
                            value: p.id,
                            displayLabel: p.name || p.id,
                        }));
                        return (
                            <div style={S.overlay}>
                                <Card style={{ width: 440, padding: 24, animation: "fadeIn .2s" }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Edit Account: {acct.label}</h3>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Account Name</label>
                                        <Inp value={form.label} onChange={v => setForm({ ...form, label: v })} />
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Email</label>
                                        <Inp value={form.email} onChange={v => setForm({ ...form, email: v })} />
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Linked Card</label>
                                        <select value={form.cardUuid} onChange={e => setForm({ ...form, cardUuid: e.target.value })} style={S.select}>
                                            <option value="">None</option>
                                            {cardOptions.map(o => <option key={o.value} value={o.value}>{o.displayLabel}</option>)}
                                        </select>
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Linked Profile</label>
                                        <select value={form.profileId} onChange={e => setForm({ ...form, profileId: e.target.value })} style={S.select}>
                                            <option value="">None</option>
                                            {profileOptions.map(o => <option key={o.value} value={o.value}>{o.displayLabel}</option>)}
                                        </select>
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Daily Budget ($)</label>
                                        <Inp value={form.budget} onChange={v => setForm({ ...form, budget: v })} type="number" />
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Status</label>
                                        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={S.select}>
                                            <option value="active">Active</option>
                                            <option value="paused">Paused</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                    <div style={S.btnRow}>
                                        <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                                        <Btn onClick={() => {
                                            const selectedCard = lcCards.find(c => c.uuid === form.cardUuid);
                                            const updates = {
                                                ...form,
                                                cardLast4: selectedCard?.card_last_4 || "",
                                                cardStatus: selectedCard?.status || "",
                                            };
                                            upd("accounts", acct.id, updates);
                                            setModal(null);
                                            flash("Account updated");
                                        }}>Save Changes</Btn>
                                    </div>
                                </Card>
                            </div>
                        );
                    };
                    return <EditAccountModal />;
                })()}
            </>}

            {/* ═══════════════════════════════════════════════════════════
                TAB: CF ACCOUNTS (Multi-Account with API Token + Account ID)
                ═══════════════════════════════════════════════════════════ */}
            {tab === "cf" && <CfAccountsTab
                data={data} add={add} del={del} upd={upd} settings={settings}
                modal={modal} setModal={setModal} flash={flash}
            />}

            {/* ═══════════════════════════════════════════════════════════
                TAB: REGISTRAR ACCOUNTS
                ═══════════════════════════════════════════════════════════ */}
            {tab === "registrars" && <RegistrarAccountsTab
                data={data} add={add} del={del} settings={settings}
                modal={modal} setModal={setModal} flash={flash}
            />}

            {/* ═══════════════════════════════════════════════════════════
                TAB: PROFILES (Task 8)
                ═══════════════════════════════════════════════════════════ */}
            {tab === "profiles" && <>
                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                    <Btn onClick={() => setModal("mlx-create")}>+ Create Profile</Btn>
                    <Btn variant="ghost" onClick={async () => {
                        setSyncing(true);
                        try {
                            const res = await multiloginApi.syncProfiles();
                            if (res.error) { flash(`Sync failed: ${res.error}`, "error"); }
                            else { flash(`Synced: ${res.created || 0} created, ${res.deleted || 0} removed`); }
                            await refreshProfiles();
                        } catch (e) { flash(`Sync failed: ${e.message}`, "error"); }
                        finally { setSyncing(false); }
                    }}>{syncing ? "Syncing..." : "\uD83D\uDD04 Sync from MLX"}</Btn>
                    <Btn variant="ghost" onClick={() => {
                        setMlLoading(true);
                        refreshProfiles().finally(() => setMlLoading(false));
                    }} style={{ fontSize: 11 }}>↻ Refresh</Btn>
                    <Btn variant="danger" onClick={async () => {
                        if (!confirm("Stop all running profiles?")) return;
                        const running = mlProfiles.filter(p => p.status === "running" || p.status === "started");
                        for (const p of running) {
                            const pid = p.uuid || p.id;
                            await multiloginApi.stopProfile(pid).catch(() => { });
                        }
                        await refreshProfiles();
                        flash(`Stopped ${running.length} profiles`);
                    }} style={{ fontSize: 11, marginLeft: "auto" }}>⏹ Stop All</Btn>
                </div>

                {/* Unified profile list */}
                {mlLoading ? <div style={S.emptyState}>Loading profiles...</div> : (
                    <div>
                        {/* Header row */}
                        <div style={{ display: "flex", padding: "6px 12px", fontSize: 10, fontWeight: 700, color: T.dim, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            <div style={{ flex: 2 }}>Name</div>
                            <div style={{ flex: 1.2 }}>MLX ID</div>
                            <div style={{ flex: 0.8 }}>Browser</div>
                            <div style={{ flex: 0.8 }}>OS</div>
                            <div style={{ flex: 1.5 }}>Proxy</div>
                            <div style={{ flex: 0.8 }}>Status</div>
                            <div style={{ flex: 1.5, textAlign: "right" }}>Actions</div>
                        </div>

                        {mlProfiles.length === 0
                            ? <div style={S.emptyState}>No profiles found. Click "Sync from MLX" or create a new profile.</div>
                            : mlProfiles.map(p => {
                                const pid = p.uuid || p.id;
                                const isRunning = p.status === "running" || p.status === "started";
                                const proxyObj = p.parameters?.proxy || (typeof p.proxy === "object" ? p.proxy : null);
                                const proxyInfo = proxyObj?.host
                                    ? `${proxyObj.host}:${proxyObj.port || ""}`
                                    : (typeof p.proxy === "string" ? p.proxy : null) || "\u2014";
                                // Find linked D1 profile
                                const d1Profile = data.profiles.find(dp => dp.mlProfileId === pid);
                                return (
                                    <div key={pid} style={{ ...S.row, padding: "10px 12px" }}>
                                        <div style={{ flex: 2, fontWeight: 600, fontSize: 12 }}>
                                            {p.name || pid.slice(0, 12)}
                                            {d1Profile?.accountId && <span style={{ marginLeft: 6, fontSize: 9, color: T.dim, background: T.card2, padding: "1px 5px", borderRadius: 3 }}>A:{d1Profile.accountId.slice(0, 6)}</span>}
                                        </div>
                                        <div style={{ flex: 1.2, fontSize: 10, color: T.muted, fontFamily: "monospace" }}>
                                            {pid.slice(0, 10)}...
                                        </div>
                                        <div style={{ flex: 0.8, fontSize: 11, color: T.muted }}>
                                            {p.browser_type || d1Profile?.browserType || "\u2014"}
                                        </div>
                                        <div style={{ flex: 0.8, fontSize: 11, color: T.muted }}>
                                            {p.os_type || d1Profile?.os || "\u2014"}
                                        </div>
                                        <div style={{ flex: 1.5, fontSize: 10, color: T.muted, fontFamily: "monospace" }}>
                                            {proxyInfo}
                                        </div>
                                        <div style={{ flex: 0.8 }}>
                                            <Dot c={isRunning ? T.success : "#666"} label={isRunning ? "Running" : "Stopped"} />
                                        </div>
                                        <div style={{ flex: 1.5, display: "flex", gap: 3, justifyContent: "flex-end" }}>
                                            {isRunning ? (
                                                <Btn variant="danger" onClick={() => {
                                                    multiloginApi.stopProfile(pid).then(() => {
                                                        refreshProfiles();
                                                        flash("Profile stopped");
                                                    }).catch(e => flash(`Stop failed: ${e.message}`, "error"));
                                                }} style={S.miniBtn}>Stop</Btn>
                                            ) : (
                                                <Btn variant="success" onClick={() => {
                                                    const fid = p.folder_id || settings.mlFolderId || "";
                                                    multiloginApi.startProfile(pid, fid).then((res) => {
                                                        if (res?.error) { flash(`Start failed: ${res.error}`, "error"); return; }
                                                        refreshProfiles();
                                                        flash("Profile started");
                                                    }).catch(e => flash(`Start failed: ${e.message}`, "error"));
                                                }} style={S.miniBtn}>Start</Btn>
                                            )}
                                            <Btn variant="ghost" onClick={() => {
                                                multiloginApi.cloneProfile(pid).then(() => {
                                                    refreshProfiles();
                                                    flash("Profile cloned");
                                                }).catch(e => flash(`Clone failed: ${e.message}`, "error"));
                                            }} style={S.miniBtn}>Clone</Btn>
                                            <Btn variant="ghost" onClick={() => {
                                                if (!confirm(`Delete profile "${p.name || pid}"?`)) return;
                                                const folderId = p.folder_id || settings.mlFolderId || "";
                                                multiloginApi.deleteProfiles([pid], folderId).then(() => {
                                                    refreshProfiles();
                                                    flash("Profile deleted");
                                                }).catch(e => flash(`Delete failed: ${e.message}`, "error"));
                                            }} style={{ ...S.miniBtn, color: T.danger }}>Del</Btn>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}

                {/* D1 profiles (unlinked) */}
                {data.profiles.filter(p => !mlProfiles.some(mp => (mp.uuid || mp.id) === p.mlProfileId)).length > 0 && <>
                    <div style={{ ...S.sectionTitle, marginTop: 24, fontSize: 11, color: T.dim }}>Local Only (not linked to MLX)</div>
                    <ListTable items={data.profiles.filter(p => !mlProfiles.some(mp => (mp.uuid || mp.id) === p.mlProfileId))} coll="profiles" cols={[
                        { key: "name", flex: 2 },
                        { key: "proxyIp", render: i => i.proxyIp || i.proxyHost || "\u2014" },
                        { key: "browserType" },
                        { key: "mlProfileId", render: i => i.mlProfileId ? <Badge color={T.primary}>ML: {i.mlProfileId.slice(0, 8)}...</Badge> : <span style={{ color: T.dim }}>Not linked</span> },
                    ]} />
                </>}

                {/* Enhanced Create Profile Modal */}
                {modal === "mlx-create" && (() => {
                    const MLXCreateModal = () => {
                        const [form, setForm] = useState({
                            name: "",
                            browser_type: "mimic",
                            os_type: "windows",
                            proxy_host: "",
                            proxy_port: "",
                            proxy_user: "",
                            proxy_pass: "",
                            proxy_type: "http",
                            start_urls: "",
                            accountId: "",
                        });
                        const [creating, setCreating] = useState(false);
                        return (
                            <div style={S.overlay}>
                                <Card style={{ width: 520, padding: 24, animation: "fadeIn .2s", maxHeight: "85vh", overflowY: "auto" }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Create MLX Profile</h3>

                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Profile Name</label>
                                        <Inp value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Account-01" />
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Browser Type</label>
                                            <select value={form.browser_type} onChange={e => setForm({ ...form, browser_type: e.target.value })} style={S.select}>
                                                <option value="mimic">Mimic</option>
                                                <option value="stealthfox">Stealthfox</option>
                                            </select>
                                        </div>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>OS Type</label>
                                            <select value={form.os_type} onChange={e => setForm({ ...form, os_type: e.target.value })} style={S.select}>
                                                <option value="windows">Windows</option>
                                                <option value="macos">macOS</option>
                                                <option value="linux">Linux</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ ...S.sectionTitle, marginTop: 12, fontSize: 11 }}>Proxy Settings</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Host</label>
                                            <Inp value={form.proxy_host} onChange={v => setForm({ ...form, proxy_host: v })} placeholder="proxy.example.com" />
                                        </div>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Port</label>
                                            <Inp value={form.proxy_port} onChange={v => setForm({ ...form, proxy_port: v })} placeholder="8080" />
                                        </div>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Type</label>
                                            <select value={form.proxy_type} onChange={e => setForm({ ...form, proxy_type: e.target.value })} style={S.select}>
                                                <option value="http">HTTP</option>
                                                <option value="socks5">SOCKS5</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Proxy Username</label>
                                            <Inp value={form.proxy_user} onChange={v => setForm({ ...form, proxy_user: v })} placeholder="user" />
                                        </div>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Proxy Password</label>
                                            <Inp value={form.proxy_pass} onChange={v => setForm({ ...form, proxy_pass: v })} type="password" placeholder="pass" />
                                        </div>
                                    </div>

                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Custom Start URLs (one per line)</label>
                                        <textarea value={form.start_urls} onChange={e => setForm({ ...form, start_urls: e.target.value })} placeholder={"https://ads.google.com\nhttps://business.facebook.com"} rows={3}
                                            style={{ ...S.select, resize: "vertical", minHeight: 60 }} />
                                    </div>

                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Link to Account (optional)</label>
                                        <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} style={S.select}>
                                            <option value="">None</option>
                                            {data.accounts.map(a => <option key={a.id} value={a.id}>{a.label || a.email || a.id}</option>)}
                                        </select>
                                    </div>

                                    <div style={S.btnRow}>
                                        <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                                        <Btn disabled={creating} onClick={async () => {
                                            setCreating(true);
                                            try {
                                                const folderId = settings.mlFolderId || "";
                                                const profileData = {
                                                    browser_type: form.browser_type,
                                                    folder_id: folderId,
                                                    name: form.name || `Profile-${uid().slice(0, 6)}`,
                                                    os_type: form.os_type,
                                                    parameters: {
                                                        proxy: form.proxy_host ? {
                                                            host: form.proxy_host,
                                                            type: form.proxy_type,
                                                            port: parseInt(form.proxy_port) || 8080,
                                                            username: form.proxy_user,
                                                            password: form.proxy_pass,
                                                        } : undefined,
                                                        flags: {
                                                            navigator_masking: "mask",
                                                            audio_masking: "mask",
                                                            localization_masking: "mask",
                                                            geolocation_popup: "prompt",
                                                            geolocation_masking: "mask",
                                                            timezone_masking: "mask",
                                                            canvas_noise: "natural",
                                                            graphics_noise: "natural",
                                                            graphics_masking: "mask",
                                                            webrtc_masking: "natural",
                                                            fonts_masking: "mask",
                                                            media_devices_masking: "mask",
                                                            screen_masking: "mask",
                                                            ports_masking: "mask",
                                                        },
                                                        custom_start_urls: form.start_urls ? form.start_urls.split("\n").map(u => u.trim()).filter(Boolean) : undefined,
                                                    },
                                                };
                                                const res = await multiloginApi.createProfile(profileData);
                                                if (res.error) throw new Error(res.error);
                                                await refreshProfiles();
                                                setModal(null);
                                                flash("Profile created in MLX + D1");
                                            } catch (e) {
                                                flash(`Create failed: ${e.message || e.detail || "Unknown error"}`, "error");
                                            } finally {
                                                setCreating(false);
                                            }
                                        }}>{creating ? "Creating..." : "Create Profile"}</Btn>
                                    </div>
                                </Card>
                            </div>
                        );
                    };
                    return <MLXCreateModal />;
                })()}
            </>}

            {/* ═══════════════════════════════════════════════════════════
                TAB: PAYMENTS (Task 7)
                ═══════════════════════════════════════════════════════════ */}
            {tab === "payments" && <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Btn onClick={() => setModal("lc-card")}>+ Create Card</Btn>
                        <Btn variant="ghost" onClick={() => {
                            setLcLoading(true);
                            refreshCards().finally(() => setLcLoading(false));
                        }} style={{ fontSize: 11 }}>🔄 Refresh</Btn>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>LeadingCards Management</div>
                </div>

                {/* Filter bar (Task 7) */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                    {[
                        { label: "All", value: "" },
                        { label: "Active", value: "ACTIVE" },
                        { label: "Blocked", value: "BLOCKED" },
                    ].map(f => (
                        <button key={f.value} onClick={() => setLcFilter(f.value)} style={S.filterBtn(lcFilter === f.value)}>
                            {f.label} {f.value === "" ? `(${lcCards.length})` : `(${lcCards.filter(c => c.status === f.value).length})`}
                        </button>
                    ))}
                </div>

                {/* Card list */}
                {lcLoading ? <div style={S.emptyState}>Loading cards...</div> : (
                    <div style={{ marginTop: 8 }}>
                        {filteredCards.length === 0
                            ? <div style={S.emptyState}>{lcFilter ? `No ${lcFilter} cards` : "No cards yet"}</div>
                            : filteredCards.map(card => (
                                <div key={card.uuid} style={S.row}>
                                    {/* Card info */}
                                    <div style={{ flex: 2, fontWeight: 600, fontSize: 12 }}>
                                        💳 **** {card.card_last_4} <span style={{ fontWeight: 400, color: T.muted }}>({card.brand || "VCC"})</span>
                                    </div>
                                    {/* Limit */}
                                    <div style={{ flex: 1.2, fontSize: 11 }}>
                                        {changingLimit && changingLimit.uuid === card.uuid ? (
                                            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                                                <Inp value={changingLimit.value} onChange={v => setChangingLimit({ ...changingLimit, value: v })} type="number"
                                                    style={{ width: 70, padding: "3px 6px", fontSize: 11 }} />
                                                <button onClick={async () => {
                                                    try {
                                                        await leadingCardsApi.changeLimit(card.uuid, parseFloat(changingLimit.value));
                                                        await refreshCards();
                                                        flash("Limit updated");
                                                    } catch (e) { flash(`Failed: ${e.message}`, "error"); }
                                                    setChangingLimit(null);
                                                }} style={{ background: T.success, border: "none", color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: 10, cursor: "pointer" }}>OK</button>
                                                <button onClick={() => setChangingLimit(null)} style={{ background: "transparent", border: "none", color: T.dim, cursor: "pointer", fontSize: 10 }}>X</button>
                                            </div>
                                        ) : (
                                            <span style={{ cursor: "pointer" }} onClick={() => setChangingLimit({ uuid: card.uuid, value: card.limit || "" })}>
                                                ${card.limit} {card.currency}
                                            </span>
                                        )}
                                    </div>
                                    {/* Status */}
                                    <div style={{ flex: 0.8 }}>
                                        <Badge color={card.status === "ACTIVE" ? T.success : card.status === "BLOCKED" ? T.danger : T.warning}>{card.status}</Badge>
                                    </div>
                                    {/* Actions */}
                                    <div style={{ display: "flex", gap: 4 }}>
                                        {card.status === "ACTIVE" ? (
                                            <Btn variant="ghost" onClick={() => {
                                                if (confirm("Block this card?")) {
                                                    leadingCardsApi.blockCard(card.uuid)
                                                        .then(() => { refreshCards(); flash("Card blocked"); })
                                                        .catch(e => flash(`Block failed: ${e.message}`, "error"));
                                                }
                                            }} style={{ ...S.miniBtn, color: T.danger }}>Block</Btn>
                                        ) : (
                                            <Btn variant="ghost" onClick={() => {
                                                leadingCardsApi.activateCard(card.uuid)
                                                    .then(() => { refreshCards(); flash("Card activated"); })
                                                    .catch(e => flash(`Activate failed: ${e.message}`, "error"));
                                            }} style={{ ...S.miniBtn, color: T.success }}>Activate</Btn>
                                        )}
                                        <Btn variant="ghost" onClick={() => setChangingLimit({ uuid: card.uuid, value: card.limit || "" })}
                                            style={{ ...S.miniBtn, color: T.primary }}>Limit</Btn>
                                        <Btn variant="ghost" onClick={() => {
                                            setLcLoading(true);
                                            refreshCards().finally(() => setLcLoading(false));
                                        }} style={{ ...S.miniBtn, color: T.muted }}>↻</Btn>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                {/* Transactions sub-section (Task 7) */}
                <div style={{ marginTop: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={S.sectionTitle}>Recent Transactions</div>
                        <Btn variant="ghost" onClick={() => {
                            const fromDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
                            leadingCardsApi.getTransactions(fromDate)
                                .then(res => {
                                    const txns = Array.isArray(res?.results) ? res.results : Array.isArray(res) ? res : [];
                                    setLcTransactions(txns);
                                    flash(`Loaded ${txns.length} transactions`);
                                })
                                .catch(e => flash(`Failed: ${e.message}`, "error"));
                        }} style={{ fontSize: 11 }}>Load Transactions</Btn>
                    </div>
                    {lcTransactions.length === 0
                        ? <div style={{ ...S.emptyState, fontSize: 11 }}>Click "Load Transactions" to fetch recent activity</div>
                        : (
                            <div>
                                {lcTransactions.slice(0, 50).map((tx, i) => (
                                    <div key={tx.uuid || i} style={{ ...S.row, fontSize: 11 }}>
                                        <div style={{ flex: 1.5, fontWeight: 600 }}>****{tx.card_last_4 || "\u2014"}</div>
                                        <div style={{ flex: 2, color: T.muted }}>{tx.merchant_name || tx.description || "\u2014"}</div>
                                        <div style={{ flex: 1, color: tx.type === "decline" ? T.danger : T.success, fontWeight: 600 }}>
                                            {tx.type === "decline" ? "DECLINED" : `$${tx.amount || 0}`}
                                        </div>
                                        <div style={{ flex: 1, color: T.dim }}>{tx.currency || ""}</div>
                                        <div style={{ flex: 1.5, color: T.dim }}>{tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "\u2014"}</div>
                                    </div>
                                ))}
                                {lcTransactions.length > 50 && <div style={{ textAlign: "center", fontSize: 11, color: T.dim, padding: 8 }}>Showing 50 of {lcTransactions.length}</div>}
                            </div>
                        )}
                </div>

                {/* Create Card modal (Task 7 — cleaned up, no settings params) */}
                {modal === "lc-card" && (() => {
                    const CreateCardModal = () => {
                        const [form, setForm] = useState({ bin_uuid: "", limit: "10", billing_address_uuid: "", comment: "" });
                        const [creating, setCreating] = useState(false);
                        return (
                            <div style={S.overlay}>
                                <Card style={{ width: 450, padding: 24, animation: "fadeIn .2s" }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Create New Card</h3>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                                        <div>
                                            <label style={S.label}>Select BIN</label>
                                            <select value={form.bin_uuid} onChange={e => setForm({ ...form, bin_uuid: e.target.value })} style={S.select}>
                                                <option value="">Select BIN...</option>
                                                {lcBins.map(b => <option key={b.uuid} value={b.uuid}>{b.brand} - {b.card_type} ({b.country})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={S.label}>Limit ($)</label>
                                            <Inp value={form.limit} onChange={v => setForm({ ...form, limit: v })} type="number" placeholder="10" />
                                        </div>
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Billing Address</label>
                                        <select value={form.billing_address_uuid} onChange={e => setForm({ ...form, billing_address_uuid: e.target.value })} style={S.select}>
                                            <option value="">Select Address...</option>
                                            {lcAddresses.map(a => <option key={a.uuid} value={a.uuid}>{a.first_name} {a.last_name} - {a.address}, {a.city}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ marginBottom: 20 }}>
                                        <label style={S.label}>Comment (Auto-tagging)</label>
                                        <Inp value={form.comment} onChange={v => setForm({ ...form, comment: v })} placeholder="google-ads-account-X" />
                                    </div>
                                    <div style={S.btnRow}>
                                        <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
                                        <Btn disabled={creating} onClick={async () => {
                                            setCreating(true);
                                            try {
                                                await leadingCardsApi.createCard({
                                                    bin_uuid: form.bin_uuid,
                                                    limit: parseFloat(form.limit) || 10,
                                                    comment: form.comment,
                                                    billing_address_uuid: form.billing_address_uuid,
                                                    amount: 1,
                                                });
                                                await refreshCards();
                                                setModal(null);
                                                flash("Card created");
                                            } catch (e) {
                                                flash(`Create failed: ${e.message}`, "error");
                                            } finally {
                                                setCreating(false);
                                            }
                                        }}>{creating ? "Creating..." : "Create Card"}</Btn>
                                    </div>
                                </Card>
                            </div>
                        );
                    };
                    return <CreateCardModal />;
                })()}
            </>}

            {/* ═══════════════════════════════════════════════════════════
                TAB: RISKS
                ═══════════════════════════════════════════════════════════ */}
            {tab === "risks" && (
                risks.length === 0
                    ? <Card style={{ textAlign: "center", padding: 40 }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>No risks detected</div>
                    </Card>
                    : risks.map((r, i) => (
                        <Card key={i} style={{ padding: "12px 16px", marginBottom: 6, borderColor: RISK_COLORS[r.level] ? `${RISK_COLORS[r.level]}44` : T.border }}>
                            <span style={{ marginRight: 6 }}>{RISK_ICONS[r.category] || "⚠️"}</span>
                            <Badge color={RISK_COLORS[r.level] || T.warning}>{r.level}</Badge>
                            <span style={{ marginLeft: 10, fontSize: 13 }}>{r.msg}</span>
                            {r.affectedIds && <span style={{ marginLeft: 8, fontSize: 10, color: T.dim }}>({r.affectedIds.length} affected)</span>}
                        </Card>
                    ))
            )}

            {/* ═══════════════════════════════════════════════════════════
                TAB: LOGS
                ═══════════════════════════════════════════════════════════ */}
            {tab === "logs" && (
                data.logs.length === 0
                    ? <Card style={{ textAlign: "center", padding: 40, color: T.dim }}>No activity yet</Card>
                    : <Card style={{ padding: 12 }}>
                        {data.logs.slice(0, 50).map(log => (
                            <div key={log.id} style={{ padding: "5px 8px", borderBottom: `1px solid ${T.border}`, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: T.muted }}>{log.msg}</span>
                                <span style={{ color: T.dim, fontSize: 10 }}>{new Date(log.ts).toLocaleString()}</span>
                            </div>
                        ))}
                    </Card>
            )}

            {/* ═══════════════════════════════════════════════════════════
                MODAL: ACCOUNT CREATION WIZARD (Task 11)
                ═══════════════════════════════════════════════════════════ */}
            {modal === "wizard" && (() => {
                const WizardModal = () => {
                    const [step, setStep] = useState(wizardStep);
                    const [wd, setWd] = useState(wizardData);
                    const [busy, setBusy] = useState(false);
                    const [wizError, setWizError] = useState(null);
                    const [wizSuccess, setWizSuccess] = useState(false);

                    const steps = [
                        { label: "1. Create Card", icon: "💳" },
                        { label: "2. Create Profile", icon: "👤" },
                        { label: "3. Account Details", icon: "💰" },
                        { label: "4. Review & Create", icon: "🚀" },
                    ];

                    const handleFinish = async () => {
                        setBusy(true);
                        setWizError(null);
                        try {
                            // Step 1: Create card
                            let cardRes = null;
                            if (wd.bin_uuid) {
                                cardRes = await leadingCardsApi.createCard({
                                    bin_uuid: wd.bin_uuid,
                                    limit: parseFloat(wd.card_limit) || 10,
                                    comment: wd.card_comment || "",
                                    billing_address_uuid: wd.billing_address_uuid || "",
                                    amount: 1,
                                });
                            }

                            // Step 2: Create profile
                            let profileRes = null;
                            if (wd.profile_browser) {
                                const profileData = {
                                    browser_type: wd.profile_browser,
                                    os_type: wd.profile_os || "windows",
                                    parameters: {
                                        proxy: wd.proxy_host ? {
                                            host: wd.proxy_host,
                                            port: parseInt(wd.proxy_port) || 8080,
                                            username: wd.proxy_user || "",
                                            password: wd.proxy_pass || "",
                                            type: "http",
                                        } : undefined,
                                    },
                                };
                                profileRes = await multiloginApi.createProfile(profileData);
                            }

                            // Step 3: Save account to D1
                            const newCardUuid = cardRes?.uuid || cardRes?.results?.[0]?.uuid || "";
                            const newProfileId = profileRes?.uuid || profileRes?.id || "";
                            const refreshedCards = await leadingCardsApi.getCards();
                            setLcCards(refreshedCards.results || []);
                            const newCard = (refreshedCards.results || []).find(c => c.uuid === newCardUuid);

                            const localProfileId = uid();
                            // Save local profile entry
                            if (newProfileId) {
                                add("profiles", {
                                    id: localProfileId,
                                    name: wd.acct_label ? `Profile - ${wd.acct_label}` : `Profile ${localProfileId}`,
                                    proxyIp: wd.proxy_host || "",
                                    browserType: wd.profile_browser || "mimic",
                                    mlProfileId: newProfileId,
                                    status: "active",
                                    createdAt: now(),
                                });
                            }

                            // Save account entry
                            add("accounts", {
                                id: uid(),
                                label: wd.acct_label || "New Account",
                                email: wd.acct_email || "",
                                budget: wd.acct_budget || "",
                                cardUuid: newCardUuid,
                                cardLast4: newCard?.card_last_4 || "",
                                cardStatus: newCard?.status || "",
                                profileId: newProfileId ? localProfileId : "",
                                status: "active",
                                createdAt: now(),
                            });

                            await refreshProfiles();
                            setWizSuccess(true);
                            flash("Account stack created end-to-end!");
                        } catch (e) {
                            setWizError(e.message || "Unknown error");
                        } finally {
                            setBusy(false);
                        }
                    };

                    if (wizSuccess) {
                        return (
                            <div style={S.overlay}>
                                <Card style={{ width: 460, padding: 32, textAlign: "center", animation: "fadeIn .2s" }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Account Stack Created!</h3>
                                    <p style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Card, profile, and account have been created and linked.</p>
                                    <Btn onClick={() => { setModal(null); setWizardStep(0); setWizardData({}); }}>Close</Btn>
                                </Card>
                            </div>
                        );
                    }

                    return (
                        <div style={S.overlay}>
                            <Card style={{ width: 560, padding: 24, animation: "fadeIn .2s" }}>
                                {/* Stepper */}
                                <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
                                    {steps.map((s, i) => (
                                        <div key={i} style={{
                                            flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                            background: i === step ? `${T.primary}22` : "transparent",
                                            color: i === step ? T.text : i < step ? T.success : T.dim,
                                            border: `1px solid ${i === step ? T.primary : "transparent"}`,
                                        }}>
                                            <span style={{ marginRight: 4 }}>{s.icon}</span>{s.label}
                                        </div>
                                    ))}
                                </div>

                                {wizError && <div style={{ padding: 8, marginBottom: 12, borderRadius: 6, background: `${T.danger}12`, border: `1px solid ${T.danger}44`, color: T.danger, fontSize: 12 }}>{wizError}</div>}

                                {/* Step 0: Create Card */}
                                {step === 0 && <>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Step 1: Create Card</h3>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Select BIN</label>
                                        <select value={wd.bin_uuid || ""} onChange={e => setWd({ ...wd, bin_uuid: e.target.value })} style={S.select}>
                                            <option value="">Select BIN...</option>
                                            {lcBins.map(b => <option key={b.uuid} value={b.uuid}>{b.brand} - {b.card_type} ({b.country})</option>)}
                                        </select>
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Billing Address</label>
                                        <select value={wd.billing_address_uuid || ""} onChange={e => setWd({ ...wd, billing_address_uuid: e.target.value })} style={S.select}>
                                            <option value="">Select Address...</option>
                                            {lcAddresses.map(a => <option key={a.uuid} value={a.uuid}>{a.first_name} {a.last_name} - {a.address}, {a.city}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Card Limit ($)</label>
                                            <Inp value={wd.card_limit || ""} onChange={v => setWd({ ...wd, card_limit: v })} type="number" placeholder="10" />
                                        </div>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Comment</label>
                                            <Inp value={wd.card_comment || ""} onChange={v => setWd({ ...wd, card_comment: v })} placeholder="auto-tag" />
                                        </div>
                                    </div>
                                </>}

                                {/* Step 1: Create Profile */}
                                {step === 1 && <>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Step 2: Create Profile</h3>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Browser Type</label>
                                            <select value={wd.profile_browser || "mimic"} onChange={e => setWd({ ...wd, profile_browser: e.target.value })} style={S.select}>
                                                <option value="mimic">Mimic</option>
                                                <option value="stealthfox">Stealthfox</option>
                                            </select>
                                        </div>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>OS Type</label>
                                            <select value={wd.profile_os || "windows"} onChange={e => setWd({ ...wd, profile_os: e.target.value })} style={S.select}>
                                                <option value="windows">Windows</option>
                                                <option value="macos">macOS</option>
                                                <option value="linux">Linux</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ ...S.sectionTitle, marginTop: 8, fontSize: 11 }}>Proxy</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Host</label>
                                            <Inp value={wd.proxy_host || ""} onChange={v => setWd({ ...wd, proxy_host: v })} placeholder="proxy.example.com" />
                                        </div>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Port</label>
                                            <Inp value={wd.proxy_port || ""} onChange={v => setWd({ ...wd, proxy_port: v })} placeholder="8080" />
                                        </div>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Username</label>
                                            <Inp value={wd.proxy_user || ""} onChange={v => setWd({ ...wd, proxy_user: v })} />
                                        </div>
                                        <div style={S.fieldWrap}>
                                            <label style={S.label}>Password</label>
                                            <Inp value={wd.proxy_pass || ""} onChange={v => setWd({ ...wd, proxy_pass: v })} type="password" />
                                        </div>
                                    </div>
                                </>}

                                {/* Step 2: Account Details */}
                                {step === 2 && <>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Step 3: Account Details</h3>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Account Label</label>
                                        <Inp value={wd.acct_label || ""} onChange={v => setWd({ ...wd, acct_label: v })} placeholder="Google Ads - US Market 1" />
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Email</label>
                                        <Inp value={wd.acct_email || ""} onChange={v => setWd({ ...wd, acct_email: v })} placeholder="account@domain.com" />
                                    </div>
                                    <div style={S.fieldWrap}>
                                        <label style={S.label}>Daily Budget ($)</label>
                                        <Inp value={wd.acct_budget || ""} onChange={v => setWd({ ...wd, acct_budget: v })} type="number" placeholder="50" />
                                    </div>
                                </>}

                                {/* Step 3: Review & Create */}
                                {step === 3 && <>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Step 4: Review & Create</h3>
                                    <Card style={{ padding: 14, marginBottom: 12, background: T.card2 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Summary</div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                                            <div>
                                                <div style={{ color: T.dim, fontSize: 10 }}>Card</div>
                                                <div>{wd.bin_uuid ? `BIN: ${lcBins.find(b => b.uuid === wd.bin_uuid)?.brand || wd.bin_uuid.slice(0, 8)}, Limit: $${wd.card_limit || 10}` : "No card"}</div>
                                            </div>
                                            <div>
                                                <div style={{ color: T.dim, fontSize: 10 }}>Profile</div>
                                                <div>{wd.profile_browser || "mimic"} / {wd.profile_os || "windows"}{wd.proxy_host ? ` via ${wd.proxy_host}` : ""}</div>
                                            </div>
                                            <div>
                                                <div style={{ color: T.dim, fontSize: 10 }}>Account</div>
                                                <div>{wd.acct_label || "Unnamed"}</div>
                                            </div>
                                            <div>
                                                <div style={{ color: T.dim, fontSize: 10 }}>Budget</div>
                                                <div>${wd.acct_budget || "0"}/day</div>
                                            </div>
                                        </div>
                                    </Card>
                                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 12 }}>
                                        This will create a new LeadingCards card, a new Multilogin profile, and save the linked account to the database.
                                    </div>
                                </>}

                                {/* Navigation */}
                                <div style={{ ...S.btnRow, marginTop: 20 }}>
                                    <Btn variant="ghost" onClick={() => { setModal(null); setWizardStep(0); setWizardData({}); }}>Cancel</Btn>
                                    {step > 0 && <Btn variant="ghost" onClick={() => setStep(step - 1)}>Back</Btn>}
                                    {step < 3 ? (
                                        <Btn onClick={() => { setWd({ ...wd }); setStep(step + 1); }}>Next</Btn>
                                    ) : (
                                        <Btn disabled={busy} onClick={handleFinish}>
                                            {busy ? "Creating..." : "Create Everything"}
                                        </Btn>
                                    )}
                                </div>
                            </Card>
                        </div>
                    );
                };
                return <WizardModal />;
            })()}
        </div>
    );
}
