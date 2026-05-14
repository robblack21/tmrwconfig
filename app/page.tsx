"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/lib/ui/Card";
import { Slider } from "@/lib/ui/Slider";
import { Section } from "@/lib/ui/Section";
import { CameraPanel } from "@/lib/ui/CameraPanel";
import { ColourPalette } from "@/lib/ui/ColourPalette";
import { BomSettingsButton } from "@/lib/ui/BomSettings";
import { SceneCanvas } from "@/lib/scene";
import { HDRI_OPTIONS } from "@/lib/scene/Scene";
import { asset } from "@/lib/assetPath";
import { SceneLoadingOverlay } from "@/lib/scene/SceneReveal";
import { HomeView } from "@/lib/views/HomeView";
import { deriveBom } from "@/lib/bom/derive";
import { openInvoiceWindow } from "@/lib/bom/invoice";
import { useConfig, useBrandKit, useTierBounds } from "@/lib/store/configStore";
import { seedBrandKitList } from "@/lib/fixtures/brandKits";
import type { PendantShape, SizeTier } from "@/lib/schemas";

const PENDANT_SHAPES: PendantShape[] = ["rectangle", "squircle", "ring", "hexagon", "triangle", "innerCurve", "wedge"];
const PENDANT_SHAPE_LABEL: Record<PendantShape, string> = {
  rectangle: "Rect",
  squircle: "Squircle",
  ring: "Ring",
  hexagon: "Hex",
  triangle: "Tri",
  innerCurve: "Curve",
  wedge: "Wedge",
};
const TIERS: SizeTier[] = ["S", "M", "L"];

export default function Page() {
  const {
    shape, tier, widthM, depthM, wallHeightM, trussTopM,
    pendantEnabled, pendantShape, pendantWidthM, pendantDepthM, pendantHeightM, pendantYOffsetM, pendantRotationDeg, pendantRingVertical,
    lightShaftsEnabled, lightShaftDensity, lightboxLogoEnabled,
    radiatingRigEnabled, radiatingRings,
    glassBalconyEnabled, circularScreenEnabled, wraparoundScreenEnabled,
    ledWallEnabled, ledWallWidthM, ledWallHeightM, ledWallBrightness,
    hallMode, brandKitId,
    exposure, keyLightIntensity, plantCount, sofaCount, coffeeTableVariant, standingDisplayCount, logoGlow, logoExtrusionM, logoEmissive, platformHeightM,
    cgBrightness, cgContrast, cgSaturation, cgVibrance, cgWhiteBalance,
    videoMuted, videoVolume, logoOverrides,
    bomRateOverrides, hdriId, hallVisible, hdrIntensity, hdrBgIntensity, hallDarkness,
    highDpr, floorStyle, radiatingRadiusM, radiatingYOffsetM, radiatingColor, renderMode,
    maximiseReuse, apply,
  } = useConfig();
  const kit = useBrandKit();
  const tierBounds = useTierBounds();

  const [view, setView] = useState<"home" | "config">("home");
  const [chromeTheme, setChromeTheme] = useState<"day" | "night">("day");
  useEffect(() => {
    document.documentElement.dataset.theme = chromeTheme;
  }, [chromeTheme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-accent", kit.palette.accent);
  }, [kit.palette.accent]);

  const wallHeightMax = Math.min(4.5, trussTopM - 0.5);
  const trussTopMin = Math.max(3.0, wallHeightM + 0.5);

  // Live BOM — quantities derived from config, rates overridable in settings modal.
  const bom = deriveBom(
    { widthM, depthM, wallHeightM, trussTopM, platformHeightM,
      pendantEnabled, pendantShape, pendantWidthM, pendantDepthM,
      ledWallEnabled, ledWallWidthM, ledWallHeightM, plantCount,
      sofaCount, noDefaultDressing: !!kit.scene?.noDefaultDressing },
    bomRateOverrides
  );
  const areaM2 = widthM * depthM;
  const totalLow = bom.grandLow;
  const totalHigh = bom.grandHigh;
  const reuse = maximiseReuse ? 86 : !pendantEnabled ? 80 : pendantShape === "ring" ? 68 : pendantShape === "squircle" ? 74 : 78;

  const [bomExpanded, setBomExpanded] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  // Resizable BOM dims (user can drag-resize from a handle when expanded)
  const [bomW, setBomW] = useState(420);
  const [bomH, setBomH] = useState(520);

  if (view === "home") {
    return (
      <main className="relative h-screen w-screen overflow-hidden bg-[color:var(--color-bg)]">
        <HomeView
          onChoose={(kitId) => {
            apply({ type: "brandKit.apply", kitId });
            setView("config");
          }}
        />
      </main>
    );
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[color:var(--color-bg)]" style={{ isolation: "isolate" }}>
      <div
        className="scene-canvas-wrap"
        // Browser-native colour grading applied as a CSS filter on the canvas
        // wrapper. Cheaper than a fragment-shader post pass and works on every
        // device. Vibrance is faked as a second softer saturate() layered on
        // top of the main saturation slider.
        style={{
          filter: [
            `brightness(${cgBrightness})`,
            `contrast(${cgContrast})`,
            `saturate(${cgSaturation * (1 + cgVibrance * 0.4)})`,
            cgWhiteBalance !== 0 ? `hue-rotate(${cgWhiteBalance}deg)` : "",
          ].filter(Boolean).join(" "),
        }}
      >
        <SceneCanvas />
      </div>
      <SceneLoadingOverlay duration={1200} />

      {/* Top bar — modelled on the etglobal.com header: orange ET circle + GLOBAL wordmark,
          black nav-style buttons, bright orange CTA on the right. */}
      <header className="ui-overlay absolute inset-x-0 top-0 h-12 px-4 flex items-center justify-between panel-glass border-b border-[color:var(--color-border-soft)]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setView("home")}
            className="h-7 w-7 rounded-full grid place-items-center transition-colors text-[color:var(--color-text-soft)] hover:text-[color:var(--color-accent)]"
            title="Back to brands"
            aria-label="Back to brands"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7L7 2L12 7M3.5 6V12H10.5V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset("/logos/etgloballogotrans.webp")}
            alt="ET Global"
            className="h-6 w-auto"
            style={{ filter: chromeTheme === "day" ? "none" : "invert(0.94)" }}
          />
          <span className="t-label tracking-wider uppercase mt-[1px]">configurator</span>
          <span
            className="t-num text-[0.6rem] px-1.5 py-[1px] rounded-[4px] ml-1"
            style={{ background: "#ee7f1a", color: "#fff", letterSpacing: "0.05em" }}
          >
            v0.6
          </span>
        </div>
        {/* Centre cluster — global controls (mute / volume / reset) that aren't
            kit-specific. Always visible at the top of the screen. */}
        <div className="absolute left-1/2 top-0 h-12 -translate-x-1/2 flex items-center gap-3">
          <NavBtn onClick={() => apply({ type: "video.setMuted", value: !videoMuted })} title="Mute / un-mute the video wall iframe">
            {videoMuted ? "🔇 Muted" : "🔊 Sound"}
          </NavBtn>
          <div className="flex items-center gap-1 px-2 py-1 rounded-[6px] neumorph-inset">
            <span className="t-label text-[0.6rem] opacity-60">vol</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={videoVolume}
              onChange={(e) => apply({ type: "video.setVolume", value: Number(e.target.value) })}
              className="w-20 accent-[color:var(--color-accent)]"
              title={`Video volume ${videoVolume}/100`}
            />
          </div>
          <NavBtn onClick={() => apply({ type: "scene.resetGeometry" })} title="Reset room geometry to the kit defaults">
            ⟲ Reset
          </NavBtn>
        </div>
        <div className="flex items-center gap-3">
          <NavBtn onClick={() => setChromeTheme(chromeTheme === "day" ? "night" : "day")} title={chromeTheme === "day" ? "Switch to night mode" : "Switch to day mode"}>
            <span className="inline-flex items-center gap-1.5">
              {chromeTheme === "day" ? (
                // Moon icon → click for night
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                  <path d="M9 6.5A4 4 0 0 1 4.5 2a4 4 0 1 0 4.5 4.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              ) : (
                // Sun icon → click for day
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden>
                  <circle cx="5.5" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3" />
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <line key={deg} x1="5.5" y1="0.8" x2="5.5" y2="2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" transform={`rotate(${deg} 5.5 5.5)`} />
                  ))}
                </svg>
              )}
              {chromeTheme === "day" ? "Night" : "Day"}
            </span>
          </NavBtn>
          <NavBtn onClick={() => apply({ type: "scene.setMode", hall: hallMode === "warehouse.dark" ? "gallery.light" : "warehouse.dark" })}>
            {hallMode === "warehouse.dark" ? "Warehouse" : "Gallery"}
          </NavBtn>
          <span className="t-label text-[0.55rem] uppercase tracking-wider opacity-60 select-none" title="The two switches to the right control render cost. The configurator also auto-degrades them when frame-rate dips.">
            Performance toggles ▸
          </span>
          <NavBtn onClick={() => apply({ type: "scene.setRenderMode", value: renderMode === "viz" ? "edit" : "viz" })} title="Edit disables lights + post for snappier slider work; Viz is the default look">
            {renderMode === "viz" ? "Visualisation" : "Editing"}
          </NavBtn>
          <NavBtn onClick={() => apply({ type: "scene.setHighDpr", value: !highDpr })} title="Toggle device-pixel-ratio (lower = faster). Auto-drops to 1× when FPS sags below 25.">
            DPR · {highDpr ? "Hi" : "1×"}
          </NavBtn>
          <NavBtn>EN</NavBtn>
          <div className="h-5 w-px bg-[color:var(--color-border-soft)]" />
          <button
            className="h-7 px-3.5 rounded-[6px] text-[0.72rem] uppercase tracking-wider"
            style={{
              background: "#ee7f1a",
              color: "#fff",
              fontVariationSettings: '"wdth" 100, "wght" 600',
              boxShadow: "0 1px 0 rgba(0,0,0,0.06), inset 0 -1px 0 rgba(0,0,0,0.12)",
            }}
          >
            Save
          </button>
        </div>
      </header>

      {/* Footprint dock — collapsible. Caret in the top-right corner slides
          the whole panel off-screen so the scene gets the full canvas. */}
      <button
        onClick={() => setLeftCollapsed((v) => !v)}
        className="ui-overlay absolute top-14 z-50 w-7 h-7 rounded-[6px] neumorph-raised grid place-items-center text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)] transition-all"
        style={{ left: leftCollapsed ? "12px" : "262px" }}
        title={leftCollapsed ? "Show left panel" : "Hide left panel"}
        aria-label="Toggle left panel"
      >
        <motion.svg animate={{ rotate: leftCollapsed ? 180 : 0 }} width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M6 2L3 5L6 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      <Card
        className="ui-overlay absolute left-3 top-14 bottom-3 w-[260px] p-3 overflow-y-auto scroll-pretty transition-transform"
        radius="md"
        variant="panel"
        style={{ transform: leftCollapsed ? "translateX(calc(-100% - 16px))" : "translateX(0)" }}
      >
        {/* Brand picker moved to top per Round 9 — most-changed control deserves the prime slot */}
        <Section label="Brand kit">
          {/* 5×3 grid — first cell is "Create" (blank ET Global template, matches
              the homepage convention); rest are the 14 seeded brand kits. */}
          <div className="grid grid-cols-5 gap-1">
            <button
              onClick={() => apply({ type: "brandKit.apply", kitId: "brand.new" })}
              title="Create new brand kit"
              className={
                "h-9 rounded-[6px] transition-all flex flex-col items-center justify-center gap-[2px] px-1 " +
                (brandKitId === "brand.new"
                  ? "neumorph-inset"
                  : "neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]")
              }
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0 border border-[color:var(--color-accent)]" style={{ background: "transparent" }} />
              <span className="text-[0.55rem] w-full text-center">+ New</span>
            </button>
            {seedBrandKitList.map((k) => (
              <button
                key={k.id}
                onClick={() => apply({ type: "brandKit.apply", kitId: k.id })}
                title={k.name}
                className={
                  "h-9 rounded-[6px] transition-all flex flex-col items-center justify-center gap-[2px] px-1 " +
                  (brandKitId === k.id
                    ? "neumorph-inset"
                    : "neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]")
                }
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: k.palette.accent }} />
                <span className="text-[0.55rem] truncate w-full text-center">{k.name.slice(0, 6)}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Room shape / dims — moved back into the left dock as a generic
            primitive (booth footprint is shared across all kits). The right
            centre dock holds the kit-unique room features (video, wall
            graphic, props). */}
        <Section label="Footprint">
          <PillRow
            options={[
              { value: "rectangle", label: "Rect" },
              { value: "corner", label: "Corner" },
              { value: "L", label: "L-shape" },
            ]}
            value={shape}
            onSelect={(v) => apply({ type: "footprint.setShape", shape: v as typeof shape })}
          />
          <PillRow
            className="mt-1.5"
            options={TIERS.map((t) => ({ value: t, label: `${t} · ${tierBounds.areaBandM2[0]}–${tierBounds.areaBandM2[1]}m²` }))}
            value={tier}
            onSelect={(v) => apply({ type: "footprint.setTier", tier: v as SizeTier })}
          />
        </Section>

        <Section label="Dimensions">
          <Slider label="Width" value={widthM} onChange={(v) => apply({ type: "footprint.set", widthM: v, depthM })} min={tierBounds.widthM.min} max={tierBounds.widthM.max} step={0.5} unit="m" />
          <Slider label="Depth" value={depthM} onChange={(v) => apply({ type: "footprint.set", widthM, depthM: v })} min={tierBounds.depthM.min} max={tierBounds.depthM.max} step={0.5} unit="m" />
          <Slider label="Height" value={wallHeightM} onChange={(v) => apply({ type: "layout.setWallHeight", value: v })} min={2.25} max={wallHeightMax} step={0.25} ticks={[2.5, 3, 3.5, 4]} unit="m" />
          <Slider label="Truss" value={trussTopM} onChange={(v) => apply({ type: "layout.setTrussTop", value: v })} min={trussTopMin} max={6.5} step={0.25} ticks={[3.5, 4.5, 5.5]} unit="m" />
          <Slider label="Floor"  value={platformHeightM} onChange={(v) => apply({ type: "layout.setPlatformHeight", value: v })} min={0.10} max={0.30} step={0.01} unit="m" />
        </Section>

        <Section
          label="Pendant"
          right={
            <button
              onClick={(e) => { e.stopPropagation(); apply({ type: "pendant.setEnabled", enabled: !pendantEnabled }); }}
              className="t-label hover:text-[color:var(--color-text)]"
            >
              {pendantEnabled ? "on" : "off"}
            </button>
          }
        >
          <PillRow
            options={PENDANT_SHAPES.map((s) => ({ value: s, label: PENDANT_SHAPE_LABEL[s] }))}
            value={pendantShape}
            onSelect={(v) => apply({ type: "pendant.setShape", shape: v as PendantShape })}
            disabled={!pendantEnabled}
          />
          <div className="mt-1 t-label">{kit.name} default: {kit.pendant.preferredShape}</div>
        </Section>

        <Section label="Pendant dimensions" defaultOpen={false}>
          <Slider label="Width"   value={pendantWidthM}   onChange={(v) => apply({ type: "pendant.setWidth",   value: v })} min={1.0} max={8.0} step={0.1} unit="m" />
          <Slider label="Depth"   value={pendantDepthM}   onChange={(v) => apply({ type: "pendant.setDepth",   value: v })} min={1.0} max={6.0} step={0.1} unit="m" />
          <Slider label="Height"  value={pendantHeightM}  onChange={(v) => apply({ type: "pendant.setHeight",  value: v })} min={0.3} max={1.2} step={0.05} unit="m" />
          <Slider label="Y-offset" value={pendantYOffsetM} onChange={(v) => apply({ type: "pendant.setYOffset", value: v })} min={-1.5} max={1.5} step={0.05} unit="m" />
          <Slider label="Rotate"   value={pendantRotationDeg} onChange={(v) => apply({ type: "pendant.setRotation", value: v })} min={0} max={90} step={5} unit="°" />
          {pendantShape === "ring" && (
            <ToggleRow label="Vertical ring" value={pendantRingVertical} onToggle={(v) => apply({ type: "pendant.setRingVertical", value: v })} />
          )}
        </Section>

        <Section label="Hero elements" defaultOpen={false}>
          <ToggleRow label="Light shafts"     value={lightShaftsEnabled}      onToggle={(v) => apply({ type: "scene.setLightShafts",      value: v })} />
          {lightShaftsEnabled && (
            <Slider label="Shaft density" value={lightShaftDensity} onChange={(v) => apply({ type: "scene.setLightShaftDensity", value: v })} min={0} max={0.25} step={0.01} />
          )}
          <ToggleRow label="Lightbox logo"    value={lightboxLogoEnabled}     onToggle={(v) => apply({ type: "scene.setLightboxLogo",     value: v })} />
          <ToggleRow label="Radiating rings"  value={radiatingRigEnabled}     onToggle={(v) => apply({ type: "scene.setRadiatingRig",     value: v })} />
          {radiatingRigEnabled && (
            <>
              <Slider label="Rings"   value={radiatingRings}     onChange={(v) => apply({ type: "scene.setRadiatingRings",   value: v })} min={2} max={6} step={1} />
              <Slider label="Radius"  value={radiatingRadiusM}   onChange={(v) => apply({ type: "scene.setRadiatingRadius",  value: v })} min={1.0} max={6.0} step={0.1} unit="m" />
              <Slider label="Height"  value={radiatingYOffsetM}  onChange={(v) => apply({ type: "scene.setRadiatingYOffset", value: v })} min={-1.5} max={2.5} step={0.05} unit="m" />
              <div className="flex items-center gap-2 mt-1">
                <span className="t-label w-[55px] flex-shrink-0">Colour</span>
                <label className="relative inline-block w-6 h-6 rounded-[6px] cursor-pointer flex-shrink-0 neumorph-raised overflow-hidden">
                  <input
                    type="color"
                    value={radiatingColor || kit.palette.accent}
                    onChange={(e) => apply({ type: "scene.setRadiatingColor", value: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="absolute inset-[3px] rounded-[4px]" style={{ background: radiatingColor || kit.palette.accent }} />
                </label>
                {radiatingColor && (
                  <button onClick={() => apply({ type: "scene.setRadiatingColor", value: "" })} className="t-label text-[0.6rem]" title="Reset to kit accent">↺</button>
                )}
              </div>
            </>
          )}
          <ToggleRow label="Glass balcony"    value={glassBalconyEnabled}     onToggle={(v) => apply({ type: "scene.setGlassBalcony",     value: v })} />
          <ToggleRow label="Circular screen"  value={circularScreenEnabled}   onToggle={(v) => apply({ type: "scene.setCircularScreen",   value: v })} />
          <ToggleRow label="Wraparound 360"   value={wraparoundScreenEnabled} onToggle={(v) => apply({ type: "scene.setWraparoundScreen", value: v })} />
        </Section>

        {/* Video wall lives in the centre Room features dock now */}

        <Section label="Dressing">
          <Slider label="Plants"   value={plantCount}          onChange={(v) => apply({ type: "layout.setPlantCount", value: v })}        min={0} max={6} step={1} />
          <Slider label="Sofas"    value={sofaCount}           onChange={(v) => apply({ type: "layout.setSofaCount", value: v })}         min={0} max={4} step={1} />
          {sofaCount >= 2 && (
            <PillRow
              options={[
                { value: "avarta", label: "Avarta" },
                { value: "kumo",   label: "Kumo"   },
                { value: "geo",    label: "Geo"    },
              ]}
              value={coffeeTableVariant}
              onSelect={(v) => apply({ type: "layout.setCoffeeTable", value: v as "avarta" | "kumo" | "geo" })}
            />
          )}
          <Slider label="Displays" value={standingDisplayCount} onChange={(v) => apply({ type: "layout.setStandingDisplayCount", value: v })} min={0} max={4} step={1} />
        </Section>

        <Section label="Lighting">
          <Slider label="Key"      value={keyLightIntensity} onChange={(v) => apply({ type: "scene.setKeyIntensity", value: v })} min={0} max={2.5} step={0.01} />
          <Slider label="Sconce"   value={logoGlow}          onChange={(v) => apply({ type: "scene.setLogoGlow",     value: v })} min={0} max={1.6} step={0.01} />
          <Slider label="Exposure" value={exposure}          onChange={(v) => apply({ type: "scene.setExposure",     value: v })} min={-1.5} max={1.5} step={0.01} unit="ev" />
        </Section>

        <Section label="Colour grading" defaultOpen={false}>
          <Slider label="Brightness"    value={cgBrightness}   onChange={(v) => apply({ type: "cg.setBrightness",   value: v })} min={0.5} max={1.5} step={0.01} />
          <Slider label="Contrast"      value={cgContrast}     onChange={(v) => apply({ type: "cg.setContrast",     value: v })} min={0.5} max={1.5} step={0.01} />
          <Slider label="Saturation"    value={cgSaturation}   onChange={(v) => apply({ type: "cg.setSaturation",   value: v })} min={0}   max={2}   step={0.01} />
          <Slider label="Vibrance"      value={cgVibrance}     onChange={(v) => apply({ type: "cg.setVibrance",     value: v })} min={0}   max={1}   step={0.01} />
          <Slider label="White balance" value={cgWhiteBalance} onChange={(v) => apply({ type: "cg.setWhiteBalance", value: v })} min={-30} max={30}  step={1}    unit="°" />
        </Section>

        <Section label="HDRI" defaultOpen={false}>
          <Slider label="Env"       value={hdrIntensity}   onChange={(v) => apply({ type: "scene.setHdrIntensity",   value: v })} min={0} max={2} step={0.01} />
          <Slider label="Bg"        value={hdrBgIntensity} onChange={(v) => apply({ type: "scene.setHdrBgIntensity", value: v })} min={0} max={2} step={0.01} />
          <Slider label="Hall dark" value={hallDarkness}   onChange={(v) => apply({ type: "scene.setHallDarkness",  value: v })} min={0} max={1} step={0.01} />
          <div className="pt-1">
            <div className="t-label mb-1">Preset</div>
            <div className="grid grid-cols-3 gap-1">
              {HDRI_OPTIONS.map((h) => (
                <button
                  key={h.id}
                  onClick={() => apply({ type: "scene.setHdri", hdriId: h.id })}
                  className={
                    "h-6 rounded-[5px] text-[0.6rem] capitalize transition-all px-1 truncate " +
                    (hdriId === h.id
                      ? "neumorph-inset text-[color:var(--color-accent)]"
                      : "neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]")
                  }
                  title={h.label}
                >
                  {h.label}
                </button>
              ))}
            </div>
            {hdriId && (
              <button
                onClick={() => apply({ type: "scene.setHdri", hdriId: "" })}
                className="t-label mt-1 hover:text-[color:var(--color-text)]"
              >
                ↺ auto (by hall mode)
              </button>
            )}
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="t-label">3D hall context</span>
            <button
              onClick={() => apply({ type: "scene.setHallVisible", value: !hallVisible })}
              className={"t-label " + (hallVisible ? "text-[color:var(--color-accent)]" : "text-[color:var(--color-text-soft)]")}
            >
              {hallVisible ? "on" : "off"}
            </button>
          </div>
        </Section>

        <Section label="Logo sign" defaultOpen={false}>
          <Slider label="Extrusion" value={logoExtrusionM} onChange={(v) => apply({ type: "scene.setLogoExtrusion", value: v })} min={0} max={0.5} step={0.01} unit="m" />
          <Slider label="Glow"      value={logoEmissive}   onChange={(v) => apply({ type: "scene.setLogoEmissive", value: v })} min={0} max={3.5} step={0.1} />
        </Section>

        <ColourPalette />

        <Section label="Floor finish" defaultOpen={false}>
          <PillRow
            options={[
              { value: "herringbone", label: "Herring" },
              { value: "diagonal",    label: "Diagonal" },
              { value: "rectangular", label: "Rect" },
            ]}
            value={floorStyle}
            onSelect={(v) => apply({ type: "scene.setFloorStyle", value: v as "herringbone" | "diagonal" | "rectangular" })}
          />
        </Section>

      </Card>

      {/* Camera panel — right side aligned with footprint dock */}
      <CameraPanel />

      {/* Room features dock — between Camera (top) and BOM (bottom). Holds
          the **kit-unique** features of the room: video URL, wall graphic,
          custom prop manifest preview, sofa colour. Generic room shape
          lives back in the left dock under Brand kit.
          Default: compact (auto-height, capped just under the BOM dock).
          Sections expand inline; the card scrolls internally when content
          overflows. Opaque surface so expanded sections stay legible. */}
      <Card
        className="ui-overlay absolute right-3 top-[210px] bottom-[207px] w-[240px] p-3 overflow-y-auto scroll-pretty"
        radius="md"
        variant="raised"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="t-label uppercase tracking-wider pb-2 mb-2 border-b border-[color:var(--color-border-soft)] flex items-center justify-between">
          <span>Room features</span>
          <span className="text-[0.6rem] opacity-60">{kit.name}</span>
        </div>

        <Section label="Logo" defaultOpen={false}>
          <label className="t-label cursor-pointer block w-full text-center neumorph-raised rounded-[6px] px-2 py-1.5 hover:text-[color:var(--color-text)]">
            Upload replacement
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const r = new FileReader();
                r.onload = () => {
                  if (typeof r.result === "string") {
                    apply({ type: "kit.setLogoOverride", kitId: brandKitId, dataUrl: r.result });
                  }
                };
                r.readAsDataURL(f);
                // allow uploading the same file twice in a row
                e.target.value = "";
              }}
            />
          </label>
          {logoOverrides[brandKitId] && (
            <button
              onClick={() => apply({ type: "kit.clearLogoOverride", kitId: brandKitId })}
              className="t-label w-full text-center mt-1 hover:text-[color:var(--color-accent)]"
            >
              ↺ restore brand logo
            </button>
          )}
        </Section>

        <Section label="Video" defaultOpen={false}>
          <ToggleRow label="Video wall" value={ledWallEnabled} onToggle={(v) => apply({ type: "ledWall.setEnabled", enabled: v })} />
          {ledWallEnabled && (
            <>
              <Slider label="Width"      value={ledWallWidthM}     onChange={(v) => apply({ type: "ledWall.setWidth",      value: v })} min={2.0} max={48.0} step={0.5} unit="m" />
              <Slider label="Height"     value={ledWallHeightM}    onChange={(v) => apply({ type: "ledWall.setHeight",     value: v })} min={1.2} max={27.0} step={0.5} unit="m" />
              <Slider label="Brightness" value={ledWallBrightness} onChange={(v) => apply({ type: "ledWall.setBrightness", value: v })} min={0}   max={2.5} step={0.05} />
              <Slider label="Volume"     value={videoVolume}       onChange={(v) => apply({ type: "video.setVolume", value: v })} min={0} max={100} step={1} />
              <div className="flex items-center gap-2 mt-1">
                <span className="t-label w-[55px] flex-shrink-0">YouTube</span>
                <input
                  type="text"
                  value={kit.scene?.youtubeId ?? ""}
                  onChange={(e) => apply({ type: "ledWall.setYoutubeId", value: e.target.value })}
                  placeholder="video id"
                  spellCheck={false}
                  className="t-num flex-1 min-w-0 rounded-[6px] px-2 py-1 text-[0.65rem] neumorph-inset bg-transparent outline-none"
                />
              </div>
            </>
          )}
        </Section>

        <Section label="Wall graphic" defaultOpen={false}>
          {kit.scene?.wallGraphic ? (
            <div className="t-label flex items-center justify-between">
              <span className="truncate">{kit.scene.wallGraphic.split("/").pop()}</span>
              <span className="text-[color:var(--color-accent)]">image</span>
            </div>
          ) : kit.scene?.wallMotif ? (
            <div className="t-label flex items-center justify-between">
              <span>{kit.scene.wallMotif}</span>
              <span className="text-[color:var(--color-accent)]">motif</span>
            </div>
          ) : (
            <div className="t-label opacity-60">No back-wall artwork for this kit.</div>
          )}
        </Section>

        <Section label="Custom props" defaultOpen={false}>
          {Array.isArray(kit.scene?.props) && kit.scene.props.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {(kit.scene.props as Array<{ kind?: string }>).map((p, i) => (
                <div key={i} className="t-label flex items-center justify-between">
                  <span className="truncate">{p.kind ?? "—"}</span>
                  <span className="text-[0.55rem] opacity-50">#{i + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="t-label opacity-60">No kit-specific props.</div>
          )}
        </Section>

        {/* Sofa colour moved to Surface colours in the left dock; Floor
            finish moved back to the left dock too. */}
      </Card>

      {/* BOM panel — bottom right, resizable */}
      <Card
        className="ui-overlay absolute right-3 bottom-3 flex flex-col panel-glass"
        radius="md"
        variant="panel"
        style={bomExpanded
          ? { width: "min(880px, calc(100vw - 24px))", height: "calc(100vh - 80px)" }
          : { width: "240px", height: "188px" }}
      >
        {/* Resize handle removed — expanded BOM now fills the viewport
            (height: calc(100vh - 80px)) and shouldn't be resizable. */}
        <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between border-b border-[color:var(--color-border-soft)]">
          <span className="t-label">Bill of materials</span>
          <div className="flex items-center gap-0.5">
            <BomSettingsButton />
            <button
              onClick={() => openInvoiceWindow(bom.lines, bom.byCategory, bom.grandLow, bom.grandHigh, { client: kit.name, areaM2, reuse })}
              className="px-2 h-5 rounded-[4px] hover:bg-[color:var(--color-surface-sub)] grid place-items-center text-[color:var(--color-text-soft)] hover:text-[color:var(--color-accent)] transition-colors text-[0.6rem] uppercase tracking-wider"
              aria-label="Generate invoice"
              title="Open a printable invoice in a new tab"
            >
              Invoice
            </button>
            <button
              onClick={() => setBomExpanded((v) => !v)}
              className="w-5 h-5 rounded-[4px] hover:bg-[color:var(--color-surface-sub)] grid place-items-center text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)] transition-colors"
              aria-label={bomExpanded ? "Collapse" : "Expand"}
            >
              <motion.svg animate={{ rotate: bomExpanded ? 0 : 180 }} width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 scroll-pretty">
          {bomExpanded ? <BomSpreadsheet bom={bom} /> : <BomCompact bom={bom} />}
          <div className="pt-2 mt-2 border-t border-[color:var(--color-border-soft)] flex items-center justify-between">
            <span className="t-label">Reuse</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-[3px] rounded-full neumorph-inset overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: kit.palette.accent }}
                  animate={{ width: `${reuse}%` }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              </div>
              <span className="t-num" style={{ color: kit.palette.accent }}>{reuse}%</span>
            </div>
          </div>
          <button
            onClick={() => apply({ type: "brandKit.toggleMaximiseReuse", value: !maximiseReuse })}
            className={
              "mt-1 w-full h-6 rounded-[6px] text-[0.7rem] transition-all " +
              (maximiseReuse
                ? "neumorph-inset text-[color:var(--color-accent)]"
                : "neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]")
            }
          >
            {maximiseReuse ? "✓ optimise" : "optimise"}
          </button>
        </div>

        <div className="px-3 py-2 border-t border-[color:var(--color-border-soft)]">
          <div className="flex items-baseline justify-between">
            <span className="t-row">Total</span>
            <span className="t-num">€{(totalLow / 1000).toFixed(1)}k–{(totalHigh / 1000).toFixed(1)}k</span>
          </div>
          <div className="flex items-baseline justify-between mt-0.5 t-label">
            <span>{Math.round(areaM2)} m² · {kit.name}</span>
            <span>33% margin</span>
          </div>
        </div>
      </Card>
    </main>
  );
}

// ── BOM views (resolved-line driven) ─────────────────────────────────────────

type Bom = ReturnType<typeof deriveBom>;

const CATEGORY_ORDER: { id: "materials" | "labour" | "services" | "logistics"; label: string }[] = [
  { id: "materials", label: "Materials" },
  { id: "labour",    label: "Labour" },
  { id: "services",  label: "Services" },
  { id: "logistics", label: "Logistics" },
];

function BomCompact({ bom }: { bom: Bom }) {
  return (
    <div className="space-y-2">
      {CATEGORY_ORDER.map((c) => (
        <div key={c.id} className="flex items-baseline justify-between">
          <span className="t-label">{c.label}</span>
          <span className="t-num">€{bom.byCategory[c.id].toLocaleString("en-DE")}</span>
        </div>
      ))}
    </div>
  );
}

function BomSpreadsheet({ bom }: { bom: Bom }) {
  return (
    <div className="t-row space-y-3">
      <div className="grid grid-cols-[1fr_28px_28px_60px_64px] gap-1 px-1 pb-1 border-b border-[color:var(--color-border-soft)] t-label">
        <span>Item</span>
        <span className="text-right">Qty</span>
        <span className="text-right">U.</span>
        <span className="text-right">Rate</span>
        <span className="text-right">Total</span>
      </div>
      {CATEGORY_ORDER.map((c) => {
        const lines = bom.lines.filter((l) => l.category === c.id && l.qty > 0);
        if (lines.length === 0) return null;
        return (
          <div key={c.id}>
            <div className="flex items-baseline justify-between px-1 mb-1">
              <span className="t-label">{c.label}</span>
              <span className="t-num text-[color:var(--color-text-soft)]">€{bom.byCategory[c.id].toLocaleString("en-DE")}</span>
            </div>
            <div className="space-y-[2px]">
              {lines.map((l) => (
                <div key={l.id} className="grid grid-cols-[1fr_28px_28px_60px_64px] gap-1 px-1 py-[2px] hover:bg-[color:var(--color-surface-sub)]/60 rounded-[3px]">
                  <span className="truncate" title={l.label}>{l.label}</span>
                  <span className="t-num text-right">{Number.isInteger(l.qty) ? l.qty : l.qty.toFixed(1)}</span>
                  <span className="t-label text-right">{l.unit}</span>
                  <span className="t-num text-right">€{l.rateResolved}</span>
                  <span className="t-num text-right">€{l.total.toLocaleString("en-DE")}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Drag handle in the top-left corner of the expanded BOM card
function ResizeCornerHandle({ bomW, bomH, setBomW, setBomH }: { bomW: number; bomH: number; setBomW: (n: number) => void; setBomH: (n: number) => void }) {
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = { x: e.clientX, y: e.clientY, w: bomW, h: bomH };
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = startRef.current;
    if (!s) return;
    // Dragging left + up grows the panel (because it's anchored bottom-right).
    const dx = s.x - e.clientX;
    const dy = s.y - e.clientY;
    setBomW(Math.min(720, Math.max(320, s.w + dx)));
    setBomH(Math.min(window.innerHeight - 60, Math.max(280, s.h + dy)));
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    startRef.current = null;
  };
  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      className="absolute -top-1 -left-1 w-4 h-4 cursor-nwse-resize z-20 grid place-items-center"
      title="Drag to resize"
    >
      <div className="w-2.5 h-2.5 rounded-tl-[3px] border-l border-t border-[color:var(--color-text-soft)]" />
    </div>
  );
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

type PillOption = { value: string; label: string };
function PillRow({
  options, value, onSelect, disabled, className,
}: { options: PillOption[]; value: string; onSelect: (v: string) => void; disabled?: boolean; className?: string }) {
  return (
    <div className={"flex gap-1 " + (className ?? "")}>
      {options.map((o) => (
        <button
          key={o.value}
          disabled={disabled}
          onClick={() => onSelect(o.value)}
          className={
            "flex-1 h-7 rounded-[6px] text-[0.7rem] capitalize transition-all disabled:opacity-40 " +
            (value === o.value
              ? "neumorph-inset text-[color:var(--color-accent)]"
              : "neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]")
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TopBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        "h-6 px-2.5 rounded-[6px] text-[0.7rem] transition-all " +
        (active
          ? "neumorph-raised text-[color:var(--color-accent)]"
          : "text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]")
      }
    >
      {children}
    </button>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between h-6">
      <span className="t-label">{label}</span>
      <button
        onClick={() => onToggle(!value)}
        className={
          "h-5 w-9 rounded-full transition-colors relative " +
          (value ? "bg-[color:var(--color-accent)]" : "neumorph-inset")
        }
        aria-label={`${label} ${value ? "on" : "off"}`}
      >
        <span
          className="absolute top-[2px] w-4 h-4 rounded-full transition-transform bg-[color:var(--color-surface-hi)]"
          style={{ left: 2, transform: value ? "translateX(16px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );
}

function NavBtn({ children, onClick, title }: { children: React.ReactNode; onClick?: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="text-[0.74rem] uppercase tracking-wider text-[color:var(--color-text)] hover:text-[#ee7f1a] transition-colors"
      style={{ fontVariationSettings: '"wdth" 100, "wght" 600' }}
    >
      {children}
    </button>
  );
}
