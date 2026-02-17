import React, { useState, useMemo, useEffect, useRef } from "react";
import { THEME as T } from "../constants";
import { uid, now } from "../utils";
import { generateHtmlByTemplate } from "../utils/template-router";
import { api } from "../services/api";
import { Card, Btn, MockPhone } from "./Atoms";
import { StepBrand, StepProduct, StepDesign, StepCopy, StepTracking, StepReview } from "./Wizard/index.js";

// Domain validation regex
const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

// URL validation for redirect URLs
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

// Validation function for each step
function validateStep(stepNum, config) {
    const errors = [];

    if (stepNum === 1) {
        if (!config.brand?.trim()) errors.push("Brand Name is required");
        if (!config.domain?.trim()) errors.push("Domain is required");
        // Validate domain format
        if (config.domain?.trim() && !DOMAIN_REGEX.test(config.domain.trim())) {
            errors.push("Invalid domain format (e.g., example.com)");
        }
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
        // Validate redirect URL format
        if (hasRedirect && !isValidUrl(hasRedirect)) {
            errors.push("Redirect URL must be a valid URL (e.g., https://example.com)");
        }
        if (hasEmbed && !/<(script|div|iframe)/i.test(hasEmbed)) {
            errors.push("Form Embed should contain &lt;script&gt;, &lt;div&gt;, or &lt;iframe&gt; tags");
        }
    }

    return { valid: errors.length === 0, errors };
}

const steps = ["Brand", "Product", "Design", "Copy", "Tracking", "Review"];

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
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    const handleNext = () => {
        const { valid, errors } = validateStep(step, config);
        if (!valid) {
            setValidationErrors(errors);
            cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        setValidationErrors([]);
        if (step < 6) setStep(s => s + 1);
    };

    const handleBackOrCancel = () => {
        if (isDirty && step > 1) {
            if (confirm("You have unsaved changes. Are you sure you want to go back?")) {
                step === 1 ? setPage("dashboard") : setStep(s => s - 1);
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
        } catch (e) {
            console.warn("[Wizard] AI generation failed:", e?.message || e);
            notify("AI generation failed. Check your API key.", "warning");
        } finally {
            setAiLoading(false);
        }
    };

    const handleBuild = async () => {
        setBuilding(true);
        let finalConfig = { ...config };

        // Only generate AI copy if fields are empty
        const needsAiCopy = !finalConfig.h1 || !finalConfig.badge || !finalConfig.cta || !finalConfig.sub;
        if (needsAiCopy) {
            try {
                const p = await api.post("/ai/generate-copy", {
                    brand: finalConfig.brand,
                    loanType: finalConfig.loanType,
                    amountMin: finalConfig.amountMin,
                    amountMax: finalConfig.amountMax,
                    lang: finalConfig.lang || "English"
                });

                if (p && !p.error) {
                    if (!finalConfig.h1 && p.h1) finalConfig.h1 = p.h1;
                    if (!finalConfig.badge && p.badge) finalConfig.badge = p.badge;
                    if (!finalConfig.cta && p.cta) finalConfig.cta = p.cta;
                    if (!finalConfig.sub && p.sub) finalConfig.sub = p.sub;
                    if (!finalConfig.tagline && p.tagline) finalConfig.tagline = p.tagline;
                    setConfig(prev => ({ ...prev, ...finalConfig }));
                }
            } catch (e) {
                // AI copy generation is optional - continue with default values
                console.warn("[Wizard] Auto AI generation skipped:", e?.message || e);
            }
        }

        await new Promise(r => setTimeout(r, 1000));
        if (finalConfig._editMode) {
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
        () => generateHtmlByTemplate(config),
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
