"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { extractDominantColours } from "./colour";
import type { WizardProps, WizardResult, WizardSize, WizardDesignLine } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Wizard
//
// Five-step "design your space" flow. Pure controlled component — no
// dependency on any host state store. The host passes sizes, design lines,
// copy + an `onComplete(result)` callback; the wizard owns the
// user's in-flight selections and emits a typed result on submit.
//
// Theming hooks: reads `--color-accent`, `--color-bg`, `--color-surface`,
// `--color-text`, `--color-text-soft`, `--color-border-soft` from the host
// stylesheet. Pass `accentVar` to point at a different variable name.
// ─────────────────────────────────────────────────────────────────────────

export function Wizard({
  sizes,
  designLines,
  initialSizeId,
  initialDesignLineId,
  copy = {},
  accentVar = "--color-accent",
  layout = "full",
  onClose,
  onComplete,
  onState,
}: WizardProps) {
  if (sizes.length === 0 || designLines.length === 0) {
    throw new Error("Wizard requires at least one size and one design line.");
  }

  const accent = `var(${accentVar})`;
  const [step, setStep] = useState(0);
  const [sizeId, setSizeId] = useState<string>(initialSizeId ?? sizes[0]!.id);
  const [designLineId, setDesignLineId] = useState<string>(initialDesignLineId ?? designLines[0]!.id);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const [colours, setColours] = useState<[string, string, string]>(["#1f1f1f", "#e0d6c5", "#d33b2d"]);
  const [extracting, setExtracting] = useState(false);

  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0]!;
  const designLine = designLines.find((d) => d.id === designLineId) ?? designLines[0]!;

  // Live state pulse — fires whenever any selection changes so the host
  // can build a scene in lock-step with the user's progress.
  useEffect(() => {
    if (!onState) return;
    onState({ step, size, designLine, logoUrl, artworkUrl, colours });
  }, [onState, step, size, designLine, logoUrl, artworkUrl, colours]);

  // Auto-run colour extraction whenever the logo changes.
  useEffect(() => {
    if (!logoUrl) return;
    let cancelled = false;
    setExtracting(true);
    extractDominantColours(logoUrl, 3)
      .then((cs) => {
        if (cancelled) return;
        setColours((prev) => [
          cs[0] ?? prev[0],
          cs[1] ?? prev[1],
          cs[2] ?? prev[2],
        ]);
      })
      .finally(() => { if (!cancelled) setExtracting(false); });
    return () => { cancelled = true; };
  }, [logoUrl]);

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const onLogoFile = useCallback((file: File) => {
    const r = new FileReader();
    r.onload = () => { if (typeof r.result === "string") setLogoUrl(r.result); };
    r.readAsDataURL(file);
  }, []);
  const onArtworkFile = useCallback((file: File) => {
    const r = new FileReader();
    r.onload = () => { if (typeof r.result === "string") setArtworkUrl(r.result); };
    r.readAsDataURL(file);
  }, []);

  const submit = () => {
    const result: WizardResult = { size, logoUrl, artworkUrl, colours, designLine };
    onComplete(result);
  };

  const labels = copy.coloursStep?.labels ?? ["Primary", "Carpet", "Accent"];

  // Three layouts:
  // • "full":     page-takeover with a radial-gradient brand wash
  // • "panel":    a 440px-wide column docked to the right (legacy)
  // • "squircle": a floating left-side overlay with a soft squircle silhouette
  //               (border-radius 32px), used when the host wants a less
  //               imposing collector that lets the live 3D preview breathe
  const panelMode = layout === "panel";
  const squircleMode = layout === "squircle";
  const overlayMode = panelMode || squircleMode;
  // Outer container className. Squircle floats inset from the left edge so
  // the 3D scene gets the right-hand 60-70% of the canvas to play with.
  const outerClass = squircleMode
    ? "absolute top-4 left-4 bottom-4 overflow-y-auto scroll-pretty"
    : panelMode
      ? "absolute top-0 right-0 bottom-0 overflow-y-auto"
      : "absolute inset-0 overflow-y-auto";
  return (
    <div
      className={outerClass}
      style={{
        zIndex: 70,
        width: squircleMode
          ? "min(420px, calc(100vw - 32px))"
          : panelMode
            ? "min(440px, 100vw)"
            : undefined,
        background: overlayMode
          ? `linear-gradient(to bottom, color-mix(in srgb, var(--color-bg) 92%, transparent), color-mix(in srgb, var(--color-bg) 82%, transparent))`
          : `radial-gradient(ellipse at top, color-mix(in srgb, ${accent} 8%, var(--color-bg)) 0%, var(--color-bg) 60%)`,
        backdropFilter: overlayMode ? "blur(18px) saturate(140%)" : undefined,
        WebkitBackdropFilter: overlayMode ? "blur(18px) saturate(140%)" : undefined,
        // Squircle: rounded edges + drop shadow with a soft outer glow.
        // Panel: hard right-edge dock with a left-cast shadow + 1px border.
        borderRadius: squircleMode ? 32 : undefined,
        boxShadow: squircleMode
          ? "0 24px 56px -20px rgba(0,0,0,0.34), 0 4px 14px -6px rgba(0,0,0,0.18)"
          : panelMode
            ? "-12px 0 32px -16px rgba(0,0,0,0.28)"
            : undefined,
        border: squircleMode ? "1px solid var(--color-border-soft)" : undefined,
        borderLeft: panelMode ? "1px solid var(--color-border-soft)" : undefined,
      }}
    >
      <div className={squircleMode ? "px-6 py-7" : panelMode ? "px-5 py-7" : "max-w-[1100px] mx-auto px-8 py-10"}>
        {/* Header — close + progress dots */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onClose}
            className="hover:opacity-100 opacity-70 flex items-center gap-1.5 text-[0.72rem] uppercase tracking-wider"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {copy.brandName ? `Back to ${copy.brandName}` : "Back"}
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }, (_, i) => (
              <span
                key={i}
                className="block h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? "32px" : "10px",
                  background: i <= step ? accent : "var(--color-border-soft)",
                }}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            {step === 0 && (
              <StepHeader
                eyebrow="Step 1 of 5"
                title={copy.sizeStep?.title ?? "Choose your size"}
                subtitle={copy.sizeStep?.subtitle ?? "You can change everything later from the configurator."}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
                  {sizes.map((s) => (
                    <SizeCard key={s.id} size={s} active={sizeId === s.id} onClick={() => setSizeId(s.id)} accent={accent} />
                  ))}
                </div>
              </StepHeader>
            )}

            {step === 1 && (
              <StepHeader
                eyebrow="Step 2 of 5"
                title={copy.logoStep?.title ?? "Upload your logo"}
                subtitle={copy.logoStep?.subtitle ?? "We'll splice it in wherever your brand mark appears. Drag a PNG / SVG / JPG here."}
              >
                <Uploader fileUrl={logoUrl} onFile={onLogoFile} accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hint={copy.logoStep?.hint ?? "PNG with transparency works best."} accent={accent} />
              </StepHeader>
            )}

            {step === 2 && (
              <StepHeader
                eyebrow="Step 3 of 5"
                title={copy.artworkStep?.title ?? "Upload a hero artwork"}
                subtitle={copy.artworkStep?.subtitle ?? "We'll feature this as the back-wall graphic. Skip if you'd rather use a solid colour."}
              >
                <Uploader fileUrl={artworkUrl} onFile={onArtworkFile} accept="image/png,image/jpeg,image/webp,image/avif" hint={copy.artworkStep?.hint ?? "Recommended 16:9 or wider, 2048px+ for sharp printing."} accent={accent} />
              </StepHeader>
            )}

            {step === 3 && (
              <StepHeader
                eyebrow="Step 4 of 5"
                title={copy.coloursStep?.title ?? "Brand colours"}
                subtitle={extracting
                  ? "Reading your logo…"
                  : (copy.coloursStep?.subtitle ?? "Auto-picked from your logo. Each one drives a different surface.")}
              >
                <div className="grid grid-cols-3 gap-5 mt-8">
                  {([0, 1, 2] as const).map((i) => (
                    <ColourCard
                      key={i}
                      label={labels[i]!}
                      value={colours[i]}
                      onChange={(v) => setColours((c) => { const n = [...c] as [string, string, string]; n[i] = v; return n; })}
                    />
                  ))}
                </div>
              </StepHeader>
            )}

            {step === 4 && (
              <StepHeader
                eyebrow="Step 5 of 5"
                title={copy.designLineStep?.title ?? "Choose your design line"}
                subtitle={copy.designLineStep?.subtitle ?? "Pick the structural language. You can swap it later from the configurator."}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
                  {designLines.map((d) => (
                    <DesignLineCard key={d.id} line={d} active={designLineId === d.id} onClick={() => setDesignLineId(d.id)} accent={accent} />
                  ))}
                </div>
              </StepHeader>
            )}

            {step === 5 && (
              <StepHeader
                eyebrow="All set"
                title={copy.summaryStep?.title ?? "Ready to build"}
                subtitle={copy.summaryStep?.subtitle ?? "We'll assemble everything in 3D. You can tweak any detail in the configurator."}
              >
                <SummaryCard
                  size={size}
                  designLine={designLine}
                  logoUrl={logoUrl}
                  artworkUrl={artworkUrl}
                  colours={colours}
                  accent={accent}
                />
              </StepHeader>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer — prev / next */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[color:var(--color-border-soft)]">
          <button
            onClick={prev}
            disabled={step === 0}
            className="hover:opacity-100 opacity-70 disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-1.5 text-[0.72rem] uppercase tracking-wider"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
          {step < 5 ? (
            <button
              onClick={next}
              className="px-6 h-10 rounded-[8px] text-[0.78rem] uppercase tracking-wider"
              style={{ background: accent, color: "#fff", fontVariationSettings: '"wdth" 100, "wght" 600', boxShadow: `0 8px 24px -12px color-mix(in srgb, ${accent} 60%, transparent)` }}
            >
              Continue
            </button>
          ) : (
            <button
              onClick={submit}
              className="px-7 h-11 rounded-[8px] text-[0.82rem] uppercase tracking-wider"
              style={{ background: accent, color: "#fff", fontVariationSettings: '"wdth" 100, "wght" 700', boxShadow: `0 12px 32px -12px color-mix(in srgb, ${accent} 70%, transparent)` }}
            >
              {copy.summaryStep?.cta ?? "Build →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step layout helper ──────────────────────────────────────────────────

function StepHeader({
  eyebrow, title, subtitle, children,
}: { eyebrow: string; title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[0.66rem] uppercase tracking-wider opacity-60 mb-2">{eyebrow}</div>
      <h2 className="text-[2rem] tracking-tight mb-2" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{title}</h2>
      {subtitle && <p className="text-[0.78rem] opacity-80 max-w-2xl">{subtitle}</p>}
      {children}
    </div>
  );
}

// ── Step 1: Size card ──────────────────────────────────────────────────

function SizeCard({ size: s, active, onClick, accent }: { size: WizardSize; active: boolean; onClick: () => void; accent: string }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="text-left p-6 rounded-[20px] backdrop-blur-md transition-all"
      style={{
        background: active ? `color-mix(in srgb, ${accent} 14%, var(--color-surface))` : "color-mix(in srgb, var(--color-surface) 80%, transparent)",
        border: active ? `2px solid ${accent}` : "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
        boxShadow: active
          ? `0 18px 40px -16px color-mix(in srgb, ${accent} 50%, transparent)`
          : "0 10px 24px -16px rgba(0,0,0,0.15)",
      }}
    >
      <div className="text-[0.66rem] uppercase tracking-wider opacity-60 mb-1">{s.id} · {s.sqm} m²</div>
      <div className="text-[1.6rem] tracking-tight mb-1" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{s.label}</div>
      <div className="text-[0.78rem] opacity-70 mb-2">{s.description}</div>
      <div className="text-[0.7rem] opacity-55" style={{ fontVariantNumeric: "tabular-nums" }}>
        {s.widthM.toFixed(1)} × {s.depthM.toFixed(1)} m
      </div>
    </motion.button>
  );
}

// ── Steps 2-3: Uploader ────────────────────────────────────────────────

function Uploader({ fileUrl, onFile, accept, hint, accent }: { fileUrl: string | null; onFile: (f: File) => void; accept: string; hint?: string; accent: string }) {
  return (
    <div className="mt-8">
      <label
        className="block aspect-[16/9] max-h-[360px] rounded-[20px] border-2 border-dashed cursor-pointer transition-all relative overflow-hidden"
        style={{
          background: fileUrl ? "color-mix(in srgb, var(--color-surface) 60%, transparent)" : "color-mix(in srgb, var(--color-surface) 30%, transparent)",
          borderColor: fileUrl ? accent : "color-mix(in srgb, var(--color-text) 18%, transparent)",
          backdropFilter: "blur(8px)",
        }}
      >
        {fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt="upload preview" className="absolute inset-0 w-full h-full object-contain p-6" style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.25))" }} />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center px-8">
            <div>
              <div className="w-14 h-14 mx-auto rounded-full mb-3 grid place-items-center" style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)` }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4v12M6 10l6-6 6 6M4 20h16" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-[0.95rem] mb-1" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>Drop a file or click to upload</div>
              {hint && <div className="text-[0.72rem] opacity-60">{hint}</div>}
            </div>
          </div>
        )}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
      </label>
    </div>
  );
}

// ── Step 4: Colour card ────────────────────────────────────────────────

function ColourCard({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-[16px] p-4 backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--color-surface) 65%, transparent)", boxShadow: "0 8px 24px -16px rgba(0,0,0,0.18)" }}>
      <div className="text-[0.72rem] opacity-70 mb-3">{label}</div>
      <label className="block aspect-square rounded-[12px] cursor-pointer relative overflow-hidden" style={{ background: value, boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-text) 10%, transparent)" }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </label>
      <div className="text-[0.78rem] mt-2 text-center opacity-70" style={{ fontVariantNumeric: "tabular-nums" }}>{value.toUpperCase()}</div>
    </div>
  );
}

// ── Step 5: Design line card ───────────────────────────────────────────

function DesignLineCard({ line, active, onClick, accent }: { line: WizardDesignLine; active: boolean; onClick: () => void; accent: string }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="text-left p-6 rounded-[20px] backdrop-blur-md transition-all"
      style={{
        background: active ? `color-mix(in srgb, ${accent} 14%, var(--color-surface))` : "color-mix(in srgb, var(--color-surface) 80%, transparent)",
        border: active ? `2px solid ${accent}` : "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
        boxShadow: active
          ? `0 18px 40px -16px color-mix(in srgb, ${accent} 50%, transparent)`
          : "0 10px 24px -16px rgba(0,0,0,0.15)",
      }}
    >
      {line.preview ?? <DefaultPreview id={line.id} active={active} accent={accent} />}
      <div className="text-[0.66rem] uppercase tracking-wider opacity-60 mt-4 mb-1">{line.tagline}</div>
      <div className="text-[1.4rem] tracking-tight mb-1" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{line.label}</div>
      <div className="text-[0.78rem] opacity-70">{line.description}</div>
    </motion.button>
  );
}

function DefaultPreview({ id, active, accent }: { id: string; active: boolean; accent: string }) {
  // A small hash-based decoration so unknown design-line ids still render
  // something visually distinct. The host can pass a real preview ReactNode
  // via `designLine.preview` if it wants bespoke artwork.
  const stroke = active ? accent : "currentColor";
  const seed = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0);
  const variant = seed % 3;
  return (
    <div className="aspect-[16/10] rounded-[12px] grid place-items-center" style={{ background: "color-mix(in srgb, var(--color-text) 5%, transparent)" }}>
      <svg width="120" height="75" viewBox="0 0 120 75" fill="none" style={{ opacity: active ? 1 : 0.55 }}>
        {variant === 0 && (
          <>
            <rect x="6" y="10" width="16" height="50" rx="2" stroke={stroke} strokeWidth="1.6" />
            <rect x="28" y="10" width="16" height="50" rx="2" stroke={stroke} strokeWidth="1.6" />
            <rect x="76" y="10" width="16" height="50" rx="2" stroke={stroke} strokeWidth="1.6" />
            <rect x="98" y="10" width="16" height="50" rx="2" stroke={stroke} strokeWidth="1.6" />
          </>
        )}
        {variant === 1 && Array.from({ length: 4 }, (_, c) =>
          Array.from({ length: 3 }, (_, r) => (
            <rect key={`${c}-${r}`} x={10 + c * 25} y={6 + r * 20} width="22" height="17" rx="1" stroke={stroke} strokeWidth="1.4" />
          )),
        )}
        {variant === 2 && (
          <>
            <line x1="10" y1="2" x2="110" y2="2" stroke={stroke} strokeWidth="1.4" />
            <rect x="12"  y="14" width="20" height="44" rx="1" stroke={stroke} strokeWidth="1.4" />
            <rect x="50"  y="14" width="20" height="44" rx="1" stroke={stroke} strokeWidth="1.4" />
            <rect x="88"  y="14" width="20" height="44" rx="1" stroke={stroke} strokeWidth="1.4" />
          </>
        )}
      </svg>
    </div>
  );
}

// ── Summary card ───────────────────────────────────────────────────────

function SummaryCard({
  size, designLine, logoUrl, artworkUrl, colours, accent,
}: { size: WizardSize; designLine: WizardDesignLine; logoUrl: string | null; artworkUrl: string | null; colours: [string, string, string]; accent: string }) {
  return (
    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="p-6 rounded-[20px] backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--color-surface) 70%, transparent)" }}>
        <div className="text-[0.66rem] uppercase tracking-wider opacity-60 mb-1">Room</div>
        <div className="text-[1.4rem] mb-4" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{size.label} · {size.sqm} m² · {designLine.label}</div>
        <div className="text-[0.72rem] opacity-70 mb-1">Dimensions</div>
        <div className="text-[1.4rem] tracking-tight" style={{ color: accent, fontVariationSettings: '"wdth" 100, "wght" 600', fontVariantNumeric: "tabular-nums" }}>
          {size.widthM.toFixed(1)} × {size.depthM.toFixed(1)} m
        </div>
      </div>
      <div className="p-6 rounded-[20px] backdrop-blur-md flex items-center gap-4" style={{ background: "color-mix(in srgb, var(--color-surface) 70%, transparent)" }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="logo" className="h-16 w-16 object-contain rounded-[8px] p-1" style={{ background: "var(--color-bg)" }} />
        ) : (
          <div className="h-16 w-16 rounded-[8px] grid place-items-center text-[0.7rem] opacity-40" style={{ background: "color-mix(in srgb, var(--color-text) 6%, transparent)" }}>no logo</div>
        )}
        <div className="flex-1">
          <div className="text-[0.72rem] opacity-70 mb-1">Brand colours</div>
          <div className="flex gap-1.5">
            {colours.map((c, i) => (
              <span key={i} className="block h-8 w-8 rounded-md" style={{ background: c, boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--color-text) 12%, transparent)" }} />
            ))}
          </div>
        </div>
      </div>
      {artworkUrl && (
        <div className="md:col-span-2 p-2 rounded-[20px] backdrop-blur-md" style={{ background: "color-mix(in srgb, var(--color-surface) 70%, transparent)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artworkUrl} alt="back-wall hero" className="w-full aspect-[16/6] object-cover rounded-[14px]" />
        </div>
      )}
    </div>
  );
}
