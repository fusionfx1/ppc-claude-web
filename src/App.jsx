import React, { useState, useEffect } from "react";
import { api } from "./services/api";
import * as db from "./services/neon";
import { THEME as T } from "./constants";
import { uid, now, LS } from "./utils";

// Component Imports
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { Toast } from "./components/Atoms";
import { Dashboard } from "./components/Dashboard";
import { Sites } from "./components/Sites";
import { Wizard } from "./components/Wizard";
import { VariantStudio } from "./components/VariantStudio";
import { OpsCenter } from "./components/OpsCenter";
import { Settings } from "./components/Settings";
import { DeployHistory } from "./components/DeployHistory";

// Neon connection string — stored in settings or hardcoded for now
const NEON_URL = import.meta.env.PUBLIC_NEON_URL || "";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [sites, setSites] = useState([]);
  const [ops, setOps] = useState({ domains: [], accounts: [], cfAccounts: [], registrarAccounts: [], profiles: [], payments: [], logs: [] });
  const [settings, setSettings] = useState(() => LS.get("settings") || {});
  const [stats, setStats] = useState({ builds: 0, spend: 0 });
  const [toast, setToast] = useState(null);
  const [wizData, setWizData] = useState(null);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [deploys, setDeploys] = useState([]);
  const [registry, setRegistry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(false);
  const [neonOk, setNeonOk] = useState(false);

  useEffect(() => {
    bootApp();
  }, []);

  async function bootApp() {
    const localSettings = LS.get("settings") || {};

    // 1. Try Neon first (primary data store)
    const neonConnStr = NEON_URL || localSettings.neonUrl || "";
    let neonReady = false;

    // Only attempt Neon if the URL looks like a real connection string
    if (neonConnStr && neonConnStr.includes("@") && !neonConnStr.includes("ep-xxx")) {
      try {
        const initialized = db.initNeon(neonConnStr);
        if (initialized) {
          const pong = await db.ping();
          if (pong) {
            neonReady = true;
            setNeonOk(true);

            // Load from Neon
            const [neonSettings, neonSites, neonDeploys] = await Promise.all([
              db.loadSettings(),
              db.loadSites(),
              db.loadDeploys(),
            ]);

            // Merge: localStorage wins over Neon (user's most recent saves)
            // then Neon fills in anything not in localStorage
            if (neonSettings && Object.keys(neonSettings).length > 0) {
              const merged = { ...neonSettings, ...localSettings };
              setSettings(merged);
              LS.set("settings", merged);
            }

            // Sites from Neon
            if (neonSites && neonSites.length > 0) {
              setSites(neonSites);
            } else {
              // First time: sync localStorage sites to Neon
              const localSites = LS.get("sites") || [];
              if (localSites.length > 0) {
                setSites(localSites);
                db.syncFromLocal(localSettings, localSites, []);
              }
            }

            // Deploys from Neon
            if (neonDeploys && neonDeploys.length > 0) {
              setDeploys(neonDeploys);
            }

            // Stats
            const siteList = neonSites?.length ? neonSites : [];
            setStats({
              builds: siteList.length,
              spend: +(siteList.reduce((a, s) => a + (s.cost || 0), 0)).toFixed(3),
            });
          }
        }
      } catch (e) {
        console.warn("[boot] Neon init failed:", e.message);
      }
    }

    // 2. Try legacy API as fallback (if Neon not ready)
    if (!neonReady) {
      try {
        const data = await api.get("/init");
        if (!data.error) {
          if (data.sites) setSites(data.sites);
          if (data.ops) setOps({ ...data.ops, cfAccounts: data.cfAccounts || [], registrarAccounts: data.registrarAccounts || [] });
          if (data.settings) {
            // localStorage wins — user's local saves are most recent
            const merged = { ...data.settings, ...localSettings };
            setSettings(merged);
            LS.set("settings", merged);
          }
          if (data.stats) setStats(data.stats);
          if (data.deploys) setDeploys(data.deploys);
          if (data.variants) setRegistry(data.variants);
          setApiOk(true);
        }
      } catch {
        // Both Neon and API failed — use localStorage only
      }
    }

    setLoading(false);
  }

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startCreate = () => {
    setWizData({
      brand: "", domain: "", tagline: "", email: "",
      loanType: "personal", amountMin: 100, amountMax: 5000, aprMin: 5.99, aprMax: 35.99,
      colorId: "ocean", fontId: "dm-sans", layout: "hero-left", radius: "rounded",
      h1: "", badge: "", cta: "", sub: "",
      gtmId: "", network: "LeadsGate", redirectUrl: "", conversionId: "", conversionLabel: "",
    });
    setPage("create");
  };

  const addSite = (site) => {
    setSites(p => [site, ...p]);
    setStats(p => ({ builds: p.builds + 1, spend: +(p.spend + (site.cost || 0)).toFixed(3) }));

    // Persist to Neon (primary) or API (fallback)
    if (neonOk) db.saveSite(site).catch(() => {});
    else if (apiOk) api.post("/sites", site).catch(() => {});

    notify(`${site.brand} created!`);
    setPage("sites");
  };

  const delSite = (id) => {
    setSites(p => p.filter(s => s.id !== id));

    if (neonOk) db.deleteSite(id).catch(() => {});
    else if (apiOk) api.del(`/sites/${id}`).catch(() => {});

    notify("Deleted", "danger");
  };

  const addDeploy = (d) => {
    setDeploys(p => [d, ...p].slice(0, 100));

    if (neonOk) db.saveDeploy(d).catch(() => {});
    else if (apiOk) api.post("/deploys", d).catch(() => {});
  };

  const resolveCollKey = (coll) => {
    if (coll === "cf-accounts") return "cfAccounts";
    if (coll === "registrar-accounts") return "registrarAccounts";
    return coll;
  };
  const resolveEndpoint = (coll, id) => {
    if (coll === "cf-accounts") return id ? `/cf-accounts/${id}` : "/cf-accounts";
    if (coll === "registrar-accounts") return id ? `/registrar-accounts/${id}` : "/registrar-accounts";
    return id ? `/ops/${coll}/${id}` : `/ops/${coll}`;
  };

  const opsAdd = (coll, item) => {
    const stateKey = resolveCollKey(coll);
    setOps(p => ({
      ...p, [stateKey]: [item, ...(p[stateKey] || [])],
      logs: [{ id: uid(), msg: `Added ${coll.slice(0, -1)}: ${item.label || item.domain || item.name || item.id}`, ts: now() }, ...p.logs].slice(0, 200),
    }));
    if (apiOk) api.post(resolveEndpoint(coll), item).catch(() => {});
  };

  const opsDel = (coll, id) => {
    const stateKey = resolveCollKey(coll);
    const item = (ops[stateKey] || []).find(i => i.id === id);
    setOps(p => ({
      ...p, [stateKey]: (p[stateKey] || []).filter(i => i.id !== id),
      logs: [{ id: uid(), msg: `Deleted: ${item?.label || item?.domain || id}`, ts: now() }, ...p.logs].slice(0, 200),
    }));
    if (apiOk) api.del(resolveEndpoint(coll, id)).catch(() => {});
  };

  const opsUpd = (coll, id, u) => {
    const stateKey = resolveCollKey(coll);
    setOps(p => ({
      ...p,
      [stateKey]: (p[stateKey] || []).map(i => i.id === id ? { ...i, ...u } : i),
      logs: [{ id: uid(), msg: `Updated ${coll.slice(0, -1)}: ${id}`, ts: now() }, ...p.logs].slice(0, 200),
    }));
    if (apiOk) api.put(resolveEndpoint(coll, id), u).catch(() => {});
  };

  const handleSaveSettings = async (s) => {
    // Use functional update to avoid stale closure
    let next;
    setSettings(prev => {
      next = { ...prev, ...s };
      return next;
    });
    // Always persist to localStorage immediately
    // Read fresh from state in case other saves happened
    const fresh = { ...(LS.get("settings") || {}), ...s };
    LS.set("settings", fresh);

    // If neonUrl changed, re-init Neon
    if (s.neonUrl) {
      const ok = db.initNeon(s.neonUrl);
      if (ok) {
        const pong = await db.ping();
        setNeonOk(pong);
        if (pong) {
          notify("Neon connected!");
          db.syncFromLocal(fresh, sites, deploys);
          return;
        }
      }
      notify("Neon connection failed", "danger");
      return;
    }

    // Save to Neon (primary) or API (fallback)
    if (neonOk) {
      const ok = await db.saveSettings(s);
      if (ok) { notify("Saved!"); }
      else { notify("Saved locally — Neon sync failed", "warning"); }
    } else if (apiOk) {
      try {
        const res = await api.post("/settings", s);
        if (res && !res.error) { notify("Saved!"); }
        else { notify("Saved locally — API sync failed", "warning"); }
      } catch { notify("Saved locally — API unreachable", "warning"); }
    } else {
      notify("Saved locally", "success");
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12, animation: "pulse 1.5s infinite" }}>⚡</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>LP Factory V2</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>Loading...</div>
      </div>
    </div>
  );

  const ml = sideCollapsed ? 64 : 220;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <Sidebar page={page} setPage={setPage} siteCount={sites.length} startCreate={startCreate}
        collapsed={sideCollapsed} toggle={() => setSideCollapsed(p => !p)} />

      <main style={{ flex: 1, marginLeft: ml, minHeight: "100vh", transition: "margin .2s" }}>
        <TopBar stats={stats} settings={settings} deploys={deploys} apiOk={apiOk} neonOk={neonOk} />
        <div style={{ padding: "24px 28px" }}>
          {page === "dashboard" && <Dashboard sites={sites} stats={stats} ops={ops} setPage={setPage} startCreate={startCreate} settings={settings} apiOk={apiOk} neonOk={neonOk} />}
          {page === "sites" && <Sites sites={sites} del={delSite} notify={notify} startCreate={startCreate} settings={settings} addDeploy={addDeploy} />}
          {page === "create" && wizData && <Wizard config={wizData} setConfig={setWizData} addSite={addSite} setPage={setPage} settings={settings} notify={notify} />}
          {page === "variant" && <VariantStudio notify={notify} sites={sites} addSite={addSite} registry={registry} setRegistry={setRegistry} apiOk={apiOk} />}
          {page === "ops" && <OpsCenter data={ops} add={opsAdd} del={opsDel} upd={opsUpd} settings={settings} />}
          {page === "deploys" && <DeployHistory deploys={deploys} />}
          {page === "settings" && <Settings settings={settings} setSettings={handleSaveSettings} stats={stats} apiOk={apiOk} neonOk={neonOk} />}
        </div>
      </main>

      <style>{`
        @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        input:focus,select:focus,textarea:focus{outline:none;border-color:${T.borderFocus}!important;box-shadow:0 0 0 3px ${T.primaryGlow}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
      `}</style>
    </div>
  );
}
