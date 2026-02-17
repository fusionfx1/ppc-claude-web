import React, { useState, useEffect } from "react";
import { THEME as T, COLORS, FONTS, LAYOUTS, RADIUS, TRUST_BADGE_STYLES, TRUST_BADGE_ICON_TONES } from "../../constants";
import { hsl } from "../../utils";
import { generateFavicon, generateOgImage } from "../../utils/image-gen";
import { Field } from "../Atoms";

export function StepDesign({ c, u }) {
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
    }, [c.colorId, c.fontId, c.brand]);

    return (
        <>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 24 }}>🎨</div>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>Design</h2>
            </div>
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
        </>
    );
}
