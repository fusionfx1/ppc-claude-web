import React, { useState, useMemo, useEffect, useRef } from "react";
import { THEME as T, COLORS, FONTS, RADIUS, LOAN_TYPES, LAYOUTS, TRUST_BADGE_STYLES, TRUST_BADGE_ICON_TONES, NETWORKS_AFF, COPY_SETS, SITE_TEMPLATES } from "../constants";
import { uid, now, hsl } from "../utils";
import { generateHtmlByTemplate, generateAstroProjectByTemplate, DEFAULT_TEMPLATE_ID } from "../utils/template-router";
import { generateFavicon, generateOgImage } from "../utils/image-gen";
import { api } from "../services/api";
import { Card, Inp, Btn, Field, MockPhone } from "./Atoms";

function getTemplateById(templateId) {
    return SITE_TEMPLATES.find(t => t.id === templateId) || SITE_TEMPLATES.find(t => t.id === DEFAULT_TEMPLATE_ID) || SITE_TEMPLATES[0];
}

function generatePreviewByTemplate(config) {
    return generateHtmlByTemplate(config);
}

function generateAstroByTemplate(config) {
    return generateAstroProjectByTemplate(config);
}

// Validation function for each step
function validateStep(stepNum, config) {
    const errors = [];

    if (stepNum === 1) {
        if (!config.brand?.trim()) errors.push("Brand Name is required");
        if (!config.domain?.trim()) errors.push("Domain is required");
    }

    if (stepNum === 2) {
        if (!config.loanType) errors.push("Loan Type is required");
        if (config.amountMin < 0) errors.push("Min Amount cannot be negative");
        if (config.amountMax < 0) errors.push("Max Amount cannot be negative");
        if (config.amountMin >= config.amountMax) errors.push("Min Amount must be less than Max Amount");
        if (config.aprMin < 0) errors.push("Min APR cannot be negative");
        if (config.aprMax < 0) errors.push("Max APR cannot be negative");
        if (config.aprMin >= config.aprMax) errors.push("Min APR must be less than Max APR");
    }

    if (stepNum === 3) {
        if (!config.colorId) errors.push("Color Scheme is required");
    }

    if (stepNum === 5) {
        const hasRedirect = config.redirectUrl?.trim();
        const hasEmbed = config.formEmbed?.trim();
        if (!hasRedirect && !hasEmbed) {
            errors.push("At least one destination required: Redirect URL or Form Embed");
        }
        if (hasEmbed && !/<(script|div|iframe)/i.test(hasEmbed)) {
            errors.push("Form Embed should contain &lt;script&gt;, &lt;div&gt;, or &lt;iframe&gt; tags");
        }
    }

    return { valid: errors.length === 0, errors };
}

export function Wizard({ config, setConfig, addSite, setPage, settings, notify }) {
    const [step, setStep] = useState(1);
    const [building, setBuilding] = useState(false);
    const [validationErrors, setValidationErrors] = useState([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [initialConfig, setInitialConfig] = useState(null);
    const cardRef = useRef(null);

    const upd = (k, v) => setConfig(p => ({ ...p, [k]: v }));

    // Track initial state for dirty detection
    useEffect(() => {
        if (config && !initialConfig) {
            setInitialConfig(JSON.stringify(config));
        }
    }, [config, initialConfig]);

    const isDirty = initialConfig && JSON.stringify(config) !== initialConfig;

    // beforeunload handler for unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty && step < 6) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty, step]);

    const steps = ["Brand Info", "Loan Product", "Design", "Copy & CTA", "Tracking", "Review & Build"];

    const handleNext = () => {
        const validation = validateStep(step, config);
        if (!validation.valid) {
            setValidationErrors(validation.errors);
            return;
        }
        setValidationErrors([]);
        setStep(s => s + 1);
    };

    const handleBackOrCancel = () => {
        if (step === 1 && isDirty) {
            if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
                setPage("dashboard");
            }
        } else {
            step === 1 ? setPage("dashboard") : setStep(s => s - 1);
        }
    };

    const handleAiGenerate = async () => {
        setAiLoading(true);
        try {
            const p = await api.post("/ai/generate-copy", {
                brand: config.brand,
                loanType: config.loanType,
                amountMin: config.amountMin,
                amountMax: config.amountMax,
                lang: config.lang || "English"
            });

            if (p && !p.error) {
                if (p.h1) upd("h1", p.h1);
                if (p.badge) upd("badge", p.badge);
                if (p.cta) upd("cta", p.cta);
                if (p.sub) upd("sub", p.sub);
                if (p.tagline) upd("tagline", p.tagline);
                notify("AI copy generated!");
            } else {
                notify(p?.error || "AI generation failed. Check your API key.", "warning");
            }
        } catch {
            notify("AI generation failed. Check your API key.", "warning");
        } finally {
            setAiLoading(false);
        }
    };

    const handleBuild = async () => {
        setBuilding(true);
        let finalConfig = { ...config };

        // Only generate AI copy if fields are empty
        const needsAiCopy = !config.h1 || !config.badge || !config.cta || !config.sub;
        if (needsAiCopy) {
            try {
                const p = await api.post("/ai/generate-copy", {
                    brand: config.brand,
                    loanType: config.loanType,
                    amountMin: config.amountMin,
                    amountMax: config.amountMax,
                    lang: config.lang || "English"
                });

                if (p && !p.error) {
                    if (!config.h1 && p.h1) finalConfig.h1 = p.h1;
                    if (!config.badge && p.badge) finalConfig.badge = p.badge;
                    if (!config.cta && p.cta) finalConfig.cta = p.cta;
                    if (!config.sub && p.sub) finalConfig.sub = p.sub;
                    if (!config.tagline && p.tagline) finalConfig.tagline = p.tagline;
                    setConfig(prev => ({ ...prev, ...finalConfig }));
                }
            } catch { /* AI generation skipped */ }
        }

        await new Promise(r => setTimeout(r, 1000));
        if (config._editMode) {
            // Edit mode: update existing site, keep same ID
            addSite({ ...finalConfig, status: "completed", updatedAt: now() });
        } else {
            // New site
            addSite({ ...finalConfig, id: uid(), status: "completed", createdAt: now(), cost: 0.001 });
        }
        setBuilding(false);
    };

    // Enter key navigation (skip if target is textarea)
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
            e.preventDefault();
            if (step < 6) handleNext();
        }
    };

    // Live preview HTML for steps 3, 4, 6
    const previewHtml = useMemo(
        () => generatePreviewByTemplate(config),
        [config.templateId, config.brand, config.domain, config.loanType, config.colorId, config.fontId, config.layout, config.radius, config.trustBadgeStyle, config.trustBadgeIconTone, config.h1, config.badge, config.cta, config.sub, config.amountMin, config.amountMax, config.redirectUrl, config.conversionId]
    );

    // Two-column layout for steps 3, 4, 6
    const showPreview = step === 3 || step === 4 || step === 6;
    const mainMaxWidth = showPreview ? 680 : 780;

    return (
        <div style={{ maxWidth: 1060, margin: "0 auto", animation: "fadeIn .3s ease" }} onKeyDown={handleKeyDown}>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Create New LP</h1>
            <p style={{ color: T.muted, fontSize: 12, marginBottom: 20 }}>Build a PPC-optimized loan landing page</p>

            <Card style={{ padding: "14px 18px", marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <b>Step {step}/6</b><span style={{ color: T.muted }}>{steps[step - 1]}</span>
                </div>
                <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
                    <div style={{ height: "100%", width: `${step / 6 * 100}%`, background: T.grad, borderRadius: 2, transition: "width .3s" }} />
                </div>
            </Card>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <div style={{ background: `${T.danger}15`, border: `1px solid ${T.danger}55`, borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.danger, marginBottom: 6 }}>⚠️ Please fix before continuing:</div>
                    {validationErrors.map((err, i) => (
                        <div key={i} style={{ fontSize: 11, color: T.danger, marginLeft: 4 }}>• {err}</div>
                    ))}
                </div>
            )}

            {showPreview ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
                    <Card style={{ padding: 28, marginBottom: 16 }} ref={cardRef}>
                        {step === 1 && <StepBrand c={config} u={upd} />}
                        {step === 2 && <StepProduct c={config} u={upd} />}
                        {step === 3 && <StepDesign c={config} u={upd} />}
                        {step === 4 && <StepCopy c={config} u={upd} onAiGenerate={handleAiGenerate} aiLoading={aiLoading} />}
                        {step === 5 && <StepTracking c={config} u={upd} />}
                        {step === 6 && <StepReview c={config} building={building} />}
                    </Card>
                    <div style={{ position: "sticky", top: 24 }}>
                        <MockPhone>
                            <iframe title="mobile-preview" style={{ width: "100%", height: "100%", border: "none" }} srcDoc={previewHtml} />
                        </MockPhone>
                    </div>
                </div>
            ) : (
                <Card style={{ padding: 28, marginBottom: 16, maxWidth: 780, margin: "0 auto 16px auto" }} ref={cardRef}>
                    {step === 1 && <StepBrand c={config} u={upd} />}
                    {step === 2 && <StepProduct c={config} u={upd} />}
                    {step === 3 && <StepDesign c={config} u={upd} />}
                    {step === 4 && <StepCopy c={config} u={upd} onAiGenerate={handleAiGenerate} aiLoading={aiLoading} />}
                    {step === 5 && <StepTracking c={config} u={upd} />}
                    {step === 6 && <StepReview c={config} building={building} />}
                </Card>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 780 }}>
                <Btn variant="ghost" onClick={handleBackOrCancel}>
                    ← {step === 1 ? "Cancel" : "Back"}
                </Btn>
                {step < 6 ? (
                    <Btn onClick={handleNext}>Next →</Btn>
                ) : (
                    <Btn onClick={handleBuild} disabled={building} style={{ padding: "10px 24px" }}>
                        {building ? "⏳ Saving..." : config._editMode ? "✅ Update & Save" : "🚀 Build & Save"}
                    </Btn>
                )}
            </div>
        </div>
    );
}

function StepBrand({ c, u }) {
    const selectedTemplate = getTemplateById(c.templateId || DEFAULT_TEMPLATE_ID);

    return <>
        <div style={{ textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 24 }}>🏢</div><h2 style={{ fontSize: 17, fontWeight: 700 }}>Brand Information</h2></div>

        <Field label="Template" req help="Select the landing page architecture">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {SITE_TEMPLATES.map(tpl => {
                    const active = (c.templateId || DEFAULT_TEMPLATE_ID) === tpl.id;
                    return (
                        <button key={tpl.id} onClick={() => u("templateId", tpl.id)} style={{
                            padding: "10px 12px",
                            background: active ? T.primaryGlow : T.input,
                            border: `2px solid ${active ? T.primary : T.border}`,
                            borderRadius: 8,
                            cursor: "pointer",
                            textAlign: "left",
                            color: T.text,
                        }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ fontSize: 12, fontWeight: 700 }}>{tpl.name}</div>
                                <span style={{ fontSize: 9, fontWeight: 700, color: active ? "#fff" : T.muted, background: active ? T.primary : T.card2, border: `1px solid ${active ? T.primary : T.border}`, padding: "2px 6px", borderRadius: 999 }}>{tpl.badge}</span>
                            </div>
                            <div style={{ fontSize: 10, color: T.dim, marginTop: 3 }}>{tpl.description}</div>
                        </button>
                    );
                })}
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>Selected: <b style={{ color: T.text }}>{selectedTemplate?.name}</b></div>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Brand Name" req help="e.g. LoanBridge"><Inp value={c.brand} onChange={v => u("brand", v)} placeholder="LoanBridge" /></Field>
            <Field label="Domain" req help="e.g. loanbridge.com"><Inp value={c.domain} onChange={v => u("domain", v)} placeholder="loanbridge.com" /></Field>
        </div>
        <Field label="Tagline"><Inp value={c.tagline} onChange={v => u("tagline", v)} placeholder="Fast. Simple. Trusted." /></Field>
        <Field label="Compliance Email"><Inp value={c.email} onChange={v => u("email", v)} placeholder="support@loanbridge.com" /></Field>
    </>;
}

function StepProduct({ c, u }) {
    const amountPresets = [
        { min: 100, max: 5000, label: "$100–$5K" },
        { min: 500, max: 10000, label: "$500–$10K" },
        { min: 1000, max: 25000, label: "$1K–$25K" },
        { min: 1000, max: 50000, label: "$1K–$50K" },
        { min: 5000, max: 100000, label: "$5K–$100K" },
    ];
    const isPresetActive = (p) => c.amountMin === p.min && c.amountMax === p.max;

    return <>
        <div style={{ textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 24 }}>💳</div><h2 style={{ fontSize: 17, fontWeight: 700 }}>Loan Product</h2></div>
        <Field label="Loan Type" req>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {LOAN_TYPES.map(lt => (
                    <button key={lt.id} onClick={() => u("loanType", lt.id)} style={{
                        padding: "12px 8px", background: c.loanType === lt.id ? T.primaryGlow : T.input,
                        border: `2px solid ${c.loanType === lt.id ? T.primary : T.border}`,
                        borderRadius: 8, cursor: "pointer", color: T.text, textAlign: "center",
                    }}><div style={{ fontSize: 18 }}>{lt.icon}</div><div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{lt.label}</div></button>
                ))}
            </div>
        </Field>

        <Field label="Loan Amount Range" req help="Choose a preset or enter custom values">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {amountPresets.map(p => (
                    <button key={p.label} onClick={() => { u("amountMin", p.min); u("amountMax", p.max); }} style={{
                        padding: "6px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: "pointer",
                        background: isPresetActive(p) ? T.primary : T.input,
                        color: isPresetActive(p) ? "#fff" : T.text,
                        border: `1px solid ${isPresetActive(p) ? T.primary : T.border}`,
                    }}>{p.label}</button>
                ))}
            </div>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Min ($)" req><Inp type="number" min={0} value={c.amountMin} onChange={v => u("amountMin", Math.max(0, +v))} /></Field>
            <Field label="Max ($)" req><Inp type="number" min={0} value={c.amountMax} onChange={v => u("amountMax", Math.max(0, +v))} /></Field>
            <Field label="APR Min (%)" req><Inp type="number" step="0.01" min={0} value={c.aprMin} onChange={v => u("aprMin", Math.max(0, +v))} /></Field>
            <Field label="APR Max (%)" req><Inp type="number" step="0.01" min={0} value={c.aprMax} onChange={v => u("aprMax", Math.max(0, +v))} /></Field>
        </div>
    </>;
}

function StepDesign({ c, u }) {
    const [genLoading, setGenLoading] = useState(false);

    const handleGenImages = async () => {
        setGenLoading(true);
        try {
            const favicon = generateFavicon(c);
            u("faviconDataUrl", favicon);
            const ogImage = await generateOgImage(c);
            u("ogImageDataUrl", ogImage);
        } catch (e) {
            console.error("Image gen failed:", e);
        }
        setGenLoading(false);
    };

    // Auto-regenerate assets when color scheme changes
    useEffect(() => {
        if (!c.brand?.trim()) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const favicon = generateFavicon(c);
                const ogImage = await generateOgImage(c);
                if (cancelled) return;
                u("faviconDataUrl", favicon);
                u("ogImageDataUrl", ogImage);
            } catch (e) {
                console.error("Auto image gen failed:", e);
            }
        }, 150);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [c.colorId, c.fontId, c.brand]);

    return <>
        <div style={{ textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 24 }}>🎨</div><h2 style={{ fontSize: 17, fontWeight: 700 }}>Design</h2></div>
        <Field label="Color Scheme" req>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {COLORS.map(cp => (
                    <button key={cp.id} onClick={() => u("colorId", cp.id)} style={{
                        padding: "10px", background: c.colorId === cp.id ? T.primaryGlow : T.input,
                        border: `2px solid ${c.colorId === cp.id ? T.primary : T.border}`, borderRadius: 8, cursor: "pointer",
                    }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 4 }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, background: hsl(...cp.p) }} />
                            <div style={{ width: 16, height: 16, borderRadius: 4, background: hsl(...cp.s) }} />
                            <div style={{ width: 16, height: 16, borderRadius: 4, background: hsl(...cp.a) }} />
                        </div>
                        <div style={{ fontSize: 10, color: T.text, fontWeight: 600 }}>{cp.name}</div>
                    </button>
                ))}
            </div>
        </Field>
        <Field label="Font">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {FONTS.map(f => (
                    <button key={f.id} onClick={() => u("fontId", f.id)} style={{
                        padding: "8px", background: c.fontId === f.id ? T.primaryGlow : T.input,
                        border: `2px solid ${c.fontId === f.id ? T.primary : T.border}`,
                        borderRadius: 6, cursor: "pointer", color: T.text, fontSize: 11, fontWeight: 600,
                    }}>{f.name}</button>
                ))}
            </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Layout">
                {LAYOUTS.map(l => (
                    <button key={l.id} onClick={() => u("layout", l.id)} style={{
                        width: "100%", padding: "8px 10px", marginBottom: 4, background: c.layout === l.id ? T.primaryGlow : T.input,
                        border: `2px solid ${c.layout === l.id ? T.primary : T.border}`, borderRadius: 6, cursor: "pointer", textAlign: "left",
                    }}><div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>{l.label}</div><div style={{ fontSize: 10, color: T.dim }}>{l.desc}</div></button>
                ))}
            </Field>
            <Field label="Radius">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {RADIUS.map(r => (
                        <button key={r.id} onClick={() => u("radius", r.id)} style={{
                            flex: 1, padding: "8px", background: c.radius === r.id ? T.primaryGlow : T.input,
                            border: `2px solid ${c.radius === r.id ? T.primary : T.border}`,
                            borderRadius: 6, cursor: "pointer", color: T.text, fontSize: 11, fontWeight: 600, minWidth: 60,
                        }}>{r.label}</button>
                    ))}
                </div>
            </Field>
        </div>
        <Field label="Trust Badges">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                {TRUST_BADGE_STYLES.map(s => (
                    <button key={s.id} onClick={() => u("trustBadgeStyle", s.id)} style={{
                        padding: "8px 10px", background: c.trustBadgeStyle === s.id ? T.primaryGlow : T.input,
                        border: `2px solid ${c.trustBadgeStyle === s.id ? T.primary : T.border}`,
                        borderRadius: 6, cursor: "pointer", textAlign: "left",
                    }}>
                        <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                            {s.id !== "cards" && (
                                <div style={{ flex: 1, height: 7, borderRadius: 999, background: `${T.primary}33` }} />
                            )}
                            {s.id !== "compact" && (
                                <>
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: `${T.primary}44` }} />
                                    <div style={{ width: 10, height: 10, borderRadius: 3, background: `${T.primary}44` }} />
                                </>
                            )}
                        </div>
                        <div style={{ fontSize: 11, color: T.text, fontWeight: 700 }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: T.dim }}>{s.desc}</div>
                    </button>
                ))}
            </div>
        </Field>
        <Field label="Trust Icon Tone">
            <div style={{ display: "flex", gap: 6 }}>
                {TRUST_BADGE_ICON_TONES.map(tone => (
                    <button key={tone.id} onClick={() => u("trustBadgeIconTone", tone.id)} style={{
                        flex: 1, padding: "8px", background: c.trustBadgeIconTone === tone.id ? T.primaryGlow : T.input,
                        border: `2px solid ${c.trustBadgeIconTone === tone.id ? T.primary : T.border}`,
                        borderRadius: 6, cursor: "pointer", color: T.text, fontSize: 11, fontWeight: 600,
                    }}>{tone.label}</button>
                ))}
            </div>
        </Field>

        {/* AI Image Generation */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 10 }}>🎨 Brand Assets (Use Current Design Colors)</div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>Auto-updates when Color Scheme changes. You can also regenerate manually.</div>
            <button onClick={handleGenImages} disabled={genLoading || !c.brand?.trim()} style={{
                width: "100%", padding: 12, marginBottom: 14, background: genLoading ? T.input : `linear-gradient(135deg, ${T.primary}15, ${T.accent}15)`,
                border: `1px dashed ${T.primary}`, borderRadius: 8, cursor: genLoading || !c.brand?.trim() ? "not-allowed" : "pointer",
                color: T.primary, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: !c.brand?.trim() ? 0.5 : 1,
            }}>
                {genLoading ? "⏳ Generating..." : "✨ Generate Favicon & OG Image"}
            </button>

            {(c.faviconDataUrl || c.ogImageDataUrl) && (
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "start" }}>
                    {c.faviconDataUrl && (
                        <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 10, color: T.muted, marginBottom: 6 }}>Favicon</div>
                            <img src={c.faviconDataUrl} alt="Favicon" style={{ width: 48, height: 48, borderRadius: 8, border: `1px solid ${T.border}` }} />
                        </div>
                    )}
                    {c.ogImageDataUrl && (
                        <div>
                            <div style={{ fontSize: 10, color: T.muted, marginBottom: 6 }}>OG Image (1200×630)</div>
                            <img src={c.ogImageDataUrl} alt="OG Image" style={{ width: "100%", maxWidth: 360, borderRadius: 8, border: `1px solid ${T.border}` }} />
                        </div>
                    )}
                </div>
            )}
        </div>
    </>;
}

function StepCopy({ c, u, onAiGenerate, aiLoading }) {
    const applyTemplate = (tpl) => {
        u("h1", tpl.h1);
        u("h1span", tpl.h1span || "");
        u("badge", tpl.badge);
        u("cta", tpl.cta);
        u("sub", tpl.sub);
        if (!c.tagline) u("tagline", `${tpl.brand}: Fast. Simple. Trusted.`);
    };

    return <>
        <div style={{ textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 24 }}>✍️</div><h2 style={{ fontSize: 17, fontWeight: 700 }}>Copy & CTA</h2></div>

        {/* Quick-Start Templates */}
        <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Quick-Start Templates</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {COPY_SETS.map(t => (
                    <button key={t.id} onClick={() => applyTemplate(t)} style={{
                        padding: "10px 12px", background: T.input, border: `1px solid ${T.border}`,
                        borderRadius: 8, cursor: "pointer", textAlign: "left",
                        transition: "all 0.15s",
                    }} onMouseEnter={(e) => e.currentTarget.style.borderColor = T.primary}
                       onMouseLeave={(e) => e.currentTarget.style.borderColor = T.border}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{t.brand}</div>
                        <div style={{ fontSize: 10, color: T.dim, marginTop: 2 }}>"{t.h1} {t.h1span}"</div>
                    </button>
                ))}
            </div>
        </div>

        {/* AI Generate Button */}
        <button onClick={onAiGenerate} disabled={aiLoading} style={{
            width: "100%", padding: "12px", marginBottom: 20, background: aiLoading ? T.input : `${T.primary}15`,
            border: `1px dashed ${T.primary}`, borderRadius: 8, cursor: aiLoading ? "not-allowed" : "pointer",
            color: T.primary, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
            {aiLoading ? "⏳ Generating..." : "✨ Generate AI Copy"}
        </button>

        <Field label="H1 Headline"><Inp value={c.h1} onChange={v => u("h1", v)} placeholder="Fast Personal Loans Up To $5,000" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Badge Text"><Inp value={c.badge} onChange={v => u("badge", v)} placeholder="No Credit Check Required" /></Field>
            <Field label="CTA Button"><Inp value={c.cta} onChange={v => u("cta", v)} placeholder="Check Your Rate →" /></Field>
        </div>
        <Field label="Sub-headline"><Inp value={c.sub} onChange={v => u("sub", v)} placeholder="Get approved in minutes. Funds fast." /></Field>
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <Field label="Auto-Translate (Gemini)" help="Generate copy in a specific language">
                <div style={{ display: "flex", gap: 10 }}>
                    {["English", "Spanish", "German", "French", "Italian"].map(l => (
                        <button key={l} onClick={() => u("lang", l)} style={{
                            flex: 1, padding: "8px", background: (c.lang || "English") === l ? T.primaryGlow : T.input,
                            border: `2px solid ${(c.lang || "English") === l ? T.primary : T.border}`,
                            borderRadius: 6, cursor: "pointer", color: T.text, fontSize: 11, fontWeight: 600,
                        }}>{l}</button>
                    ))}
                </div>
            </Field>
        </div>
    </>;
}

function StepTracking({ c, u }) {
    const hasValidEmbed = c.formEmbed?.trim() && /<(script|div|iframe)/i.test(c.formEmbed);
    const embedWarning = c.formEmbed?.trim() && !hasValidEmbed;
    const hasAid = !!c.aid?.trim();

    return <>
        <div style={{ textAlign: "center", marginBottom: 20 }}><div style={{ fontSize: 24 }}>📊</div><h2 style={{ fontSize: 17, fontWeight: 700 }}>Tracking & Conversion</h2></div>

        {/* Google Ads — Layer 1 */}
        <div style={{ padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: T.muted }}>Layer 1: Google Ads Conversion</div>
            <Field label="Google Ads Conversion ID"><Inp value={c.conversionId} onChange={v => u("conversionId", v)} placeholder="AW-123456789" /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="form_start Label (Secondary)"><Inp value={c.formStartLabel} onChange={v => u("formStartLabel", v)} placeholder="AbCdEfGhIjK" /></Field>
                <Field label="form_submit Label (Primary)"><Inp value={c.formSubmitLabel} onChange={v => u("formSubmitLabel", v)} placeholder="XyZaBcDeFgH" /></Field>
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4 }}>Only gtag.js — no GTM, no GA4. Easy to swap per account.</div>
        </div>

        {/* Custom Pixel — Layer 2 (automatic, no config needed) */}
        <div style={{ padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, color: T.muted }}>Layer 2: First-Party Pixel</div>
            <div style={{ fontSize: 10, color: T.muted }}>Auto-configured. Sends events to t.&#123;domain&#125;/e via sendBeacon. No setup needed.</div>
        </div>

        {/* Voluum — Layer 3 */}
        <div style={{ padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: T.muted }}>Layer 3: Voluum (Click Tracking + S2S Postback)</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Voluum Pixel ID"><Inp value={c.voluumId} onChange={v => u("voluumId", v)} placeholder="v-id-xxxx" /></Field>
                <Field label="Voluum Domain"><Inp value={c.voluumDomain} onChange={v => u("voluumDomain", v)} placeholder="trk.domain.com" /></Field>
            </div>
        </div>

        {/* LeadsGate / Affiliate Form */}
        <div style={{ padding: 12, background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: T.muted }}>LeadsGate Form</div>
            <Field label="LeadsGate AID" help="Auto-generates form embed with tracking callbacks">
                <Inp value={c.aid} onChange={v => u("aid", v)} placeholder="14881" />
            </Field>
            {hasAid && <div style={{ fontSize: 10, color: "#22c55e", marginTop: 4 }}>Auto-embed with onFormLoad, onStepChange, onSubmit, onSuccess callbacks</div>}
            <Field label="Affiliate Network">
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {NETWORKS_AFF.map(n => (
                        <button key={n} onClick={() => u("network", n)} style={{
                            padding: "7px 14px", background: c.network === n ? T.primaryGlow : T.input,
                            border: `2px solid ${c.network === n ? T.primary : T.border}`,
                            borderRadius: 6, cursor: "pointer", color: T.text, fontSize: 11, fontWeight: 600,
                        }}>{n}</button>
                    ))}
                </div>
            </Field>
        </div>

        {/* Fallback: manual form embed or redirect */}
        {!hasAid && <>
            <Field label="Redirect URL" help="Where users go after clicking CTA (if no AID)"><Inp value={c.redirectUrl} onChange={v => u("redirectUrl", v)} placeholder="https://offers.leadsgate.com/..." /></Field>
            <Field label="Form Embed Code (Advanced)" help="Raw embed code — tracking callbacks NOT auto-added">
                <textarea
                    value={c.formEmbed || ""}
                    onChange={e => u("formEmbed", e.target.value)}
                    placeholder='<script src="https://..."></script>'
                    style={{
                        width: "100%", minHeight: 80, padding: "10px 12px",
                        background: T.input, border: `1px solid ${embedWarning ? T.danger : T.border}`,
                        borderRadius: 8, color: T.text, fontSize: 12, fontFamily: "monospace",
                        resize: "vertical",
                    }}
                />
                {embedWarning && <div style={{ fontSize: 10, color: T.danger, marginTop: 4 }}>Embed should contain &lt;script&gt;, &lt;div&gt;, or &lt;iframe&gt; tags</div>}
            </Field>
        </>}
    </>;
}

function StepReview({ c, building }) {
    const co = COLORS.find(x => x.id === c.colorId) || COLORS[0];
    const selectedTemplate = getTemplateById(c.templateId || DEFAULT_TEMPLATE_ID);
    const astroFiles = useMemo(() => {
        try { return Object.keys(generateAstroByTemplate(c)); } catch { return []; }
    }, [c.templateId, c.brand, c.domain, c.colorId, c.fontId]);
    const [showTree, setShowTree] = useState(false);

    const rows = [
        ["Brand", c.brand], ["Domain", c.domain || "—"], ["Type", LOAN_TYPES.find(l => l.id === c.loanType)?.label],
        ["Template", selectedTemplate?.name || "Classic LP"],
        ["Range", `$${c.amountMin}–$${c.amountMax}`], ["APR", `${c.aprMin}%–${c.aprMax}%`],
        ["Colors", co.name], ["Ads ID", c.conversionId || "—"], ["AID", c.aid || "—"],
    ];

    // Build a tree structure from file paths
    const buildTree = (paths) => {
        const tree = {};
        for (const p of paths) {
            const parts = p.split("/");
            let node = tree;
            for (let i = 0; i < parts.length; i++) {
                const name = parts[i];
                if (i === parts.length - 1) {
                    node[name] = null; // leaf file
                } else {
                    if (!node[name]) node[name] = {};
                    node = node[name];
                }
            }
        }
        return tree;
    };

    const renderTree = (node, depth = 0) => {
        if (!node) return null;
        return Object.entries(node).sort(([a, av], [b, bv]) => {
            // Directories first
            if (av !== null && bv === null) return -1;
            if (av === null && bv !== null) return 1;
            return a.localeCompare(b);
        }).map(([name, children]) => {
            const isDir = children !== null;
            const ext = name.split(".").pop();
            const iconMap = { astro: "🟣", js: "🟡", mjs: "🟡", ts: "🔵", json: "📋", css: "🎨", md: "📄", env: "🔐" };
            const icon = isDir ? "📁" : (iconMap[ext] || "📄");
            return (
                <div key={name + depth}>
                    <div style={{ padding: "2px 0", paddingLeft: depth * 14, fontSize: 11, fontFamily: "monospace", color: isDir ? T.text : T.muted, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 10 }}>{icon}</span>
                        <span style={{ fontWeight: isDir ? 600 : 400 }}>{name}</span>
                    </div>
                    {isDir && renderTree(children, depth + 1)}
                </div>
            );
        });
    };

    return (
        <div>
            <div style={{ marginBottom: 20 }}><div style={{ fontSize: 24 }}>🔍</div><h2 style={{ fontSize: 17, fontWeight: 700 }}>Review & Build</h2></div>
            <div style={{ background: T.input, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ padding: "10px 16px", fontWeight: 600, fontSize: 13, borderBottom: `1px solid ${T.border}` }}>Configuration</div>
                {rows.map(([l, v], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: i < rows.length - 1 ? `1px solid ${T.border}` : "none", fontSize: 12 }}>
                        <span style={{ color: T.muted }}>{l}</span><span style={{ fontWeight: 500 }}>{v}</span>
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {["p", "s", "a"].map(k => <div key={k} style={{ flex: 1, padding: "8px", borderRadius: 8, background: hsl(...co[k]), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>{k.toUpperCase()}</div>)}
            </div>

            {/* Astro Project File Tree */}
            <div style={{ background: T.input, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
                <button onClick={() => setShowTree(!showTree)} style={{
                    width: "100%", padding: "10px 16px", fontWeight: 600, fontSize: 13,
                    borderBottom: showTree ? `1px solid ${T.border}` : "none",
                    background: "transparent", border: "none", color: T.text,
                    cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <span>🚀 Astro Project ({astroFiles.length} files)</span>
                    <span style={{ fontSize: 10, color: T.muted }}>{showTree ? "▲" : "▼"}</span>
                </button>
                {showTree && (
                    <div style={{ padding: "8px 12px", maxHeight: 200, overflowY: "auto" }}>
                        {renderTree(buildTree(astroFiles))}
                    </div>
                )}
            </div>

            {building && <div style={{ textAlign: "center", padding: 12, background: T.primaryGlow, borderRadius: 8, color: T.primary, fontSize: 13, fontWeight: 600, animation: "pulse 1s infinite" }}>⚡ AI is crafting your site...</div>}
        </div>
    );
}
