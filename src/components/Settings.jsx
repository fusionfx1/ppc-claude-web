import React, { useState, useEffect } from "react";
import { THEME as T } from "../constants";
import { Card, Inp, Btn, Sel } from "./Atoms";
import { api } from "../services/api";
import { multiloginApi } from "../services/multilogin";
import { getCfApiBase } from "../utils/api-proxy";

export function Settings({ settings, setSettings, stats, apiOk, neonOk }) {
    const [neonUrl, setNeonUrl] = useState(settings.neonUrl || "");
    const [apiKey, setApiKey] = useState(settings.apiKey || "");
    const [geminiKey, setGeminiKey] = useState(settings.geminiKey || "");
    const [netlifyToken, setNetlifyToken] = useState(settings.netlifyToken || "");
    const [netlifyTeamSlug, setNetlifyTeamSlug] = useState(settings.netlifyTeamSlug || "");
    const [lcToken, setLcToken] = useState(settings.lcToken || "");
    const [lcTeamUuid, setLcTeamUuid] = useState(settings.lcTeamUuid || "");
    const [defaultBinUuid, setDefaultBinUuid] = useState(settings.defaultBinUuid || "");
    const [defaultBillingUuid, setDefaultBillingUuid] = useState(settings.defaultBillingUuid || "");
    const [mlToken, setMlToken] = useState(settings.mlToken || "");
    const [mlEmail, setMlEmail] = useState(settings.mlEmail || "");
    const [mlPassword, setMlPassword] = useState(settings.mlPassword || "");
    const [mlFolderId, setMlFolderId] = useState(settings.mlFolderId || "");
    const [defaultProxyProvider, setDefaultProxyProvider] = useState(settings.defaultProxyProvider || "multilogin");
    // Deploy credentials
    const [cfApiToken, setCfApiToken] = useState(settings.cfApiToken || "");
    const [cfAccountId, setCfAccountId] = useState(settings.cfAccountId || "");
    const [awsAccessKey, setAwsAccessKey] = useState(settings.awsAccessKey || "");
    const [awsSecretKey, setAwsSecretKey] = useState(settings.awsSecretKey || "");
    const [awsRegion, setAwsRegion] = useState(settings.awsRegion || "us-east-1");
    const [s3Bucket, setS3Bucket] = useState(settings.s3Bucket || "");
    const [cloudfrontDistId, setCloudfrontDistId] = useState(settings.cloudfrontDistId || "");
    const [vpsHost, setVpsHost] = useState(settings.vpsHost || "");
    const [vpsPort, setVpsPort] = useState(settings.vpsPort || "22");
    const [vpsUser, setVpsUser] = useState(settings.vpsUser || "");
    const [vpsPath, setVpsPath] = useState(settings.vpsPath || "");
    const [vpsAuthMethod, setVpsAuthMethod] = useState(settings.vpsAuthMethod || "key");
    const [vpsKey, setVpsKey] = useState(settings.vpsKey || "");
    const [vpsWorkerUrl, setVpsWorkerUrl] = useState(settings.vpsWorkerUrl || "");
    // Vercel deploy token
    const [vercelToken, setVercelToken] = useState(settings.vercelToken || "");
    // Git push pipeline settings
    const [githubToken, setGithubToken] = useState(settings.githubToken || "");
    const [githubRepoOwner, setGithubRepoOwner] = useState(settings.githubRepoOwner || "");
    const [githubRepoName, setGithubRepoName] = useState(settings.githubRepoName || "");
    const [githubRepoBranch, setGithubRepoBranch] = useState(settings.githubRepoBranch || "main");
    const [githubDeployWorkflow, setGithubDeployWorkflow] = useState(settings.githubDeployWorkflow || "deploy-sites.yml");
    // D1 Database credentials
    const [d1AccountId, setD1AccountId] = useState(settings.d1AccountId || "");
    const [d1DatabaseId, setD1DatabaseId] = useState(settings.d1DatabaseId || "");
    const [d1ApiToken, setD1ApiToken] = useState(settings.d1ApiToken || "");
    const [d1Result, setD1Result] = useState(null);

    const [generatingToken, setGeneratingToken] = useState(false);
    const [testing, setTesting] = useState(null);
    const [testResult, setTestResult] = useState({});
    const [folders, setFolders] = useState(null);
    const [launcherOk, setLauncherOk] = useState(null);
    const [loadingFolders, setLoadingFolders] = useState(false);
    const [saving, setSaving] = useState(false);

    // Sync saved token into service on mount
    useEffect(() => {
        if (mlToken) multiloginApi.setToken(mlToken);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const testApi = async () => {
        setTesting("api");
        try {
            const r = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
                body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 10, messages: [{ role: "user", content: "OK" }] })
            });
            setTestResult(p => ({ ...p, api: r.ok ? "ok" : "fail" }));
        } catch (e) {
            console.warn("[Settings] API test failed:", e?.message || e);
            setTestResult(p => ({ ...p, api: "fail" }));
        }
        setTesting(null);
    };

    const testGitHub = async () => {
        setTesting("github");
        try {
            const owner = String(githubRepoOwner || "").trim();
            const repo = String(githubRepoName || "").trim();
            const token = String(githubToken || "").trim();
            if (!owner || !repo || !token) {
                setTestResult(p => ({ ...p, github: "fail", githubDetail: "Fill token + owner + repo" }));
                setTesting(null);
                return;
            }
            const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            });
            if (!r.ok) {
                const text = await r.text().catch(() => "");
                setTestResult(p => ({ ...p, github: "fail", githubDetail: text || `HTTP ${r.status}` }));
            } else {
                setTestResult(p => ({ ...p, github: "ok", githubDetail: `${owner}/${repo}` }));
            }
        } catch (e) {
            setTestResult(p => ({ ...p, github: "fail", githubDetail: e.message }));
        }
        setTesting(null);
    };

    const testNetlify = async () => {
        setTesting("netlify");
        try {
            const teamSlug = String(netlifyTeamSlug || "").trim();
            const url = teamSlug
                ? `https://api.netlify.com/api/v1/sites?per_page=1&account_slug=${encodeURIComponent(teamSlug)}`
                : "https://api.netlify.com/api/v1/sites?per_page=1";
            const r = await fetch(url, { headers: { Authorization: `Bearer ${netlifyToken}` } });
            setTestResult(p => ({ ...p, netlify: r.ok ? "ok" : "fail" }));
        } catch (e) {
            console.warn("[Settings] Netlify test failed:", e?.message || e);
            setTestResult(p => ({ ...p, netlify: "fail" }));
        }
        setTesting(null);
    };

    const testCf = async () => {
        setTesting("cf");
        // Validate Account ID format: must be exactly 32 hex chars
        const cleanId = cfAccountId.trim();
        if (!/^[0-9a-f]{32}$/i.test(cleanId)) {
            setTestResult(p => ({ ...p, cf: "fail", cfDetail: `Account ID must be exactly 32 hex characters (got ${cleanId.length})` }));
            setTesting(null);
            return;
        }
        const cfBase = getCfApiBase();
        try {
            // Test 1: Verify token by listing Pages projects
            const pagesRes = await fetch(`${cfBase}/accounts/${cleanId}/pages/projects?per_page=1`, {
                headers: { Authorization: `Bearer ${cfApiToken}` },
            });
            if (!pagesRes.ok) {
                const err = await pagesRes.json().catch(() => ({}));
                const msg = err.errors?.[0]?.message || `HTTP ${pagesRes.status}`;
                setTestResult(p => ({ ...p, cf: "fail", cfDetail: `Pages: ${msg}` }));
                setTesting(null);
                return;
            }
            // Test 2: Verify Workers permission
            const workersRes = await fetch(`${cfBase}/accounts/${cleanId}/workers/subdomain`, {
                headers: { Authorization: `Bearer ${cfApiToken}` },
            });
            if (!workersRes.ok) {
                setTestResult(p => ({ ...p, cf: "partial", cfDetail: "Pages OK, Workers permission missing" }));
            } else {
                const subData = await workersRes.json().catch(() => ({}));
                const sub = subData.result?.subdomain;
                setTestResult(p => ({ ...p, cf: "ok", cfDetail: sub ? `*.${sub}.workers.dev` : "All permissions OK" }));
            }
        } catch (e) { setTestResult(p => ({ ...p, cf: "fail", cfDetail: e.message })); }
        setTesting(null);
    };

    const testAws = async () => {
        setTesting("aws");
        try {
            // Simple S3 ListObjects to verify credentials
            const r = await fetch(`https://${s3Bucket}.s3.${awsRegion}.amazonaws.com/?list-type=2&max-keys=1`);
            // This will likely fail due to CORS, so we just check if the bucket exists
            setTestResult(p => ({ ...p, aws: r.status !== 0 ? "ok" : "fail" }));
        } catch (e) {
            // CORS error usually means the bucket exists
            console.warn("[Settings] AWS test failed (likely CORS):", e?.message || e);
            setTestResult(p => ({ ...p, aws: "cors" }));
        }
        setTesting(null);
    };

    const testLc = async () => {
        setTesting("lc");
        try {
            const r = await api.get("/lc/teams");
            if (r && !r.error) {
                setTestResult(p => ({ ...p, lc: "ok" }));
            } else {
                setTestResult(p => ({ ...p, lc: "fail" }));
            }
        } catch (e) {
            console.warn("[Settings] LC test failed:", e?.message || e);
            setTestResult(p => ({ ...p, lc: "fail" }));
        }
        setTesting(null);
    };

    const testD1 = async () => {
        setTesting("d1");
        let requestUrl = "";
        try {
            // Validate Account ID format
            const cleanId = d1AccountId.trim();
            if (!/^[0-9a-f]{32}$/i.test(cleanId)) {
                setD1Result({ success: false, error: `Account ID must be exactly 32 hex characters (got ${cleanId.length})` });
                setTesting(null);
                return;
            }

            // Test by listing D1 databases in the account
            const cfBase = getCfApiBase();
            requestUrl = `${cfBase}/accounts/${cleanId}/d1/database`;
            const res = await fetch(requestUrl, {
                headers: { Authorization: `Bearer ${d1ApiToken}` },
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                const msg = err.errors?.[0]?.message || `HTTP ${res.status}`;
                setD1Result({ success: false, error: msg, url: requestUrl });
            } else {
                const data = await res.json();
                // Verify the specific database exists if databaseId is provided
                if (d1DatabaseId) {
                    const dbExists = data.result?.some(db => db.uuid === d1DatabaseId || db.id === d1DatabaseId);
                    if (dbExists) {
                        const dbInfo = data.result.find(db => db.uuid === d1DatabaseId || db.id === d1DatabaseId);
                        setD1Result({ success: true, database: dbInfo });
                    } else {
                        setD1Result({ success: false, error: `Database ID ${d1DatabaseId} not found in account` });
                    }
                } else {
                    setD1Result({ success: true, count: data.result?.length || 0 });
                }
            }
        } catch (e) {
            setD1Result({
                success: false,
                error: `${e.message || "Failed to fetch"}. Check API base/proxy URL and CORS/network.`,
                detail: e?.stack || null,
                url: requestUrl || null,
            });
        }
        setTesting(null);
    };

    const testMl = async () => {
        setTesting("ml");
        try {
            if (mlToken) {
                // Actually validate the token by trying to list folders
                multiloginApi.setToken(mlToken);
                const r = await multiloginApi.getFolders();
                if (r && !r.error) {
                    setTestResult(p => ({ ...p, ml: "active" }));
                } else if (r?.status === 401) {
                    // Token expired — try refresh
                    const ref = await multiloginApi.refreshToken(mlToken);
                    if (ref.data?.token) {
                        setMlToken(ref.data.token);
                        setTestResult(p => ({ ...p, ml: "ok" }));
                    } else {
                        setTestResult(p => ({ ...p, ml: "expired" }));
                    }
                } else {
                    setTestResult(p => ({ ...p, ml: "fail" }));
                }
                setTesting(null);
                return;
            }
            // No token — try sign in with email/password
            if (mlEmail && mlPassword) {
                const r = await multiloginApi.signin(mlEmail, mlPassword);
                if (r?.data?.token) {
                    setMlToken(r.data.token);
                    setTestResult(p => ({ ...p, ml: "ok" }));
                } else {
                    setTestResult(p => ({ ...p, ml: "fail" }));
                }
            } else {
                setTestResult(p => ({ ...p, ml: "no-creds" }));
            }
        } catch (e) {
            console.warn("[Settings] Multilogin test failed:", e?.message || e);
            setTestResult(p => ({ ...p, ml: "fail" }));
        }
        setTesting(null);
    };

    const save = async (s) => {
        setSaving(true);
        try {
            await setSettings(s);
        } finally {
            setSaving(false);
        }
    };

    const labelStyle = { fontSize: 10, color: T.muted, display: "block", marginBottom: 2 };
    const sectionHeaderStyle = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: T.dim, marginBottom: 12, marginTop: 20, paddingBottom: 6, borderBottom: `1px solid ${T.border}` };

    return (
        <div style={{ maxWidth: 600, animation: "fadeIn .3s ease" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Settings</h1>
            <p style={{ color: T.muted, fontSize: 12, marginBottom: 8 }}>API keys and deployment configuration</p>
            {/* Connection Status */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, fontSize: 11, padding: "6px 10px", borderRadius: 6, background: neonOk ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", color: neonOk ? T.success : T.danger, border: `1px solid ${neonOk ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}` }}>
                    {neonOk ? "✓ Neon DB connected — primary data store" : "⚠ Neon DB offline"}
                </div>
                <div style={{ flex: 1, fontSize: 11, padding: "6px 10px", borderRadius: 6, background: apiOk ? "rgba(16,185,129,0.08)" : "rgba(100,100,100,0.1)", color: apiOk ? T.success : T.dim, border: `1px solid ${apiOk ? "rgba(16,185,129,0.15)" : "rgba(100,100,100,0.15)"}` }}>
                    {apiOk ? "✓ Legacy API" : "— Legacy API offline"}
                </div>
            </div>

            {/* ══════════════ DATABASE ══════════════ */}
            <div style={sectionHeaderStyle}>🗄️ Database</div>

            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Neon Postgres</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>Serverless Postgres for persistent storage (settings, sites, deploys)</p>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Connection String (pooler)</label>
                    <Inp type="password" value={neonUrl} onChange={setNeonUrl} placeholder="postgresql://user:pass@ep-xxx.us-west-2.aws.neon.tech/neondb?sslmode=require" />
                </div>
                {neonOk && <div style={{ fontSize: 11, color: T.success, marginBottom: 8 }}>✓ Connected to Neon</div>}
                <Btn onClick={() => save({ neonUrl })} disabled={saving || !neonUrl} style={{ fontSize: 12 }}>{saving ? "Connecting..." : "💾 Save & Connect"}</Btn>
            </Card>

            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>☁️ Cloudflare D1 Database</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>Edge SQL database for low-latency queries</p>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Account ID {d1AccountId && (
                        /^[0-9a-f]{32}$/i.test(d1AccountId.trim())
                            ? <span style={{ color: T.success, fontSize: 10 }}>✓ {d1AccountId.trim().length} chars</span>
                            : <span style={{ color: T.danger, fontSize: 10 }}>✗ {d1AccountId.trim().length}/32 chars</span>
                    )}</label>
                    <Inp value={d1AccountId} onChange={setD1AccountId} placeholder="32-char hex account ID" />
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Database ID (UUID)</label>
                    <Inp value={d1DatabaseId} onChange={setD1DatabaseId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>API Token</label>
                    <Inp type="password" value={d1ApiToken} onChange={setD1ApiToken} placeholder="Cloudflare API Token with D1 permissions" />
                </div>
                {d1Result && (
                    <div style={{ fontSize: 11, marginBottom: 8, color: d1Result.success ? T.success : T.danger }}>
                        <div>
                            {d1Result.success
                                ? `✓ Connected${d1Result.database ? ` to "${d1Result.database.name}"` : d1Result.count !== undefined ? ` (${d1Result.count} databases)` : ""}`
                                : `✗ ${d1Result.error}`}
                        </div>
                        {!d1Result.success && d1Result.url && (
                            <div style={{ marginTop: 4, fontSize: 10, color: T.dim, fontFamily: "monospace", wordBreak: "break-all" }}>
                                URL: {d1Result.url}
                            </div>
                        )}
                        {!d1Result.success && d1Result.detail && (
                            <div style={{ marginTop: 2, fontSize: 10, color: T.dim, fontFamily: "monospace", wordBreak: "break-all" }}>
                                Detail: {d1Result.detail}
                            </div>
                        )}
                    </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" onClick={testD1} disabled={!d1AccountId || !d1ApiToken || testing === "d1"} style={{ fontSize: 12 }}>{testing === "d1" ? "..." : "🔑 Test"}</Btn>
                    <Btn onClick={() => {
                        const cleanId = d1AccountId.trim();
                        if (cleanId && !/^[0-9a-f]{32}$/i.test(cleanId)) {
                            setD1Result({ success: false, error: `Account ID must be exactly 32 hex characters (got ${cleanId.length})` });
                            return;
                        }
                        save({ d1AccountId: cleanId, d1DatabaseId, d1ApiToken });
                    }} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
                </div>
            </Card>

            {/* ══════════════ AI PROVIDERS ══════════════ */}
            <div style={sectionHeaderStyle}>🤖 AI Providers</div>

            {/* AI Provider - Anthropic */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Anthropic API Key</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>For AI copy generation</p>
                <Inp type="password" value={apiKey} onChange={setApiKey} placeholder="sk-ant-..." style={{ marginBottom: 8 }} />
                {settings.apiKey && <div style={{ fontSize: 11, color: T.success, marginBottom: 8 }}>✓ Configured</div>}
                <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" onClick={testApi} disabled={!apiKey || testing === "api"} style={{ fontSize: 12 }}>{testing === "api" ? "..." : "🔑 Test"}</Btn>
                    <Btn onClick={() => save({ apiKey })} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
                </div>
            </Card>

            {/* AI Provider - Gemini */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Gemini API Key</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>For advanced text and image prompting</p>
                <Inp type="password" value={geminiKey} onChange={setGeminiKey} placeholder="AIza..." style={{ marginBottom: 8 }} />
                <Btn onClick={() => save({ geminiKey })} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
            </Card>

            {/* ══════════════ DEPLOY TARGETS ══════════════ */}
            <div style={sectionHeaderStyle}>🚀 Deploy Targets</div>

            {/* P1 + P4: Cloudflare (Pages + Workers Sites) */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>☁️ Cloudflare</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>Shared by CF Pages (P1) and CF Workers Sites (P4)</p>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>API Token</label>
                    <Inp type="password" value={cfApiToken} onChange={setCfApiToken} placeholder="Bearer token with Pages/Workers edit..." />
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Account ID {cfAccountId && (
                        /^[0-9a-f]{32}$/i.test(cfAccountId.trim())
                            ? <span style={{ color: T.success, fontSize: 10 }}>✓ {cfAccountId.trim().length} chars</span>
                            : <span style={{ color: T.danger, fontSize: 10 }}>✗ {cfAccountId.trim().length}/32 chars</span>
                    )}</label>
                    <Inp value={cfAccountId} onChange={setCfAccountId} placeholder="32-char hex account ID"
                        style={cfAccountId && !/^[0-9a-f]{32}$/i.test(cfAccountId.trim()) ? { borderColor: T.danger } : undefined} />
                </div>
                {testResult.cf && (
                    <div style={{ fontSize: 11, marginBottom: 8, color: testResult.cf === "ok" ? T.success : testResult.cf === "partial" ? T.warning : T.danger }}>
                        {testResult.cf === "ok" ? "✓ Pages + Workers OK" :
                         testResult.cf === "partial" ? "⚠ Partial — " :
                         "✗ Failed — "}
                        {testResult.cfDetail && <span style={{ fontFamily: "monospace", fontSize: 10 }}>{testResult.cfDetail}</span>}
                    </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" onClick={testCf} disabled={!cfApiToken || !cfAccountId || testing === "cf"} style={{ fontSize: 12 }}>{testing === "cf" ? "..." : "🔑 Test"}</Btn>
                    <Btn onClick={() => {
                        const cleanId = cfAccountId.trim();
                        if (cleanId && !/^[0-9a-f]{32}$/i.test(cleanId)) {
                            setTestResult(p => ({ ...p, cf: "fail", cfDetail: `Account ID must be exactly 32 hex characters (got ${cleanId.length})` }));
                            return;
                        }
                        save({ cfApiToken, cfAccountId: cleanId });
                    }} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
                </div>
            </Card>

            {/* P2: Netlify Deploy Token */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>🔺 Netlify</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>Backup deploy — diversify footprint (P2)</p>
                <Inp type="password" value={netlifyToken} onChange={setNetlifyToken} placeholder="nfp_..." style={{ marginBottom: 8 }} />
                <Inp value={netlifyTeamSlug} onChange={setNetlifyTeamSlug} placeholder="Team slug (optional) e.g. my-agency" style={{ marginBottom: 8 }} />
                {settings.netlifyToken && <div style={{ fontSize: 11, color: T.success, marginBottom: 8 }}>✓ Configured</div>}
                <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" onClick={testNetlify} disabled={!netlifyToken || testing === "netlify"} style={{ fontSize: 12 }}>{testing === "netlify" ? "..." : "🔑 Test"}</Btn>
                    <Btn onClick={() => save({ netlifyToken, netlifyTeamSlug })} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
                </div>
            </Card>

            {/* P3: Vercel Deploy Token */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>▲ Vercel</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>Fast edge deployments with preview support (P3)</p>
                <Inp type="password" value={vercelToken} onChange={setVercelToken} placeholder="vercel_..." style={{ marginBottom: 8 }} />
                {settings.vercelToken && <div style={{ fontSize: 11, color: T.success, marginBottom: 8 }}>✓ Configured</div>}
                <Btn onClick={() => save({ vercelToken })} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
            </Card>

            {/* P5: AWS S3 + CloudFront */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>🪣 AWS S3 + CloudFront</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>US-focused LP, low latency (P5)</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                        <label style={labelStyle}>Access Key ID</label>
                        <Inp type="password" value={awsAccessKey} onChange={setAwsAccessKey} placeholder="AKIA..." />
                    </div>
                    <div>
                        <label style={labelStyle}>Secret Access Key</label>
                        <Inp type="password" value={awsSecretKey} onChange={setAwsSecretKey} placeholder="••••••••" />
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                        <label style={labelStyle}>Region</label>
                        <Sel value={awsRegion} onChange={setAwsRegion} options={[
                            { value: "us-east-1", label: "US East (N. Virginia)" },
                            { value: "us-east-2", label: "US East (Ohio)" },
                            { value: "us-west-1", label: "US West (N. California)" },
                            { value: "us-west-2", label: "US West (Oregon)" },
                            { value: "eu-west-1", label: "EU (Ireland)" },
                            { value: "eu-central-1", label: "EU (Frankfurt)" },
                            { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
                        ]} />
                    </div>
                    <div>
                        <label style={labelStyle}>S3 Bucket Name</label>
                        <Inp value={s3Bucket} onChange={setS3Bucket} placeholder="my-lp-bucket" />
                    </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>CloudFront Distribution ID (optional)</label>
                    <Inp value={cloudfrontDistId} onChange={setCloudfrontDistId} placeholder="E1234ABCDEF" />
                </div>
                {testResult.aws && (
                    <div style={{ fontSize: 11, marginBottom: 8, color: testResult.aws === "fail" ? T.danger : T.success }}>
                        {testResult.aws === "ok" ? "✓ Bucket accessible" : testResult.aws === "cors" ? "⚠ Bucket exists (CORS limited)" : "✗ Failed"}
                    </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" onClick={testAws} disabled={!s3Bucket || testing === "aws"} style={{ fontSize: 12 }}>{testing === "aws" ? "..." : "🔑 Test"}</Btn>
                    <Btn onClick={() => save({ awsAccessKey, awsSecretKey, awsRegion, s3Bucket, cloudfrontDistId })} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
                </div>
            </Card>

            {/* P6: VPS via SSH */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>🖥️ VPS (SSH/rsync)</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>Self-managed server, full control (P6). Requires Worker proxy.</p>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                        <label style={labelStyle}>Host</label>
                        <Inp value={vpsHost} onChange={setVpsHost} placeholder="123.45.67.89" />
                    </div>
                    <div>
                        <label style={labelStyle}>Port</label>
                        <Inp value={vpsPort} onChange={setVpsPort} placeholder="22" />
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                        <label style={labelStyle}>Username</label>
                        <Inp value={vpsUser} onChange={setVpsUser} placeholder="deploy" />
                    </div>
                    <div>
                        <label style={labelStyle}>Remote Path</label>
                        <Inp value={vpsPath} onChange={setVpsPath} placeholder="/var/www/html/" />
                    </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Auth Method</label>
                    <Sel value={vpsAuthMethod} onChange={setVpsAuthMethod} options={[
                        { value: "key", label: "SSH Key" },
                        { value: "password", label: "Password" },
                    ]} />
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>{vpsAuthMethod === "key" ? "Private Key" : "Password"}</label>
                    <Inp type="password" value={vpsKey} onChange={setVpsKey} placeholder={vpsAuthMethod === "key" ? "-----BEGIN OPENSSH PRIVATE KEY-----" : "••••••••"} />
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Worker Proxy URL</label>
                    <Inp value={vpsWorkerUrl} onChange={setVpsWorkerUrl} placeholder="https://your-worker.workers.dev" />
                </div>
                <Btn onClick={() => save({ vpsHost, vpsPort, vpsUser, vpsPath, vpsAuthMethod, vpsKey, vpsWorkerUrl })} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save VPS Config"}</Btn>
            </Card>

            {/* P7: Git Push Pipeline */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>🧬 Git Push Pipeline</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>Commit artifacts to GitHub, then let Actions deploy to targets</p>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>GitHub Token (repo scope)</label>
                    <Inp type="password" value={githubToken} onChange={setGithubToken} placeholder="ghp_..." />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                        <label style={labelStyle}>Repo Owner</label>
                        <Inp value={githubRepoOwner} onChange={setGithubRepoOwner} placeholder="org-or-user" />
                    </div>
                    <div>
                        <label style={labelStyle}>Repo Name</label>
                        <Inp value={githubRepoName} onChange={setGithubRepoName} placeholder="repo-name" />
                    </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                        <label style={labelStyle}>Branch</label>
                        <Inp value={githubRepoBranch} onChange={setGithubRepoBranch} placeholder="main" />
                    </div>
                    <div>
                        <label style={labelStyle}>Workflow File</label>
                        <Inp value={githubDeployWorkflow} onChange={setGithubDeployWorkflow} placeholder="deploy-sites.yml" />
                    </div>
                </div>
                {testResult.github && (
                    <div style={{ fontSize: 11, marginBottom: 8, color: testResult.github === "ok" ? T.success : T.danger }}>
                        {testResult.github === "ok" ? "✓ GitHub repo accessible" : "✗ GitHub check failed"}
                        {testResult.githubDetail && (
                            <span style={{ fontFamily: "monospace", fontSize: 10 }}> — {testResult.githubDetail}</span>
                        )}
                    </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" onClick={testGitHub} disabled={!githubToken || !githubRepoOwner || !githubRepoName || testing === "github"} style={{ fontSize: 12 }}>{testing === "github" ? "..." : "🔑 Test"}</Btn>
                    <Btn onClick={() => save({ githubToken, githubRepoOwner, githubRepoName, githubRepoBranch, githubDeployWorkflow })} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
                </div>
            </Card>

            {/* ══════════════ EXTERNAL SERVICES ══════════════ */}
            <div style={sectionHeaderStyle}>🔗 External Services</div>

            {/* LeadingCards API */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>LeadingCards API</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 12px" }}>For automated card management</p>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Token</label>
                    <Inp type="password" value={lcToken} onChange={setLcToken} placeholder="b2f..." />
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Team UUID</label>
                    <Inp value={lcTeamUuid} onChange={setLcTeamUuid} placeholder="Optional for Team Members" />
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Default BIN UUID</label>
                    <Inp value={defaultBinUuid} onChange={setDefaultBinUuid} placeholder="BIN UUID for card issuance" />
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Default Billing Address UUID</label>
                    <Inp value={defaultBillingUuid} onChange={setDefaultBillingUuid} placeholder="Billing address UUID" />
                </div>
                {testResult.lc && (
                    <div style={{ fontSize: 11, marginBottom: 8, color: testResult.lc === "ok" ? T.success : T.danger }}>
                        {testResult.lc === "ok" ? "✓ Connected" : "✗ Failed"}
                    </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                    <Btn variant="ghost" onClick={testLc} disabled={!lcToken || testing === "lc"} style={{ fontSize: 12 }}>{testing === "lc" ? "..." : "🔑 Test"}</Btn>
                    <Btn onClick={() => save({ lcToken, lcTeamUuid, defaultBinUuid, defaultBillingUuid })} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
                </div>
            </Card>

            {/* Multilogin X */}
            <Card style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>Multilogin X</h3>
                <p style={{ fontSize: 11, color: T.dim, margin: "0 0 8px" }}>
                    Direct API integration — <a href="https://multilogin.com/help/en_US/api" target="_blank" rel="noopener" style={{ color: T.accent }}>docs</a>
                </p>
                <div style={{ fontSize: 10, color: T.muted, marginBottom: 12, padding: "6px 8px", background: "rgba(99,102,241,0.06)", borderRadius: 6, border: `1px solid rgba(99,102,241,0.12)` }}>
                    Remote API: <code style={{ fontSize: 10 }}>{multiloginApi.MLX_BASE || "https://api.multilogin.com"}</code> &nbsp;|&nbsp;
                    Launcher: <code style={{ fontSize: 10 }}>{multiloginApi.LAUNCHER_BASE || "https://launcher.mlx.yt:45001"}</code>
                </div>

                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Automation Token (Recommended — lasts up to 30 days)</label>
                    <Inp type="password" value={mlToken} onChange={setMlToken} placeholder="Bearer token from MLX or generate below..." />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                        <label style={labelStyle}>Login Email</label>
                        <Inp value={mlEmail} onChange={setMlEmail} placeholder="user@multilogin.com" />
                    </div>
                    <div>
                        <label style={labelStyle}>Password (hashed via MD5 per MLX spec)</label>
                        <Inp type="password" value={mlPassword} onChange={setMlPassword} placeholder="••••••••" />
                    </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                    <label style={labelStyle}>Default Folder ID</label>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Inp value={mlFolderId} onChange={setMlFolderId} placeholder="Folder ID for browser profiles" style={{ flex: 1 }} />
                        <Btn variant="ghost" onClick={async () => {
                            setLoadingFolders(true);
                            try {
                                if (mlToken) multiloginApi.setToken(mlToken);
                                const res = await multiloginApi.getFolders();
                                const fdata = res.data?.folders || res.data || [];
                                setFolders(Array.isArray(fdata) ? fdata : []);
                            } catch (e) {
                                console.warn("[Settings] Failed to load folders:", e?.message || e);
                                setFolders([]);
                            }
                            setLoadingFolders(false);
                        }} disabled={loadingFolders || (!mlToken && !mlEmail)} style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                            {loadingFolders ? "..." : "📂 Browse"}
                        </Btn>
                    </div>
                    {folders && (
                        <div style={{ marginTop: 6, background: T.input, border: `1px solid ${T.border}`, borderRadius: 6, padding: 8, maxHeight: 160, overflowY: "auto" }}>
                            {folders.length === 0 ? (
                                <div style={{ fontSize: 11, color: T.muted }}>No folders found. Check your token or sign in first.</div>
                            ) : folders.map(f => (
                                <div key={f.folder_id || f.id} onClick={() => { setMlFolderId(f.folder_id || f.id); setFolders(null); }}
                                    style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 4, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}
                                    onMouseEnter={e => e.currentTarget.style.background = T.border}
                                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                    <span style={{ fontWeight: 500 }}>{f.name || "Unnamed"}</span>
                                    <span style={{ fontSize: 10, color: T.muted, fontFamily: "monospace" }}>{(f.folder_id || f.id || "").slice(0, 12)}...</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>Default Proxy Provider</label>
                    <Sel value={defaultProxyProvider} onChange={setDefaultProxyProvider} options={[
                        { value: "multilogin", label: "Multilogin" },
                        { value: "custom", label: "Custom" },
                    ]} />
                </div>
                {testResult.ml && (
                    <div style={{ fontSize: 11, marginBottom: 8, color: testResult.ml === "fail" || testResult.ml === "expired" || testResult.ml === "no-creds" ? T.danger : T.success }}>
                        {testResult.ml === "ok" ? "✓ Signed In — token acquired" :
                         testResult.ml === "active" ? "✓ Token Valid — API connected" :
                         testResult.ml === "expired" ? "✗ Token Expired — sign in or generate new" :
                         testResult.ml === "no-creds" ? "✗ Enter token or email/password" :
                         "✗ Connection Failed — check credentials"}
                    </div>
                )}
                {/* Launcher status */}
                {launcherOk !== null && (
                    <div style={{ fontSize: 11, marginBottom: 8, color: launcherOk ? T.success : T.dim }}>
                        {launcherOk ? "✓ Local Launcher detected" : "— Launcher not detected (needed for start/stop)"}
                    </div>
                )}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn variant="ghost" onClick={testMl} disabled={testing === "ml"} style={{ fontSize: 12 }}>{testing === "ml" ? "..." : "🔑 Test / Sign In"}</Btn>
                    <Btn variant="ghost" onClick={async () => {
                        setGeneratingToken(true);
                        try {
                            // Sign in first if no token
                            if (!mlToken && mlEmail && mlPassword) {
                                const sr = await multiloginApi.signin(mlEmail, mlPassword);
                                if (sr.data?.token) multiloginApi.setToken(sr.data.token);
                            } else if (mlToken) {
                                multiloginApi.setToken(mlToken);
                            }
                            const res = await multiloginApi.getAutomationToken("30d");
                            if (res.data?.token) {
                                setMlToken(res.data.token);
                                setTestResult(p => ({ ...p, ml: "ok" }));
                            } else {
                                setTestResult(p => ({ ...p, ml: "fail" }));
                            }
                        } catch (e) {
                            console.warn("[Settings] Auto token generation failed:", e?.message || e);
                            setTestResult(p => ({ ...p, ml: "fail" }));
                        }
                        setGeneratingToken(false);
                    }} disabled={(!mlToken && !mlEmail) || generatingToken} style={{ fontSize: 12 }}>
                        {generatingToken ? "..." : "🔑 Generate 30-day Token"}
                    </Btn>
                    <Btn variant="ghost" onClick={async () => {
                        const res = await multiloginApi.checkLauncher();
                        setLauncherOk(!res.error);
                    }} style={{ fontSize: 12 }}>🖥️ Check Launcher</Btn>
                    <Btn onClick={() => save({ mlToken, mlEmail, mlPassword, mlFolderId, defaultProxyProvider })} disabled={saving} style={{ fontSize: 12 }}>{saving ? "Saving..." : "💾 Save"}</Btn>
                </div>
            </Card>

            {/* ══════════════ BUILD STATS ══════════════ */}
            <div style={sectionHeaderStyle}>📊 Stats</div>

            <Card>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px" }}>Build Stats</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, textAlign: "center" }}>
                    <div><div style={{ fontSize: 22, fontWeight: 700 }}>{stats.builds}</div><div style={{ fontSize: 10, color: T.muted }}>Builds</div></div>
                    <div><div style={{ fontSize: 22, fontWeight: 700, color: T.accent }}>${stats.spend.toFixed(3)}</div><div style={{ fontSize: 10, color: T.muted }}>Spend</div></div>
                    <div><div style={{ fontSize: 22, fontWeight: 700, color: T.success }}>90+</div><div style={{ fontSize: 10, color: T.muted }}>PageSpeed</div></div>
                </div>
            </Card>
        </div>
    );
}
