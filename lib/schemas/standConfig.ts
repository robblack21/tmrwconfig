import { z } from "zod";
import {
  FootprintShape,
  SizeTier,
  ProfileAllocation,
  InfillType,
  PendantShape,
  Vec2,
  HexColor,
} from "./primitives";

// ── Anchors (content-aware resize) ─────────────────────────────────────────────

export const AnchorPlacement = z.object({
  uTarget: z.number().min(0).max(1),
  uTolerance: z.number().min(0).max(0.5),
  baseSize: z.object({ w: z.number(), h: z.number() }),
  scaleWithWall: z.object({ min: z.number(), max: z.number() }),
  edgeMarginM: z.number().nonnegative(),
  vAlign: z.enum(["top", "centre", "bottom"]),
  vOffsetM: z.number(),
});
export type AnchorPlacement = z.infer<typeof AnchorPlacement>;

export const Anchor = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("logoMark"), ref: z.enum(["primary", "mono"]), placement: AnchorPlacement }),
  z.object({ kind: z.literal("headline"), phraseKey: z.string(), placement: AnchorPlacement }),
  z.object({ kind: z.literal("screen"), diagonalIn: z.number(), placement: AnchorPlacement }),
  z.object({ kind: z.literal("door"), w: z.number(), h: z.number(), placement: AnchorPlacement }),
  z.object({ kind: z.literal("vitrine"), w: z.number(), d: z.number(), placement: AnchorPlacement }),
  z.object({ kind: z.literal("fasciaPrint"), placement: AnchorPlacement }),
]);
export type Anchor = z.infer<typeof Anchor>;

// ── Wall segment ───────────────────────────────────────────────────────────────

export const WallSegment = z.object({
  id: z.string(),
  startPt: Vec2,
  endPt: Vec2,
  profileRole: z.enum(["post.vertical", "post.heavy"]),
  topRailRole: z.enum(["rail.top", "rail.heavy"]).default("rail.top"),
  bottomRailRole: z.literal("rail.bottom").default("rail.bottom"),
  defaultInfill: InfillType,
  anchors: z.array(Anchor),
});
export type WallSegment = z.infer<typeof WallSegment>;

// ── Pendant config (only one per stand for v1) ─────────────────────────────────

export const PendantConfig = z.object({
  enabled: z.boolean(),
  shape: PendantShape,
  outerWM: z.number(),
  outerDM: z.number(),
  innerWM: z.number().optional(),     // ring only
  innerDM: z.number().optional(),     // ring only
  cornerRadiusM: z.number().optional(),
  heightM: z.number(),
  yPositionM: z.number(),
  centerXZ: Vec2,
  rotationDegY: z.number(),
  outerFaceTreatment: z.enum(["printed", "led", "etched", "fabric"]),
  innerFaceTreatment: z.enum(["lit-fabric", "matte", "led", "downlight"]),
});
export type PendantConfig = z.infer<typeof PendantConfig>;

// ── Scene environment (hall, HDRI, mode) ───────────────────────────────────────

export const HdriId = z.enum([
  "events_hall_interior_4k",
  "newman_lobby_4k",
  "phone_shop_4k",
  "glass_passage_4k",
  "dancing_hall_4k",
  "artist_workshop_4k",
  "industrial_workshop_foundry_4k",
  "ferndale_studio_03_4k",
  "studio_kominka_01_4k",
]);
export type HdriId = z.infer<typeof HdriId>;

export const SceneEnvironment = z.object({
  hall: z.enum(["gallery.light", "warehouse.dark"]),
  hallOverride: z.boolean().default(false),
  hdriId: HdriId,
  toneMapping: z.enum(["agx", "neutral", "cinematic"]),
  exposure: z.number().min(-2).max(2),
  showNeighbours: z.boolean().default(true),
  rampVisible: z.enum(["auto", "always", "never"]).default("auto"),
});
export type SceneEnvironment = z.infer<typeof SceneEnvironment>;

// ── StandConfig (the canonical user-editable object) ───────────────────────────

export const StandConfig = z.object({
  footprint: z.object({
    shape: FootprintShape,
    sizeTier: SizeTier,
    widthM: z.number().min(2).max(30),
    depthM: z.number().min(2).max(30),
    cornerCutM: z
      .object({
        axis: z.enum(["x", "z"]),
        sizeM: z.object({ w: z.number(), d: z.number() }),
      })
      .optional(),
  }),
  layout: z.object({
    wallHeightM: z.number().min(2.0).max(5.0),       // continuous; UI snaps to 0.25m
    trussTopM: z.number().min(2.5).max(7.0),          // continuous; UI snaps to 0.25m
    fasciaMode: z.enum(["integrated", "suspended"]),
    trussSupport: z.enum(["self", "hallRigged"]),
    floor: z.enum(["raisedPlatform", "carpetOnFloor", "vinylOnPlatform", "polishedTile"]),
    rampEdge: z.enum(["none", "single", "double"]),
    storage: z.enum(["none", "small", "medium"]),
    meeting: z.enum(["none", "lounge", "enclosed"]),
    media: z.enum(["none", "screen", "ledWall"]),
    profileAllocation: ProfileAllocation,
    scene: SceneEnvironment,
  }),
  walls: z.array(WallSegment),
  pendant: PendantConfig,
  brandKitId: z.string(),
  maximiseReuse: z.boolean().default(false),
});
export type StandConfig = z.infer<typeof StandConfig>;
