import { z } from "zod";
import { FootprintShape, SizeTier, PendantShape, InfillType, ProfileId } from "./primitives";
import { Anchor } from "./standConfig";

// ── Intent dispatcher (agent-ready) ────────────────────────────────────────────
// Every UI action becomes one of these. The reducer accepts the same JSON whether it
// came from a click or a future agent. See specs/schemas.md → Intent.

export const Intent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("footprint.set"), widthM: z.number(), depthM: z.number() }),
  z.object({ type: z.literal("footprint.setShape"), shape: FootprintShape }),
  z.object({ type: z.literal("footprint.setTier"), tier: SizeTier }),

  z.object({ type: z.literal("layout.setWallHeight"), value: z.number() }),
  z.object({ type: z.literal("layout.setTrussTop"), value: z.number() }),
  z.object({ type: z.literal("layout.setFloor"), value: z.string() }),

  z.object({ type: z.literal("wall.profile.set"), wallId: z.string(), profile: ProfileId }),
  z.object({ type: z.literal("wall.infill.set"), wallId: z.string(), bayIndex: z.number(), infill: InfillType }),
  z.object({ type: z.literal("wall.anchor.add"), wallId: z.string(), anchor: Anchor }),
  z.object({ type: z.literal("wall.anchor.move"), wallId: z.string(), anchorId: z.string(), uTarget: z.number() }),

  z.object({ type: z.literal("pendant.setShape"), shape: PendantShape }),
  z.object({ type: z.literal("pendant.setEnabled"), enabled: z.boolean() }),
  z.object({ type: z.literal("pendant.setWidth"), value: z.number() }),
  z.object({ type: z.literal("pendant.setDepth"), value: z.number() }),
  z.object({ type: z.literal("pendant.setHeight"), value: z.number() }),
  z.object({ type: z.literal("pendant.setYOffset"), value: z.number() }),
  z.object({ type: z.literal("pendant.setRotation"), value: z.number() }),
  z.object({ type: z.literal("pendant.setRingVertical"), value: z.boolean() }),

  z.object({ type: z.literal("scene.setLightShafts"), value: z.boolean() }),
  z.object({ type: z.literal("scene.setLightShaftDensity"), value: z.number() }),
  z.object({ type: z.literal("scene.setLightboxLogo"), value: z.boolean() }),
  z.object({ type: z.literal("scene.setRadiatingRig"), value: z.boolean() }),
  z.object({ type: z.literal("scene.setRadiatingRings"), value: z.number().int() }),
  z.object({ type: z.literal("scene.setRadiatingRadius"), value: z.number() }),
  z.object({ type: z.literal("scene.setRadiatingYOffset"), value: z.number() }),
  z.object({ type: z.literal("scene.setRadiatingColor"), value: z.string() }),
  z.object({ type: z.literal("scene.setGlassBalcony"), value: z.boolean() }),
  z.object({ type: z.literal("scene.setCircularScreen"), value: z.boolean() }),
  z.object({ type: z.literal("scene.setWraparoundScreen"), value: z.boolean() }),

  // Boardroom geometry
  z.object({ type: z.literal("room.setWindowsEnabled"), value: z.boolean() }),
  z.object({ type: z.literal("room.setCeilingEnabled"), value: z.boolean() }),
  z.object({ type: z.literal("room.setWallTextureEnabled"), value: z.boolean() }),
  z.object({ type: z.literal("merch.setCupsEnabled"), value: z.boolean() }),
  z.object({ type: z.literal("room.setWindowSegments"), value: z.number().int() }),
  z.object({ type: z.literal("boardroom.setTableOrientation"), value: z.union([z.literal(0), z.literal(90)]) }),
  z.object({ type: z.literal("room.setWindowSill"), value: z.number() }),
  z.object({ type: z.literal("room.setCount"), value: z.number().int() }),
  z.object({ type: z.literal("boardroom.setTableLength"), value: z.number() }),
  z.object({ type: z.literal("boardroom.setTableWidth"), value: z.number() }),
  z.object({ type: z.literal("boardroom.setChairCount"), value: z.number().int() }),
  z.object({ type: z.literal("boardroom.setTableVariant"), value: z.enum(["main", "secondary", "presenter", "simple"]) }),
  z.object({ type: z.literal("boardroom.setChairVariant"), value: z.enum(["studio", "executive", "office", "presenter"]) }),

  z.object({ type: z.literal("ledWall.setEnabled"), enabled: z.boolean() }),
  z.object({ type: z.literal("ledWall.setWidth"), value: z.number() }),
  z.object({ type: z.literal("ledWall.setHeight"), value: z.number() }),
  z.object({ type: z.literal("ledWall.setBrightness"), value: z.number() }),
  z.object({ type: z.literal("ledWall.setYoutubeId"), value: z.string() }),
  z.object({ type: z.literal("videoMatrix.setCols"), value: z.number().int() }),
  z.object({ type: z.literal("videoMatrix.setRows"), value: z.number().int() }),
  z.object({ type: z.literal("videoMatrix.setCell"), index: z.number().int(), kind: z.enum(["default", "youtube", "image"]), value: z.string() }),

  z.object({ type: z.literal("brandKit.apply"), kitId: z.string() }),
  z.object({ type: z.literal("brandKit.toggleMaximiseReuse"), value: z.boolean() }),
  /** Per-hero-prop tweaks. propIndex selects within kit.scene.props. */
  z.object({ type: z.literal("kit.setPropField"), kitId: z.string(), propIndex: z.number().int(), field: z.enum(["heightM", "x", "y", "z", "rotationX", "rotationY", "rotationZ", "plinthHeightM"]), value: z.number() }),

  z.object({ type: z.literal("camera.gotoShot"), shotId: z.string() }),
  z.object({ type: z.literal("scene.setMode"), hall: z.enum(["gallery.light", "warehouse.dark"]) }),
  z.object({ type: z.literal("scene.setHdri"), hdriId: z.string() }),
  z.object({ type: z.literal("scene.setHallVisible"), value: z.boolean() }),
  z.object({ type: z.literal("scene.setHdrIntensity"), value: z.number() }),
  z.object({ type: z.literal("scene.setHdrBgIntensity"), value: z.number() }),
  z.object({ type: z.literal("scene.setHdrRotation"), value: z.number() }),
  z.object({ type: z.literal("scene.setHdrBlur"), value: z.number() }),
  z.object({ type: z.literal("scene.setHallDarkness"), value: z.number() }),
  z.object({ type: z.literal("scene.setHighDpr"), value: z.boolean() }),
  z.object({ type: z.literal("scene.setDprFloor"), value: z.number() }),
  z.object({ type: z.literal("scene.setFloorStyle"), value: z.enum(["herringbone", "diagonal", "rectangular"]) }),
  z.object({ type: z.literal("scene.setRenderMode"), value: z.enum(["edit", "viz"]) }),
  z.object({ type: z.literal("camera.markEntryFired"), }),
  z.object({ type: z.literal("scene.setExposure"), value: z.number() }),
  z.object({ type: z.literal("scene.setKeyIntensity"), value: z.number() }),
  z.object({ type: z.literal("cg.setBrightness"), value: z.number() }),
  z.object({ type: z.literal("cg.setContrast"), value: z.number() }),
  z.object({ type: z.literal("cg.setSaturation"), value: z.number() }),
  z.object({ type: z.literal("cg.setVibrance"), value: z.number() }),
  z.object({ type: z.literal("cg.setWhiteBalance"), value: z.number() }),
  z.object({ type: z.literal("video.setVolume"), value: z.number() }),
  z.object({ type: z.literal("video.setMuted"), value: z.boolean() }),
  z.object({ type: z.literal("scene.resetGeometry") }),
  z.object({ type: z.literal("kit.setLogoOverride"), kitId: z.string(), dataUrl: z.string() }),
  z.object({ type: z.literal("kit.clearLogoOverride"), kitId: z.string() }),
  z.object({ type: z.literal("layout.setPlantCount"), value: z.number().int() }),
  z.object({ type: z.literal("layout.setPlatformHeight"), value: z.number() }),
  z.object({ type: z.literal("scene.setLogoGlow"), value: z.number() }),
  z.object({ type: z.literal("scene.setLogoExtrusion"), value: z.number() }),
  z.object({ type: z.literal("scene.setLogoEmissive"), value: z.number() }),
  z.object({ type: z.literal("layout.setSofaCount"), value: z.number().int() }),
  z.object({ type: z.literal("layout.setStandingDisplayCount"), value: z.number().int() }),
  z.object({ type: z.literal("layout.setCoffeeTable"), value: z.enum(["avarta", "kumo", "geo"]) }),
  z.object({ type: z.literal("camera.setFov"), value: z.number() }),
  z.object({ type: z.literal("camera.gotoPreset"), preset: z.string() }),
  z.object({ type: z.literal("camera.savePreset"), preset: z.string(), pos: z.tuple([z.number(), z.number(), z.number()]), target: z.tuple([z.number(), z.number(), z.number()]), fov: z.number() }),
  z.object({ type: z.literal("camera.setActivePreset"), preset: z.string() }),

  z.object({ type: z.literal("colourOverride.set"), surface: z.enum(["walls", "floor", "trim", "pendant", "truss", "sofa", "counter", "vitrine", "monitor", "table", "chair", "ceiling"]), value: z.string().nullable() }),
  /** Per-kit wall-motif change via UI (e.g. long-press editor). */
  z.object({ type: z.literal("kit.setWallMotif"), kitId: z.string(), motif: z.string() }),
  /** Per-kit wall-graphic URL override via UI. */
  z.object({ type: z.literal("kit.setWallGraphic"), kitId: z.string(), url: z.string().nullable() }),

  z.object({ type: z.literal("scene.save"), name: z.string() }),
]);
export type Intent = z.infer<typeof Intent>;
