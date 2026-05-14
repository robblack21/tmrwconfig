# Templates — three baked, all fully fleshed

We ship three templates, each closely based on a real reference (Round 2). The diversity envelope: one **rectangle / LED-led / media-heavy**, one **corner / glass-led / dark retail**, one **corner-or-L / curved-structural / sustainable brand**.

If schedule slips (Round 5), we drop to the first two; the third becomes a stretch goal.

Every template ships with **S / M / L size tier presets** (Round 7 lock) drawn from `standardSizeTiers` in [schemas.md](schemas.md). Picking a tier seeds default `widthM`/`depthM` and re-bounds the sliders.

| Template | Inspired by | Default tier | Hero | Brand kit at launch |
|---|---|---|---|---|
| `tpl.tdk-fascia-island`     | TDK (LogiMAT) | rectangle M (12×8 default; S 8×6 / M 12×8 / L 16×12) | Suspended fascia + decotruss + LED back wall | TDK |
| `tpl.tagheuer-glass-corner` | Tag Heuer Dubai Mall | corner M (8×5 default; S 6×4 / M 8×5 / L 14×10) | Glass storefront + lit vitrines + dark back wall | Tag Heuer |
| `tpl.cargill-curved-corner` | Cargill (two refs) | corner M (8×5 default; S 6×4 / M 8×5 / L 14×10). L-shape variant `tpl.cargill-curved-L` at the M (9×9 with 3×3 cut) and L (14×14 with 4×4 cut) tiers. | **Halo ring sign + tiered drum + squircle counter + honeycomb arch** — curved-structural hero | Cargill |

---

## 1. `tpl.tdk-fascia-island` — fully fleshed (hero template, build first)

### 1.1 Footprint & layout defaults

```yaml
shape: rectangle
sizeTier: M         # S: 8×6, M: 12×8, L: 16×12
widthM: 12          # range bound by tier (M tier: 10..12, step 0.5)
depthM: 8           # range bound by tier (M tier: 8..10,  step 0.5)
wallHeightM: 3.0    # 2.5 / 3.0 / 4.0
trussTopM: 4.5      # 3.5 / 4.5 / 5.5
fasciaMode: suspended
trussSupport: self  # vertical truss legs at four corners
floor: raisedPlatform
rampEdge: double    # ramps on both visible aisle sides
storage: small
meeting: lounge
media: ledWall
```

### 1.2 Walls (parametric)

Four walls along the rectangle perimeter, two "open" (aisle-facing) and two "closed" (graphics):

```
       N (back, closed)         — full graphics + LED back wall
   W ───────────────────── E
   │                     │
   │  W (side, closed)   │      — flank graphics + meeting alcove
   │                     │      
   │  E (side, half-open)│      — half wall to reveal storage
   │                     │
   W ───────────────────── E
       S (front, open)          — open with reception counter + branded soffit overhead
```

| Wall | Profile | Top-rail | Default infill mix | Notes |
|---|---|---|---|---|
| N (back) | `profile_alpine_42h` | `profile_big_sky_ic` | 2×`led.tile` (centre) + `seg.fabric` flanks | LED region drives anchor centred at u=0.5 |
| W (left flank) | `profile_alpine_42h` | `profile_big_sky_ic` | `seg.fabric` with logo anchor + headline anchor | |
| E (right flank) | `profile_alpine_42h` (half-height to 2m) | `profile_big_sky_ic` | `seg.fabric` lower + `open` upper | Reveals storage room behind |
| S (front-open) | (no infill; only top fascia hung from truss) | `profile_big_sky_ic` | n/a | Top of stand is the **suspended fascia** under the truss |

### 1.3 Decotruss + pendant sign

- 4 vertical truss legs at corners (290mm box, length = `trussTopM`).
- 4 horizontal truss bars forming the canopy at `trussTopM`.
- Optional centre cross-bar if `widthM > 12`.
- **Suspended pendant sign** under the canopy — formally a `PendantSign` module:
  ```yaml
  pendantSign:
    shape: rectangle           # TDK ref photo (Unbenannt4.jpg); user can swap to squircle / oval / ring
    outerWM: widthM - 1.5      # follows the stand width minus margins
    outerDM: depthM - 1.5
    heightM: 0.8
    yPositionM: trussTopM - 0.4
    outerFaceTreatment: led    # LED video on the outer face (signature TDK move)
    innerFaceTreatment: downlight
    brandableSurfaceId: surf.pendant.outer
  ```
  Swapping `shape: rectangle → squircle` softens the silhouette without losing the fascia function. `shape: ring` would expose the truss canopy through the hole (more architectural).

### 1.4 Brandable surfaces

| Slot ID | Kind | Default treatment | Anchors |
|---|---|---|---|
| `surf.fascia.front` | `fascia` | printed SEG | logoMark @ u=0.5 ±0.05; headline @ u=0.5 below logo |
| `surf.fascia.sides` (×2) | `fascia` | printed SEG, wordmark-only | logoMark mono @ u=0.5 |
| `surf.backwall.flanks` (×2) | `backWall` | printed SEG, motif `chevron` | logoMark @ u=0.25 / u=0.75; pattern fill |
| `surf.ledwall.centre` | `ledWall` | LED idle loop (brand video) | brand idle content; 5×3 m, 2.5mm pitch |
| `surf.flank.west` | `flankWall` | printed SEG | logoMark @ u=0.5 ±0.1; headline above |
| `surf.counter.front` | `counterFront` | vinyl-applied wordmark | icon @ u=0.5 |
| `surf.soffit.under` | `soffit` | downward-printed colour + icon | icon repeat |
| `surf.carpet.zone` | `carpetInsert` | colour-block carpet under lounge | n/a |

### 1.5 Pick-and-place placements (defaults)

- 1× reception counter (front-left of opening)
- 2× display vitrine (`vitrine.glass.1.0x0.5x1.2`) flanking the LED wall
- 1× lounge cluster (2 chairs + low table) in the corner alcove
- 4× hanging blade lights along truss interior
- 1× large plant in storage-adjacent corner
- 1× ultrawide portrait display on stand kiosk (front-right)

### 1.6 Camera shots (6 fixed + 4 user-pinnable)

1. **Hero ¾** — orbit, azimuth 35°, elevation 18°, full stand framed.
2. **Fascia front** — eye-level, head-on to suspended fascia, DoF on logo.
3. **LED wall close** — framed shot, fills the LED.
4. **Vitrine close** — DoF on vitrine glass + product.
5. **Brand-wall close (flank W)** — head-on, logo + headline centred (also entry to 2D-edit).
6. **Reception/counter** — eye-level, counter logo prominent.

### 1.7 Constraints

```yaml
- widthM × depthM ≤ 130 m² (else BOM range warns)
- LED wall width ≤ widthM - 4m (must leave 2m margin each side on back wall)
- Suspended fascia mandatory; integrated fascia not allowed
- East wall must remain half-height to keep storage visible
- Truss legs cannot fall within 0.6m of reception counter centreline
```

### 1.8 BOM seed (default 12×8, before user changes)

Roll-up at default config (anchor numbers; full price tables in [bom.md](bom.md)):

| Group | Approx range (EUR cost, pre-margin) |
|---|---|
| Structure (extrusion + connectors + raised platform) | 12,800 – 16,200 |
| Decotruss (290 box, 4 legs + canopy) | 3,400 – 4,400 |
| Graphics (SEG fabric back/flanks + fascia print) | 4,200 – 6,800 |
| Glass (2 vitrines) | 1,400 – 1,900 |
| Lighting (4 blades + 8 track + 2 vitrine internal) | 1,700 – 2,600 |
| AV (5×3 LED wall + portrait kiosk + audio) | 11,800 – 16,400 |
| Furniture (counter + lounge + plant) | 1,300 – 2,200 |
| Labour (install + electrical + AV + graphics + supervisor) | 5,800 – 7,400 |
| Services (wifi, power, cleaning, security) | 1,900 – 2,800 |
| Logistics (truck + crates) | 1,100 – 1,600 |
| **Total cost** | **45,400 – 62,300** |
| With 33% default margin | **60,400 – 82,900** |
| Reuse score | ~71% |
| CO₂e saving vs full-new | ~28% |

---

## 2. `tpl.tagheuer-glass-corner` — fully fleshed (build second)

### 2.1 Footprint & layout defaults

```yaml
shape: corner          # two walls meet at right angle; other two sides open
sizeTier: M            # S: 6×4 (intimate boutique), M: 8×5 (default), L: 14×10 (flagship)
widthM: 8              # M tier range 8..10, step 0.5
depthM: 5              # M tier range 5..7,  step 0.5
wallHeightM: 4.0       # taller for retail drama
trussTopM: 5.5
fasciaMode: integrated # logo on top rail of back wall, no suspended fascia
trussSupport: self     # discreet vail_120db legs inside the corner
floor: polishedTile    # black, mirror-finish (SSR-friendly)
rampEdge: single       # ramp on one aisle-facing edge
storage: small         # behind the back wall
meeting: none
media: screen
profileAllocation:
  post.vertical: profile_vail_120db   # heavy black posts for the dark retail feel
  rail.top:     profile_aspen_slim
  rail.bottom:  profile_aspen_slim
  corner.90:    profile_big_sky_32d
  connector.inline: profile_vail_40c
  endcap:       profile_big_sky_cg
scene:
  hall: warehouse.dark    # the dark retail vibe stays even in client mode here
  hdriId: phone_shop_4k
  toneMapping: cinematic
  exposure: -0.6
```

### 2.2 Walls

L-shaped two-wall configuration meeting at a 90° interior corner; the other two sides are **open glass storefront**.

| Wall | Profile | Bays / infill | Notes |
|---|---|---|---|
| N (back, 8m closed) | `vail_120db` (heavy black) | 4 bays × 2m: `glass.satin` flanks + central `laminate.rigid` matte black with etched backlit logo | The hero anchor wall |
| W (side, 5m closed) | `vail_120db` | 2 bays: vitrine alcoves (`glass.clear` recess + internal LED) | Hosts the vitrine row |
| S (front-open, 8m) | n/a — open glass storefront (3 panels × 2.67m × full height) | `glass.clear` only, no infill behind | Visitors enter from here |
| E (side-open, 5m) | n/a — open | optional half-height counter only | Aisle-facing |

The glass storefront panels sit in slim extrusion frames (Vail 40D for double-sided in a frame), tensioned, polished. This is the dominant visual element.

### 2.3 Decotruss

Minimal — Tag Heuer retail vibe is **clean and architectural**, not gantry-heavy.
- 2 vertical truss legs at the inside-corner intersection only (visual punctuation).
- 1 horizontal bar across the top of the back wall to hang the linear LED.
- No fascia overhang.

### 2.4 Brandable surfaces

| Slot ID | Kind | Default treatment | Anchors |
|---|---|---|---|
| `surf.backwall.etched` | `backWall` | etched + back-lit on matte black | logoMark mono @ u=0.5, large (~1.4m wide), backlit |
| `surf.vitrines.etch` (×3) | `vitrineEtch` | etched on glass front | icon @ u=0.5, small (~0.18m) |
| `surf.entry.sign` | `flankWall` | floating block on truss | "WE ARE BACK" style hero phrase in brand display font |
| `surf.counter.front` | `counterFront` | vinyl polished black | wordmark @ u=0.5 |
| `surf.screen.idle` | `ledWall` | linear LED above back wall, brand idle | red-on-black animated wordmark |

### 2.5 Pick-and-place placements (defaults)

- 1× reception counter (front-left of L)
- 3× display vitrine (`vitrine.glass.0.5x0.5x1.5`) along W wall — each holds the **chronograph_watch.glb** hero asset, instanced, lit with cool internal LED
- 1× ultrawide portrait display behind counter
- 2× hanging blade luminaires on the back-wall truss bar
- 1× linear LED light strip (slimline) above the storefront entrance

### 2.6 Camera shots (6 fixed + 4 user-pinnable)

1. **Hero ¾ from aisle** — orbit, looking through the open storefront into the L.
2. **Vitrine close (×3 baked as separate shots)** — DoF on chronograph, refraction-heavy.
3. **Back-wall etched logo close** — head-on, backlit logo fills frame.
4. **Counter / reception** — angle that frames the counter wordmark.
5. **Glass-storefront eye-level** — outside-in, showing the reflective glass façade.
6. **Top-down architectural** — 65° elev, shows the L footprint clearly.

### 2.7 Constraints

```yaml
- Open storefront mandatory — front + outer-side stay glass-only
- Vitrine count locked at 3 along the side wall (per reference)
- floor must be polishedTile (other floors disallowed)
- LED strip is decorative; no LED video wall
- Maximum 130 m² footprint
```

### 2.8 BOM seed (default 8×5 corner, pre-margin)

| Group | Approx range (EUR cost) |
|---|---|
| Structure (heavy black extrusion + platform + glass frames) | 9,200 – 12,400 |
| Decotruss (minimal — 2 legs + 1 bar) | 1,100 – 1,500 |
| Graphics (etched logo + vinyl + LED idle) | 2,800 – 4,400 |
| **Glass** (storefront 3 panels ~24m² + 3 vitrines + satin flanks) | **5,200 – 7,800** |
| Lighting (3× vitrine LED + 2 blade + 1 linear) | 1,400 – 2,200 |
| AV (ultrawide kiosk + linear LED + audio) | 4,200 – 6,400 |
| Furniture (counter only) | 480 – 720 |
| Labour (heavy on graphics + electrical + supervisor) | 5,200 – 6,800 |
| Services | 1,800 – 2,600 |
| Logistics | 980 – 1,400 |
| **Total cost** | **32,380 – 46,220** |
| With markup (mixed by category) | **42,800 – 60,900** |
| Reuse score | ~58% (glass+tile lower-reuse) |
| CO₂e saving vs full-new | ~18% |

---

## 3. `tpl.cargill-curved-corner` — fully fleshed (build third / stretch)

**Deconstructed from** the supplied Cargill reference photos + `/components/stands/cargill_faic_2024_exhibition_stall.glb`. This template proves the configurator handles **shape-agnostic pendant signs + curved counters + honeycomb panels**, not just rectangular SEG.

> **Important re-spec (Round 7 + anti-boxology lock).** The hero is a **suspended pendant sign** in any shape (Cargill's *preferred* default is `ring`, but the user can pick `rectangle`, `squircle`, `oval`, `circle`). The pendant carries the wordmark on its outer face. When shape is `ring`, an optional **tiered drum** can drop through the centre hole carrying backlit imagery. The reception counter is also shape-agnostic — `rectangle`, `squircle`, or curved-arc plans are all available. A green **honeycomb hex arch** can punctuate the open corner.
>
> The Cargill brand kit doesn't lock these shapes — it just sets the most-Cargill-like defaults. The same kit autobrands any shape combination credibly. A different provider could use this template with a rectangular pendant + rectangular counter and still apply the Cargill kit; the Cargill kit owns the *treatment* (palette, motifs, headlines), not the geometry.

### 3.1 Footprint & layout defaults

```yaml
shape: corner            # two open sides, two closed
sizeTier: M
widthM: 8                # range 8..10 (M tier)
depthM: 5                # range 5..7  (M tier)
wallHeightM: 3.0
trussTopM: 4.5
fasciaMode: integrated
trussSupport: self
floor: raisedPlatform
rampEdge: double
storage: small           # accessed through a door inside the back wall (per first ref)
meeting: lounge
media: screen
profileAllocation: defaults
scene:
  hall: warehouse.dark   # green/white brand pops dramatically against dark; reuses the second-ref aesthetic
  hdriId: events_hall_interior_4k
  toneMapping: cinematic
  exposure: -0.4
```

L-shape variant available as `tpl.cargill-curved-L` for clients wanting a larger footprint — same components arranged across an L instead of a corner.

### 3.2 Walls (the rectangular part)

| Wall | Profile | Bays / infill | Notes |
|---|---|---|---|
| N (back, 8m closed) | `alpine_42v` | 4 bays × 2m: 1× `seg.fabric` headline + 2× `seg.fabric` brand pattern + 1× internal door (storage) | Door is `infill.open` flush within the wall |
| W (side, 5m closed) | `alpine_42v` | 2 bays × 2.5m: `seg.fabric` headline + `infill.curved.arch` honeycomb entry (occupies one full bay) | The hex archway opens onto the lounge |
| S, E (open aisles) | n/a | open glass-storefront-free aisle access | LED edge strip along platform edge in Cargill green |

### 3.3 Structural hero elements (Round 7 + anti-boxology)

All four elements below are shape-agnostic where possible. The values shown are the **Cargill-preferred defaults**; users freely change shape and the template re-resolves.

```yaml
pendantSign:                     # SHAPE-AGNOSTIC; ring is the Cargill default
  kind: structure.pendant.sign
  shape: ring                    # ring | circle | squircle | oval | rectangle (all valid)
  outerWM: 5.2                   # 5.2m outer diameter (Ø) for ring/circle; bbox width for others
  outerDM: 5.2
  innerWM: 3.6                   # ring shape only — central hole Ø
  innerDM: 3.6
  heightM: 0.6
  yPositionM: 4.1                # just below trussTopM
  outerFaceTreatment: led        # wordmark + leaf icon, lit
  innerFaceTreatment: downlight  # clean light wash beneath
  brandableSurfaceId: surf.pendant.outer
  centerXZ: [3.0, 2.5]
  rotationDegY: 0

# Only present if pendantSign.shape == "ring": optional Cargill tiered drum drops through the hole
tieredDrumOptional:
  kind: structure.drum.tiered
  enabled: true                  # auto-disable if pendant shape changes off "ring"
  levels:
    - { radiusM: 1.8, heightM: 1.2 }   # top — matches pendant inner radius
    - { radiusM: 1.5, heightM: 1.0 }
    - { radiusM: 1.2, heightM: 0.8 }
  centerXZ: [3.0, 2.5]
  baseYM: 1.1                    # sits on top of the counter

receptionCounter:                # SHAPE-AGNOSTIC counter
  kind: counter.squircle         # alternates: counter.curved.arc, counter.rectangle
  widthM: 4.0
  depthM: 2.4
  cornerRadiusM: 0.6             # squircle param; ignored for arc/rectangle
  heightM: 1.1
  surfaceMaterial: solidSurface
  ledEdge: { colorK: 0, rgbOverride: "#7CB342", emissiveLumPerM: 80, thicknessM: 0.015 }
  brandableSurfaceId: surf.counter.front

archEntry:                       # optional — green honeycomb archway, only on Cargill kit by default
  kind: infill.curved.arch
  enabled: true                  # provider can disable for a more conservative look
  spanM: 2.4
  archHeightM: 3.0
  legHeightM: 1.8
  thicknessM: 0.15
  cornerRadiusM: 0.6
  infill: honeycomb.hex
  brandableSurfaceId: surf.arch.entry
```

**Anti-boxology consequence.** When users want the configurator to *look more like a real stand and less like a CGI block*, the highest-impact lever is the pendant `shape`. A shape change is one click; the autobrand re-renders the pendant face surface and the BOM updates the per-shape line item.

### 3.4 Decotruss

- 4 truss legs at the corner footprint's external corners.
- Horizontal canopy across the closed walls only (not across the open aisle sides).
- A **rigid spider mount** hangs the halo ring sign + drum from the canopy centre.

### 3.5 Brandable surfaces (Round 7 expanded)

| Slot ID | Kind | Default treatment | Notes |
|---|---|---|---|
| `surf.backwall.long` | `backWall` | SEG print, pillCluster motif | headline @ u=0.5, logo near door |
| `surf.flank.archside` | `flankWall` | SEG print | logoMark + sub-headline beside the arch |
| `surf.ringSign.outer` | `soffit`/ringSign | LED-backlit printed wordmark + leaf icon | THE hero brand moment, visible from every aisle |
| `surf.drum.tier1/2/3` | `drumTier` | backlit-fabric printed imagery (wheat/grain/cocoa) | rotates per BrandKit |
| `surf.counter.front` | `counterFront` | wordmark applied to curved face | LED green strip outlines the foot |
| `surf.arch.entry` | `archEntry` | honeycomb hex infill, green | The architectural punctuation |
| `surf.carpet.platform` | `carpetInsert` | full Cargill-green carpet on platform | covers the raised platform |
| `surf.screen.idle` | `ledWall` | mounted display in the lounge | secondary |

### 3.6 Pick-and-place placements (defaults)

- 1× squircle counter (procedural, see §3.3) along the front-of-stand edge of the closed wall
- 4× bar stools at the counter, evenly spaced along the curve
- 1× meeting table + 4 lounge chairs inside the arch in the open corner
- 2× plant placements using `hexapot.glb` (Cargill-branded planter — ties to the honeycomb motif)
- 1× plant placement using `tree_s2.glb` near the storage door
- 1× snake plant by the counter
- 1× mounted display (55") on the back wall behind the counter
- 4× recessed spotlights under the halo ring sign, downlighting the counter
- 2× downlights inside the honeycomb arch
- Linear LED accent along platform edge (Cargill-green)

### 3.7 Camera shots (6 fixed + 4 user-pinnable)

1. **Hero ¾ from aisle** — orbit, shows halo ring + drum + squircle counter + archway in one frame.
2. **Halo ring look-up** — wide-angle low-angle, framing the outer wordmark face of the ring.
3. **Drum close** — eye-level, sees the wheat/grain imagery wrapping the tiered cylinders.
4. **Squircle counter front** — head-on, shows the wordmark + green LED foot.
5. **Through-the-arch** — POV walking through the honeycomb archway into the lounge.
6. **Top-down architectural** — 70° elev, reveals the curved-vs-rectangular contrast in plan.

### 3.8 Constraints

```yaml
- Halo ring sign mandatory; default position above the squircle counter
- Tiered drum directly under the halo, sitting on the counter
- Squircle counter mandatory; cannot be replaced by rectangular counter
- Honeycomb arch occupies exactly one wall bay on the flank
- Storage door is `infill.open` flush within the back wall, no `door.glass`
- Green carpet covers the entire platform (no other floor finishes allowed)
- LED edge strip is Cargill-green only; no override
```

### 3.9 BOM seed (default 8×5 corner, pre-margin)

| Group | Approx range (EUR cost) |
|---|---|
| Structure (light extrusion both walls + platform + back-wall door framing) | 7,800 – 10,200 |
| Decotruss (4 legs + canopy + spider mount for ring) | 3,200 – 4,400 |
| **Curved custom** (halo ring + tiered drum + squircle counter + arch + LED edge) | **10,800 – 16,200** |
| Graphics (SEG walls + drum print fabrics + arch hex infill + counter vinyl) | 4,800 – 7,400 |
| Glass | 0 |
| Lighting (4 spot + 2 downlight in arch + halo LED + drum backlight) | 1,800 – 2,800 |
| AV (single 55" display + audio) | 720 – 1,040 |
| Furniture (4 bar stools + meeting set + plants in hexapots) | 1,400 – 2,200 |
| Labour (curved-structure custom build heavy) | 6,200 – 8,400 |
| Services | 1,600 – 2,400 |
| Logistics | 980 – 1,400 |
| **Total cost** | **39,320 – 56,440** |
| With markup (curved custom @ 35%) | **52,400 – 75,100** |
| Reuse score | **~68%** (custom curved structure lower-reuse than extrusion) |
| CO₂e saving vs full-new | **~30%** |

The trade-off is honest: the curved Cargill template scores LOWER on reuse than the (hypothetical) all-SEG variant, because halo + drum + squircle are custom-built. The configurator can surface this trade in the BOM panel as a **sustainability disclosure** — and offer a "Maximise reuse" toggle that swaps the curved hero for a flat fabric back wall (the user immediately sees both the saving and the brand-impact loss).

---

## Implementation notes shared across templates

- Each template ships with a **fixture file** (TypeScript) that exports a fully-typed `Template` matching [schemas.md](schemas.md). Hot-reloadable.
- A `TemplateResolver` takes the template + the user's `StandConfig` and emits a `DerivedStand` (modules placed, BOM computed, warnings raised).
- The fixture-to-runtime is pure — same input always gives same output. Snapshot tests cover regression.
- Anchor positions on walls are recomputed on every `widthM`/`depthM` change (the parametric resize algorithm in plan_v2 §4b).
