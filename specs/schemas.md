# Schemas (Zod) — single source of truth

All cross-cutting types live here. UI forms, Supabase rows, and the future agent intent dispatcher all validate against the same Zod schemas. If a shape changes here, it changes everywhere.

## Top-level

```ts
// One project = one configured stand
type Project = {
  id: string
  ownerId: string                       // Supabase auth user
  roleScope: Role                       // who is currently editing
  templateId: TemplateId
  config: StandConfig
  brandKitId: string
  createdAt: ISODateTime
  updatedAt: ISODateTime
}

type Role = "client" | "provider" | "supplier"
```

## StandConfig — what the user edits

```ts
type StandConfig = {
  footprint: {
    shape: "rectangle" | "corner" | "L"
    sizeTier: SizeTier                  // S/M/L preset; sliders snap to this tier's range
    widthM: number                      // primary 1m grid, secondary 0.5m
    depthM: number
    cornerCutM?: { axis: "x" | "z"; sizeM: { w: number; d: number } }   // only for corner/L
    gridSizeM: 1.0                      // primary; locked
    secondaryGridM: 0.5                 // for furniture/inserts; locked
  }

// Standard European trade-fair size tiers (Round 7 lock)
type SizeTier = "S" | "M" | "L"
//   S: small row/corner/starter island      (16-80 m² depending on shape)
//   M: medium island (the demo's hero range) (32-150 m²)
//   L: large island (premium client tier)    (70-300 m²)

type StandSizeTiers = Record<
  StandConfig["footprint"]["shape"],
  Record<SizeTier, {
    widthM: { min: number; max: number; default: number }
    depthM: { min: number; max: number; default: number }
    areaBandM2: [number, number]
  }>
>

const standardSizeTiers: StandSizeTiers = {
  rectangle: {
    S: { widthM: { min: 6,  max: 10, default: 8  }, depthM: { min: 6,  max: 8,  default: 6  }, areaBandM2: [36, 80]   },
    M: { widthM: { min: 10, max: 12, default: 12 }, depthM: { min: 8,  max: 10, default: 8  }, areaBandM2: [80, 144]  },
    L: { widthM: { min: 14, max: 20, default: 16 }, depthM: { min: 10, max: 15, default: 12 }, areaBandM2: [144, 300] },
  },
  corner: {
    S: { widthM: { min: 4,  max: 8,  default: 6  }, depthM: { min: 4,  max: 5,  default: 4  }, areaBandM2: [16, 32]   },
    M: { widthM: { min: 8,  max: 10, default: 8  }, depthM: { min: 5,  max: 7,  default: 5  }, areaBandM2: [32, 70]   },
    L: { widthM: { min: 12, max: 15, default: 14 }, depthM: { min: 8,  max: 10, default: 10 }, areaBandM2: [70, 150]  },
  },
  L: {
    S: { widthM: { min: 4,  max: 5,  default: 4  }, depthM: { min: 4,  max: 5,  default: 4  }, areaBandM2: [28, 48]   },
    M: { widthM: { min: 8,  max: 11, default: 9  }, depthM: { min: 8,  max: 11, default: 9  }, areaBandM2: [48, 112]  },
    L: { widthM: { min: 13, max: 15, default: 14 }, depthM: { min: 13, max: 15, default: 14 }, areaBandM2: [112, 200] },
  },
}
  layout: {
    wallHeightM: 2.5 | 3.0 | 4.0
    trussTopM: 3.5 | 4.5 | 5.5
    fasciaMode: "integrated" | "suspended"
    trussSupport: "self" | "hallRigged"
    floor: "raisedPlatform" | "carpetOnFloor" | "vinylOnPlatform" | "polishedTile"
    rampEdge: "none" | "single" | "double"
    storage: "none" | "small" | "medium"
    meeting: "none" | "lounge" | "enclosed"   // enclosed → adds door.glass
    media: "none" | "screen" | "ledWall"
    profileAllocation: ProfileAllocation       // defaults from template; user-overridable
    scene: SceneEnvironment                    // see specs/scene_environment.md
  }

  // Hall / lighting context — Round 6 lock
  // (full description in specs/scene_environment.md)
  // type SceneEnvironment = {
  //   hall: "gallery.light" | "warehouse.dark"
  //   hallOverride: boolean
  //   hdriId: HdriId
  //   toneMapping: "agx" | "neutral" | "cinematic"
  //   exposure: number
  //   showNeighbours: boolean
  //   rampVisible: "auto" | "always" | "never"
  // }
  walls: WallSegment[]
  placements: Placement[]               // pick-and-place items (palette modules)
  brandOverrides: BrandSurfaceOverride[]
  marginPolicy: MarginPolicy
}
```

## Wall system

```ts
type WallSegment = {
  id: string
  // Path along the footprint perimeter (or interior) in metres, CCW.
  startPt: Vec2
  endPt:   Vec2
  profile: ProfileId                    // alpine_42h, vail_120db, etc.
  topRailProfile: ProfileId             // often big_sky_ic
  bottomRailProfile: ProfileId
  bays: Bay[]                           // derived but cached for fast BOM
  trussLegs: TrussLeg[]                 // derived from height + profile limits
  anchors: Anchor[]                     // content placements along the wall
  attachments: Attachment[]             // truss/header above this segment
}

type Bay = {
  index: number
  widthM: number
  heightM: number
  infill: InfillType
  surfaceId?: string                    // links to a BrandableSurface
}

type InfillType =
  | "seg.fabric"
  | "laminate.rigid"
  | "glass.clear"
  | "glass.satin"
  | "led.tile"
  | "open"
  | "door.glass"
  | "honeycomb.hex"                     // Cargill green-hex motif lattice
  | "fabric.curved"                     // tensioned fabric on a curved frame

type ProfileId =
  | "profile_alpine_42h"
  | "profile_alpine_42v"          // VERTICAL POST default
  | "profile_aspen_slim"          // TOP/BOTTOM RAIL default (rotated)
  | "profile_big_sky_32d"         // 90° CORNER connector
  | "profile_big_sky_cg"          // END CAP
  | "profile_big_sky_ic"          // heavy top rail (wide spans)
  | "profile_vail_40c"            // INLINE INTERCONNECTOR default
  | "profile_vail_40d"            // double-sided wall
  | "profile_vail_120db"          // heavy structural / tall walls

// Role aliases — the resolver looks these up per template
type ProfileRole =
  | "post.vertical"
  | "rail.top"
  | "rail.bottom"
  | "corner.90"
  | "connector.inline"
  | "endcap"
  | "post.heavy"
  | "rail.heavy"

type ProfileAllocation = Record<ProfileRole, ProfileId>

const defaultProfileAllocation: ProfileAllocation = {
  "post.vertical":    "profile_alpine_42v",
  "rail.top":         "profile_aspen_slim",
  "rail.bottom":      "profile_aspen_slim",
  "corner.90":        "profile_big_sky_32d",
  "connector.inline": "profile_vail_40c",
  "endcap":           "profile_big_sky_cg",
  "post.heavy":       "profile_vail_120db",
  "rail.heavy":       "profile_big_sky_ic",
}

type TrussLeg = {
  atUM: number                          // position along the wall in metres
  heightM: number                       // 100% wall height default, 66% optional
  profile: "truss.deco.290"
}

type Anchor =
  | { kind: "logoMark";     ref: "primary" | "mono"; placement: AnchorPlacement }
  | { kind: "headline";     phraseKey: string;       placement: AnchorPlacement }
  | { kind: "screen";       diagonalIn: number;      placement: AnchorPlacement }
  | { kind: "door";         w: number; h: number;    placement: AnchorPlacement }
  | { kind: "vitrine";      w: number; d: number;    placement: AnchorPlacement }
  | { kind: "fasciaPrint";  motifRef?: MotifRef;     placement: AnchorPlacement }

type AnchorPlacement = {
  uTarget: number                       // 0..1 along wall length
  uTolerance: number                    // ± allowed drift
  baseSize: { w: number; h: number }
  scaleWithWall: { min: number; max: number }
  edgeMarginM: number                   // never closer than this to a corner/end
  vAlign: "top" | "centre" | "bottom"
  vOffsetM: number
}
```

## Curved & structural primitives (Round 7 lock)

These are NOT extrusion-frame walls. They are custom procedural geometry — CNC-cut MDF + spray, or rotomoulded panels. Generated at runtime from parameters; not loaded from glb. Lower reuse score (~50–70%) than SEG extrusion.

```ts
type CurvedStructure =
  | PendantSign        // overhead suspended branded element — SHAPE-AGNOSTIC (Round 7+anti-boxology)
  | TieredDrum         // stacked drum (often hangs below a ring-shaped PendantSign)
  | SquircleCounter    // curved-plan reception counter
  | CurvedArcCounter   // partial-arc counter
  | CurvedArchFrame    // squircle archway as entrance/portal
  | HoneycombPanel     // hex lattice panel
  | LedEdgeStrip       // continuous LED accent strip

// Pendant signs are the single biggest weapon against "CGI boxology" — overhead suspended
// branded elements visible from every aisle. They take a shape enum so the same module
// covers TDK's rectangular pendant, Cargill's ring, an oval option, etc.
type PendantSign = {
  kind: "structure.pendant.sign"
  shape: PendantShape
  // For all shapes: oriented horizontally and suspended from truss
  // Bounding-box dims (interpretation depends on shape):
  outerWM: number               // bounding-box width
  outerDM: number               // bounding-box depth
  // Shape-specific extras:
  innerWM?: number              // RING ONLY — inner hole width  (for tiered-drum drop-through)
  innerDM?: number              // RING ONLY — inner hole depth
  cornerRadiusM?: number        // SQUIRCLE — corner radius
  // Common:
  heightM: number               // pendant thickness vertically, typical 0.4..0.8
  yPositionM: number             // floor → bottom of pendant, usually trussTopM - 0.4
  outerFaceTreatment: "printed" | "led" | "etched" | "fabric"
  innerFaceTreatment: "lit-fabric" | "matte" | "led" | "downlight"   // downlight = unbroken light wash below
  brandableSurfaceId: string    // outer face is the headline brand slot
  // Layout / placement:
  centerXZ: Vec2
  rotationDegY: number
}

type PendantShape =
  | "rectangle"        // hard-edged box — TDK suspended fascia, STILL fascia
  | "squircle"         // rounded-rectangle — softer than rectangle, premium
  | "oval"             // ellipse — distinctive, less common
  | "circle"           // solid disc
  | "ring"             // donut — has a hole; allows a TieredDrum or product to drop through

type TieredDrum = {
  kind: "structure.drum.tiered"
  levels: { radiusM: number; heightM: number; printAssetId?: string }[]
  centerXZ: Vec2
  baseYM: number                // top of the counter, typically
  topCapAttachToRingSign?: boolean
}

type SquircleCounter = {
  kind: "counter.squircle"
  widthM: number                // bounding box w
  depthM: number                // bounding box d
  cornerRadiusM: number         // squircle corner radius, typical 0.6
  heightM: number               // 0.9 reception / 1.1 bar
  surfaceMaterial: "laminate" | "solidSurface" | "woodVeneer" | "paintedMDF"
  ledEdge?: LedEdgeStrip
  brandableSurfaceId?: string   // the front-facing curved face
}

type CurvedArcCounter = {
  kind: "counter.curved.arc"
  radiusM: number
  arcDeg: number                // 60..270
  thicknessM: number            // counter depth, typical 0.6
  heightM: number
  surfaceMaterial: SquircleCounter["surfaceMaterial"]
  ledEdge?: LedEdgeStrip
  brandableSurfaceId?: string
}

type CurvedArchFrame = {
  kind: "infill.curved.arch"
  spanM: number                 // doorway width
  archHeightM: number           // peak of arch from floor
  legHeightM: number             // straight section height before arch begins
  thicknessM: number            // frame depth (z)
  cornerRadiusM: number          // 0 = full arch; >0 = squircle
  infill: "open" | "honeycomb.hex" | "seg.fabric"
  brandableSurfaceId?: string
}

type HoneycombPanel = {
  kind: "panel.honeycomb"
  widthM: number
  heightM: number
  hexSizeM: number              // hex edge length, typical 0.06
  depthM: number                // panel depth
  fillColor: HexColor
  edgeColor: HexColor
  backlit: boolean
}

type LedEdgeStrip = {
  kind: "light.led.edge.linear"
  pathPoints: Vec3[]            // polyline path the strip follows
  colorK: number                // 2700K..6500K, or RGB if brand-coloured
  rgbOverride?: HexColor
  emissiveLumPerM: number
  thicknessM: number            // visual cross-section, typical 0.01
}
```

These structures are referenced by the template's `ComponentPlan` and rendered as procedural meshes. Each declares its own BOM line via `toBomLines()` on the type (cost is by material + complexity, not by extrusion m).

```ts
type BrandKit = {
  id: string
  name: string
  palette: Palette
  derivation: DerivationRule
  derivedOverrides?: Partial<DerivedPalette>
  logos: {
    primary:   LogoAsset                // SVG mandatory
    monoLight: LogoAsset
    monoDark:  LogoAsset
    icon:      LogoAsset
  }
  typography: {
    display: FontFace
    body:    FontFace
    fallbackGoogle?: { display: string; body: string }
  }
  motifs: MotifRef[]
  patterns: PatternAsset[]
  imagery:  ImageAsset[]
  phrases:  string[]                    // approved headlines for in-scene typesetting
  rules: {
    minLogoHeightMm: number
    safeAreaRatio: number               // multiplier × cap-height; inferred default = 1
    contrastMin: number                 // WCAG-ish
    disallowedBgs: HexColor[]
  }
  intents: ApplyIntent[]                // per-surface overrides for the 3 baked kits
}

type Palette = {
  primary: HexColor
  secondary: HexColor
  accent: HexColor
  neutralLight: HexColor
  neutralDark: HexColor
}

type DerivationRule =
  | "complementary"
  | "splitComplementary"
  | "analogous"
  | "triadic"
  | "monochrome"

type DerivedPalette = {
  surfaceTintHi: HexColor
  surfaceTintLo: HexColor
  onPrimary: HexColor
  onSecondary: HexColor
  borderSoft: HexColor
  headlineOnDark: HexColor
  headlineOnLight: HexColor
  motifFill: HexColor
  motifStroke: HexColor
}

type LogoAsset = {
  svgUrl: string                        // mandatory
  rasterUrl?: string                    // PNG fallback
  viewBox: [number, number, number, number]
  capHeightFraction: number             // for safe-area math
  isMono: boolean
}

type FontFace = {
  family: string
  weights: number[]
  italic: boolean
  source: "uploaded" | "google" | "system"
  url?: string                          // when uploaded
  cssName: string                       // what `font-family` resolves to in scene
}

type MotifRef =
  | { kind: "chevron";     angleDeg: number; density: number; scale: number }
  | { kind: "dotField";    density: number; sizeMin: number; sizeMax: number; jitter: number }
  | { kind: "pillCluster"; pillCount: number; sizes: number[]; spacing: number }
  | { kind: "arrowSweep";  curvature: number; count: number }
  | { kind: "lineGrid";    spacing: number; angleDeg: number; weight: number }
  | { kind: "halftone";    sourceImageId: string; dotSize: number }

type ApplyIntent = {
  surfaceKind: BrandableSurfaceKind
  treatment: "etched" | "printed" | "led" | "fabric" | "vinyl" | "skip"
  paletteRole: "primary" | "secondary" | "accent" | "neutralDark" | "neutralLight"
  motifRef?: MotifRef
  logoVariant: "primary" | "monoLight" | "monoDark" | "icon"
  notes?: string
}

type BrandableSurfaceKind =
  | "fascia" | "soffit" | "backWall" | "flankWall"
  | "counterFront" | "vitrineEtch" | "ledWall"
  | "carpetInsert" | "trussFlag"
```

## Templates

```ts
type Template = {
  id: TemplateId
  name: { de: string; en: string }
  inspiredBy: string                    // "TDK trade-fair stand"
  footprintRange: {
    shape: ("rectangle" | "corner" | "L")[]
    widthM: { min: number; max: number; default: number }
    depthM: { min: number; max: number; default: number }
  }
  defaultLayout: StandConfig["layout"]
  walls: WallSegmentSeed[]              // path + profile + anchors, dimensions parametric
  placements: Placement[]
  brandableSurfaces: BrandableSurfaceSeed[]
  cameraShots: CameraShot[]             // 6 fixed; user can pin up to 4 more
  bomSeed: BomSeed                      // structural minimums for each footprint band
  constraints: TemplateConstraint[]
}

type TemplateId =
  | "tpl.tdk-fascia-island"
  | "tpl.tagheuer-glass-corner"
  | "tpl.cargill-printed-L"

type Placement = {
  id: string
  moduleId: ModuleId
  positionM: Vec3
  rotationDegY: 0 | 90 | 180 | 270 | number  // 90° snap default
  slotRef?: { kind: "floor" | "wall" | "truss"; ref: string }
}
```

## BOM, pricing, and invoice

```ts
type BomLine = {
  id: string
  category: BomCategory
  group: BomGroup                       // for invoice consolidation
  item: { de: string; en: string }
  qty: number
  unit: BomUnit
  unitCostLow: number                   // EUR, internal cost
  unitCostHigh: number                  // EUR, internal cost
  marginPct: number                     // resolved from MarginPolicy
  sellLow: number                       // unitCostLow × (1 + marginPct) × qty
  sellHigh: number
  reuseEligible: boolean
  embodiedCO2KgLow: number
  embodiedCO2KgHigh: number
  massKg: number
  source: "in-house" | "subcontracted"
  supplierId?: string
}

type BomCategory =
  | "structure" | "graphics" | "glass" | "lighting" | "av"
  | "furniture" | "labour" | "services" | "logistics"

type BomGroup =                         // mirrors Rob's invoice example
  | "stand.construction"                // design + production + install
  | "graphics"
  | "furniture.rental"
  | "av"
  | "cleaning"
  | "install.dismantle.labour"
  | "services.utilities"                // wifi, power, water
  | "rigging"
  | "logistics"

type BomUnit = "each" | "m2" | "m" | "kg" | "day" | "hour" | "point" | "lot" | "kVA" | "night"

type MarginPolicy = {
  defaultPct: number                    // 0.33
  perCategory: Partial<Record<BomCategory, number>>
  applyToInHouse: boolean               // false by Round 5 decision
}
```

## Invoice (EU)

```ts
type Invoice = {
  number: string                        // EXP-2026-001
  date: ISODate
  customerId: string
  project: { name: string; boothNumber: string; exhibitionName: string }
  provider: PartyBlock                  // ET Global, VAT DE…
  client: PartyBlock                    // includes optional VAT ID
  lines: InvoiceLine[]
  subtotal: number
  vatTreatment: "DE_19" | "EU_REVERSE_CHARGE" | "NON_EU_ZERO"
  vatAmount: number
  total: number
  payment: {
    dueDate: ISODate
    method: "bank-transfer"
    iban: string
    bic: string
    bankName: string
    reference: string                   // invoice number
  }
}

type InvoiceLine = {
  description: { de: string; en: string }
  qty: number
  unitPrice: number
  amount: number
  bomGroup: BomGroup
}

type PartyBlock = {
  name: string
  street: string
  city: string
  postal: string
  country: string
  vatId?: string                        // present → may trigger reverse charge
}
```

## Camera

```ts
type CameraShot = {
  id: string
  name: { de: string; en: string }
  kind: "orbit" | "framed" | "swatch" | "orthoEdit"
  target: Vec3 | { ref: string }
  framing: {
    distance?: number
    azimuthDeg?: number
    elevationDeg?: number
    fovDeg?: number
    paddingPx?: number
  }
  dof?: { focusDistance: number; focalLength: number; bokehScale: number }
  duration: number
  easing: "smooth" | "snap" | "cinematic"
  pinned?: boolean                      // user-pinned vs template-shipped
}
```

## Sliders

```ts
type SliderSpec = {
  id: string
  label: { de: string; en: string }
  unit: "m" | "mm" | "deg" | "pct" | "count" | "kVA" | "lux"
  min: number
  max: number
  step: number
  defaultValue: number
  ticks?: number[]
  bounds: { providerLocked: boolean; hardMin: number; hardMax: number }
  format: (n: number) => string
}
```

## Intent dispatcher (agent-ready)

Every UI action becomes one of these. The reducer accepts the same JSON whether it came from a click or a future agent.

```ts
type Intent =
  | { type: "footprint.set";       widthM: number; depthM: number }
  | { type: "footprint.setShape";  shape: StandConfig["footprint"]["shape"] }
  | { type: "layout.set";          patch: Partial<StandConfig["layout"]> }
  | { type: "wall.profile.set";    wallId: string; profile: ProfileId }
  | { type: "wall.infill.set";     wallId: string; bayIndex: number; infill: InfillType }
  | { type: "wall.anchor.add";     wallId: string; anchor: Anchor }
  | { type: "wall.anchor.move";    wallId: string; anchorId: string; uTarget: number }
  | { type: "brandKit.apply";      kitId: string }
  | { type: "brandKit.overrideSurface"; surfaceId: string; override: BrandSurfaceOverride }
  | { type: "place";               moduleId: ModuleId; positionM: Vec3; rotationDegY: number }
  | { type: "remove";              placementId: string }
  | { type: "camera.gotoShot";     shotId: string }
  | { type: "camera.pin";          shot: CameraShot }
  | { type: "scene.save";          name: string }
  | { type: "scene.exportPdf";     scope: "internal" | "invoice" }
```

All intents are Zod-validated; the dispatcher rejects malformed input and returns a typed result with derived diffs (which BOM lines changed, which warnings fired).
