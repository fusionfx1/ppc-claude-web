import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { THEME as T, COLORS } from "../constants";
import { LS, uid, now, hsl } from "../utils";
import { makeThemeJson, htmlToZip, astroProjectToZip } from "../utils/lp-generator";
import { generateHtmlByTemplate, generateAstroProjectByTemplate, generateApplyPageByTemplate } from "../utils/template-router";

import { deployTo, DEPLOY_TARGETS, getAvailableTargets } from "../utils/deployers";
import { InputField as Inp } from "./ui/input-field";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export function Sites({ sites, del, notify, startCreate, settings, addDeploy, ops }) {
    const [search, setSearch] = useState("");
    const [groupBy, setGroupBy] = useState("google-ads");
    const [onlyIssues, setOnlyIssues] = useState(false);
    const [quickFilter, setQuickFilter] = useState(() => {
        const stored = LS.get("sitesQuickFilter");
        const allowed = ["all", "banned", "warming", "no-domain", "not-deployed"];
        return allowed.includes(stored) ? stored : "all";
    });
    const [sortBy, setSortBy] = useState(() => {
        const stored = LS.get("sitesSortBy");
        const allowed = ["issues-first", "latest", "brand"];
        return allowed.includes(stored) ? stored : "issues-first";
    });
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
    const availableTargets = getAvailableTargets(settings);

    const normalizeDomain = (value) => String(value || "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        .split(":")[0];

    const cfAccountsById = useMemo(() => {
        const map = {};
        (ops?.cfAccounts || []).forEach((account) => {
            const keys = [account.id, account.accountId, account.account_id].filter(Boolean);
            keys.forEach((key) => {
                map[String(key)] = account;
            });
        });
        return map;
    }, [ops?.cfAccounts]);

    const domainsByName = useMemo(() => {
        const map = {};
        (ops?.domains || []).forEach((domain) => {
            const normalized = normalizeDomain(domain.domain || domain.hostname || "");
            if (normalized) map[normalized] = domain;
        });
        return map;
    }, [ops?.domains]);

    useEffect(() => { LS.set("deployUrls", deployUrls); }, [deployUrls]);
    useEffect(() => { LS.set("sitesQuickFilter", quickFilter); }, [quickFilter]);
    useEffect(() => { LS.set("sitesSortBy", sortBy); }, [sortBy]);

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
        
        // Comprehensive debug logging
        console.log("=== DEPLOY DEBUG START ===");
        console.log("[Sites] Deploying site:", {
            id: site.id,
            brand: site.brand,
            templateId: site.templateId,
            target: target
        });
        
        try {
            // For Git Push Pipeline, use Astro project files
            // For other targets, use HTML
            let content;
            if (target === "git-push") {
                console.log("[Sites] Using git-push target, calling generateAstroProjectByTemplate");
                const astroFiles = generateAstroProjectByTemplate(site);
                const applyHtml = generateApplyPageByTemplate(site);
                // Merge apply.html into astro files
                content = { ...astroFiles, "apply.html": applyHtml };
                console.log("[Sites] Generated astro files count:", Object.keys(content).length);
            } else {
                // Single-file HTML deploy for other targets
                console.log("[Sites] Using non-git-push target, calling generateHtmlByTemplate");
                const mainHtml = generateHtmlByTemplate(site);
                const applyHtml = generateApplyPageByTemplate(site);
                // Create multi-file content with both index.html and apply.html
                content = {
                    "index.html": mainHtml,
                    "apply.html": applyHtml
                };
                console.log("[Sites] Generated content keys:", Object.keys(content));
                console.log("[Sites] Main HTML length:", mainHtml?.length || 0);
                console.log("[Sites] Apply HTML length:", applyHtml?.length || 0);
            }

            console.log("[Sites] Calling deployTo with target:", target);
            const result = await deployTo(target, content, site, settings);
            console.log("[Sites] Deploy result:", {
                success: result.success,
                url: result.url,
                error: result.error
            });
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
        if (!urls) return [];

        // Legacy storage: direct URL string
        if (typeof urls === "string") {
            return [{ target: "legacy", url: urls }];
        }

        if (typeof urls !== "object") return [];

        return Object.entries(urls)
            .map(([target, value]) => {
                if (!value) return null;
                if (typeof value === "string") return { target, url: value };
                if (typeof value === "object" && typeof value.url === "string") {
                    return { target, url: value.url, ts: value.ts || value.updatedAt || value.createdAt };
                }
                return null;
            })
            .filter(Boolean);
    };

    const getLatestDeploy = (siteId) => {
        const targets = getDeployedTargets(siteId);
        if (targets.length === 0) return null;

        const withTs = targets.filter((t) => t?.ts && !Number.isNaN(new Date(t.ts).getTime()));
        if (withTs.length > 0) {
            return withTs.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())[0];
        }

        return targets[targets.length - 1];
    };

    const formatAgo = (ts) => {
        if (!ts) return "never";
        const date = new Date(ts);
        if (Number.isNaN(date.getTime())) return "unknown";
        const diffMs = Date.now() - date.getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const getTemplateLabel = (templateId) => {
        const map = {
            classic: "Classic",
            "pdl-loansv1": "PDL Loans V1",
            "astrodeck-loan": "Astrodeck",
            "lander-core": "Lander Core",
        };
        return map[templateId] || templateId || "Classic";
    };

    const getSiteHealth = (site, deployedCount) => {
        if (!site.domain) return { label: "No Domain", color: T.warning };
        if (deployedCount === 0) return { label: "Not Deployed", color: T.dim };
        return { label: "Live", color: T.success };
    };

    const getGoogleAdsAccountLabel = (site) => {
        return site.googleAdsAccountName
            || site.googleAdsAccountLabel
            || site.googleAdsCustomerId
            || site.googleAdsAccountId
            || site.adsAccountName
            || site.adsAccountId
            || "Unassigned Ads";
    };

    const getCloudflareAccountLabel = (site) => {
        const siteDomain = normalizeDomain(site.domain);
        const linkedDomain = siteDomain ? domainsByName[siteDomain] : null;
        const linkedCfAccountId = linkedDomain?.cfAccountId || linkedDomain?.cf_account_id || "";
        const linkedCfAccount = linkedCfAccountId ? cfAccountsById[String(linkedCfAccountId)] : null;

        return site.cloudflareAccountName
            || site.cloudflareAccountId
            || site.cfAccountName
            || site.cfAccountId
            || linkedCfAccount?.label
            || linkedCfAccount?.email
            || linkedCfAccountId
            || linkedDomain?.zoneId
            || site.cfZoneId
            || "Unassigned CF";
    };

    const getPolicyStatus = (site) => {
        const raw = String(
            site.policyStatus
            || site.complianceStatus
            || site.reviewStatus
            || site.accountStatus
            || ""
        ).toLowerCase();

        if (raw.includes("ban")) return "Banned";
        if (raw.includes("limit") || raw.includes("risk")) return "Limited";
        if (raw.includes("warm")) return "Warming";
        if (raw.includes("clean") || raw.includes("active") || raw.includes("ok")) return "Clean";
        if (site.warmupStartedAt) return "Warming";
        return "Unknown";
    };

    const getPolicyTone = (status) => {
        if (status === "Banned") return { label: "Policy: Banned", color: T.danger };
        if (status === "Limited") return { label: "Policy: Limited", color: T.warning };
        if (status === "Warming") return { label: "Policy: Warming", color: "#f59e0b" };
        if (status === "Clean") return { label: "Policy: Clean", color: T.success };
        return { label: "Policy: Unknown", color: T.dim };
    };

    const truncateLabel = (value, max = 24) => {
        if (!value) return "-";
        return value.length > max ? `${value.slice(0, max - 1)}…` : value;
    };

    const hasIssue = (site) => {
        const deployedCount = getDeployedTargets(site.id).length;
        const policyStatus = getPolicyStatus(site);
        return !site.domain || deployedCount === 0 || policyStatus === "Banned" || policyStatus === "Limited";
    };

    const matchesQuickFilter = (site) => {
        const policyStatus = getPolicyStatus(site);
        const deployedCount = getDeployedTargets(site.id).length;

        if (quickFilter === "banned") return policyStatus === "Banned";
        if (quickFilter === "warming") return policyStatus === "Warming";
        if (quickFilter === "no-domain") return !site.domain;
        if (quickFilter === "not-deployed") return deployedCount === 0;
        return true;
    };

    const getSortableTs = (site) => {
        const latestDeploy = getLatestDeploy(site.id);
        const deployTs = latestDeploy?.ts ? new Date(latestDeploy.ts).getTime() : NaN;
        if (!Number.isNaN(deployTs)) return deployTs;

        const updateTs = site.updatedAt || site._updatedAt || site._createdAt || site.createdAt;
        const parsed = updateTs ? new Date(updateTs).getTime() : NaN;
        return Number.isNaN(parsed) ? 0 : parsed;
    };

    const sortGroupSites = (siteA, siteB) => {
        if (sortBy === "latest") return getSortableTs(siteB) - getSortableTs(siteA);
        if (sortBy === "brand") return (siteA.brand || "").localeCompare(siteB.brand || "");

        const aIssue = hasIssue(siteA) ? 1 : 0;
        const bIssue = hasIssue(siteB) ? 1 : 0;
        if (bIssue !== aIssue) return bIssue - aIssue;

        return getSortableTs(siteB) - getSortableTs(siteA);
    };

    const applyQuickScope = (mode) => {
        if (mode === "issues") {
            setOnlyIssues(true);
            setQuickFilter("all");
            return;
        }

        setOnlyIssues(false);
        setQuickFilter(mode);
    };

    const isQuickScopeActive = (mode) => {
        if (mode === "issues") return onlyIssues;
        if (mode === "all") return quickFilter === "all" && !onlyIssues;
        return quickFilter === mode && !onlyIssues;
    };

    const getGroupBadgeButtonStyle = (mode) => {
        const active = isQuickScopeActive(mode);
        return {
            background: active ? `${T.primary}22` : "transparent",
            border: `1px solid ${active ? `${T.primary}66` : "transparent"}`,
            borderRadius: 999,
            padding: "1px 3px",
            cursor: "pointer",
        };
    };

    const getScopeHelpText = (mode) => {
        if (mode === "issues") return "Show issue-only sites in current search scope";
        if (mode === "not-deployed") return "Show sites that have no deployments yet";
        if (mode === "warming") return "Show warming policy status sites";
        if (mode === "banned") return "Show banned policy status sites";
        return "Show all sites in current search scope";
    };

    const baseScopedSites = sites.filter((site) => {
        const keyword = `${site.brand || ""}${site.domain || ""}`.toLowerCase();
        const matchesSearch = keyword.includes(search.toLowerCase());
        return matchesSearch && (!onlyIssues || hasIssue(site));
    });

    const quickFilterCounts = useMemo(() => {
        const counts = {
            all: baseScopedSites.length,
            banned: 0,
            warming: 0,
            "no-domain": 0,
            "not-deployed": 0,
        };

        baseScopedSites.forEach((site) => {
            const policyStatus = getPolicyStatus(site);
            const deployedCount = getDeployedTargets(site.id).length;
            if (policyStatus === "Banned") counts.banned += 1;
            if (policyStatus === "Warming") counts.warming += 1;
            if (!site.domain) counts["no-domain"] += 1;
            if (deployedCount === 0) counts["not-deployed"] += 1;
        });

        return counts;
    }, [baseScopedSites]);

    const filteredSites = baseScopedSites.filter((site) => {
        return matchesQuickFilter(site);
    });

    const groupedSites = useMemo(() => {
        const buckets = {};

        filteredSites.forEach((site) => {
            const policyStatus = getPolicyStatus(site);
            const deployedCount = getDeployedTargets(site.id).length;
            const issue = !site.domain || deployedCount === 0 || policyStatus === "Banned" || policyStatus === "Limited";

            let key = "All Sites";
            if (groupBy === "google-ads") key = getGoogleAdsAccountLabel(site);
            if (groupBy === "cloudflare") key = getCloudflareAccountLabel(site);
            if (groupBy === "status") key = policyStatus;
            if (groupBy === "template") key = getTemplateLabel(site.templateId || "classic");

            if (!buckets[key]) {
                buckets[key] = {
                    key,
                    label: key,
                    sites: [],
                    deployed: 0,
                    notDeployed: 0,
                    issue: 0,
                    banned: 0,
                    warming: 0,
                };
            }

            buckets[key].sites.push(site);
            if (deployedCount > 0) buckets[key].deployed += 1;
            if (deployedCount === 0) buckets[key].notDeployed += 1;
            if (issue) buckets[key].issue += 1;
            if (policyStatus === "Banned") buckets[key].banned += 1;
            if (policyStatus === "Warming") buckets[key].warming += 1;
        });

        return Object.values(buckets)
            .map((group) => ({
                ...group,
                sites: group.sites.sort(sortGroupSites),
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [filteredSites, groupBy, sortBy]);

    return (
        <div className="animate-[fadeIn_.3s_ease]">
            <div className="flex justify-between items-center mb-5">
                <div>
                    <h1 className="text-[22px] font-bold m-0">My Sites</h1>
                    <p className="text-[hsl(var(--muted-foreground))] text-xs mt-0.5">Manage & deploy your loan landing pages</p>
                </div>
                <Button onClick={startCreate}>➕ Create LP</Button>
            </div>

            <div className="grid grid-cols-4 gap-2.5 mb-4">
                {[
                    { l: "Sites", v: sites.length },
                    { l: "Builds", v: sites.length },
                    { l: "Deployed", v: Object.keys(deployUrls).filter(k => Object.keys(deployUrls[k] || {}).length > 0).length },
                    { l: "Need Attention", v: sites.filter(s => !s.domain || getDeployedTargets(s.id).length === 0).length },
                ].map((m, i) => (
                    <Card key={i} className="p-3">
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{m.l}</div>
                        <div className="text-[18px] font-bold mt-0.5">{m.v}</div>
                    </Card>
                ))}
            </div>

            <div className="flex flex-wrap gap-2.5 items-center mb-3.5">
                <Inp value={search} onChange={setSearch} placeholder="Search sites..." style={{ width: 240 }} />
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
                    className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg text-xs px-2.5 py-2 min-w-[170px] cursor-pointer">
                    <option value="google-ads">Group: Google Ads</option>
                    <option value="cloudflare">Group: Cloudflare</option>
                    <option value="status">Group: Policy Status</option>
                    <option value="template">Group: Template</option>
                    <option value="none">Group: None</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                    className="bg-[hsl(var(--input))] border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-lg text-xs px-2.5 py-2 min-w-[180px] cursor-pointer">
                    <option value="issues-first">Sort: Issues first</option>
                    <option value="latest">Sort: Latest activity</option>
                    <option value="brand">Sort: Brand A-Z</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] cursor-pointer">
                    <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />
                    Only issues
                </label>
            </div>

            <div className="flex flex-wrap gap-2 mb-3.5">
                {[
                    { id: "all", label: "All" },
                    { id: "banned", label: "Banned" },
                    { id: "warming", label: "Warming" },
                    { id: "no-domain", label: "No Domain" },
                    { id: "not-deployed", label: "Not Deployed" },
                ].map((chip) => {
                    const active = quickFilter === chip.id;
                    return (
                        <button key={chip.id} onClick={() => setQuickFilter(chip.id)}
                            className={cn(
                                "border rounded-full text-[11px] font-bold px-2.5 py-1.5 cursor-pointer transition-all",
                                active
                                    ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))/13] text-[hsl(var(--primary))]"
                                    : "border-[hsl(var(--border))] bg-[hsl(var(--input))] text-[hsl(var(--muted-foreground))]"
                            )}>
                            {chip.label} ({quickFilterCounts[chip.id] || 0})
                        </button>
                    );
                })}
            </div>

            {filteredSites.length === 0 ? (
                <Card className="text-center p-12">
                    <div className="text-4xl mb-2">🏗️</div>
                    <div className="text-[15px] font-semibold">No sites yet</div>
                    <div className="text-[hsl(var(--muted-foreground))] text-xs mt-1">Create your first loan LP</div>
                </Card>
            ) : (
                <div className="flex flex-col gap-3.5">
                    {groupedSites.map((group) => (
                        <Card key={group.key} className="p-3">
                            <div className="flex justify-between items-center mb-2.5 flex-wrap gap-2">
                                <div className="text-[13px] font-bold">{group.label}</div>
                                <div className="flex gap-1.5 flex-wrap">
                                    {[{scope:"all",content:<Badge variant="default">{group.sites.length} site(s)</Badge>},{scope:"all",content:<Badge variant="success">{group.deployed} deployed</Badge>},{scope:"issues",content:<Badge variant="warning">{group.issue} issue</Badge>}].map((b,i)=>(
                                        <button key={i} type="button" title={getScopeHelpText(b.scope)} onClick={() => applyQuickScope(b.scope)}
                                            className={cn("rounded-full px-0.5 py-0 border cursor-pointer transition-all", isQuickScopeActive(b.scope) ? "border-[hsl(var(--primary))/40] bg-[hsl(var(--primary))/12]" : "border-transparent bg-transparent")}>
                                            {b.content}
                                        </button>
                                    ))}
                                    {group.notDeployed > 0 && (
                                        <button type="button" title={getScopeHelpText("not-deployed")} onClick={() => applyQuickScope("not-deployed")}
                                            className={cn("rounded-full px-0.5 border cursor-pointer", isQuickScopeActive("not-deployed") ? "border-[hsl(var(--primary))/40] bg-[hsl(var(--primary))/12]" : "border-transparent")}>
                                            <Badge variant="secondary">{group.notDeployed} not deployed</Badge>
                                        </button>
                                    )}
                                    {group.warming > 0 && (
                                        <button type="button" title={getScopeHelpText("warming")} onClick={() => applyQuickScope("warming")}
                                            className="rounded-full px-0.5 border border-transparent cursor-pointer">
                                            <Badge variant="warning">{group.warming} warming</Badge>
                                        </button>
                                    )}
                                    {group.banned > 0 && (
                                        <button type="button" title={getScopeHelpText("banned")} onClick={() => applyQuickScope("banned")}
                                            className="rounded-full px-0.5 border border-transparent cursor-pointer">
                                            <Badge variant="danger">{group.banned} banned</Badge>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {group.sites.map(s => {
                                    const co = COLORS.find(x => x.id === s.colorId);
                                    const deployed = getDeployedTargets(s.id);
                                    const health = getSiteHealth(s, deployed.length);
                                    const isDeploying = deploying?.siteId === s.id;
                                    const latestUpdate = s.updatedAt || s._updatedAt || s._createdAt || s.createdAt;
                                    const templateLabel = getTemplateLabel(s.templateId || "classic");
                                    const latestDeploy = getLatestDeploy(s.id);
                                    const policyStatus = getPolicyStatus(s);
                                    const policyTone = getPolicyTone(policyStatus);
                                    const googleAdsLabel = getGoogleAdsAccountLabel(s);
                                    const cloudflareLabel = getCloudflareAccountLabel(s);

                                    return (
                                        <Card key={s.id} className="p-4 flex gap-4 relative">
                                            <div className="w-11 h-11 rounded-[10px] flex items-center justify-center text-lg text-white font-bold shrink-0"
                                                style={{ background: co ? hsl(...co.p) : T.primary }}>{s.brand?.[0]}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <div className="text-[15px] font-bold">{s.brand}</div>
                                                    <button onClick={() => handleDelete(s)}
                                                        className="px-2.5 py-1 text-[10px] font-bold bg-[rgba(239,68,68,.15)] text-[#ef4444] border border-[rgba(239,68,68,.3)] rounded-md cursor-pointer tracking-wide hover:bg-[#ef4444] hover:text-white transition-all">
                                                        🗑 DELETE
                                                    </button>
                                                </div>
                                                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{s.domain || "no domain"}</div>

                                                <div className="flex gap-1.5 items-center flex-wrap mt-2">
                                                    <Badge variant="default">{templateLabel}</Badge>
                                                    <Badge style={{ background: `${health.color}22`, color: health.color, border: `1px solid ${health.color}44` }}>{health.label}</Badge>
                                                    <Badge style={{ background: `${policyTone.color}22`, color: policyTone.color, border: `1px solid ${policyTone.color}44` }}>{policyTone.label}</Badge>
                                                    <Badge variant={deployed.length > 0 ? "success" : "secondary"}>{deployed.length > 0 ? `${deployed.length} target(s)` : "0 targets"}</Badge>
                                                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">Updated {formatAgo(latestUpdate)}</span>
                                                </div>

                                                <div className="flex gap-1.5 flex-wrap mt-1.5">
                                                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] rounded-full px-2 py-0.5 bg-[hsl(var(--input))]">Ads: {truncateLabel(googleAdsLabel)}</span>
                                                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))] rounded-full px-2 py-0.5 bg-[hsl(var(--input))]">CF: {truncateLabel(cloudflareLabel)}</span>
                                                </div>

                                                <div className="mt-2 text-[11px] text-[hsl(var(--muted-foreground))]">
                                                    <span>Live URL: </span>
                                                    {latestDeploy?.url ? (
                                                        <a href={latestDeploy.url} target="_blank" rel="noreferrer"
                                                            className="text-[hsl(var(--accent))] no-underline ml-1">{latestDeploy.url}</a>
                                                    ) : (
                                                        <span className="ml-1">Not deployed yet</span>
                                                    )}
                                                </div>

                                                {deployed.length > 0 && (
                                                    <div className="mt-1.5">
                                                        {deployed.map(({ target, url }) => (
                                                            <a key={target} href={url} target="_blank" rel="noreferrer"
                                                                className="flex items-center gap-1 text-[10px] text-[hsl(var(--accent))] no-underline mb-0.5">
                                                                <span>{DEPLOY_TARGETS.find(t => t.id === target)?.icon || "🚀"}</span>
                                                                <span className="overflow-hidden text-ellipsis whitespace-nowrap">{url}</span>
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex flex-wrap gap-1.5 mt-3">
                                                    <Button variant="ghost" onClick={() => setPreview(s)} className="px-2.5 py-1.5 text-[10px] h-auto">👁 Preview</Button>
                                                    <Button variant="ghost" onClick={() => startCreate(s)} className="px-2.5 py-1.5 text-[10px] h-auto">🔄 Edit & Redeploy</Button>

                                                    <div className="relative" ref={openDownload === s.id ? downloadRef : null}>
                                                        <Button variant="ghost" onClick={() => setOpenDownload(openDownload === s.id ? null : s.id)} className="px-2.5 py-1.5 text-[10px] h-auto">📥 Download ▾</Button>
                                                        {openDownload === s.id && (
                                                            <div style={dropdownStyle}>
                                                                <DropdownItem icon="🚀" label="Astro Project (ZIP)" desc="Full source, buildable" onClick={() => { setOpenDownload(null); downloadAstroZip(s); }} />
                                                                <DropdownItem icon="📄" label="Static HTML (ZIP)" desc="Single index.html" onClick={() => { setOpenDownload(null); downloadHtmlZip(s); }} />
                                                                <DropdownItem icon="📝" label="Apply Page (HTML)" desc="Form embed page" onClick={() => { setOpenDownload(null); downloadApplyPage(s); }} />
                                                                <DropdownItem icon="🎨" label="Theme JSON" desc="Design tokens export" onClick={() => { setOpenDownload(null); exportJson(s); }} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="relative" ref={openDeploy === s.id ? deployRef : null}>
                                                        <Button onClick={() => setOpenDeploy(openDeploy === s.id ? null : s.id)} disabled={isDeploying} className="px-3 py-1.5 text-[10px] h-auto">
                                                            {isDeploying ? `Deploying to ${DEPLOY_TARGETS.find(t => t.id === deploying?.target)?.label || "..."}` : "🚀 Deploy ▾"}
                                                        </Button>
                                                        {openDeploy === s.id && !isDeploying && (
                                                            <div style={dropdownStyle}>
                                                                {availableTargets.map(t => (
                                                                    <DropdownItem key={t.id} icon={t.icon} label={t.label}
                                                                        desc={t.configured ? t.description : "⚠ Not configured"}
                                                                        disabled={!t.configured} active={!!deployUrls[s.id]?.[t.id]}
                                                                        onClick={() => t.configured && handleDeploy(s, t.id)} />
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
                        </Card>
                    ))}
                </div>
            )}

            {preview && createPortal(
                <div onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}
                    className="fixed inset-0 bg-black/85 z-[10000] flex flex-col p-6 animate-[fadeIn_.2s_ease]">
                    <div className="flex justify-between mb-3">
                        <div className="text-white font-bold">Preview: {preview.brand}</div>
                        <Button variant="destructive" onClick={() => setPreview(null)} className="px-3 py-1 h-auto text-xs">Close</Button>
                    </div>
                    <iframe title="preview" className="flex-1 bg-white rounded-xl border-none" srcDoc={generateHtmlByTemplate(preview)} />
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
