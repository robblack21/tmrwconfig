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

/** One cell in the LED-wall video matrix. `kind: "default"` falls back to
 *  the kit's logo for that cell. `kind: "youtube"` plays the value as a
 *  YouTube ID; `kind: "image"` renders the URL (HTTP or data URL upload). */
export type VideoCell = {
  kind: "default" | "youtube" | "image";
  value: string;
};

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
  // Video-matrix display — the LED wall splits into N×N cells. Cell (0,0)
  // hosts the kit's YouTube video by default; other cells show the brand
  // logo, or a per-cell override (image URL / uploaded data URL).
  videoMatrixCols: number;      // 1..4
  videoMatrixRows: number;      // 1..4
  videoMatrixCells: VideoCell[];// length = cols*rows (sparse — defaults applied at render)
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
  colourOverrides: Partial<Record<"walls" | "floor" | "trim" | "pendant" | "truss" | "sofa" | "counter" | "vitrine" | "monitor" | "table" | "chair" | "ceiling", string | null>>;
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

/** Minimum interior room dimensions to seat chairs around a table of the
 *  given length × width with a comfortable aisle on all sides.
 *  Chair gap (0.42m) + chair depth (~0.55m) + aisle (1.0m) ≈ 2m per side
 *  → 4m total buffer beyond the table itself. */
function minRoomForTable(tableLengthM: number, tableWidthM: number): { widthM: number; depthM: number } {
  const BUFFER = 4.0;
  return { widthM: tableWidthM + BUFFER, depthM: tableLengthM + BUFFER };
}

/** Bump tier / width / depth so the room can accommodate a table of the
 *  given footprint. The room only ever grows — never shrinks — so existing
 *  larger rooms keep their dimensions. Returns the patch to merge. */
function fitRoomForTable(
  shape: FootprintShape,
  currentTier: SizeTier,
  currentWidth: number,
  currentDepth: number,
  tableLengthM: number,
  tableWidthM: number,
): { tier: SizeTier; widthM: number; depthM: number } {
  const need = minRoomForTable(tableLengthM, tableWidthM);
  const tierOrder: SizeTier[] = ["S", "M", "L"];
  let tier = currentTier;
  // Step the tier up until its max bounds can host the requested room.
  while (true) {
    const b = bounds(shape, tier);
    if (need.widthM <= b.widthM.max && need.depthM <= b.depthM.max) break;
    const idx = tierOrder.indexOf(tier);
    if (idx >= tierOrder.length - 1) break;
    tier = tierOrder[idx + 1]!;
  }
  const b = bounds(shape, tier);
  return {
    tier,
    widthM: Math.min(b.widthM.max, Math.max(currentWidth, need.widthM)),
    depthM: Math.min(b.depthM.max, Math.max(currentDepth, need.depthM)),
  };
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
  ledWallWidthM: 5.6,           // 16:9 default — sized for a typical M-tier
                                // back wall (12m wide), leaves room for the
                                // flanking monitors on either side.
  ledWallHeightM: 3.15,         // 5.6 / 3.15 = 16:9
  ledWallBrightness: 1.4,
  videoMatrixCols: 1,
  videoMatrixRows: 1,
  videoMatrixCells: [],
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
  cameraFov: 60,
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
        const seedTier = intent.shape === "pavilion" && s.tier !== "L" ? "L" : s.tier;
        const b = bounds(intent.shape, seedTier);
        // Then run fit-to-table — if the table doesn't fit the new shape's
        // default room (e.g. circular S would clip a long table), grow.
        const fit = fitRoomForTable(intent.shape, seedTier, b.widthM.default, b.depthM.default, s.tableLengthM, s.tableWidthM);
        set({ shape: intent.shape, ...fit });
        break;
      }
      case "footprint.setTier": {
        const b = bounds(s.shape, intent.tier);
        const fit = fitRoomForTable(s.shape, intent.tier, b.widthM.default, b.depthM.default, s.tableLengthM, s.tableWidthM);
        set(fit);
        break;
      }
      case "footprint.set": {
        const b = bounds(s.shape, s.tier);
        // Honour the user's explicit slider input but never let the room
        // shrink below what the table needs — chairs must stay inside.
        const nextW = clamp(intent.widthM, b.widthM.min, b.widthM.max);
        const nextD = clamp(intent.depthM, b.depthM.min, b.depthM.max);
        const fit = fitRoomForTable(s.shape, s.tier, nextW, nextD, s.tableLengthM, s.tableWidthM);
        set(fit);
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
      case "boardroom.setTableLength": {
        const next = clamp(intent.value, 2.0, 8.0);
        // Grow the room (and tier if needed) so the table + chairs always fit.
        const fit = fitRoomForTable(s.shape, s.tier, s.widthM, s.depthM, next, s.tableWidthM);
        set({ tableLengthM: next, ...fit });
        break;
      }
      case "boardroom.setTableWidth": {
        const next = clamp(intent.value, 1.0, 3.0);
        const fit = fitRoomForTable(s.shape, s.tier, s.widthM, s.depthM, s.tableLengthM, next);
        set({ tableWidthM: next, ...fit });
        break;
      }
      case "boardroom.setChairCount":    { set({ chairCount: Math.round(clamp(intent.value, 0, 16)) }); break; }
      case "boardroom.setTableVariant":  { set({ tableVariant: intent.value }); break; }
      case "boardroom.setChairVariant":  { set({ chairVariant: intent.value }); break; }
      case "ledWall.setEnabled": {
        set({ ledWallEnabled: intent.enabled });
        break;
      }
      case "ledWall.setWidth": {
        // Clamp to room dimensions — the LED panel never wants to push past
        // 85% of the wall width (leaves room for flanking monitors), and is
        // bounded below at 1.5m so the slider isn't useless on tight rooms.
        const maxW = Math.max(2, Math.min(s.widthM * 0.85, 12));
        const w = clamp(intent.value, 1.5, maxW);
        // Lock 16:9 — if the new width pushes height past the wall, scale
        // down together so we never produce a "cinema screen" overshoot.
        const wallCap = Math.max(1.0, s.wallHeightM - 1.0);
        const h169 = w * 9 / 16;
        const finalW = h169 > wallCap ? wallCap * 16 / 9 : w;
        const finalH = Math.min(h169, wallCap);
        set({ ledWallWidthM: finalW, ledWallHeightM: finalH });
        break;
      }
      case "ledWall.setHeight": {
        const wallCap = Math.max(1.0, s.wallHeightM - 1.0);
        const h = clamp(intent.value, 1.0, wallCap);
        // Lock 16:9 the other way too — height drives width.
        const maxW = Math.max(2, Math.min(s.widthM * 0.85, 12));
        const w169 = h * 16 / 9;
        const finalH = w169 > maxW ? maxW * 9 / 16 : h;
        const finalW = Math.min(w169, maxW);
        set({ ledWallHeightM: finalH, ledWallWidthM: finalW });
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
      case "videoMatrix.setCols": {
        set({ videoMatrixCols: Math.round(clamp(intent.value, 1, 4)) });
        break;
      }
      case "videoMatrix.setRows": {
        set({ videoMatrixRows: Math.round(clamp(intent.value, 1, 4)) });
        break;
      }
      case "videoMatrix.setCell": {
        const cells = [...s.videoMatrixCells];
        while (cells.length <= intent.index) cells.push({ kind: "default", value: "" });
        cells[intent.index] = { kind: intent.kind, value: intent.value };
        set({ videoMatrixCells: cells });
        break;
      }
      case "kit.setWallMotif": {
        const kit = findKitById(intent.kitId);
        if (!kit) break;
        if (!kit.scene) kit.scene = {};
        // Use a loose cast — schema enum keeps the caller honest at the UI layer.
        (kit.scene as { wallMotif?: string }).wallMotif = intent.motif;
        set({ kitRev: (get().kitRev ?? 0) + 1 });
        break;
      }
      case "kit.setWallGraphic": {
        const kit = findKitById(intent.kitId);
        if (!kit) break;
        if (!kit.scene) kit.scene = {};
        if (intent.url === null) delete kit.scene.wallGraphic;
        else kit.scene.wallGraphic = intent.url;
        set({ kitRev: (get().kitRev ?? 0) + 1 });
        break;
      }
      case "kit.setPropField": {
        // Live-edit a single field on a hero prop. Stored on the kit so it
        // persists across re-applies; bump kitRev so subscribers re-read.
        const kit = findKitById(intent.kitId);
        if (!kit?.scene?.props) break;
        const prop = kit.scene.props[intent.propIndex] as Record<string, unknown> | undefined;
        if (!prop) break;
        switch (intent.field) {
          case "heightM":         prop.heightM = clamp(intent.value, 0.02, 4); break;
          case "plinthHeightM":   prop.plinthHeightM = clamp(intent.value, 0, 2); break;
          case "x":
          case "y":
          case "z": {
            const pos = (prop.position as [number, number, number] | undefined) ?? [0, 0, 0];
            const idx = intent.field === "x" ? 0 : intent.field === "y" ? 1 : 2;
            const next: [number, number, number] = [pos[0], pos[1], pos[2]];
            next[idx] = clamp(intent.value, -25, 25);
            prop.position = next;
            break;
          }
          case "rotationX": prop.rotationX = intent.value; break;
          case "rotationY": prop.rotationY = intent.value; break;
          case "rotationZ": prop.rotationZ = intent.value; break;
        }
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
