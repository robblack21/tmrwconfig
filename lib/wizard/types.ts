// Shared types for the @standalone Wizard module.
//
// The wizard is intentionally domain-agnostic — these types describe the
// *shape* of a five-step "design your space" flow without baking in any
// trade-fair or meeting-room specifics. The host project supplies the
// concrete sizes, design lines, copy, and an `onComplete` handler that
// dispatches whatever intents make sense in its world.

import type { ReactNode } from "react";
import type { PendantShape } from "@/lib/schemas";

/** One size option offered in step 1. The cards render label / sqm / dims
 *  / description. */
export type WizardSize = {
  id: string;
  label: string;
  /** Floor area in m². Shown on the card for context. */
  sqm: number;
  /** Width on the +X axis, in metres. Surfaced verbatim in `WizardResult` so
   *  the host can apply it to its scene. */
  widthM: number;
  /** Depth on the +Z axis, in metres. */
  depthM: number;
  /** One-line copy under the label. */
  description: string;
};

/** One design-line option offered in step 5. */
export type WizardDesignLine = {
  id: string;
  label: string;
  /** Short uppercase eyebrow on the card. */
  tagline: string;
  /** One- or two-line copy under the label. */
  description: string;
  /** Optional custom preview rendered inside the card. If omitted the
   *  wizard shows a generic decorative SVG that varies by `id`. */
  preview?: ReactNode;
};

/** Auto-derived surface colours that complete the room palette beyond
 *  the logo-extracted brand trio. Editable per-swatch so the user can
 *  override individual surfaces; otherwise re-derived whenever the
 *  brand trio (or harmony rule) changes.
 *
 *  Five surfaces: floor / table / chairs / cups + pendant. Pendant
 *  lives here too (not in the brand-row trio) because it's a derived
 *  brand-shade, not one of the dominant logo colours. */
export type WizardExtendedColours = {
  floor: string;
  table: string;
  chairs: string;
  cups: string;
  pendant: string;
};

/** Customisation choices made in the new step 5 — cups / plants / sofas /
 *  displays / posterboards / cube plinths. The host can apply each value
 *  to its scene directly. */
export type WizardCustomisation = {
  cupsEnabled: boolean;
  plantCount: number;
  sofaCount: number;
  standingDisplayCount: number;
  /** Upright portrait-ratio posterboards distributed along the side walls.
   *  Each carries a `posterboardUrls[i]` (may be null = brand logo). */
  posterboardCount: number;
  posterboardUrls: (string | null)[];
  /** Cube plinths in the middle of the room — each with a hotspot the
   *  user clicks to upload or generate a hero 3D object. (Hotspot UI is
   *  the next iteration; the count + cubeAssets array is plumbed now.) */
  cubeCount: number;
  cubeAssets: ({ url: string; kind: "uploaded" | "generated" | "preset"; label?: string } | null)[];
  /** Pendant body shape. Picked compactly in step 1 so the user gets a
   *  silhouette decision before brand + colour choices. Optional — when
   *  undefined the design-line's default applies. */
  pendantShape?: PendantShape;
};

/** Returned to the host's `onComplete` callback. The host wires this into
 *  whatever scene / state it owns. */
export type WizardResult = {
  size: WizardSize;
  /** Wall height in metres — fine-tuned via the slider in step 1. */
  wallHeightM: number;
  /** data: URL of the uploaded logo, or null if the user skipped. */
  logoUrl: string | null;
  /** data: URLs of the up-to-four uploaded hero artworks (or null per
   *  empty slot). The first non-null one drives the back-wall
   *  full-bleed graphic; remaining ones become extra wall posters via
   *  kit.scene.exhibitionGraphics. */
  artworkUrls: [string | null, string | null, string | null, string | null];
  /** @deprecated Kept on the result for back-compat with single-slot
   *  callers; resolves to artworkUrls[0]. */
  artworkUrl: string | null;
  /** [primary, secondary, accent, highlight] — hex strings. Auto-extracted
   *  from the logo (top-4 dominant colours) and editable in step 4. */
  colours: [string, string, string, string];
  /** floor / table / chairs colours derived from `colours` + editable in
   *  step 4's second row. */
  extendedColours: WizardExtendedColours;
  designLine: WizardDesignLine;
  customisation: WizardCustomisation;
  /** HDRI id chosen in the Environment step (or null for the host's default). */
  environmentId: string | null;
  /** AI-generated environment image URL (LDR). When set, the host wraps
   *  it as a skydome around the room. Null = use the HDRI pipeline. */
  customEnvironmentUrl: string | null;
};

/** Optional copy overrides — every field has a sensible default. */
export type WizardCopy = {
  brandName?: string;
  introTitle?: string;
  introSubtitle?: string;
  sizeStep?:           { title?: string; subtitle?: string };
  logoStep?:           { title?: string; subtitle?: string; hint?: string };
  artworkStep?:        { title?: string; subtitle?: string; hint?: string };
  coloursStep?:        { title?: string; subtitle?: string; labels?: [string, string, string, string] };
  designLineStep?:     { title?: string; subtitle?: string };
  environmentStep?:    { title?: string; subtitle?: string };
  customisationStep?:  { title?: string; subtitle?: string };
  summaryStep?:        { title?: string; subtitle?: string; cta?: string };
};

/** Live snapshot of in-flight wizard state. Fired by `onState` so the host
 *  can build the scene up step-by-step (e.g. apply size as walls grow,
 *  recolour walls as the user tweaks swatches). The host does NOT have to
 *  wait for `onComplete` — every step's choice arrives here. */
export type WizardState = {
  step: number;
  size: WizardSize;
  /** Wall height in metres — fine-tuned via the slider in step 1. The
   *  picked size card doesn't carry this (sizes are square-metres-driven)
   *  so the wizard tracks it alongside. */
  wallHeightM: number;
  designLine: WizardDesignLine;
  logoUrl: string | null;
  artworkUrl: string | null;
  artworkUrls: [string | null, string | null, string | null, string | null];
  colours: [string, string, string, string];
  extendedColours: WizardExtendedColours;
  customisation: WizardCustomisation;
  environmentId: string | null;
  /** AI-generated environment image URL (LDR), or null. Tracked in the
   *  live state so the host can apply it (as a skydome) the moment the
   *  user generates it — no need to wait for onComplete. */
  customEnvironmentUrl: string | null;
};

/** One HDRI environment option offered in the new Environment step. */
export type WizardEnvironment = {
  id: string;
  label: string;
  /** A representative colour pair for the procedural gradient thumbnail.
   *  No HDR processing happens at runtime; the wizard renders a small
   *  swatch using these two hexes so the user can recognise the mood. */
  thumb: [string, string];
};

/** Top-level props. Host-defined `sizes` + `designLines` are the only
 *  mandatory inputs; everything else has a default. */
export type WizardProps = {
  sizes: WizardSize[];
  designLines: WizardDesignLine[];
  /** HDRI environment options for the new Environment step. Optional —
   *  the wizard skips the step if this is empty / undefined. */
  environments?: WizardEnvironment[];
  /** Initial selections by id. Default first item of each list. */
  initialSizeId?: string;
  initialDesignLineId?: string;
  copy?: WizardCopy;
  /** Optional CSS-variable name for the accent colour. Default
   *  "--color-accent" — set by the host's stylesheet. */
  accentVar?: string;
  /** Render the wizard as an overlay instead of a full-screen card grid.
   *  Use when the host has a live 3D preview behind the wizard.
   *    • "full"     — page-takeover gradient (no preview behind)
   *    • "panel"    — right-side 440px column with a hard edge
   *    • "squircle" — floating soft-cornered card docked to the left,
   *                   inset 16px from the screen edges so the 3D scene
   *                   gets the right 60-70% of the canvas to breathe */
  layout?: "full" | "panel" | "squircle";
  /** Close button — host typically routes back to its home view. */
  onClose: () => void;
  /** Called when the user clicks "Build my stand". */
  onComplete: (result: WizardResult) => void;
  /** Live state pulse — fires on every selection change so the host can
   *  build the scene incrementally. Optional. */
  onState?: (state: WizardState) => void;
};
