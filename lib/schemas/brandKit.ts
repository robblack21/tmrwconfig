import { z } from "zod";
import { HexColor, Bilingual, PendantShape } from "./primitives";

// ── Palette + derivation ───────────────────────────────────────────────────────

export const Palette = z.object({
  primary: HexColor,
  secondary: HexColor,
  accent: HexColor,
  neutralLight: HexColor,
  neutralDark: HexColor,
});
export type Palette = z.infer<typeof Palette>;

export const DerivationRule = z.enum([
  "complementary",
  "splitComplementary",
  "analogous",
  "triadic",
  "monochrome",
]);
export type DerivationRule = z.infer<typeof DerivationRule>;

// Resolved at apply-time; computed in lib/brand/derivePalette.ts.
export const DerivedPalette = z.object({
  surfaceTintHi: HexColor,
  surfaceTintLo: HexColor,
  onPrimary: HexColor,
  onSecondary: HexColor,
  borderSoft: HexColor,
  headlineOnDark: HexColor,
  headlineOnLight: HexColor,
  motifFill: HexColor,
  motifStroke: HexColor,
});
export type DerivedPalette = z.infer<typeof DerivedPalette>;

// ── Logo / typography ──────────────────────────────────────────────────────────

export const LogoAsset = z.object({
  svgUrl: z.string().url().or(z.string().startsWith("/")),
  rasterUrl: z.string().url().or(z.string().startsWith("/")).optional(),
  viewBox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  capHeightFraction: z.number().min(0).max(1),
  isMono: z.boolean(),
});
export type LogoAsset = z.infer<typeof LogoAsset>;

export const FontFace = z.object({
  family: z.string(),
  weights: z.array(z.number()),
  italic: z.boolean(),
  source: z.enum(["uploaded", "google", "system"]),
  url: z.string().optional(),
  cssName: z.string(),
});
export type FontFace = z.infer<typeof FontFace>;

// ── Motif library ──────────────────────────────────────────────────────────────

export const MotifRef = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("chevron"), angleDeg: z.number(), density: z.number(), scale: z.number() }),
  z.object({ kind: z.literal("dotField"), density: z.number(), sizeMin: z.number(), sizeMax: z.number(), jitter: z.number() }),
  z.object({ kind: z.literal("pillCluster"), pillCount: z.number(), sizes: z.array(z.number()), spacing: z.number() }),
  z.object({ kind: z.literal("arrowSweep"), curvature: z.number(), count: z.number() }),
  z.object({ kind: z.literal("lineGrid"), spacing: z.number(), angleDeg: z.number(), weight: z.number() }),
  z.object({ kind: z.literal("halftone"), sourceImageId: z.string(), dotSize: z.number() }),
  z.object({ kind: z.literal("honeycomb"), hexSizeM: z.number(), fillAlpha: z.number(), edgeWeight: z.number() }),
  z.object({ kind: z.literal("arch"), cornerRadius: z.number(), legHeightFrac: z.number() }),
]);
export type MotifRef = z.infer<typeof MotifRef>;

// ── Pendant preferences (anti-boxology) ────────────────────────────────────────

export const PendantPreference = z.object({
  preferredShape: PendantShape.or(z.literal("none")),
  alternates: z.array(PendantShape),
  outerFaceTreatment: z.enum(["printed", "led", "etched", "fabric"]),
  innerFaceTreatment: z.enum(["lit-fabric", "matte", "led", "downlight"]),
});
export type PendantPreference = z.infer<typeof PendantPreference>;

// ── Apply intents ──────────────────────────────────────────────────────────────

export const BrandableSurfaceKind = z.enum([
  "fascia",
  "soffit",
  "backWall",
  "flankWall",
  "counterFront",
  "vitrineEtch",
  "ledWall",
  "carpetInsert",
  "trussFlag",
  "pendantOuter",
  "drumTier",
  "archEntry",
]);
export type BrandableSurfaceKind = z.infer<typeof BrandableSurfaceKind>;

export const ApplyIntent = z.object({
  surfaceKind: BrandableSurfaceKind,
  treatment: z.enum(["etched", "printed", "led", "fabric", "vinyl", "skip"]),
  paletteRole: z.enum(["primary", "secondary", "accent", "neutralDark", "neutralLight"]),
  motifRef: MotifRef.optional(),
  logoVariant: z.enum(["primary", "monoLight", "monoDark", "icon", "skip"]),
  notes: z.string().optional(),
});
export type ApplyIntent = z.infer<typeof ApplyIntent>;

// ── BrandKit ───────────────────────────────────────────────────────────────────

export const BrandKit = z.object({
  id: z.string(),
  name: z.string(),
  palette: Palette,
  derivation: DerivationRule,
  derivedOverrides: DerivedPalette.partial().optional(),
  logos: z.object({
    primary: LogoAsset,
    monoLight: LogoAsset,
    monoDark: LogoAsset,
    icon: LogoAsset,
  }),
  typography: z.object({
    display: FontFace,
    body: FontFace,
    fallbackGoogle: z.object({ display: z.string(), body: z.string() }).optional(),
  }),
  motifs: z.array(MotifRef),
  phrases: z.array(Bilingual),
  rules: z.object({
    minLogoHeightMm: z.number(),
    safeAreaRatio: z.number(),
    contrastMin: z.number(),
    disallowedBgs: z.array(HexColor),
  }),
  intents: z.array(ApplyIntent),
  pendant: PendantPreference,
  // Optional per-kit scene tuning (lighting, ambient, etc) — overrides defaults.
  scene: z
    .object({
      // Walls override — when set, walls render this colour instead of palette.primary.
      wallColor: HexColor.optional(),
      // Floor override — for showroom-style polished tile etc.
      floorColor: HexColor.optional(),
      // Window frame / mullion colour — defaults to palette.accent when unset.
      windowTrimColor: HexColor.optional(),
      // Ambient / global-illumination intensity multiplier (0..2).
      giMultiplier: z.number().optional(),
      // Key light intensity multiplier (0..2).
      keyMultiplier: z.number().optional(),
      // YouTube video ID (or empty for the procedural emissive panel).
      youtubeId: z.string().optional(),
      // Per-kit prop manifest — when set, replaces the default props list with brand-specific objects.
      props: z.array(z.any()).optional(),
      // Image URL (in /public) to render as the back wall graphic — full-bleed
      // hero artwork rather than the default plaster + brand tint.
      wallGraphic: z.string().optional(),
      // Procedural motif applied as a tile pattern over the wall (alternative to wallGraphic).
      wallMotif: z.enum(["stripes.diagonal", "stripes.horizontal", "dots", "hex"]).optional(),
      // Invert the logo at render time — for brands whose canonical mark is dark
      // and needs to read against dark walls (e.g. Neura on near-black wall).
      invertLogo: z.boolean().optional(),
      // Chroma-key out a flat background colour at decode-time — used for JPG logos
      // that have a white or black bed (e.g. Nissan red+chrome on white).
      logoChroma: z.enum(["white", "black"]).optional(),
      // Suppress the default booth dressing (curved counter, glass vitrines, TV
      // on stand, sofas + plants) when a kit provides its own bespoke set —
      // e.g. NWRA's caravan + campfire campsite, Lufthansa's open lounge.
      noDefaultDressing: z.boolean().optional(),
      // Optional decal applied to the front-facing eave of the tent roof prop
      // (mascot / campaign artwork — NWRA's Skip-the-Bin owl).
      awningDecal: z.string().optional(),
      // Default footprint applied when the kit is loaded. Used by big kits
      // (Nissan patrol, Swiss Krono moss wall) that need more floor space.
      defaultTier: z.enum(["S", "M", "L"]).optional(),
      defaultWidthM: z.number().optional(),
      defaultDepthM: z.number().optional(),
      /** Pendant body colour override when the kit is applied — keeps wall +
       *  trim colours separate from the pendant's brand-on-pendant look. */
      defaultPendantColor: HexColor.optional(),
    })
    .optional(),
});
export type BrandKit = z.infer<typeof BrandKit>;
