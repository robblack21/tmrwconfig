import { z } from "zod";

// ── Primitive types ────────────────────────────────────────────────────────────

export const HexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "Hex color required");
export type HexColor = z.infer<typeof HexColor>;

export const Vec2 = z.tuple([z.number(), z.number()]);
export type Vec2 = z.infer<typeof Vec2>;

export const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3>;

export const Bilingual = z.object({ de: z.string(), en: z.string() });
export type Bilingual = z.infer<typeof Bilingual>;

// ── Stand shape / tier ─────────────────────────────────────────────────────────

export const FootprintShape = z.enum([
  "rectangle", "corner", "L", "invertedL", "U", "circular", "pavilion",
]);
export type FootprintShape = z.infer<typeof FootprintShape>;

export const SizeTier = z.enum(["S", "M", "L"]);
export type SizeTier = z.infer<typeof SizeTier>;

// Standard European trade-fair size tiers (Round 7 lock + Round-15 max bump
// to 40×20 for the largest L-tier rectangle / corner so Nissan + Swiss Krono
// have room for the patrol GLB and the moss-wall hero respectively).
export const standardSizeTiers = {
  rectangle: {
    S: { widthM: { min: 6, max: 10, default: 8 }, depthM: { min: 6, max: 8, default: 6 }, areaBandM2: [36, 80] as const },
    M: { widthM: { min: 10, max: 12, default: 12 }, depthM: { min: 8, max: 10, default: 8 }, areaBandM2: [80, 144] as const },
    L: { widthM: { min: 14, max: 40, default: 16 }, depthM: { min: 10, max: 20, default: 12 }, areaBandM2: [144, 800] as const },
  },
  corner: {
    S: { widthM: { min: 4, max: 8, default: 6 }, depthM: { min: 4, max: 5, default: 4 }, areaBandM2: [16, 32] as const },
    M: { widthM: { min: 8, max: 10, default: 8 }, depthM: { min: 5, max: 7, default: 5 }, areaBandM2: [32, 70] as const },
    L: { widthM: { min: 12, max: 40, default: 14 }, depthM: { min: 8, max: 20, default: 10 }, areaBandM2: [70, 800] as const },
  },
  L: {
    S: { widthM: { min: 4, max: 5, default: 4 }, depthM: { min: 4, max: 5, default: 4 }, areaBandM2: [28, 48] as const },
    M: { widthM: { min: 8, max: 11, default: 9 }, depthM: { min: 8, max: 11, default: 9 }, areaBandM2: [48, 112] as const },
    L: { widthM: { min: 13, max: 40, default: 14 }, depthM: { min: 13, max: 20, default: 14 }, areaBandM2: [112, 800] as const },
  },
  // The remaining shapes all fit inside a width × depth bounding box, so they
  // reuse the rectangle tier bounds.
  invertedL: {
    S: { widthM: { min: 6, max: 10, default: 8 }, depthM: { min: 6, max: 8, default: 6 }, areaBandM2: [36, 80] as const },
    M: { widthM: { min: 10, max: 12, default: 12 }, depthM: { min: 8, max: 10, default: 8 }, areaBandM2: [80, 144] as const },
    L: { widthM: { min: 14, max: 40, default: 16 }, depthM: { min: 10, max: 20, default: 12 }, areaBandM2: [144, 800] as const },
  },
  U: {
    S: { widthM: { min: 6, max: 10, default: 8 }, depthM: { min: 6, max: 8, default: 6 }, areaBandM2: [36, 80] as const },
    M: { widthM: { min: 10, max: 12, default: 12 }, depthM: { min: 8, max: 10, default: 8 }, areaBandM2: [80, 144] as const },
    L: { widthM: { min: 14, max: 40, default: 16 }, depthM: { min: 10, max: 20, default: 12 }, areaBandM2: [144, 800] as const },
  },
  circular: {
    S: { widthM: { min: 6, max: 9, default: 8 }, depthM: { min: 6, max: 9, default: 8 }, areaBandM2: [28, 64] as const },
    M: { widthM: { min: 9, max: 12, default: 10 }, depthM: { min: 9, max: 12, default: 10 }, areaBandM2: [64, 113] as const },
    L: { widthM: { min: 12, max: 30, default: 14 }, depthM: { min: 12, max: 30, default: 14 }, areaBandM2: [113, 700] as const },
  },
  pavilion: {
    S: { widthM: { min: 8, max: 11, default: 10 }, depthM: { min: 8, max: 11, default: 9 }, areaBandM2: [64, 121] as const },
    M: { widthM: { min: 12, max: 16, default: 14 }, depthM: { min: 10, max: 13, default: 11 }, areaBandM2: [120, 208] as const },
    L: { widthM: { min: 18, max: 40, default: 20 }, depthM: { min: 12, max: 22, default: 14 }, areaBandM2: [216, 880] as const },
  },
} as const;

// ── Extrusion profile vocabulary ───────────────────────────────────────────────

export const ProfileId = z.enum([
  "profile_alpine_42h",
  "profile_alpine_42v",
  "profile_aspen_slim",
  "profile_big_sky_32d",
  "profile_big_sky_cg",
  "profile_big_sky_ic",
  "profile_vail_40c",
  "profile_vail_40d",
  "profile_vail_120db",
]);
export type ProfileId = z.infer<typeof ProfileId>;

export const ProfileRole = z.enum([
  "post.vertical",
  "rail.top",
  "rail.bottom",
  "corner.90",
  "connector.inline",
  "endcap",
  "post.heavy",
  "rail.heavy",
]);
export type ProfileRole = z.infer<typeof ProfileRole>;

export const ProfileAllocation = z.record(ProfileRole, ProfileId);
export type ProfileAllocation = z.infer<typeof ProfileAllocation>;

export const defaultProfileAllocation: ProfileAllocation = {
  "post.vertical": "profile_alpine_42v",
  "rail.top": "profile_aspen_slim",
  "rail.bottom": "profile_aspen_slim",
  "corner.90": "profile_big_sky_32d",
  "connector.inline": "profile_vail_40c",
  endcap: "profile_big_sky_cg",
  "post.heavy": "profile_vail_120db",
  "rail.heavy": "profile_big_sky_ic",
};

// ── Pendant shapes (v1 ships rectangle/squircle/ring only — pendant_scope_lock) ─

export const PendantShape = z.enum(["rectangle", "squircle", "ring", "hexagon", "triangle", "innerCurve", "wedge"]);
export type PendantShape = z.infer<typeof PendantShape>;

export const PendantShapeFull = z.enum(["rectangle", "squircle", "oval", "circle", "ring"]);
// oval / circle defined in schema, gated behind future-scope flag in UI.

// ── Infill ─────────────────────────────────────────────────────────────────────

export const InfillType = z.enum([
  "seg.fabric",
  "laminate.rigid",
  "glass.clear",
  "glass.satin",
  "led.tile",
  "open",
  "door.glass",
  "honeycomb.hex",
  "fabric.curved",
]);
export type InfillType = z.infer<typeof InfillType>;
