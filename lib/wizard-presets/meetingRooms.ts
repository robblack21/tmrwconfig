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

import type { WizardSize, WizardDesignLine, WizardResult } from "@/lib/wizard";
import type { useConfig } from "@/lib/store/configStore";
import { tmrwBlank } from "@/lib/fixtures/brandKits";

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
    description: "16 people · all-hands · presentation",
  },
];

// ── Design lines ──────────────────────────────────────────────────────────
// Each line drives a different cluster of scene defaults — wall finish,
// floor style, chair variant, pendant shape, parquet warmth.
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
};

export function applyWizardResult(apply: ApplyFn, result: WizardResult): void {
  // 1. Start from the blank TMRW template — gives a clean palette without
  //    inheriting any seeded brand's hero props.
  apply({ type: "brandKit.apply", kitId: tmrwBlank.id });

  // 2. Apply the room footprint. The configurator clamps to the current
  //    tier's bounds, then auto-grows the tier if the wizard requested a
  //    larger footprint than the tier max.
  apply({ type: "footprint.set", widthM: result.size.widthM, depthM: result.size.depthM });

  // 3. Brand colours — drive walls (primary), floor (neutral) and accent.
  //    The wizard's three swatches are [primary, secondary, accent]; we
  //    map primary → walls so the brand mark reads as a coloured volume,
  //    and accent → the trim / sconce highlight.
  const [primary, , accent] = result.colours;
  apply({ type: "colourOverride.set", surface: "walls", value: primary });
  apply({ type: "colourOverride.set", surface: "trim",  value: accent });

  // 4. Logo override — replaces the TMRW mark with the uploaded one. The
  //    store keeps these per-kit so the wizard's pick survives a reload.
  if (result.logoUrl) {
    apply({ type: "kit.setLogoOverride", kitId: tmrwBlank.id, dataUrl: result.logoUrl });
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

  // 7. Reasonable defaults for everything else the wizard didn't ask
  //    about — gallery mode, lights on, ceiling closed.
  apply({ type: "room.setCeilingEnabled", value: true });
  apply({ type: "room.setWindowsEnabled", value: true });
}
