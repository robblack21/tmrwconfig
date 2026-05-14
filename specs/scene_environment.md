# Scene Environment — hall, lighting, neighbours, mode switch

The configurator never renders a stand in a void. Two hall environments + a HDRI library + neighbour silhouettes give every scene operational context (Round 2 + Round 6).

## Dual-mode hall (Round 6 lock)

Two glb environments ship in `/components/exhibitionhall/`:

| Mode | File | When active | Vibe |
|---|---|---|---|
| **Gallery (light)** | `vr_exhibition_gallery_baked.glb` | Presenting / client view / saved-scene playback | Premium, gallery-like, light walls, clean floor. "Imagine your stand here, opening day." |
| **Warehouse (dark)** | `warehouse_fbx_model_free.glb` | Designing / provider view / active editing | Dark concrete, less competitive visual chrome, designer-focused. |

### Mode switch behaviour

- The mode is bound to the active `Role` + a manual toggle in the TopBar.
  - `role = "provider"` → default Warehouse.
  - `role = "client"` → default Gallery.
  - Manual override persists per project.
- On switch: cross-fade environment over 600ms; lighting rig re-tunes (warehouse = cooler, lower key; gallery = warmer, fuller fill).
- HDRI and tone mapping also swap (see below).

### Schema addition

```ts
// extends StandConfig.layout
type SceneEnvironment = {
  hall: "gallery.light" | "warehouse.dark"
  hallOverride: boolean              // true = user pinned this regardless of role
  hdriId: HdriId                     // overrides template default
  toneMapping: "agx" | "neutral" | "cinematic"
  exposure: number                   // EV stops, -2..+2
  showNeighbours: boolean            // low-poly silhouettes outside stand footprint
  rampVisible: "auto" | "always" | "never"
}
```

## HDRI library and assignments

Nine HDRIs in `/hdri/`. Each is mapped to a primary use + a per-template default:

| HDRI | Primary use | Template defaults |
|---|---|---|
| `events_hall_interior_4k.hdr` | General trade-fair lighting | TDK in warehouse mode |
| `newman_lobby_4k.hdr` | Showroom / lobby | Tag Heuer in gallery mode |
| `phone_shop_4k.hdr` | Premium retail | Tag Heuer in warehouse mode |
| `glass_passage_4k.hdr` | Glass-heavy lit interior | Tag Heuer (alt) |
| `dancing_hall_4k.hdr` | Wide warm interior | Cargill in gallery mode |
| `artist_workshop_4k.hdr` | Studio softbox | Brand-kit-builder preview |
| `industrial_workshop_foundry_4k.hdr` | Industrial cool | Reserved |
| `ferndale_studio_03_4k.hdr` | Neutral product-shot | Material swatch / vitrine close shot |
| `studio_kominka_01_4k.hdr` | Warm neutral | TDK in gallery mode |

### Build-time pipeline

- All `.hdr` → 2048×1024 EXR + PMREM-prefiltered cubemap KTX2 + a 256×128 SDR preview PNG.
- Stored in Supabase Storage / R2 alongside templates.
- At runtime: PMREM cube is loaded for IBL; original EXR is only used for the visible background when the environment is exposed (when the hall glbs are hidden).
- HDRI applies only to the upper hemisphere — lower hemisphere is occluded by the hall floor + stand.

## Lighting rig per template (synthesised, tunable per scene)

A pure-data rig — no manual three.js light tweaking:

```ts
type LightingRig = {
  keyLight: { type: "directional"; intensity: number; angleDeg: [number, number]; colorK: number }
  fillLight: { type: "ambient"; intensity: number; colorK: number }
  rimLight?: { type: "spot"; intensity: number; angleDeg: [number, number]; colorK: number }
  spotPoints?: { positionM: Vec3; targetM: Vec3; intensity: number; coneDeg: number; colorK: number }[]
  contactShadow: { resolution: number; blur: number; opacity: number }
}
```

| Mode | Key | Fill | Tone map | Exposure |
|---|---|---|---|---|
| Gallery | 1500lm @ 35° elev, 5500K | 0.35 ambient @ 5200K | AgX | +0.0 |
| Warehouse | 900lm @ 22° elev, 4800K | 0.18 ambient @ 4000K | Neutral | -0.7 |

Vision-Pro pick-and-place shadows reuse the key light's shadow camera but each placed object also gets a tiny dedicated contact-shadow render target (Round 1 lock).

## Neighbour silhouettes (Round 2 lock)

Generated procedurally — not modelled by hand:

```ts
type NeighbourRing = {
  silhouetteCount: number          // 4..8
  ringRadiusM: number              // 12..18
  archetypeMix: { kind: NeighbourArchetype; weight: number }[]
  desaturation: number             // 0.6..0.9
  blurPx: number                   // 1..2
}

type NeighbourArchetype =
  | "box.simple"                   // 3×3×3m grey box
  | "box.with.fascia"              // box + suspended fascia
  | "tall.fascia"                  // narrow tall fascia stand
  | "open.lounge"                  // low platform with chairs silhouette
```

Each silhouette is a low-poly instanced mesh (~30 tris) with a single greyscale material. Total budget < 0.5ms/frame. No shadows cast, no reflections received.

## Floor & platform (Round 2 lock)

The hall glbs provide the underlying floor; the stand's `raisedPlatform` sits on top.

- Platform module: 1×1m × 100mm, materialised from `/textures/concrete_floor_worn_001_4k.gltf` (underside, when ramp is visible) and a chosen finish on top (vinyl / carpet / parquet / polished tile).
- Ramp edge: chamfered 1m module at platform perimeter where `rampEdge !== "none"`.
- DE convention: ramp on at least one aisle-facing edge (accessibility).

## Carpet inventory (from `/components/carpets/`)

For carpet finish on the platform OR colour-block insert:

| Asset | Use |
|---|---|
| `carpet_tile_template_model_1.0_x_1.0m_texture.glb` | Reference 1m grid sample |
| `seamless_crumpled_carpet_pbr_texture.glb` | Hero PBR carpet for in-scene materialising |
| `ege_carpets_patchwork_beige_vr_experience.glb` | Premium pattern variant |
| `carpet_tile_layout_design_for_petone_library..glb` | Tile-layout inspiration (Library reference) |
| `carpet (1).glb`, `carpet.glb` | Generic alternates |

In practice we don't instance the glbs — we extract the textures and apply them to a procedural floor plane sized to the stand's platform.

## Materialisation rules per environment

A small table the renderer consults at scene assembly time:

| Surface | Gallery mode | Warehouse mode |
|---|---|---|
| Hall floor | `concrete_floor_worn` polished | `concrete_floor_worn` matte, scratched |
| Stand platform top | from `StandConfig.layout.floor` | same |
| HDRI | `newman_lobby` / `studio_kominka` (per template) | `events_hall_interior` / `phone_shop` |
| Neighbour material | white-tinted, 0.6 desaturation | dark-grey-tinted, 0.85 desaturation |
| Stand back-lighting | rim 250lm @ 4000K | rim disabled |
| Particles | dust motes (very subtle) | none |

## Camera director — environment-aware

When `mode` switches, all `CameraShot.framing` values stay the same but `dof.focusDistance` and tone-mapping reapply. Saved scenes record the active mode so they always re-open with the right vibe.
