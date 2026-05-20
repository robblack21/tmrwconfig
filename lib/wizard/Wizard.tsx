"use client";
import { useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { extractDominantColours, harmonise, type HarmonyRule } from "./colour";
import type { WizardProps, WizardResult, WizardSize, WizardDesignLine, WizardExtendedColours, WizardCustomisation, WizardEnvironment } from "./types";
import type { PendantShape } from "@/lib/schemas";

const HARMONY_RULES: { id: HarmonyRule; label: string; description: string }[] = [
  { id: "complementary",      label: "Complementary",      description: "Brand + its opposite for high contrast" },
  { id: "triadic",            label: "Triadic",            description: "Three evenly-spaced hues — balanced and bold" },
  { id: "splitComplementary", label: "Split-complementary", description: "Complement softened by 30° — friendlier than full opposites" },
  { id: "analogous",          label: "Analogous",          description: "Adjacent hues — calm, harmonious" },
];

// Total steps in the wizard (0..TOTAL_STEPS-1). Bumping this needs
// matching step blocks in the AnimatePresence body below.
//   0: Size · 1: Logo · 2: Artwork · 3: Brand colours · 4: Design line
//   5: Environment · 6: Customisation · 7: Summary
const TOTAL_STEPS = 8;
const LAST_STEP = TOTAL_STEPS - 1;

/** Mix two hex colours in sRGB-ish space. t=0 returns a, t=1 returns b. */
function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ar = parseInt(pa.slice(0, 2), 16), ag = parseInt(pa.slice(2, 4), 16), ab = parseInt(pa.slice(4, 6), 16);
  const br = parseInt(pb.slice(0, 2), 16), bg = parseInt(pb.slice(2, 4), 16), bb = parseInt(pb.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t).toString(16).padStart(2, "0");
  const g = Math.round(ag + (bg - ag) * t).toString(16).padStart(2, "0");
  const b2 = Math.round(ab + (bb - ab) * t).toString(16).padStart(2, "0");
  return `#${r}${g}${b2}`;
}

/** Auto-derive floor / table / chair colours from the user's three brand
 *  swatches. Mirrors the scene's `tableResolved` / `chairResolved` mixing
 *  recipes so the wizard preview matches what the configurator actually
 *  renders. */
function deriveExtendedColours([primary, carpet, accent, highlight]: [string, string, string, string]): WizardExtendedColours {
  void highlight; // reserved — extended surfaces still derive from primary/carpet/accent
  // Floor reads as the user's "carpet" pick directly — it IS the floor.
  // Table = brand-tinted dark walnut.
  // Chairs = a soft mid-tone built from the accent over a dark anchor.
  // Cups = lightened neutral with a hint of carpet so they read as
  //   ceramic-with-brand-undertone.
  // Pendant = primary darkened, gives the suspended sign a punchier
  //   silhouette against the ceiling.
  return {
    floor:   carpet,
    table:   mixHex("#1a1814", primary, 0.3),
    chairs:  mixHex("#222428", accent, 0.55),
    cups:    mixHex("#f5f4ee", carpet, 0.18),
    pendant: mixHex("#0a0a0a", primary, 0.55),
  };
}

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
  environments = [],
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
  // Default to the MIDDLE size card (Meeting Room for our preset) — the
  // most common pick, and the most flattering visual baseline for the
  // live 3D preview. Host can override via `initialSizeId`.
  const defaultSize = sizes[Math.min(Math.floor(sizes.length / 2), sizes.length - 1)] ?? sizes[0]!;
  const [sizeId, setSizeId] = useState<string>(initialSizeId ?? defaultSize.id);
  // Step 1 fine-tune sliders — width × depth × wall-height. Default to the
  // picked size card's dims, then track user edits. A "touched" flag per
  // axis stops the preset re-applying its size when the user has dialled
  // in their own number. Resets to preset values whenever the user picks
  // a different size card.
  const [dimsTouched, setDimsTouched] = useState<{ w: boolean; d: boolean; h: boolean }>({ w: false, d: false, h: false });
  const [widthM,  setWidthM]   = useState<number>(defaultSize.widthM);
  const [depthM,  setDepthM]   = useState<number>(defaultSize.depthM);
  const [heightM, setHeightM]  = useState<number>(4.5);
  const [designLineId, setDesignLineId] = useState<string>(initialDesignLineId ?? designLines[0]!.id);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [artworkUrls, setArtworkUrls] = useState<[string | null, string | null, string | null, string | null]>([null, null, null, null]);
  const artworkUrl = artworkUrls[0]; // first slot drives the back wall full-bleed
  const [colours, setColours] = useState<[string, string, string, string]>(["#1f1f1f", "#e0d6c5", "#d33b2d", "#1a1814"]);
  // Extended colours (floor/table/chairs). Tracked separately from `colours`
  // so the user can edit individual derived swatches without losing the
  // auto-derivation. Re-derived whenever the user hasn't touched them.
  const [extendedColours, setExtendedColours] = useState<WizardExtendedColours>(() => deriveExtendedColours(["#1f1f1f", "#e0d6c5", "#d33b2d", "#1a1814"]));
  const [extendedTouched, setExtendedTouched] = useState<{ floor: boolean; table: boolean; chairs: boolean; cups: boolean; pendant: boolean }>({ floor: false, table: false, chairs: false, cups: false, pendant: false });
  // Customisation (cups / plants / sofas / displays) — new step 5.
  // Defaults mirror the configurator's defaults so a "skip the step" user
  // gets a sensible room.
  const [customisation, setCustomisation] = useState<WizardCustomisation>({
    cupsEnabled: true,
    plantCount: 2,
    sofaCount: 0,
    standingDisplayCount: 0,
    posterboardCount: 0,
    posterboardUrls: [null, null, null, null],
    cubeCount: 0,
    cubeAssets: [null, null, null, null],
    pendantShape: undefined,
  });
  // Anthracite dark-mode toggle. Applies only to the wizard chrome —
  // swaps a small set of CSS vars on the wizard's own root element so
  // text + surfaces darken without touching the host's global theme.
  const [darkMode, setDarkMode] = useState(false);
  // HDRI environment id picked in step 5. Null = keep the host's
  // current default (warehouse interior).
  const [environmentId, setEnvironmentId] = useState<string | null>(null);
  // AI-generated environment URL — when the user types a prompt in
  // step 5 and the fal.ai call returns, we store the URL here. The
  // host applies it as a skydome via `scene.setCustomEnvironment`. Null
  // = no AI environment, fall back to the HDRI pipeline.
  const [customEnvironmentUrl, setCustomEnvironmentUrl] = useState<string | null>(null);
  const [envPrompt, setEnvPrompt] = useState("");
  const [envGenerating, setEnvGenerating] = useState(false);
  const [envError, setEnvError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);

  const sizeBase = sizes.find((s) => s.id === sizeId) ?? sizes[0]!;
  // Effective `size` honours any user edits to the W/D sliders. We
  // splice the touched dims over the preset's; sqm/label/description
  // stay from the card so the chrome still reads as that preset.
  const size: WizardSize = {
    ...sizeBase,
    widthM: dimsTouched.w ? widthM : sizeBase.widthM,
    depthM: dimsTouched.d ? depthM : sizeBase.depthM,
  };

  // Whenever the user picks a NEW size card, reset the touched flags so
  // its preset dims flow in. Subsequent slider edits flip the touched
  // flag and stick.
  useEffect(() => {
    setWidthM(sizeBase.widthM);
    setDepthM(sizeBase.depthM);
    setDimsTouched({ w: false, d: false, h: false });
  }, [sizeBase.id, sizeBase.widthM, sizeBase.depthM]);
  const designLine = designLines.find((d) => d.id === designLineId) ?? designLines[0]!;

  // Active harmony rule for the swatch palette. Declared before the
  // derive useEffect so that effect can read it. When the user picks
  // a rule we re-derive the FULL 8-colour palette (brand row + surface
  // row); subsequently editing the primary swatch keeps the rule active
  // and re-derives. Editing any other swatch drops the rule.
  const [harmony, setHarmony] = useState<HarmonyRule | null>(null);

  // Whenever the user edits the primary swatches, re-derive any extended
  // swatches they HAVEN'T manually touched. Keeps the second-line palette
  // tracking the first-line unless the user has explicitly overridden.
  //
  // Harmony-aware: when a harmony rule is active, the EXTENDED swatches
  // come from positions [4..7] of `harmonise` (which produces a true
  // 8-colour palette spanning every paintable surface). Without a rule,
  // we fall back to the perceptual `deriveExtendedColours` blender.
  useEffect(() => {
    let derived;
    if (harmony) {
      const eight = harmonise(colours[0], harmony);
      const fallback = deriveExtendedColours(colours);
      derived = {
        floor:   eight[4],
        table:   eight[5],
        chairs:  eight[6],
        cups:    fallback.cups,                 // cups stay branded white/cream
        pendant: eight[7],
      };
    } else {
      derived = deriveExtendedColours(colours);
    }
    setExtendedColours((prev) => ({
      floor:   extendedTouched.floor   ? prev.floor   : derived.floor,
      table:   extendedTouched.table   ? prev.table   : derived.table,
      chairs:  extendedTouched.chairs  ? prev.chairs  : derived.chairs,
      cups:    extendedTouched.cups    ? prev.cups    : derived.cups,
      pendant: extendedTouched.pendant ? prev.pendant : derived.pendant,
    }));
  }, [colours, extendedTouched, harmony]);

  // Live state pulse — fires whenever any selection changes so the host
  // can build a scene in lock-step with the user's progress.
  useEffect(() => {
    if (!onState) return;
    onState({ step, size, wallHeightM: heightM, designLine, logoUrl, artworkUrl, artworkUrls, colours, extendedColours, customisation, environmentId, customEnvironmentUrl });
  }, [onState, step, size, heightM, designLine, logoUrl, artworkUrl, artworkUrls, colours, extendedColours, customisation, environmentId, customEnvironmentUrl]);

  // Auto-run colour extraction whenever the logo changes.
  useEffect(() => {
    if (!logoUrl) return;
    let cancelled = false;
    setExtracting(true);
    extractDominantColours(logoUrl, 4)
      .then((cs) => {
        if (cancelled) return;
        setColours((prev) => [
          cs[0] ?? prev[0],
          cs[1] ?? prev[1],
          cs[2] ?? prev[2],
          cs[3] ?? prev[3],
        ]);
      })
      .finally(() => { if (!cancelled) setExtracting(false); });
    return () => { cancelled = true; };
  }, [logoUrl]);

  const next = () => setStep((s) => Math.min(s + 1, LAST_STEP));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const onLogoFile = useCallback((file: File) => {
    const r = new FileReader();
    r.onload = () => { if (typeof r.result === "string") setLogoUrl(r.result); };
    r.readAsDataURL(file);
  }, []);
  const onArtworkFile = useCallback((file: File, slot: number) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result !== "string") return;
      const url = r.result;
      setArtworkUrls((prev) => {
        const next = [...prev] as [string | null, string | null, string | null, string | null];
        next[slot] = url;
        return next;
      });
    };
    r.readAsDataURL(file);
  }, []);
  const onArtworkClear = useCallback((slot: number) => {
    setArtworkUrls((prev) => {
      const next = [...prev] as [string | null, string | null, string | null, string | null];
      next[slot] = null;
      return next;
    });
  }, []);

  const submit = () => {
    const result: WizardResult = { size, wallHeightM: heightM, logoUrl, artworkUrl, artworkUrls, colours, extendedColours, designLine, customisation, environmentId, customEnvironmentUrl };
    onComplete(result);
  };

  const labels = copy.coloursStep?.labels ?? ["Primary", "Carpet", "Accent", "Highlight"];

  const applyHarmony = (rule: HarmonyRule) => {
    setHarmony(rule);
    const eight = harmonise(colours[0], rule);
    // First 4 → brand row (walls / trim / accent / highlight).
    setColours([eight[0], eight[1], eight[2], eight[3]]);
    // Last 4 → surface row (floor / table / chairs / pendant). Cups stays
    // auto-derived (white/cream brand standard). All five "touched" flags
    // get RESET because the user picked a harmony rule, which is an
    // explicit instruction to re-derive the whole palette.
    setExtendedColours((prev) => ({
      floor:   eight[4],
      table:   eight[5],
      chairs:  eight[6],
      cups:    prev.cups,                       // keep cup colour as-is
      pendant: eight[7],
    }));
    setExtendedTouched({ floor: false, table: false, chairs: false, cups: false, pendant: false });
  };

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
  // Anthracite dark-mode CSS-var overrides — scoped to the wizard root via
  // inline style so the host's globals aren't touched. Toggled by the
  // header button below.
  const darkVars = darkMode
    ? {
        // Anthracite ~ #1a1c20 with slightly cooler surface
        "--color-bg":            "#16181c" as const,
        "--color-surface":       "#202329" as const,
        "--color-surface-sub":   "#1a1c22" as const,
        "--color-text":          "#e8eaf0" as const,
        "--color-text-soft":     "#a4a8b3" as const,
        "--color-border-soft":   "#2a2d35" as const,
      }
    : {};

  return (
    <div
      // data-wizard-overlay: tells the long-press detector to bail when
      // the user is interacting with the wizard UI on top of the canvas.
      data-wizard-overlay
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
        color: "var(--color-text)",
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
        ...darkVars,
      } as React.CSSProperties}
    >
      <div className={squircleMode ? "px-6 py-7" : panelMode ? "px-5 py-7" : "max-w-[1100px] mx-auto px-8 py-10"}>
        {/* Header — close · dark-mode toggle · progress dots */}
        <div className="flex items-center justify-between mb-8 gap-2">
          <button
            onClick={onClose}
            className="hover:opacity-100 opacity-70 flex items-center gap-1.5 text-[0.72rem] uppercase tracking-wider flex-shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {copy.brandName ? `Back to ${copy.brandName}` : "Back"}
          </button>
          <div className="flex items-center gap-1 flex-shrink min-w-0">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <motion.span
                key={i}
                className="block h-1.5 rounded-full"
                animate={{
                  width: i === step ? 24 : 8,
                  backgroundColor: i <= step ? accent : "var(--color-border-soft)",
                }}
                transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.6 }}
              />
            ))}
          </div>
          {/* Anthracite dark-mode toggle — swaps a small set of CSS vars on
              this wizard root so the chrome darkens without touching the
              host's globals. Doesn't affect the 3D scene behind it. */}
          <button
            onClick={() => setDarkMode((v) => !v)}
            title={darkMode ? "Switch to light" : "Switch to dark"}
            aria-label={darkMode ? "Switch to light" : "Switch to dark"}
            className="flex-shrink-0 h-7 w-7 rounded-full grid place-items-center hover:opacity-100 opacity-70 transition-opacity"
            style={{ background: "color-mix(in srgb, var(--color-text) 6%, transparent)" }}
          >
            {darkMode ? (
              // Sun icon — currently dark, tap for light
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                <circle cx="6.5" cy="6.5" r="2.4" stroke="currentColor" strokeWidth="1.4" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                  <line key={deg} x1="6.5" y1="0.8" x2="6.5" y2="2.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" transform={`rotate(${deg} 6.5 6.5)`} />
                ))}
              </svg>
            ) : (
              // Moon icon — currently light, tap for dark
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
                <path d="M10 7.5A4.5 4.5 0 0 1 5.5 3a4.5 4.5 0 1 0 5 4.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
            exit={{    opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 180, damping: 26, mass: 0.8 }}
          >
            {step === 0 && (
              <StepHeader
                eyebrow={`Step 1 of ${TOTAL_STEPS}`}
                title={copy.sizeStep?.title ?? "Choose your size"}
                subtitle={copy.sizeStep?.subtitle ?? "You can change everything later from the configurator."}
              >
                {/* Vertical stack in the squircle layout — fits the 420px
                    column cleanly. Each card reads as a row with label /
                    sqm / dimensions on a single line. Staggered reveal so
                    the cards cascade in rather than popping together. */}
                <motion.div
                  className="flex flex-col gap-3 mt-6 items-stretch"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden:  { opacity: 1 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
                  }}
                >
                  {sizes.map((s) => (
                    <motion.div
                      key={s.id}
                      className="w-full"
                      variants={{
                        hidden:  { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 240, damping: 22 } },
                      }}
                    >
                      <SizeCard size={s} active={sizeId === s.id} onClick={() => setSizeId(s.id)} accent={accent} />
                    </motion.div>
                  ))}
                </motion.div>
                {/* Fine-tune dims — width × depth × wall-height. Edits
                    here flow through to footprint.set / setWallHeight
                    via the host's onState handler. */}
                <div className="text-[0.62rem] uppercase tracking-wider opacity-50 mt-5 mb-2">Fine-tune</div>
                <div className="flex flex-col gap-3">
                  <WizardSlider
                    label="Width"  value={size.widthM} min={2.5} max={12} step={0.5} unit="m"
                    onChange={(v) => { setWidthM(v); setDimsTouched((t) => ({ ...t, w: true })); }}
                    accent={accent}
                  />
                  <WizardSlider
                    label="Depth"  value={size.depthM} min={2.5} max={12} step={0.5} unit="m"
                    onChange={(v) => { setDepthM(v); setDimsTouched((t) => ({ ...t, d: true })); }}
                    accent={accent}
                  />
                  <WizardSlider
                    label="Height" value={heightM} min={2.4} max={5.5} step={0.1} unit="m"
                    onChange={(v) => { setHeightM(v); setDimsTouched((t) => ({ ...t, h: true })); }}
                    accent={accent}
                  />
                </div>
                {/* Compact pendant shape picker. Lives on step 1 because
                    the silhouette decision pairs naturally with the
                    other room-form choices (W/D/H). Tiny SVG glyphs +
                    a row of square buttons so the whole row fits in
                    one breath inside the 420px squircle column. */}
                <div className="text-[0.62rem] uppercase tracking-wider opacity-50 mt-5 mb-2">Pendant shape</div>
                <PendantShapeRow
                  value={customisation.pendantShape}
                  onChange={(s) => setCustomisation((c) => ({ ...c, pendantShape: s }))}
                  accent={accent}
                />
              </StepHeader>
            )}

            {step === 1 && (
              <StepHeader
                eyebrow={`Step 2 of ${TOTAL_STEPS}`}
                title={copy.logoStep?.title ?? "Upload your logo"}
                subtitle={copy.logoStep?.subtitle ?? "We'll splice it in wherever your brand mark appears. Drag a PNG / SVG / JPG here."}
              >
                <Uploader fileUrl={logoUrl} onFile={onLogoFile} accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" hint={copy.logoStep?.hint ?? "PNG with transparency works best."} accent={accent} />
              </StepHeader>
            )}

            {step === 2 && (
              <StepHeader
                eyebrow={`Step 3 of ${TOTAL_STEPS}`}
                title={copy.artworkStep?.title ?? "Hero artworks"}
                subtitle={copy.artworkStep?.subtitle ?? "Up to four images. Slot 1 drives the back-wall full-bleed; slots 2–4 hang as wall posters."}
              >
                <div className="grid grid-cols-2 gap-3 mt-5">
                  {[0, 1, 2, 3].map((slot) => (
                    <ArtworkSlot
                      key={slot}
                      slot={slot}
                      fileUrl={artworkUrls[slot]}
                      onFile={(f) => onArtworkFile(f, slot)}
                      onClear={() => onArtworkClear(slot)}
                      accent={accent}
                    />
                  ))}
                </div>
                <div className="text-[0.62rem] opacity-55 mt-3">Slot 1 is the back-wall hero. Remaining slots become exhibition wall posters.</div>
              </StepHeader>
            )}

            {step === 3 && (
              <StepHeader
                eyebrow={`Step 4 of ${TOTAL_STEPS}`}
                title={copy.coloursStep?.title ?? "Brand colours"}
                subtitle={extracting
                  ? "Reading your logo…"
                  : (copy.coloursStep?.subtitle ?? "Brand row auto-picked from your logo. Surfaces row auto-derived — edit any swatch to override.")}
              >
                {/* Brand row — four logo-extracted swatches. The 4th
                    ("Highlight") drives the pendant + any other tertiary
                    accent surface via the extendedColours pipe. */}
                <div className="text-[0.6rem] uppercase tracking-wider opacity-55 mt-5 mb-1.5">Brand</div>
                <div className="grid grid-cols-4 gap-2">
                  {([0, 1, 2, 3] as const).map((i) => (
                    <ColourCard
                      key={i} compact
                      label={labels[i]!}
                      value={colours[i]}
                      onChange={(v) => {
                        // Edit primary while a harmony is active → re-derive
                        // the WHOLE 8-colour palette (brand + surface). This
                        // gives the user a "drag the primary, watch the room
                        // recolour everything" interaction. Editing any other
                        // swatch drops the rule (manual mode).
                        if (i === 0 && harmony) {
                          const eight = harmonise(v, harmony);
                          setColours([eight[0], eight[1], eight[2], eight[3]]);
                          setExtendedColours((prev) => ({
                            floor:   eight[4],
                            table:   eight[5],
                            chairs:  eight[6],
                            cups:    prev.cups,
                            pendant: eight[7],
                          }));
                          setExtendedTouched({ floor: false, table: false, chairs: false, cups: false, pendant: false });
                          return;
                        }
                        if (i !== 0) setHarmony(null);
                        setColours((c) => {
                          const n = [...c] as [string, string, string, string];
                          n[i] = v;
                          return n;
                        });
                      }}
                    />
                  ))}
                </div>
                {/* Surfaces row — derived from brand + editable. */}
                <div className="text-[0.6rem] uppercase tracking-wider opacity-55 mt-3 mb-1.5">Surfaces</div>
                <div className="grid grid-cols-4 gap-2">
                  <ColourCard compact label="Floor"  value={extendedColours.floor}  onChange={(v) => { setExtendedColours((c) => ({ ...c, floor:  v })); setExtendedTouched((t) => ({ ...t, floor:  true })); }} />
                  <ColourCard compact label="Table"  value={extendedColours.table}  onChange={(v) => { setExtendedColours((c) => ({ ...c, table:  v })); setExtendedTouched((t) => ({ ...t, table:  true })); }} />
                  <ColourCard compact label="Chairs" value={extendedColours.chairs} onChange={(v) => { setExtendedColours((c) => ({ ...c, chairs: v })); setExtendedTouched((t) => ({ ...t, chairs: true })); }} />
                  <ColourCard compact label="Cups"   value={extendedColours.cups}   onChange={(v) => { setExtendedColours((c) => ({ ...c, cups:   v })); setExtendedTouched((t) => ({ ...t, cups:   true })); }} />
                </div>
                {/* Harmony schemes — each button renders a static preview
                    of the trio it WOULD produce from the current primary,
                    so the user can compare all four at a glance and
                    "selecting one doesn't corrupt the others" — the
                    previews are derived live but the click is the only
                    state change. */}
                <div className="text-[0.6rem] uppercase tracking-wider opacity-55 mt-4 mb-1.5">Harmony</div>
                <div className="grid grid-cols-2 gap-2">
                  {HARMONY_RULES.map((h) => {
                    const preview = harmonise(colours[0], h.id);
                    const isActive = harmony === h.id;
                    return (
                      <button
                        key={h.id}
                        onClick={() => applyHarmony(h.id)}
                        title={h.description}
                        className="text-left rounded-[12px] px-2.5 py-2 transition-all neumorph-raised"
                        style={{
                          // Active pill: brand accent fill with neumorphic
                          // inset highlight. Inactive: surface colour with
                          // the existing neumorph-raised shadow.
                          background: isActive ? accent : "var(--color-surface)",
                          color: isActive ? "#fff" : "currentColor",
                          boxShadow: isActive
                            ? "inset 0 1px 0 rgba(255,255,255,0.30), inset 0 -1px 0 rgba(0,0,0,0.18), " +
                              `0 8px 22px -10px color-mix(in srgb, ${accent} 60%, transparent), ` +
                              "0 2px 6px -1px rgba(0,0,0,0.18)"
                            : undefined,
                        }}
                      >
                        {/* Two rows of four swatches — top row = brand
                            (walls / trim / accent / highlight), bottom
                            row = surfaces (floor / table / chairs /
                            pendant). The user sees every surface a
                            harmony rule will touch before clicking. */}
                        <div className="flex flex-col gap-1 mb-1">
                          <div className="flex items-center gap-1">
                            {preview.slice(0, 4).map((c, i) => (
                              <span key={i} className="h-[20px] w-[20px] rounded-[6px]" style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)" }} />
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            {preview.slice(4, 8).map((c, i) => (
                              <span key={i} className="h-[20px] w-[20px] rounded-[6px]" style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)" }} />
                            ))}
                          </div>
                        </div>
                        <div className="text-[0.68rem]" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{h.label}</div>
                      </button>
                    );
                  })}
                </div>
              </StepHeader>
            )}

            {step === 4 && (
              <StepHeader
                eyebrow={`Step 5 of ${TOTAL_STEPS}`}
                title={copy.designLineStep?.title ?? "Choose your design line"}
                subtitle={copy.designLineStep?.subtitle ?? "Pick the structural language. You can swap it later from the configurator."}
              >
                <div className="flex flex-col gap-3 mt-6">
                  {designLines.map((d) => (
                    <DesignLineCard key={d.id} line={d} active={designLineId === d.id} onClick={() => setDesignLineId(d.id)} accent={accent} />
                  ))}
                </div>
              </StepHeader>
            )}

            {step === 5 && (
              <StepHeader
                eyebrow={`Step 6 of ${TOTAL_STEPS}`}
                title={copy.environmentStep?.title ?? "Environment"}
                subtitle={copy.environmentStep?.subtitle ?? "Pick a setting outside the room. Disables the warehouse hall behind the windows."}
              >
                {/* AI generator — top-left of the step. Click to expand a
                    prompt input, then call fal.ai. The returned URL is
                    applied as a skydome (LDR, not true HDR). User can
                    clear it to fall back to a stock HDRI. */}
                <div className="mt-5 mb-4">
                  <EnvironmentGenerator
                    customUrl={customEnvironmentUrl}
                    prompt={envPrompt}
                    setPrompt={setEnvPrompt}
                    generating={envGenerating}
                    error={envError}
                    accent={accent}
                    onGenerate={async () => {
                      const p = envPrompt.trim();
                      if (!p) return;
                      setEnvGenerating(true);
                      setEnvError(null);
                      try {
                        const { generateTexture } = await import("@/lib/services/falTexture");
                        // Use flux/schnell — fast (4 steps, ~3s) and the
                        // free-tier-friendly default. Generation quality is
                        // plenty for a skydome backdrop. Falls back to a
                        // helpful auth-error message if the FAL key is
                        // missing or rejected.
                        const r = await generateTexture(`Wide cinematic landscape view through floor-to-ceiling glass: ${p}. Photoreal, soft daylight, deep horizon, no people, no logos, no text.`, {
                          model: "fal-ai/flux/schnell",
                          image_size: "landscape_16_9",
                        });
                        if (r.ok) {
                          setCustomEnvironmentUrl(r.url);
                          // Clear the HDRI pick — they're mutually exclusive
                          // and "Auto / AI" reads cleanly.
                          setEnvironmentId(null);
                        } else {
                          // Translate fal.ai's machine-speak into actionable
                          // advice. The most common failure is an invalid
                          // key (revoked / wrong format / never valid).
                          const lower = r.error.toLowerCase();
                          if (lower.includes("no user found") || lower.includes("unauthorized") || lower.includes("invalid") || lower.includes("forbidden")) {
                            setEnvError("fal.ai key rejected. Open .env.local, paste a fresh key from https://fal.ai/dashboard/keys, then rebuild.");
                          } else {
                            setEnvError(r.error);
                          }
                        }
                      } catch (e) {
                        setEnvError(e instanceof Error ? e.message : String(e));
                      } finally {
                        setEnvGenerating(false);
                      }
                    }}
                    onClear={() => {
                      setCustomEnvironmentUrl(null);
                      setEnvError(null);
                    }}
                  />
                </div>
                <div className="text-[0.62rem] uppercase tracking-wider opacity-50 mb-2">Or pick a preset</div>
                <div className="grid grid-cols-2 gap-3">
                  {environments.map((env) => (
                    <EnvironmentCard
                      key={env.id}
                      env={env}
                      active={environmentId === env.id}
                      onClick={() => {
                        // Picking a preset clears any AI-generated env so
                        // the two paths don't fight for the visible backdrop.
                        setCustomEnvironmentUrl(null);
                        setEnvironmentId(env.id === environmentId ? null : env.id);
                      }}
                      accent={accent}
                    />
                  ))}
                </div>
              </StepHeader>
            )}

            {step === 6 && (
              <StepHeader
                eyebrow={`Step 7 of ${TOTAL_STEPS}`}
                title={copy.customisationStep?.title ?? "Customisation"}
                subtitle={copy.customisationStep?.subtitle ?? "Optional flourishes. The room works without them — these are the personality dials."}
              >
                <CustomisationStep
                  value={customisation}
                  onChange={(patch) => setCustomisation((v) => ({ ...v, ...patch }))}
                  accent={accent}
                />
              </StepHeader>
            )}

            {step === 7 && (
              <StepHeader
                eyebrow="All set"
                title={copy.summaryStep?.title ?? "Your space is ready"}
                subtitle={copy.summaryStep?.subtitle ?? "Here's what we'll assemble. Every detail stays editable from the configurator after you generate the room."}
              >
                <SummaryCard
                  size={size}
                  wallHeightM={heightM}
                  designLine={designLine}
                  logoUrl={logoUrl}
                  artworkUrls={artworkUrls}
                  colours={colours}
                  extendedColours={extendedColours}
                  customisation={customisation}
                  environmentId={environmentId}
                  environments={environments}
                  accent={accent}
                />
              </StepHeader>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer — Back is now a proper neumorph button (was a text link),
            Next is the accent pill. */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-[color:var(--color-border-soft)]">
          <button
            onClick={prev}
            disabled={step === 0}
            className="px-4 h-10 rounded-[10px] text-[0.74rem] uppercase tracking-wider neumorph-raised disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5 transition-opacity"
            style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </button>
          {step < LAST_STEP ? (
            <button
              onClick={next}
              className="px-6 h-10 rounded-[10px] text-[0.78rem] uppercase tracking-wider flex items-center gap-1.5 transition-all"
              style={{
                background: accent,
                color: "#fff",
                fontVariationSettings: '"wdth" 100, "wght" 600',
                // Neumorphic-on-accent — inset highlight on top + soft dual
                // shadow below so the pill reads as raised in dark mode too.
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.30), " +
                  "inset 0 -1px 0 rgba(0,0,0,0.18), " +
                  `0 10px 24px -10px color-mix(in srgb, ${accent} 70%, transparent), ` +
                  "0 3px 8px -2px rgba(0,0,0,0.25)",
              }}
            >
              Next
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ) : (
            <button
              onClick={submit}
              className="px-7 h-11 rounded-[10px] text-[0.82rem] uppercase tracking-wider transition-all"
              style={{
                background: accent,
                color: "#fff",
                fontVariationSettings: '"wdth" 100, "wght" 700',
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.30), " +
                  "inset 0 -1px 0 rgba(0,0,0,0.20), " +
                  `0 14px 32px -10px color-mix(in srgb, ${accent} 75%, transparent), ` +
                  "0 4px 10px -2px rgba(0,0,0,0.28)",
              }}
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
  // Row layout — label / description on the left, sqm + dimensions
  // anchored right. Reads cleanly in the narrow squircle column.
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="w-full text-left rounded-[16px] transition-all flex items-center gap-4 px-4 py-3.5 neumorph-raised"
      style={{
        background: active ? accent : "var(--color-surface)",
        color: active ? "#fff" : "currentColor",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.18), " +
            `0 14px 32px -10px color-mix(in srgb, ${accent} 60%, transparent), ` +
            "0 4px 10px -2px rgba(0,0,0,0.22)"
          : undefined,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[1.05rem] tracking-tight" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{s.label}</div>
        <div className="text-[0.7rem] opacity-80 mt-0.5 truncate">{s.description}</div>
      </div>
      <div className="text-right flex-shrink-0" style={{ fontVariantNumeric: "tabular-nums" }}>
        <div className="text-[0.92rem]" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{s.sqm} m²</div>
        <div className="text-[0.65rem] opacity-75 mt-0.5">{s.widthM.toFixed(1)} × {s.depthM.toFixed(1)} m</div>
      </div>
    </motion.button>
  );
}

// ── Compact 4-slot artwork tile (step 2) ───────────────────────────────
function ArtworkSlot({
  slot, fileUrl, onFile, onClear, accent,
}: {
  slot: number;
  fileUrl: string | null;
  onFile: (f: File) => void;
  onClear: () => void;
  accent: string;
}) {
  return (
    <div
      className="relative rounded-[14px] overflow-hidden neumorph-raised"
      style={{ aspectRatio: "16 / 9" }}
    >
      <label
        className="block w-full h-full cursor-pointer"
        style={{
          background: fileUrl ? "color-mix(in srgb, var(--color-surface) 60%, transparent)" : "color-mix(in srgb, var(--color-surface) 30%, transparent)",
        }}
      >
        {fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={`slot ${slot + 1}`} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="w-9 h-9 mx-auto rounded-full mb-1.5 grid place-items-center" style={{ background: `color-mix(in srgb, ${accent} 20%, transparent)` }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3v10M3 8h10" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-[0.6rem] opacity-70">Slot {slot + 1}</div>
            </div>
          </div>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
      </label>
      {fileUrl && (
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onClear(); }}
          className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full grid place-items-center text-[0.7rem]"
          style={{ background: "rgba(0,0,0,0.55)", color: "#fff", backdropFilter: "blur(6px)" }}
          aria-label={`Clear slot ${slot + 1}`}
        >×</button>
      )}
    </div>
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

function ColourCard({ label, value, onChange, compact = false }: { label: string; value: string; onChange: (v: string) => void; compact?: boolean }) {
  // `compact` is used by the 2×4 colours grid where vertical space is
  // tight — drops the bottom hex readout, smaller padding, narrower
  // swatch height. Hex is still visible via the swatch tooltip + the
  // long-press editor for fine-tune.
  if (compact) {
    return (
      <label
        className="block rounded-[12px] cursor-pointer neumorph-raised relative overflow-hidden"
        style={{ padding: 6 }}
        title={value.toUpperCase()}
      >
        <div className="w-full rounded-[8px] mb-1" style={{ aspectRatio: "1 / 0.7", background: value, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)" }} />
        <div className="text-[0.6rem] opacity-65 text-center" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{label}</div>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </label>
    );
  }
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
  // Row layout (matches SizeCard) — active state is a neumorphic
  // accent-filled pill (white text + inset/outer shadow); inactive is
  // a neutral neumorph-raised surface so the row reads as a stack of
  // tactile chips.
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="w-full text-left rounded-[16px] transition-all flex items-start gap-3 px-4 py-3.5 neumorph-raised"
      style={{
        background: active ? accent : "var(--color-surface)",
        color: active ? "#fff" : "currentColor",
        boxShadow: active
          ? "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.18), " +
            `0 14px 32px -10px color-mix(in srgb, ${accent} 60%, transparent), ` +
            "0 4px 10px -2px rgba(0,0,0,0.22)"
          : undefined,
      }}
    >
      {line.preview && <div className="flex-shrink-0">{line.preview}</div>}
      <div className="min-w-0 flex-1">
        <div className="text-[0.62rem] uppercase tracking-wider opacity-75">{line.tagline}</div>
        <div className="text-[1.05rem] tracking-tight mt-0.5" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{line.label}</div>
        <div className="text-[0.72rem] opacity-80 mt-0.5">{line.description}</div>
      </div>
    </motion.button>
  );
}

// ── Summary card ───────────────────────────────────────────────────────

function SummaryCard({
  size, wallHeightM, designLine, logoUrl, artworkUrls, colours, extendedColours, customisation, environmentId, environments, accent,
}: {
  size: WizardSize;
  wallHeightM: number;
  designLine: WizardDesignLine;
  logoUrl: string | null;
  artworkUrls: [string | null, string | null, string | null, string | null];
  colours: [string, string, string, string];
  extendedColours: WizardExtendedColours;
  customisation: WizardCustomisation;
  environmentId: string | null;
  environments: WizardEnvironment[];
  accent: string;
}) {
  const cardBg = "color-mix(in srgb, var(--color-surface) 70%, transparent)";
  const envLabel = environments.find((e) => e.id === environmentId)?.label ?? "Warehouse";
  const artworks = artworkUrls.filter((u): u is string => !!u);
  // Customisation summary lines — only show non-zero counts.
  const cLines: { label: string; value: string }[] = [];
  if (customisation.cupsEnabled)            cLines.push({ label: "Branded cups",      value: "on" });
  if (customisation.plantCount > 0)         cLines.push({ label: "Plants",            value: `${customisation.plantCount}` });
  if (customisation.sofaCount > 0)          cLines.push({ label: "Breakout sofas",    value: `${customisation.sofaCount}` });
  if (customisation.standingDisplayCount > 0) cLines.push({ label: "Standing displays", value: `${customisation.standingDisplayCount}` });
  if (customisation.posterboardCount > 0)   cLines.push({ label: "Posterboards",      value: `${customisation.posterboardCount}` });
  if (customisation.cubeCount > 0)          cLines.push({ label: "Cube plinths",      value: `${customisation.cubeCount}` });
  return (
    <div className="mt-7 grid grid-cols-2 gap-3">
      {/* Room — size + dims */}
      <div className="rounded-[16px] p-4 neumorph-raised" style={{ background: cardBg }}>
        <div className="text-[0.58rem] uppercase tracking-wider opacity-55 mb-1">Room</div>
        <div className="text-[1.05rem] leading-tight mb-1" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{size.label}</div>
        <div className="text-[0.7rem] opacity-70">{size.sqm} m² · {designLine.label}</div>
        <div className="text-[0.74rem] mt-2" style={{ color: accent, fontVariationSettings: '"wdth" 100, "wght" 600', fontVariantNumeric: "tabular-nums" }}>
          {size.widthM.toFixed(1)} × {size.depthM.toFixed(1)} × {wallHeightM.toFixed(1)} m
        </div>
      </div>
      {/* Environment */}
      <div className="rounded-[16px] p-4 neumorph-raised" style={{ background: cardBg }}>
        <div className="text-[0.58rem] uppercase tracking-wider opacity-55 mb-1">Environment</div>
        <div className="text-[1.05rem] leading-tight" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{envLabel}</div>
        <div className="text-[0.7rem] opacity-70 mt-1">{environmentId ? "Hall hidden" : "Warehouse hall"}</div>
      </div>
      {/* Logo + brand colours */}
      <div className="col-span-2 rounded-[16px] p-4 neumorph-raised flex items-center gap-4" style={{ background: cardBg }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="logo" className="h-14 w-14 object-contain rounded-[8px] p-1" style={{ background: "var(--color-bg)" }} />
        ) : (
          <div className="h-14 w-14 rounded-[8px] grid place-items-center text-[0.62rem] opacity-50" style={{ background: "color-mix(in srgb, var(--color-text) 6%, transparent)" }}>no logo</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[0.58rem] uppercase tracking-wider opacity-55 mb-1.5">Brand · surfaces</div>
          <div className="flex flex-wrap gap-1">
            {colours.map((c, i) => (
              <span key={`b${i}`} className="block h-6 w-6 rounded-[4px]" title={`Brand ${i + 1}: ${c.toUpperCase()}`} style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)" }} />
            ))}
            <span className="block w-2" />
            {(["floor", "table", "chairs", "cups", "pendant"] as const).map((k) => (
              <span key={k} className="block h-6 w-6 rounded-[4px]" title={`${k}: ${extendedColours[k].toUpperCase()}`} style={{ background: extendedColours[k], boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)" }} />
            ))}
          </div>
        </div>
      </div>
      {/* Artwork — first slot full bleed; remaining as thumbnails */}
      {artworks.length > 0 && (
        <div className="col-span-2 rounded-[16px] p-2.5 neumorph-raised" style={{ background: cardBg }}>
          <div className="text-[0.58rem] uppercase tracking-wider opacity-55 mb-1.5 px-1">Hero artwork · {artworks.length} of 4</div>
          <div className="grid grid-cols-4 gap-1.5">
            {artworks.map((u, i) => (
              <div key={i} className="rounded-[8px] overflow-hidden aspect-[3/4]" style={{ background: "color-mix(in srgb, var(--color-text) 5%, transparent)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt={`art-${i}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Customisation flourishes */}
      {cLines.length > 0 && (
        <div className="col-span-2 rounded-[16px] p-4 neumorph-raised" style={{ background: cardBg }}>
          <div className="text-[0.58rem] uppercase tracking-wider opacity-55 mb-2">Flourishes</div>
          <div className="flex flex-wrap gap-2">
            {cLines.map((l) => (
              <span key={l.label} className="px-2.5 py-1 rounded-full text-[0.66rem] flex items-center gap-1.5 neumorph-inset" style={{ background: "color-mix(in srgb, var(--color-surface) 90%, transparent)" }}>
                <span className="opacity-65">{l.label}</span>
                <span style={{ color: accent, fontVariationSettings: '"wdth" 100, "wght" 600' }}>{l.value}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Environment card (HDRI picker, step 5) ─────────────────────────────
//
// Square tile with a procedural gradient swatch standing in for a baked
// thumbnail. The HDR sources are 24-26MB each so we keep the preview
// cheap; the mood colours come from `env.thumb` (set per-environment in
// the host's preset list).

// AI environment generator block. Lives at the top of step 5. The
// generation is intentionally async + non-blocking — the user can
// switch to a stock HDRI preset while the call is in flight and the
// returned URL just sits in state until they pick the AI card.
function EnvironmentGenerator({
  customUrl, prompt, setPrompt, generating, error, accent, onGenerate, onClear,
}: {
  customUrl: string | null;
  prompt: string;
  setPrompt: (s: string) => void;
  generating: boolean;
  error: string | null;
  accent: string;
  onGenerate: () => void | Promise<void>;
  onClear: () => void;
}) {
  return (
    <div
      className="rounded-[14px] p-3 flex flex-col gap-3"
      style={{
        background: `color-mix(in srgb, ${accent} 8%, var(--color-surface))`,
        border: `1px solid color-mix(in srgb, ${accent} 28%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[1rem]">✨</span>
          <span className="text-[0.78rem]" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>Generate an environment</span>
        </div>
        {customUrl && (
          <button
            type="button"
            onClick={onClear}
            className="text-[0.65rem] opacity-70 hover:opacity-100 underline"
          >
            Clear
          </button>
        )}
      </div>
      {/* Preview tile — appears when the user has a generated URL. Tiny
          16:9 thumbnail so the user can confirm what's applied. */}
      {customUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={customUrl}
          alt="Generated environment"
          className="w-full aspect-[16/10] object-cover rounded-[10px]"
          style={{ border: "1px solid color-mix(in srgb, var(--color-text) 12%, transparent)" }}
        />
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Tokyo dusk skyline through floor-to-ceiling glass…"
          className="flex-1 px-2.5 py-1.5 rounded-[8px] text-[0.78rem] outline-none"
          style={{
            background: "color-mix(in srgb, var(--color-surface) 70%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-text) 12%, transparent)",
            color: "var(--color-text)",
          }}
          onKeyDown={(e) => { if (e.key === "Enter" && !generating && prompt.trim()) { void onGenerate(); } }}
        />
        <button
          type="button"
          disabled={generating || !prompt.trim()}
          onClick={() => void onGenerate()}
          className="px-3 py-1.5 rounded-[8px] text-[0.74rem] transition-opacity"
          style={{
            background: accent,
            color: "#fff",
            opacity: generating || !prompt.trim() ? 0.5 : 1,
            cursor: generating || !prompt.trim() ? "not-allowed" : "pointer",
            fontVariationSettings: '"wdth" 100, "wght" 600',
          }}
        >
          {generating ? "Generating…" : customUrl ? "Regenerate" : "Generate"}
        </button>
      </div>
      <div className="text-[0.6rem] opacity-60 leading-snug">
        Wraps a generated image as a skydome — indicative only, not true HDR lighting.
      </div>
      {error && (
        <div className="text-[0.65rem] px-2 py-1 rounded-[6px]" style={{ background: "rgba(255,80,80,0.12)", color: "#ff7878" }}>
          {error}
        </div>
      )}
    </div>
  );
}

function EnvironmentCard({ env, active, onClick, accent }: {
  env: { id: string; label: string; thumb: [string, string] };
  active: boolean;
  onClick: () => void;
  accent: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="text-left rounded-[14px] overflow-hidden transition-all"
      style={{
        background: active ? `color-mix(in srgb, ${accent} 12%, var(--color-surface))` : "color-mix(in srgb, var(--color-surface) 80%, transparent)",
        border: active ? `2px solid ${accent}` : "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
        boxShadow: active
          ? `0 12px 24px -14px color-mix(in srgb, ${accent} 50%, transparent)`
          : "0 6px 12px -12px rgba(0,0,0,0.14)",
      }}
    >
      {/* Procedural thumbnail — radial light source at top + horizon
          fade so the swatch reads as an environment, not a flat chip. */}
      <div
        className="w-full aspect-[16/10]"
        style={{
          background: `radial-gradient(ellipse at 50% 25%, ${env.thumb[1]} 0%, ${env.thumb[0]} 78%)`,
        }}
        aria-hidden
      />
      <div className="px-3 py-2">
        <div className="text-[0.78rem]" style={{ fontVariationSettings: '"wdth" 100, "wght" 600', color: active ? accent : "currentColor" }}>{env.label}</div>
      </div>
    </motion.button>
  );
}

// ── Customisation step (cups · plants · sofas · displays) ──────────────
//
// Lifted out of the floating WizardFlourishes side panel and into a
// proper wizard step. Lets the user dial in the room's personality
// flourishes inline with the rest of the flow.

// ── Wizard slider — small inline slider for step 1's W/D/H fine-tune. ───
// Kept inline (not lib/ui/Slider) so the wizard module stays portable
// across host projects without dragging in the configurator's UI kit.
function WizardSlider({
  label, value, min, max, step, unit, accent, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; accent: string; onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const pct = ((value - min) / Math.max(1e-6, max - min)) * 100;
  const snap = (n: number) => Math.round(n / step) * step;
  const handle = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    onChange(Math.min(max, Math.max(min, snap(min + t * (max - min)))));
  };
  return (
    <div className="flex items-center gap-3">
      <span className="t-label w-[58px] flex-shrink-0 opacity-70">{label}</span>
      <div
        ref={trackRef}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setDragging(true); handle(e.clientX); }}
        onPointerMove={(e) => { if (dragging) handle(e.clientX); }}
        onPointerUp={(e) => { (e.target as HTMLElement).releasePointerCapture(e.pointerId); setDragging(false); }}
        className="relative flex-1 h-6 cursor-pointer"
      >
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ background: "color-mix(in srgb, var(--color-text) 14%, transparent)" }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full" style={{ left: 0, width: `${pct}%`, background: accent }} />
        <div className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full shadow-md" style={{ left: `calc(${pct}% - 8px)`, background: accent }} />
      </div>
      <span className="text-[0.72rem] w-[58px] text-right tabular-nums opacity-70">
        {value.toFixed(step < 1 ? 1 : 0)}{unit ?? ""}
      </span>
    </div>
  );
}

// Compact pendant shape row used on step 1. SVG glyphs are intentionally
// tiny (18×12) so the seven options + an "Auto" reset fit in a single
// 420px column without wrapping awkwardly. Each glyph is a stylised
// silhouette of the pendant body — not a literal projection, but enough
// for the user to recognise rectangle vs ring vs hexagon.
const PENDANT_SHAPES: { id: PendantShape; label: string; glyph: ReactNode }[] = [
  { id: "rectangle",   label: "Bar",      glyph: <rect  x="3" y="6" width="18" height="4" rx="1" /> },
  { id: "squircle",    label: "Squircle", glyph: <rect  x="4" y="5" width="16" height="6" rx="3" /> },
  { id: "ring",        label: "Ring",     glyph: <circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /> },
  { id: "hexagon",     label: "Hexagon",  glyph: <polygon points="6,8 9,4 15,4 18,8 15,12 9,12" fill="none" stroke="currentColor" strokeWidth="1.4" /> },
  { id: "triangle",    label: "Triangle", glyph: <polygon points="12,3 21,13 3,13" /> },
  { id: "innerCurve",  label: "Curve",    glyph: <path  d="M3 11 Q 12 3, 21 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /> },
  { id: "wedge",       label: "Wedge",    glyph: <polygon points="3,12 21,4 21,12" /> },
];

function PendantShapeRow({
  value, onChange, accent,
}: {
  value: PendantShape | undefined;
  onChange: (v: PendantShape | undefined) => void;
  accent: string;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {/* "Auto" tile — clears the override so the design-line default
          flows in. First tile so the visual flow reads "let the line
          decide, or pick a silhouette". */}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className="flex flex-col items-center justify-center gap-1 rounded-[10px] py-2 text-[0.6rem] transition-colors"
        style={{
          background: value === undefined ? accent : "color-mix(in srgb, var(--color-surface) 70%, transparent)",
          color: value === undefined ? "#fff" : "var(--color-text)",
          border: `1px solid ${value === undefined ? accent : "color-mix(in srgb, var(--color-text) 12%, transparent)"}`,
        }}
        aria-pressed={value === undefined}
      >
        <span className="text-[1rem] leading-none">⟳</span>
        <span className="opacity-80">Auto</span>
      </button>
      {PENDANT_SHAPES.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className="flex flex-col items-center justify-center gap-1 rounded-[10px] py-2 text-[0.6rem] transition-colors"
            style={{
              background: active ? accent : "color-mix(in srgb, var(--color-surface) 70%, transparent)",
              color: active ? "#fff" : "var(--color-text)",
              border: `1px solid ${active ? accent : "color-mix(in srgb, var(--color-text) 12%, transparent)"}`,
            }}
            aria-pressed={active}
            title={s.label}
          >
            <svg width="22" height="14" viewBox="0 0 24 16" fill="currentColor">
              {s.glyph}
            </svg>
            <span className="opacity-80">{s.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function CustomisationStep({
  value, onChange, accent,
}: {
  value: WizardCustomisation;
  onChange: (patch: Partial<WizardCustomisation>) => void;
  accent: string;
}) {
  return (
    <div className="mt-6 flex flex-col gap-5">
      {/* Cups toggle — switch styled to match the rest of the wizard. */}
      <div className="flex items-center justify-between rounded-[14px] p-4" style={{ background: "color-mix(in srgb, var(--color-surface) 70%, transparent)" }}>
        <div>
          <div className="text-[0.92rem]" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>Branded coffee cups</div>
          <div className="text-[0.72rem] opacity-65 mt-0.5">A cup in front of each chair, logo wrapped around the body.</div>
        </div>
        <button
          onClick={() => onChange({ cupsEnabled: !value.cupsEnabled })}
          aria-label={`Toggle branded cups ${value.cupsEnabled ? "off" : "on"}`}
          className="h-6 w-11 rounded-full relative transition-colors"
          style={{ background: value.cupsEnabled ? accent : "color-mix(in srgb, var(--color-text) 14%, transparent)" }}
        >
          <span
            className="absolute top-[2px] h-5 w-5 rounded-full transition-transform"
            style={{ left: 2, transform: value.cupsEnabled ? "translateX(20px)" : "translateX(0)", background: "#fff" }}
          />
        </button>
      </div>

      {/* Three counters — plants / sofas / displays. */}
      <CounterRow
        label="Plants"
        hint="Foliage in the corners — biophilic warmth."
        value={value.plantCount}
        min={0} max={6}
        onChange={(v) => onChange({ plantCount: v })}
        accent={accent}
      />
      <CounterRow
        label="Breakout sofas"
        hint="Two-seat lounges along the front wall."
        value={value.sofaCount}
        min={0} max={4}
        onChange={(v) => onChange({ sofaCount: v })}
        accent={accent}
      />
      <CounterRow
        label="Standing displays"
        hint="Brand screens on stands around the room."
        value={value.standingDisplayCount}
        min={0} max={4}
        onChange={(v) => onChange({ standingDisplayCount: v })}
        accent={accent}
      />
      {/* Posterboards — upright portrait frames carrying brand art. The
          count adds frames along the side walls; each gets its own
          upload slot in the row below. */}
      <CounterRow
        label="Posterboards"
        hint="Upright portrait frames along the side walls."
        value={value.posterboardCount}
        min={0} max={4}
        onChange={(v) => onChange({ posterboardCount: v })}
        accent={accent}
      />
      {value.posterboardCount > 0 && (
        <div className="grid grid-cols-4 gap-2 -mt-2">
          {Array.from({ length: value.posterboardCount }, (_, i) => (
            <label
              key={i}
              className="relative rounded-[10px] overflow-hidden cursor-pointer neumorph-raised"
              style={{ aspectRatio: "3 / 4" }}
              title={`Upload posterboard ${i + 1}`}
            >
              {value.posterboardUrls[i] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value.posterboardUrls[i]!} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="grid place-items-center h-full text-[0.62rem] opacity-60" style={{ background: "color-mix(in srgb, var(--color-surface) 40%, transparent)" }}>+ {i + 1}</div>
              )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/avif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const r = new FileReader();
                  r.onload = () => {
                    if (typeof r.result !== "string") return;
                    const next = [...value.posterboardUrls];
                    next[i] = r.result;
                    onChange({ posterboardUrls: next });
                  };
                  r.readAsDataURL(f);
                  e.target.value = "";
                }}
              />
            </label>
          ))}
        </div>
      )}
      {/* Cube plinths — dealers'-choice. Each cube renders in the scene
          with a clickable hotspot the user uses to upload a 3D object or
          generate one via the fal.ai pipeline. The wizard only collects
          count + assets here; the hotspot UI lives in the configurator. */}
      <CounterRow
        label="Cube plinths"
        hint="Centre-of-room blocks with hotspots — drop or generate a 3D object on each."
        value={value.cubeCount}
        min={0} max={4}
        onChange={(v) => onChange({ cubeCount: v })}
        accent={accent}
      />
    </div>
  );
}

function CounterRow({
  label, hint, value, min, max, onChange, accent,
}: {
  label: string; hint: string;
  value: number; min: number; max: number;
  onChange: (v: number) => void;
  accent: string;
}) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="flex items-center justify-between rounded-[14px] p-4" style={{ background: "color-mix(in srgb, var(--color-surface) 70%, transparent)" }}>
      <div className="min-w-0 mr-4">
        <div className="text-[0.92rem]" style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}>{label}</div>
        <div className="text-[0.72rem] opacity-65 mt-0.5 truncate">{hint}</div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={dec}
          disabled={value <= min}
          className="h-7 w-7 rounded-full grid place-items-center text-[0.95rem] disabled:opacity-30 transition-opacity"
          style={{ background: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}
          aria-label={`Decrease ${label}`}
        >−</button>
        <span className="t-num text-[0.95rem] w-6 text-center tabular-nums" style={{ color: accent, fontVariationSettings: '"wdth" 100, "wght" 600' }}>{value}</span>
        <button
          onClick={inc}
          disabled={value >= max}
          className="h-7 w-7 rounded-full grid place-items-center text-[0.95rem] disabled:opacity-30 transition-opacity"
          style={{ background: "color-mix(in srgb, var(--color-text) 8%, transparent)" }}
          aria-label={`Increase ${label}`}
        >+</button>
      </div>
    </div>
  );
}
