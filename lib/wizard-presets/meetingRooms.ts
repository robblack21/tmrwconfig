// Meeting-room wizard presets for the TMRW configurator.
//
// The Wizard component (lib/wizard) is domain-agnostic — this file
// adapts it to the boardroom / meeting-room world by:
//   • supplying the size cards (small / medium / large meeting rooms)
//   • supplying the three design lines (Warm / Studio / Minimal)
//   • exporting `applyWizardResult()` which converts a WizardResult into
//     a stream of intents on the configStore.
//
// The wizard owns the user's in-flight selections; the moment they hit
// "Generate room" we synchronously dispatch the intents and the host
// routes the user from the home view straight into the configurator
// with the resulting kit applied.

import type { WizardSize, WizardDesignLine, WizardEnvironment, WizardResult, WizardState } from "@/lib/wizard";
import type { useConfig } from "@/lib/store/configStore";
import { tmrwBlank } from "@/lib/fixtures/brandKits";
import { measureImageDims } from "@/lib/util/measureImage";

// ── Size cards ────────────────────────────────────────────────────────────
// Three meeting-room footprints. Width × depth picked to land inside the
// existing standardSizeTiers (S / M / L tier bounds in lib/schemas) so
// the configurator doesn't have to bump a tier when the result is applied.
//
//   small  → 12 m²   4 × 3   — huddle room, 4-up
//   medium → 25 m²   5 × 5   — main meeting room, 8-up + video
//   large  → 40 m²   8 × 5   — boardroom, 16-up + all-hands
export const meetingRoomSizes: WizardSize[] = [
  {
    id: "small",
    label: "Huddle",
    sqm: 12,
    widthM: 4,
    depthM: 3,
    description: "4 people · hot-desk syncs",
  },
  {
    id: "medium",
    label: "Meeting room",
    sqm: 25,
    widthM: 5,
    depthM: 5,
    description: "8 people · video conf + screen",
  },
  {
    id: "large",
    label: "Boardroom",
    sqm: 40,
    widthM: 8,
    depthM: 5,
    description: "12 people · all-hands · presentation",
  },
];

// Table dims + chair counts mapped to each size id. Kept as a sibling
// map (not on WizardSize) so the wizard type stays domain-agnostic.
//   - tableLengthM × tableWidthM is the boardroom-table footprint.
//   - chairCount is the conference seating; ChairsAroundTable caps this
//     down further if the table is too narrow to fit them at the min
//     0.69m centre-to-centre spacing.
const meetingRoomTableMeta: Record<string, { tableLengthM: number; tableWidthM: number; chairCount: number; tier: "S" | "M" | "L" }> = {
  // Tier bounds in lib/schemas clamp footprint.set per current tier, so
  // we must dispatch a matching tier BEFORE the footprint.set or the
  // Boardroom's 8m width gets silently clamped to whatever the M tier max
  // is (~6m). The tier is set first; the explicit widthM/depthM dispatch
  // then lands cleanly within the tier's range.
  small:  { tableLengthM: 1.8, tableWidthM: 1.0, chairCount: 4,  tier: "S" },
  medium: { tableLengthM: 3.0, tableWidthM: 1.4, chairCount: 8,  tier: "M" },
  large:  { tableLengthM: 5.0, tableWidthM: 1.8, chairCount: 12, tier: "L" },
};

// ── Design lines ──────────────────────────────────────────────────────────
// Each line drives a different cluster of scene defaults — wall finish,
// floor style, chair variant, pendant shape, parquet warmth.
// ── Environment cards ─────────────────────────────────────────────────────
// Each card maps to one of the HDRIs in /public/hdri/. The wizard uses
// the thumb tuple to render a procedural gradient swatch in lieu of a
// pre-baked thumbnail JPG — HDR sources are 24-26MB each so we keep the
// preview cheap. Mood colours roughly match the sky / horizon of each
// HDRI so users can recognise them.
export const meetingRoomEnvironments: WizardEnvironment[] = [
  { id: "canary_wharf_4k",              label: "Canary Wharf",   thumb: ["#1d2330", "#3f4a5f"] },
  { id: "docklands_02_4k",              label: "Docklands",      thumb: ["#2e3645", "#7d8597"] },
  { id: "lake_pier_4k",                 label: "Lake pier",      thumb: ["#6b7e8f", "#c4d3d8"] },
  { id: "schadowplatz_4k",              label: "Schadowplatz",   thumb: ["#3a3024", "#9c7d59"] },
  { id: "limpopo_golf_course_4k",       label: "Limpopo golf",   thumb: ["#5d6f3a", "#dfd2a2"] },
  { id: "little_paris_eiffel_tower_4k", label: "Paris · Eiffel", thumb: ["#3d3c46", "#cfb88a"] },
];

export const meetingRoomDesignLines: WizardDesignLine[] = [
  {
    id: "warm",
    label: "Warm",
    tagline: "Wood + plants",
    description: "Herringbone oak, soft fabric chairs, biophilic plants in the corners.",
  },
  {
    id: "studio",
    label: "Studio",
    tagline: "Mid-century",
    description: "Diagonal parquet, walnut accents, executive leather chairs.",
  },
  {
    id: "minimal",
    label: "Minimal",
    tagline: "All-white acoustic",
    description: "Rectangular parquet, plaster walls, studio chairs in soft cream.",
  },
  // Two new lines mix existing patches more boldly so users get more
  // structural variety than just the warm/studio/minimal triangle.
  {
    id: "atelier",
    label: "Atelier",
    tagline: "Gallery loft",
    description: "Herringbone parquet, studio chairs, ring pendant — soft like Warm but sharper.",
  },
  {
    id: "executive",
    label: "Executive",
    tagline: "Power room",
    description: "Diagonal parquet, executive chairs, squircle pendant — Studio meets Boardroom.",
  },
];

// ── Apply ─────────────────────────────────────────────────────────────────
// Translates a WizardResult into the configStore intent dialect. Caller
// supplies the store's `apply` so this module doesn't import from the
// store directly (keeps the wizard-presets tree free of side-effects
// at import time).
type ApplyFn = ReturnType<typeof useConfig.getState>["apply"];

type DesignLinePatch = {
  floorStyle: "herringbone" | "diagonal" | "rectangular";
  chairVariant: "studio" | "executive" | "office" | "presenter";
  tableVariant: "main" | "secondary" | "presenter" | "simple";
  pendantShape: "rectangle" | "squircle" | "ring" | "hexagon" | "triangle" | "innerCurve" | "wedge";
  plantCount: number;
  wallTextureEnabled: boolean;
};

const designLineEffects: Record<string, DesignLinePatch> = {
  warm: {
    floorStyle: "herringbone",
    chairVariant: "studio",
    tableVariant: "main",
    pendantShape: "rectangle",
    plantCount: 6,
    wallTextureEnabled: true,
  },
  studio: {
    floorStyle: "diagonal",
    chairVariant: "executive",
    tableVariant: "main",
    pendantShape: "squircle",
    plantCount: 2,
    wallTextureEnabled: true,
  },
  minimal: {
    floorStyle: "rectangular",
    chairVariant: "studio",
    tableVariant: "simple",
    pendantShape: "ring",
    plantCount: 0,
    wallTextureEnabled: false,
  },
  // Gallery-loft hybrid — Warm's herringbone + studio chairs + ring
  // pendant. Reads as a curated showroom rather than a meeting room.
  atelier: {
    floorStyle: "herringbone",
    chairVariant: "studio",
    tableVariant: "simple",
    pendantShape: "ring",
    plantCount: 4,
    wallTextureEnabled: false,
  },
  // Power-room — Studio's diagonal parquet + executive chairs + squircle
  // pendant, but bumps the table variant up to presenter for a punchier
  // boardroom-table look.
  executive: {
    floorStyle: "diagonal",
    chairVariant: "executive",
    tableVariant: "presenter",
    pendantShape: "squircle",
    plantCount: 1,
    wallTextureEnabled: true,
  },
};

/**
 * Live-build dispatcher. Fires every time the wizard state changes
 * (after each step / selection edit). Idempotent — re-dispatches the
 * full visible state every tick. The store de-dupes equal sets so
 * repeated identical calls are cheap.
 *
 * Two-phase: the FIRST tick (step 0, no logo yet) clears the slate by
 * applying the blank TMRW kit; subsequent ticks layer in size /
 * colours / logo / artwork / design-line as the user picks them.
 */
// Step-indexed camera presets. Each step in the wizard frames a different
// part of the room so the user sees the consequence of their selection.
const CAMERA_BY_STEP: Record<number, string> = {
  0: "top",      // Size — looks down on the empty platform; the walls grow in
  1: "pendant",  // Logo — pulled into the room so the pendant + side-wall signs read
  2: "front",    // Artwork — frames the back-wall video matrix
  3: "side",     // Colours — wall-on-wall view so the recolour reads
  4: "closeup",  // Design line — tight on the table + chairs
  5: "side",     // Environment — frames the windowed side wall so HDRI swap is visible
  6: "hero",     // Customisation — wide shot showing cups/plants/sofas/displays
  7: "hero",     // Summary — the brand-room hero shot
};

export function applyWizardState(apply: ApplyFn, state: WizardState, prev?: WizardState): void {
  // First call — initialise to the blank kit + suppress hero props.
  if (!prev) {
    apply({ type: "brandKit.apply", kitId: tmrwBlank.id });
  }

  // Camera move on step transitions — flies to a preset framing what the
  // current step is asking about.
  if (!prev || prev.step !== state.step) {
    const preset = CAMERA_BY_STEP[state.step] ?? "hero";
    apply({ type: "camera.gotoPreset", preset });
  }

  // Size — always applied (it's chosen on step 0, default to the first
  // size card). Tier MUST be dispatched first because footprint.set
  // clamps to the current tier's bounds; the Boardroom's 8m width was
  // silently chopped to ~6m by the M tier's clamp. After tier, the
  // explicit width/depth lands within range.
  if (!prev || prev.size.id !== state.size.id) {
    const meta = meetingRoomTableMeta[state.size.id];
    if (meta) {
      apply({ type: "footprint.setTier", tier: meta.tier });
    }
    if (meta) {
      apply({ type: "boardroom.setTableLength", value: meta.tableLengthM });
      apply({ type: "boardroom.setTableWidth",  value: meta.tableWidthM });
      apply({ type: "boardroom.setChairCount",  value: meta.chairCount });
    }
  }
  // Effective W/D — honours fine-tune slider edits in step 1.
  if (!prev || prev.size.widthM !== state.size.widthM || prev.size.depthM !== state.size.depthM) {
    apply({ type: "footprint.set", widthM: state.size.widthM, depthM: state.size.depthM });
  }
  // Wall height fine-tune slider.
  if (!prev || prev.wallHeightM !== state.wallHeightM) {
    apply({ type: "layout.setWallHeight", value: state.wallHeightM });
  }

  // Colours — re-dispatch when any swatch changes. All THREE swatches
  // flow to surface overrides now (was just walls + trim, so picking a
  // new harmony rule visibly changed the wizard UI but the middle
  // "carpet" swatch never landed on the floor). The wizard's
  // deriveExtendedColours useEffect also re-derives floor/table/chairs
  // from the new primary trio whenever colours[] changes.
  if (!prev || prev.colours.some((c, i) => c !== state.colours[i])) {
    const [primary, carpet, accent] = state.colours;
    apply({ type: "colourOverride.set", surface: "walls",   value: primary });
    apply({ type: "colourOverride.set", surface: "trim",    value: accent });
    // Secondary (carpet) drives the soft secondary surfaces — pendant
    // body + sofa upholstery — that aren't covered by the extended-
    // colours dispatch below.
    apply({ type: "colourOverride.set", surface: "pendant", value: carpet });
    apply({ type: "colourOverride.set", surface: "sofa",    value: carpet });
  }

  // Extended colours — surfaces row of step 3 (floor/table/chairs/cups)
  // + the brand-row's Pendant swatch. Each flows through its own
  // override so the scene's resolver picks them up exactly the same as
  // a long-press edit.
  if (!prev || prev.extendedColours.floor !== state.extendedColours.floor) {
    apply({ type: "colourOverride.set", surface: "floor", value: state.extendedColours.floor });
  }
  if (!prev || prev.extendedColours.table !== state.extendedColours.table) {
    apply({ type: "colourOverride.set", surface: "table", value: state.extendedColours.table });
  }
  if (!prev || prev.extendedColours.chairs !== state.extendedColours.chairs) {
    apply({ type: "colourOverride.set", surface: "chair", value: state.extendedColours.chairs });
  }
  if (!prev || prev.extendedColours.cups !== state.extendedColours.cups) {
    apply({ type: "colourOverride.set", surface: "cup", value: state.extendedColours.cups });
  }
  if (!prev || prev.extendedColours.pendant !== state.extendedColours.pendant) {
    apply({ type: "colourOverride.set", surface: "pendant", value: state.extendedColours.pendant });
  }

  // Environment — HDRI swap + hall toggle. When the user picks an HDRI
  // in step 5, we apply it AND hide the warehouse hall (the brand
  // experience reads as "this room is in <environment>"). Clearing the
  // selection (clicking the active card again) restores the hall.
  if (!prev || prev.environmentId !== state.environmentId) {
    if (state.environmentId) {
      apply({ type: "scene.setHdri", hdriId: state.environmentId });
      apply({ type: "scene.setHallVisible", value: false });
    } else {
      apply({ type: "scene.setHdri", hdriId: "" });
      apply({ type: "scene.setHallVisible", value: true });
    }
  }

  // Customisation — cups / plants / sofas / displays. Dispatched only on
  // change; each maps to an existing config intent the configurator UI
  // already uses.
  if (!prev || prev.customisation.cupsEnabled !== state.customisation.cupsEnabled) {
    apply({ type: "merch.setCupsEnabled", value: state.customisation.cupsEnabled });
  }
  if (!prev || prev.customisation.plantCount !== state.customisation.plantCount) {
    apply({ type: "layout.setPlantCount", value: state.customisation.plantCount });
  }
  if (!prev || prev.customisation.sofaCount !== state.customisation.sofaCount) {
    apply({ type: "layout.setSofaCount", value: state.customisation.sofaCount });
  }
  if (!prev || prev.customisation.standingDisplayCount !== state.customisation.standingDisplayCount) {
    apply({ type: "layout.setStandingDisplayCount", value: state.customisation.standingDisplayCount });
  }
  if (!prev || prev.customisation.posterboardCount !== state.customisation.posterboardCount) {
    apply({ type: "layout.setPosterboardCount", value: state.customisation.posterboardCount });
  }
  if (!prev || prev.customisation.posterboardUrls.some((u, i) => u !== prev.customisation.posterboardUrls[i])) {
    apply({ type: "layout.setPosterboardUrls", urls: state.customisation.posterboardUrls });
  }
  if (!prev || prev.customisation.cubeCount !== state.customisation.cubeCount) {
    apply({ type: "layout.setCubeCount", value: state.customisation.cubeCount });
  }

  // Logo override. Measured asynchronously so the kit's effective viewBox
  // gets the user's actual aspect (un-squashing the upload). The dispatch
  // happens once the Image() has decoded — fast for data URLs.
  if (state.logoUrl && (!prev || prev.logoUrl !== state.logoUrl)) {
    const url = state.logoUrl;
    void measureImageDims(url).then(({ width, height }) => {
      apply({ type: "kit.setLogoOverride", kitId: tmrwBlank.id, dataUrl: url, width, height });
    });
  } else if (!state.logoUrl && prev?.logoUrl) {
    apply({ type: "kit.clearLogoOverride", kitId: tmrwBlank.id });
  }

  // Hero artwork on the back wall.
  if (state.artworkUrl && (!prev || prev.artworkUrl !== state.artworkUrl)) {
    apply({ type: "kit.setWallGraphic", kitId: tmrwBlank.id, url: state.artworkUrl });
  } else if (!state.artworkUrl && prev?.artworkUrl) {
    apply({ type: "kit.setWallGraphic", kitId: tmrwBlank.id, url: null });
  }

  // Design line — refresh the scene defaults when the user picks a new one.
  if (!prev || prev.designLine.id !== state.designLine.id) {
    const patch = designLineEffects[state.designLine.id] ?? designLineEffects.warm!;
    apply({ type: "scene.setFloorStyle", value: patch.floorStyle });
    apply({ type: "boardroom.setChairVariant", value: patch.chairVariant });
    apply({ type: "boardroom.setTableVariant", value: patch.tableVariant });
    apply({ type: "pendant.setShape", shape: patch.pendantShape });
    apply({ type: "layout.setPlantCount", value: patch.plantCount });
    apply({ type: "room.setWallTextureEnabled", value: patch.wallTextureEnabled });
  }
}

export function applyWizardResult(apply: ApplyFn, result: WizardResult): void {
  // 1. Start from the blank TMRW template — gives a clean palette without
  //    inheriting any seeded brand's hero props.
  apply({ type: "brandKit.apply", kitId: tmrwBlank.id });

  // 2. Apply tier first, then the room footprint. footprint.set clamps to
  //    the current tier's bounds — without an explicit tier dispatch
  //    first, the Boardroom (8m wide) gets silently clamped to ~6m by
  //    the M tier. Tier also re-anchors the size sliders so the user
  //    can dial bigger from the configurator.
  const sizeMeta = meetingRoomTableMeta[result.size.id];
  if (sizeMeta) {
    apply({ type: "footprint.setTier", tier: sizeMeta.tier });
  }
  apply({ type: "footprint.set", widthM: result.size.widthM, depthM: result.size.depthM });
  apply({ type: "layout.setWallHeight", value: result.wallHeightM });
  if (sizeMeta) {
    apply({ type: "boardroom.setTableLength", value: sizeMeta.tableLengthM });
    apply({ type: "boardroom.setTableWidth",  value: sizeMeta.tableWidthM });
    apply({ type: "boardroom.setChairCount",  value: sizeMeta.chairCount });
  }

  // 3. Brand colours — walls / trim from the user's first-row picks,
  //    floor / table / chairs from the auto-derived second row (or
  //    overrides the user made in step 3).
  const [primary, , accent] = result.colours;
  apply({ type: "colourOverride.set", surface: "walls",   value: primary });
  apply({ type: "colourOverride.set", surface: "trim",    value: accent });
  apply({ type: "colourOverride.set", surface: "floor",   value: result.extendedColours.floor });
  apply({ type: "colourOverride.set", surface: "table",   value: result.extendedColours.table });
  apply({ type: "colourOverride.set", surface: "chair",   value: result.extendedColours.chairs });
  apply({ type: "colourOverride.set", surface: "cup",     value: result.extendedColours.cups });
  apply({ type: "colourOverride.set", surface: "pendant", value: result.extendedColours.pendant });

  // 4. Logo override — replaces the TMRW mark with the uploaded one. The
  //    store keeps these per-kit so the wizard's pick survives a reload.
  //    Measure dims so the kit's effective viewBox carries the upload's
  //    aspect ratio (the logo stays un-squashed across every consumer).
  if (result.logoUrl) {
    const url = result.logoUrl;
    void measureImageDims(url).then(({ width, height }) => {
      apply({ type: "kit.setLogoOverride", kitId: tmrwBlank.id, dataUrl: url, width, height });
    });
  }

  // 5. Back-wall hero artwork — drops the user's image into the kit's
  //    wallGraphic slot so the LED wall + ExhibitionGraphics stack
  //    picks it up.
  if (result.artworkUrl) {
    apply({ type: "kit.setWallGraphic", kitId: tmrwBlank.id, url: result.artworkUrl });
  }

  // 6. Design-line scene defaults.
  const patch = designLineEffects[result.designLine.id] ?? designLineEffects.warm!;
  apply({ type: "scene.setFloorStyle", value: patch.floorStyle });
  apply({ type: "boardroom.setChairVariant", value: patch.chairVariant });
  apply({ type: "boardroom.setTableVariant", value: patch.tableVariant });
  apply({ type: "pendant.setShape", shape: patch.pendantShape });
  apply({ type: "layout.setPlantCount", value: patch.plantCount });
  apply({ type: "room.setWallTextureEnabled", value: patch.wallTextureEnabled });

  // 7. Environment — HDRI + hall toggle. Picking an environment in step 5
  //    swaps the HDRI and disables the warehouse hall so the brand room
  //    reads as being IN that environment.
  if (result.environmentId) {
    apply({ type: "scene.setHdri", hdriId: result.environmentId });
    apply({ type: "scene.setHallVisible", value: false });
  } else {
    apply({ type: "scene.setHdri", hdriId: "" });
    apply({ type: "scene.setHallVisible", value: true });
  }

  // 8. Customisation flourishes (step 6) — cups / plants / sofas / displays.
  apply({ type: "merch.setCupsEnabled", value: result.customisation.cupsEnabled });
  apply({ type: "layout.setPlantCount", value: result.customisation.plantCount });
  apply({ type: "layout.setSofaCount",  value: result.customisation.sofaCount });
  apply({ type: "layout.setStandingDisplayCount", value: result.customisation.standingDisplayCount });
  apply({ type: "layout.setPosterboardCount", value: result.customisation.posterboardCount });
  apply({ type: "layout.setPosterboardUrls",  urls:  result.customisation.posterboardUrls });
  apply({ type: "layout.setCubeCount",  value: result.customisation.cubeCount });
  apply({ type: "layout.setCubeAssets", assets: result.customisation.cubeAssets });

  // 9. Reasonable defaults for everything else the wizard didn't ask
  //    about — lights on, ceiling closed.
  apply({ type: "room.setCeilingEnabled", value: true });
  apply({ type: "room.setWindowsEnabled", value: true });
}
