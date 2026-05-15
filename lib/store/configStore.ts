"use client";
import { create } from "zustand";
import type { Intent, PendantShape, SizeTier, FootprintShape } from "@/lib/schemas";
import { standardSizeTiers } from "@/lib/schemas";
import { seedBrandKitList, findKitById } from "@/lib/fixtures/brandKits";
import type { TableVariant, ChairVariant } from "@/lib/scene/Boardroom";

// Configurator state — derived/persisted from a real StandConfig later.
// For Week-1 we keep a flat shape that mirrors what the UI binds to;
// the next step folds this into the canonical `StandConfig` Zod object.

export type HallMode = "gallery.light" | "warehouse.dark";

export type ConfigState = {
  // footprint
  shape: FootprintShape;
  tier: SizeTier;
  widthM: number;
  depthM: number;
  // layout
  wallHeightM: number;          // 2.0..5.0, UI snaps to 0.25m
  trussTopM: number;            // 2.5..7.0, UI snaps to 0.25m
  // pendant
  pendantEnabled: boolean;
  pendantShape: PendantShape;
  pendantWidthM: number;        // 1.0..8.0
  pendantDepthM: number;        // 1.0..6.0
  pendantHeightM: number;       // 0.3..1.2 (vertical thickness)
  pendantYOffsetM: number;      // -1.5..+1.5 — moves pendant up/down from default (which is trussTop - 1.2)
  pendantRotationDeg: number;   // 0..90 — applied as rotation-Y on the pendant group (45° → diamond)
  pendantRingVertical: boolean; // ring shape: true = stands vertically (faces camera), false = horizontal halo

  // Hero / signature elements (Round 8+ additions)
  lightShaftsEnabled: boolean;
  lightShaftDensity: number;          // 0..1 — opacity of visible spot cones
  lightboxLogoEnabled: boolean;       // free-floating internally-lit logo sign
  radiatingRigEnabled: boolean;       // concentric ring lights around the pendant
  radiatingRings: number;             // 2..6 — number of rings
  radiatingRadiusM: number;           // 1.5..6
  radiatingYOffsetM: number;          // -1..+2 — offset from pendant Y
  radiatingColor: string;             // hex; empty = use kit accent
  glassBalconyEnabled: boolean;       // half-height platform + glass rail
  circularScreenEnabled: boolean;     // brand-coloured disc media element on back wall
  wraparoundScreenEnabled: boolean;   // curved LED wall wrapping the back of the booth
  // Boardroom geometry
  windowsEnabled: boolean;            // ribbon windows on the side walls (glass shading)
  ceilingEnabled: boolean;            // enclosed ceiling slab (off = open / exhibition look)
  windowSillM: number;                // 0.4..1.6 — height of the window sill off the floor
  roomCount: number;                  // 1..6 — cloned rooms linked by mid-wall doorways
  tableLengthM: number;               // 2.0..8.0 — boardroom table length (non-parametric resize)
  tableWidthM: number;                // 1.0..3.0 — boardroom table width
  chairCount: number;                 // 0..16 — chairs arranged around the table, facing in
  tableVariant: TableVariant;         // which boardroom-table GLB
  chairVariant: ChairVariant;         // which boardroom-chair GLB
  // LED / video wall
  ledWallEnabled: boolean;
  ledWallWidthM: number;        // 2.0..14.0
  ledWallHeightM: number;       // 1.2..7.0
  ledWallBrightness: number;    // 0..2.5
  // scene
  hallMode: HallMode;
  hdriId: string;                   // explicit selection (empty = auto from hallMode)
  hallVisible: boolean;             // toggle the 3D hall context glb
  hdrIntensity: number;             // 0..2 — env-lighting multiplier
  hdrBgIntensity: number;           // 0..2 — visible-background multiplier
  hallDarkness: number;             // 0..1 — 1 = darkest (collapses to near-black)
  highDpr: boolean;                 // true = retina (1..2), false = forced 1× for perf
  dprFloor: number;                 // 1 or 0.5 — auto-dropped to 0.5 by PerfMonitor when FPS sags after DPR already at 1×
  floorStyle: "herringbone" | "diagonal" | "rectangular";
  renderMode: "edit" | "viz";       // edit = fewer lights/emissive for editing speed; viz = full
  cameraEntryFired: boolean;        // tracks whether the entry-mode pullback has played
  exposure: number;                  // -1..+1
  keyLightIntensity: number;         // 0..2.5
  // Colour grading — applied as CSS filters on the canvas wrapper.
  cgBrightness: number;              // 0.5..1.5 (1 = unchanged)
  cgContrast: number;                // 0.5..1.5
  cgSaturation: number;              // 0..2
  cgVibrance: number;                // 0..1 (mild secondary saturate at higher values)
  cgWhiteBalance: number;            // -30..+30 degrees of hue-rotate (negative warmer, positive cooler)
  // YouTube iframe ambient audio.
  videoVolume: number;               // 0..100 — passed to YT IFrame API setVolume()
  videoMuted: boolean;
  /** Per-kit logo override (data: URL set by the user via the upload button). */
  logoOverrides: Record<string, string>;
  plantCount: number;                // 0..6
  logoGlow: number;                  // 0..1.5  — back-wall sconce intensity
  logoExtrusionM: number;            // 0..0.04 — logo sign thickness
  logoEmissive: number;              // 0..3 — self-illumination of logo decals
  sofaCount: number;                 // 0..4
  coffeeTableVariant: "avarta" | "kumo" | "geo"; // which glb sits between the sofa pair
  standingDisplayCount: number;      // 0..4 — angled standing displays around the room (suppressed when kit opts out via noDefaultDressing)
  platformHeightM: number;           // 0.10..0.30 — raised platform thickness
  cameraFov: number;                 // 20..70
  cameraPreset: string;              // last requested preset id ('' = no command)
  /** Per-preset custom overrides (position + target + fov) — overlays the built-in defaults. */
  cameraPresetOverrides: Record<string, { pos: [number, number, number]; target: [number, number, number]; fov: number }>;
  /** Currently-selected preset (which one the editable fields below mutate). */
  cameraActivePreset: string;

  // Manual colour overrides per surface — null = use kit default
  colourOverrides: Partial<Record<"walls" | "floor" | "trim" | "pendant" | "truss" | "sofa" | "counter" | "vitrine" | "monitor", string | null>>;
  // Per-line BOM rate overrides (lineId → unit-rate in EUR)
  bomRateOverrides: Record<string, number>;
  // brand
  brandKitId: string;
  /** Revision counter bumped when an active brand kit's mutable fields (e.g. youtubeId) change in-memory. */
  kitRev: number;
  // toggles
  maximiseReuse: boolean;

  // single dispatcher for everything — same shape an agent would post.
  apply: (intent: Intent) => void;
  // Convenience selectors (memo'd by caller; not strictly needed).
};

function bounds(shape: FootprintShape, tier: SizeTier) {
  // `standardSizeTiers` is a typed const; the shape lookup is safe.
  return standardSizeTiers[shape][tier];
}

const defaultShape: FootprintShape = "rectangle";
const defaultTier: SizeTier = "M";
const defaultBounds = bounds(defaultShape, defaultTier);

export const useConfig = create<ConfigState>((set, get) => ({
  shape: defaultShape,
  tier: defaultTier,
  widthM: defaultBounds.widthM.default,
  depthM: defaultBounds.depthM.default,
  wallHeightM: 4.2,
  trussTopM: 5.5,
  pendantEnabled: true,
  pendantShape: "rectangle",
  pendantWidthM: 5.0,
  pendantDepthM: 4.5,
  pendantHeightM: 1.0,
  pendantYOffsetM: 0,
  pendantRotationDeg: 0,
  pendantRingVertical: false,
  lightShaftsEnabled: false,
  lightShaftDensity: 0.12,
  lightboxLogoEnabled: false,
  radiatingRigEnabled: false,
  radiatingRings: 3,
  radiatingRadiusM: 3.0,
  radiatingYOffsetM: 0.3,
  radiatingColor: "",
  glassBalconyEnabled: false,
  circularScreenEnabled: false,
  wraparoundScreenEnabled: false,
  windowsEnabled: true,
  ceilingEnabled: true,
  windowSillM: 0.95,
  roomCount: 1,
  tableLengthM: 3.6,
  tableWidthM: 1.4,
  chairCount: 8,
  tableVariant: "main",
  chairVariant: "studio",
  ledWallEnabled: true,
  ledWallWidthM: 12.0,          // big back-wall screen — LedWall clamps it to fit
  ledWallHeightM: 6.75,         // 12 / 6.75 = 16:9
  ledWallBrightness: 1.4,
  hallMode: "warehouse.dark",
  hdriId: "",
  hallVisible: true,
  hdrIntensity: 0.20,
  hdrBgIntensity: 0.20,
  hallDarkness: 0.85,
  highDpr: true,
  dprFloor: 1,
  floorStyle: "herringbone",
  renderMode: "viz",
  cameraEntryFired: false,
  exposure: 0,
  keyLightIntensity: 1.0,
  cgBrightness: 1.0,
  cgContrast: 1.0,
  cgSaturation: 1.0,
  cgVibrance: 0.0,
  cgWhiteBalance: 0,
  videoVolume: 8,
  videoMuted: true,
  logoOverrides: {},
  plantCount: 3,
  logoGlow: 1.0,
  logoExtrusionM: 0.3,
  logoEmissive: 1.2,
  sofaCount: 0,
  coffeeTableVariant: "avarta",
  standingDisplayCount: 2,
  platformHeightM: 0.20,
  cameraFov: 40,
  cameraPreset: "",
  cameraPresetOverrides: {},
  cameraActivePreset: "hero",
  colourOverrides: {},
  bomRateOverrides: {},
  brandKitId: seedBrandKitList[0]!.id,
  kitRev: 0,
  maximiseReuse: false,

  apply(intent) {
    const s = get();
    switch (intent.type) {
      case "footprint.setShape": {
        // Atrium / pavilion is naturally a large-room shape — bump to the L
        // tier when picked unless the user is already there. Other shapes
        // keep whatever tier the user previously chose.
        const nextTier = intent.shape === "pavilion" && s.tier !== "L" ? "L" : s.tier;
        const b = bounds(intent.shape, nextTier);
        set({
          shape: intent.shape,
          tier: nextTier,
          widthM: b.widthM.default,
          depthM: b.depthM.default,
        });
        break;
      }
      case "footprint.setTier": {
        const b = bounds(s.shape, intent.tier);
        set({
          tier: intent.tier,
          widthM: b.widthM.default,
          depthM: b.depthM.default,
        });
        break;
      }
      case "footprint.set": {
        const b = bounds(s.shape, s.tier);
        set({
          widthM: clamp(intent.widthM, b.widthM.min, b.widthM.max),
          depthM: clamp(intent.depthM, b.depthM.min, b.depthM.max),
        });
        break;
      }
      case "layout.setWallHeight": {
        set({ wallHeightM: clamp(intent.value, 2.0, 5.0) });
        // Keep truss above walls automatically.
        const t = get().trussTopM;
        if (t < intent.value + 0.5) set({ trussTopM: clamp(intent.value + 1.5, 2.5, 7.0) });
        break;
      }
      case "layout.setTrussTop": {
        const w = get().wallHeightM;
        set({ trussTopM: clamp(Math.max(intent.value, w + 0.5), 2.5, 7.0) });
        break;
      }
      case "pendant.setShape": {
        set({ pendantShape: intent.shape });
        break;
      }
      case "pendant.setEnabled": {
        set({ pendantEnabled: intent.enabled });
        break;
      }
      case "pendant.setWidth": {
        set({ pendantWidthM: clamp(intent.value, 1.0, 8.0) });
        break;
      }
      case "pendant.setDepth": {
        set({ pendantDepthM: clamp(intent.value, 1.0, 6.0) });
        break;
      }
      case "pendant.setHeight": {
        set({ pendantHeightM: clamp(intent.value, 0.3, 1.2) });
        break;
      }
      case "pendant.setYOffset": {
        set({ pendantYOffsetM: clamp(intent.value, -1.5, 1.5) });
        break;
      }
      case "pendant.setRotation": {
        set({ pendantRotationDeg: clamp(intent.value, 0, 90) });
        break;
      }
      case "pendant.setRingVertical": {
        set({ pendantRingVertical: intent.value });
        break;
      }
      case "scene.setLightShafts":       { set({ lightShaftsEnabled: intent.value }); break; }
      case "scene.setLightShaftDensity": { set({ lightShaftDensity: clamp(intent.value, 0, 0.25) }); break; }
      case "scene.setLightboxLogo":      { set({ lightboxLogoEnabled: intent.value }); break; }
      case "scene.setRadiatingRig":      { set({ radiatingRigEnabled: intent.value }); break; }
      case "scene.setRadiatingRings":    { set({ radiatingRings: Math.round(clamp(intent.value, 2, 6)) }); break; }
      case "scene.setRadiatingRadius":   { set({ radiatingRadiusM: clamp(intent.value, 1.0, 6.0) }); break; }
      case "scene.setRadiatingYOffset":  { set({ radiatingYOffsetM: clamp(intent.value, -2.0, 3.0) }); break; }
      case "scene.setRadiatingColor":    { set({ radiatingColor: intent.value }); break; }
      case "scene.setGlassBalcony":      { set({ glassBalconyEnabled: intent.value }); break; }
      case "scene.setCircularScreen":    { set({ circularScreenEnabled: intent.value }); break; }
      case "scene.setWraparoundScreen":  { set({ wraparoundScreenEnabled: intent.value }); break; }
      case "room.setWindowsEnabled":     { set({ windowsEnabled: intent.value }); break; }
      case "room.setCeilingEnabled":     { set({ ceilingEnabled: intent.value }); break; }
      case "room.setWindowSill":         { set({ windowSillM: clamp(intent.value, 0.4, 1.6) }); break; }
      case "room.setCount":              { set({ roomCount: Math.round(clamp(intent.value, 1, 6)) }); break; }
      case "boardroom.setTableLength":   { set({ tableLengthM: clamp(intent.value, 2.0, 8.0) }); break; }
      case "boardroom.setTableWidth":    { set({ tableWidthM: clamp(intent.value, 1.0, 3.0) }); break; }
      case "boardroom.setChairCount":    { set({ chairCount: Math.round(clamp(intent.value, 0, 16)) }); break; }
      case "boardroom.setTableVariant":  { set({ tableVariant: intent.value }); break; }
      case "boardroom.setChairVariant":  { set({ chairVariant: intent.value }); break; }
      case "ledWall.setEnabled": {
        set({ ledWallEnabled: intent.enabled });
        break;
      }
      case "ledWall.setWidth": {
        set({ ledWallWidthM: clamp(intent.value, 2.0, 48.0) });
        break;
      }
      case "ledWall.setHeight": {
        set({ ledWallHeightM: clamp(intent.value, 1.2, 27.0) });
        break;
      }
      case "ledWall.setBrightness": {
        set({ ledWallBrightness: clamp(intent.value, 0, 2.5) });
        break;
      }
      case "ledWall.setYoutubeId": {
        const kit = findKitById(get().brandKitId);
        if (!kit) break;
        if (!kit.scene) kit.scene = {};
        kit.scene.youtubeId = intent.value.trim();
        // Bump a revision counter so subscribers re-read kit fields.
        set({ kitRev: (get().kitRev ?? 0) + 1 });
        break;
      }
      case "brandKit.apply": {
        const kit = findKitById(intent.kitId);
        if (!kit) break;
        const patch: Partial<ConfigState> = { brandKitId: kit.id };
        // Pendant shape follows the brand's preferred default — but only if
        // the brand declares one. "none" leaves the current shape alone.
        if (kit.pendant.preferredShape !== "none") {
          patch.pendantShape = kit.pendant.preferredShape;
          patch.pendantEnabled = true;
        } else {
          patch.pendantEnabled = false;
        }
        // Kit can request a larger footprint when it ships (Nissan patrol,
        // Swiss Krono moss wall). The tier override drives the slider bounds;
        // explicit dims, if provided, are clamped to the resolved tier bounds.
        if (kit.scene?.defaultTier) {
          patch.tier = kit.scene.defaultTier;
        }
        const shape = get().shape;
        const tier = patch.tier ?? get().tier;
        const b = bounds(shape, tier);
        // A kit-declared tier resets the footprint to that tier's defaults
        // (explicit defaultWidthM / defaultDepthM below still override).
        if (kit.scene?.defaultTier) {
          patch.widthM = b.widthM.default;
          patch.depthM = b.depthM.default;
        }
        if (kit.scene?.defaultWidthM !== undefined) {
          patch.widthM = clamp(kit.scene.defaultWidthM, b.widthM.min, b.widthM.max);
        }
        if (kit.scene?.defaultDepthM !== undefined) {
          patch.depthM = clamp(kit.scene.defaultDepthM, b.depthM.min, b.depthM.max);
        }
        // Pendant colour override comes from the kit when it declares one.
        // Falls back to the kit primary if unset.
        const co = { ...get().colourOverrides };
        co.pendant = kit.scene?.defaultPendantColor ?? null;
        patch.colourOverrides = co;
        set(patch);
        break;
      }
      case "brandKit.toggleMaximiseReuse": {
        set({ maximiseReuse: intent.value });
        break;
      }
      case "scene.setMode": {
        set({ hallMode: intent.hall });
        break;
      }
      case "scene.setHdri": {
        set({ hdriId: intent.hdriId });
        break;
      }
      case "scene.setHallVisible": {
        set({ hallVisible: intent.value });
        break;
      }
      case "scene.setHdrIntensity":   { set({ hdrIntensity:   clamp(intent.value, 0, 2) }); break; }
      case "scene.setHdrBgIntensity": { set({ hdrBgIntensity: clamp(intent.value, 0, 2) }); break; }
      case "scene.setHallDarkness":   { set({ hallDarkness:   clamp(intent.value, 0, 1) }); break; }
      case "scene.setHighDpr":        { set({ highDpr: intent.value }); break; }
      case "scene.setDprFloor":       { set({ dprFloor: intent.value <= 0.6 ? 0.5 : 1 }); break; }
      case "scene.setFloorStyle":     { set({ floorStyle: intent.value }); break; }
      case "scene.setRenderMode":     { set({ renderMode: intent.value }); break; }
      case "camera.markEntryFired":   { set({ cameraEntryFired: true }); break; }
      case "scene.setExposure": {
        set({ exposure: clamp(intent.value, -1.5, 1.5) });
        break;
      }
      case "scene.setKeyIntensity": {
        set({ keyLightIntensity: clamp(intent.value, 0, 3) });
        break;
      }
      case "cg.setBrightness": { set({ cgBrightness: clamp(intent.value, 0.5, 1.5) }); break; }
      case "cg.setContrast":   { set({ cgContrast:   clamp(intent.value, 0.5, 1.5) }); break; }
      case "cg.setSaturation": { set({ cgSaturation: clamp(intent.value, 0, 2)     }); break; }
      case "cg.setVibrance":   { set({ cgVibrance:   clamp(intent.value, 0, 1)     }); break; }
      case "cg.setWhiteBalance": { set({ cgWhiteBalance: clamp(intent.value, -30, 30) }); break; }
      case "video.setVolume": { set({ videoVolume: clamp(intent.value, 0, 100) }); break; }
      case "video.setMuted": { set({ videoMuted: intent.value }); break; }
      case "scene.resetGeometry": {
        // Restore booth geometry to whatever the active kit defaults to
        // (kit.scene.defaultTier / defaultWidthM / defaultDepthM if set,
        // otherwise the resolved tier-default for the current shape).
        const kit = findKitById(get().brandKitId);
        const shape = get().shape;
        const tier = kit?.scene?.defaultTier ?? get().tier;
        const b = bounds(shape, tier);
        set({
          tier,
          widthM: kit?.scene?.defaultWidthM ?? b.widthM.default,
          depthM: kit?.scene?.defaultDepthM ?? b.depthM.default,
          wallHeightM: 4.2,
          trussTopM: 5.5,
          platformHeightM: 0.2,
          pendantHeightM: 1.0,
          windowsEnabled: true,
          ceilingEnabled: true,
          windowSillM: 0.95,
          roomCount: 1,
          tableLengthM: 3.6,
          tableWidthM: 1.4,
          chairCount: 8,
        });
        break;
      }
      case "kit.setLogoOverride": {
        set({ logoOverrides: { ...get().logoOverrides, [intent.kitId]: intent.dataUrl } });
        // Bump kitRev so consumers re-read the kit's effective logos.
        set({ kitRev: (get().kitRev ?? 0) + 1 });
        break;
      }
      case "kit.clearLogoOverride": {
        const next = { ...get().logoOverrides };
        delete next[intent.kitId];
        set({ logoOverrides: next, kitRev: (get().kitRev ?? 0) + 1 });
        break;
      }
      case "layout.setPlantCount": {
        set({ plantCount: Math.round(clamp(intent.value, 0, 8)) });
        break;
      }
      case "scene.setLogoGlow": {
        set({ logoGlow: clamp(intent.value, 0, 2.0) });
        break;
      }
      case "scene.setLogoExtrusion": {
        set({ logoExtrusionM: clamp(intent.value, 0, 0.5) });
        break;
      }
      case "scene.setLogoEmissive": {
        set({ logoEmissive: clamp(intent.value, 0, 4) });
        break;
      }
      case "layout.setSofaCount": {
        set({ sofaCount: Math.round(clamp(intent.value, 0, 4)) });
        break;
      }
      case "layout.setCoffeeTable": {
        set({ coffeeTableVariant: intent.value });
        break;
      }
      case "layout.setStandingDisplayCount": {
        set({ standingDisplayCount: Math.round(clamp(intent.value, 0, 4)) });
        break;
      }
      case "layout.setPlatformHeight": {
        set({ platformHeightM: clamp(intent.value, 0.1, 0.3) });
        break;
      }
      case "camera.setFov": {
        set({ cameraFov: clamp(intent.value, 20, 70) });
        break;
      }
      case "camera.gotoPreset": {
        // toggle: set the preset, scene consumer resets it once consumed
        set({ cameraPreset: intent.preset, cameraActivePreset: intent.preset || s.cameraActivePreset });
        break;
      }
      case "camera.savePreset": {
        set({
          cameraPresetOverrides: {
            ...s.cameraPresetOverrides,
            [intent.preset]: { pos: intent.pos, target: intent.target, fov: intent.fov },
          },
        });
        break;
      }
      case "camera.setActivePreset": {
        set({ cameraActivePreset: intent.preset });
        break;
      }
      case "colourOverride.set": {
        set({ colourOverrides: { ...s.colourOverrides, [intent.surface]: intent.value } });
        break;
      }
      case "bom.setLineRate": {
        set({ bomRateOverrides: { ...s.bomRateOverrides, [intent.lineId]: intent.rate } });
        break;
      }
      case "bom.resetRates": {
        set({ bomRateOverrides: {} });
        break;
      }
      // Stubbed for now — wired when scene/save are implemented.
      case "wall.profile.set":
      case "wall.infill.set":
      case "wall.anchor.add":
      case "wall.anchor.move":
      case "brandKit.apply":      // unreachable; handled above but ts-narrows
      case "camera.gotoShot":
      case "scene.save":
      case "scene.exportPdf":
      case "layout.setFloor":
        break;
    }
  },
}));

function clamp(n: number, lo: number, hi: number) {
  return Math.min(Math.max(n, lo), hi);
}

export function useBrandKit() {
  const id = useConfig((s) => s.brandKitId);
  // Subscribe to the revision counter so mutations to the kit object
  // (e.g. youtubeId edits) re-render consumers even though the reference is stable.
  useConfig((s) => s.kitRev);
  const override = useConfig((s) => s.logoOverrides[id]);
  const kit = findKitById(id) ?? seedBrandKitList[0]!;
  // If the user has uploaded a replacement logo for this kit, splice it
  // into every logo slot. Cheap shallow clone — kit is small.
  if (override) {
    return {
      ...kit,
      logos: {
        primary:   { ...kit.logos.primary,   rasterUrl: override },
        monoLight: { ...kit.logos.monoLight, rasterUrl: override },
        monoDark:  { ...kit.logos.monoDark,  rasterUrl: override },
        icon:      { ...kit.logos.icon,      rasterUrl: override },
      },
    };
  }
  return kit;
}

export function useTierBounds() {
  const shape = useConfig((s) => s.shape);
  const tier = useConfig((s) => s.tier);
  return bounds(shape, tier);
}
