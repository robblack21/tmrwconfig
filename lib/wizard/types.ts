// Shared types for the @standalone Wizard module.
//
// The wizard is intentionally domain-agnostic — these types describe the
// *shape* of a five-step "design your space" flow without baking in any
// trade-fair or meeting-room specifics. The host project supplies the
// concrete sizes, design lines, copy, and an `onComplete` handler that
// dispatches whatever intents make sense in its world.

import type { ReactNode } from "react";

/** One size option offered in step 1. The cards render label / sqm / dims
 *  / description, and the wizard computes a € range from `ratePerSqm`. */
export type WizardSize = {
  id: string;
  label: string;
  /** Floor area in m². Used for the indicative price band. */
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

/** Returned to the host's `onComplete` callback. The host wires this into
 *  whatever scene / state it owns. */
export type WizardResult = {
  size: WizardSize;
  /** data: URL of the uploaded logo, or null if the user skipped. */
  logoUrl: string | null;
  /** data: URL of the uploaded hero artwork, or null if skipped. */
  artworkUrl: string | null;
  /** [primary, secondary, accent] — hex strings. Auto-extracted from the
   *  logo and editable in step 4. */
  colours: [string, string, string];
  designLine: WizardDesignLine;
};

/** Optional copy overrides — every field has a sensible default. */
export type WizardCopy = {
  brandName?: string;
  introTitle?: string;
  introSubtitle?: string;
  sizeStep?:       { title?: string; subtitle?: string };
  logoStep?:       { title?: string; subtitle?: string; hint?: string };
  artworkStep?:    { title?: string; subtitle?: string; hint?: string };
  coloursStep?:    { title?: string; subtitle?: string; labels?: [string, string, string] };
  designLineStep?: { title?: string; subtitle?: string };
  summaryStep?:    { title?: string; subtitle?: string; cta?: string };
};

/** Top-level props. Host-defined `sizes` + `designLines` are the only
 *  mandatory inputs; everything else has a default. */
export type WizardProps = {
  sizes: WizardSize[];
  designLines: WizardDesignLine[];
  /** Indicative €/m² used for the price band on the size cards + summary.
   *  Default 450 (matches Stuttgart-Messe baseline). */
  ratePerSqm?: number;
  /** Initial selections by id. Default first item of each list. */
  initialSizeId?: string;
  initialDesignLineId?: string;
  copy?: WizardCopy;
  /** Optional CSS-variable name for the accent colour. Default
   *  "--color-accent" — set by the host's stylesheet. */
  accentVar?: string;
  /** Close button — host typically routes back to its home view. */
  onClose: () => void;
  /** Called when the user clicks "Build my stand". */
  onComplete: (result: WizardResult) => void;
};
