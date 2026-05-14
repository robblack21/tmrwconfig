# Pre-baked Brand Kits

Three kits ship as fixtures so the demo "just works" (Round 4 decision). Each is sourced from the brand's public identity page where possible. If a font is not licensable for this prototype, we use the closest Google Fonts equivalent and note the substitution.

Sources to consult during implementation (provided by Rob):
- TDK — https://www.tdk.com/en/about_tdk/brand-identity/index.html
- Cargill — https://www.cargill.com/news/news-media-assets
- Tag Heuer — https://craftsupply.co/articles/tag-heuer-logo/ (third-party article; cross-reference with TAG Heuer official press)

All kits conform to the `BrandKit` shape in [schemas.md](schemas.md).

---

## 1. TDK — `brand.tdk`

### Palette (anchor values — confirm vs official spec)

```yaml
primary:      "#0073C5"   # TDK Blue (anchor — confirm exact value from brand page)
secondary:    "#FFFFFF"
accent:       "#5BC2E7"   # cyan support
neutralLight: "#F2F4F8"
neutralDark:  "#0B1730"
derivation:   "splitComplementary"   # generates derived warm support if needed
```

### Logos

```yaml
primary:    /brand/tdk/logo-primary.svg          # SVG mandatory
monoLight:  /brand/tdk/logo-mono-light.svg
monoDark:   /brand/tdk/logo-mono-dark.svg
icon:       /brand/tdk/icon-diamond.svg          # the TDK diamond/triangle mark
```

### Typography

```yaml
display:
  family: "TDK Display"    # if licensable; else fallback
  source: uploaded
  fallback Google: "Barlow"
body:
  family: "TDK Text"
  source: uploaded
  fallback Google: "Barlow"
```

### Motif

```yaml
- kind: chevron
  angleDeg: 30
  density: 0.4
  scale: 1.0
```

### Phrases (in-scene allowed headlines)

```yaml
de:
  - "In allem besser."
  - "Technologie, die verbindet."
  - "Hochleistung von Anfang an."
en:
  - "In Everything, Better."
  - "Technology that connects."
  - "Engineered for performance."
```

### Apply intents (per surface)

```yaml
fascia:        { treatment: printed,  paletteRole: primary,    logoVariant: primary,    motifRef: { kind: chevron } }
backWall:      { treatment: printed,  paletteRole: primary,    logoVariant: monoLight,  motifRef: { kind: chevron } }
flankWall:     { treatment: printed,  paletteRole: neutralDark,logoVariant: monoLight,  motifRef: { kind: chevron } }
counterFront:  { treatment: vinyl,    paletteRole: neutralLight,logoVariant: icon }
soffit:        { treatment: printed,  paletteRole: primary,    logoVariant: icon }
vitrineEtch:   { treatment: etched,   paletteRole: neutralLight,logoVariant: icon }
ledWall:       { treatment: led,      paletteRole: primary,    logoVariant: primary }
carpetInsert:  { treatment: skip }    # TDK doesn't typically use carpet inserts
trussFlag:     { treatment: skip }
```

### Preferred pendant shape (Round 7 anti-boxology lock)

Brand kits do not lock the structural shape — but they declare a *preferred* default:

```yaml
pendantSign:
  preferredShape: rectangle   # TDK reference photo (Unbenannt4.jpg) clearly shows a rectangular pendant fascia
  alternates:  [squircle, ring]    # both valid; user can swap freely
  outerFaceTreatment: led          # TDK = LED video on the pendant face
  innerFaceTreatment: downlight    # clean downward light wash
```

### Hero 3D strategy (Round 6 lock)

TDK booths in the reference photos are **screen-and-tablet-heavy** rather than product-heavy. Strategy: lean into that. The TDK hero composition uses general props from `/components/props/` rather than bespoke hero glbs:

- `realistic_smart_tv_3d_model_with_stand.glb` — used as a freestanding portrait/landscape display (multiple instances along the back wall).
- `low_poly_tablet_for_mockups.glb` — on tablet display stands at the counter.
- `tablet_display_stands.glb` — pedestal-mounted tablets along the flank wall.

The `/components/brand-hero/tdk/` folder stays empty — TDK is **media-led, not product-led**.

---

## 2. Tag Heuer — `brand.tagheuer`

### Palette

```yaml
primary:      "#000000"
secondary:    "#FFFFFF"
accent:       "#D40029"     # Tag Heuer red (anchor — confirm)
neutralLight: "#F4F4F4"
neutralDark:  "#1A1A1A"
derivation:   "complementary"
```

### Logos

```yaml
primary:    /brand/tagheuer/logo-primary.svg
monoLight:  /brand/tagheuer/logo-mono-light.svg
monoDark:   /brand/tagheuer/logo-mono-dark.svg
icon:       /brand/tagheuer/icon-shield.svg     # the TH shield
```

### Typography

```yaml
display:
  family: "TAG Heuer Wordmark"      # bespoke; not licensable — use as image
  source: uploaded
  fallback Google: "Cormorant Garamond" + "Inter" combo for support text
body:
  family: "Inter"
  source: google
```

### Motif

```yaml
- kind: lineGrid
  spacing: 0.05
  angleDeg: 0
  weight: 0.5
- kind: chevron        # TH uses chevrons in the chronograph context too
  angleDeg: 60
  density: 0.2
  scale: 0.6
```

### Phrases

```yaml
de:
  - "Don’t Crack Under Pressure."
  - "Avantgarde seit 1860."
  - "Schweizer Präzision."
en:
  - "Don’t Crack Under Pressure."
  - "Avant-Garde Since 1860."
  - "Swiss Precision."
```

### Apply intents

```yaml
fascia:        { treatment: printed,  paletteRole: neutralDark,    logoVariant: monoLight }
backWall:      { treatment: etched,   paletteRole: neutralDark,    logoVariant: primary }
flankWall:     { treatment: printed,  paletteRole: neutralDark,    logoVariant: monoLight }
counterFront:  { treatment: vinyl,    paletteRole: neutralDark,    logoVariant: icon }
vitrineEtch:   { treatment: etched,   paletteRole: neutralLight,   logoVariant: icon }    # SIGNATURE: etched on vitrines
ledWall:       { treatment: led,      paletteRole: neutralDark,    logoVariant: primary }
soffit:        { treatment: skip }    # Tag Heuer doesn't use soffit branding in retail
carpetInsert:  { treatment: skip }
trussFlag:     { treatment: skip }
```

### Preferred pendant shape

```yaml
pendantSign:
  preferredShape: none        # Tag Heuer's retail aesthetic is integrated-fascia; no overhead pendant by default
  alternates: [squircle]       # if user enables one, squircle suits the premium retail tone
  outerFaceTreatment: etched
  innerFaceTreatment: matte
```

Heavy emphasis on **etched-glass vitrines** — this is the signature autobrand move for the Tag Heuer kit.

### Hero 3D assets (Round 6 lock)

`/components/brand-hero/tagheuer/chronograph_watch.glb` ✓ — instanced into the three vitrines as the centrepiece, with internal LED lighting tuned for chrome/glass material.

---

## 3. Cargill — `brand.cargill`

### Palette

```yaml
primary:      "#1B4332"   # Cargill green (anchor — confirm)
secondary:    "#F5EFE0"   # cream
accent:       "#E57A2A"   # orange
neutralLight: "#FFFFFF"
neutralDark:  "#0C2A1F"
# extended palette (the pill-cluster motif uses):
extended:
  - "#5BC2E7"    # sky blue
  - "#7CB342"    # lime
  - "#000000"    # black
derivation:   "triadic"
```

### Logos

```yaml
primary:    /brand/cargill/logo-primary.svg
monoLight:  /brand/cargill/logo-mono-light.svg
monoDark:   /brand/cargill/logo-mono-dark.svg
icon:       /brand/cargill/icon-leaf.svg
```

### Typography

```yaml
display:
  family: "Cargill Sans"
  source: uploaded
  fallback Google: "DM Sans"
body:
  family: "DM Sans"
  source: google
```

### Motifs (Round 7 expansion — Cargill is multi-motif)

```yaml
- kind: pillCluster      # the secondary surface motif
  pillCount: 14
  sizes: [0.4, 0.6, 0.8, 1.2]
  spacing: 0.3
- kind: honeycomb        # the architectural / wall infill motif (greenhouse hex)
  hexSizeM: 0.06
  fillAlpha: 0.0          # see-through cells
  edgeWeight: 0.4
- kind: arch             # the architectural framing motif (Cargill squircle arch)
  cornerRadius: 0.6
  legHeightFrac: 0.6
```

The honeycomb is rendered as `infill.honeycomb.hex` on Cargill wall bays (lit green from behind in the dark warehouse mode). The arch is used as `infill.curved.arch` at the open corner of the L. Pills carry the back-wall fabric prints. All three pull colours from the kit palette + extended.

### Phrases

```yaml
de:
  - "Nahrung. Verantwortung. Zukunft."
  - "Globale Präsenz. Lokaler Einfluss."
  - "Auf das nächste Level."
en:
  - "Nourishing. Responsible. Future."
  - "Global presence. Local impact."
  - "Next Level. Realized."
```

### Apply intents

```yaml
fascia:        { treatment: printed,  paletteRole: primary,        logoVariant: monoLight, motifRef: { kind: pillCluster } }
backWall:      { treatment: printed,  paletteRole: primary,        logoVariant: monoLight, motifRef: { kind: pillCluster } }
flankWall:     { treatment: printed,  paletteRole: neutralLight,   logoVariant: primary }
counterFront:  { treatment: vinyl,    paletteRole: neutralLight,   logoVariant: primary }   # any counter plan (rectangular or curved)
soffit:        { treatment: skip }                                                          # superseded by the pendantSign treatment below
carpetInsert:  { treatment: vinyl,    paletteRole: primary,        logoVariant: skip }      # green carpet (per second ref); accent disc as alt
ledWall:       { treatment: led,      paletteRole: primary,        logoVariant: primary }
vitrineEtch:   { treatment: skip }
trussFlag:     { treatment: skip }
# Cargill-only Round 7 additions (still optional — multi-provider safe):
archEntry:     { treatment: printed,  paletteRole: primary,        logoVariant: skip,      motifRef: { kind: honeycomb } }  # green hex archway, if template includes one
drumTier:      { treatment: printed,  paletteRole: primary,        logoVariant: skip,      motifRef: { kind: pillCluster } }# stacked drum graphics (most striking when pendant shape = ring)
```

### Preferred pendant shape

```yaml
pendantSign:
  preferredShape: ring        # first Cargill ref photo shows a halo ring at 5.2m outer Ø
  alternates:  [circle, squircle, oval, rectangle]   # ALL valid — multi-provider safe
  outerFaceTreatment: led      # backlit wordmark + leaf icon
  innerFaceTreatment: downlight
  # Ring shape additionally enables a TieredDrum to drop through the centre hole.
```

### Hero 3D strategy (Round 6 + 7)

Cargill is intentionally **abstract — no bespoke 3D hero**. Their brand language is graphic (motifs, ingredient photography, plants in hex pots) rather than object-based. The autobranding hero moves are therefore:

- **Suspended pendant sign** in any shape — Cargill's preferred default is `ring`, but the kit autobrands `rectangle` / `squircle` / `oval` / `circle` equally well. The kit owns the *brand treatment*, not the geometry.
- **Honeycomb hex motif** wall infill (greenhouse aesthetic), often as a curved arch when the template includes one.
- **Hexapot planters** with cocoa-plant-style foliage from `/components/plants/hexapot.glb` + `/components/plants/tree_s2.glb`.
- **Pill-cluster motif** on fabric back walls.
- **Green LED edge** accent on platform / counter foot.

The `/components/brand-hero/cargill/` folder stays empty. Reference deconstruction lives in `/components/stands/cargill_faic_2024_exhibition_stall.glb` + the two supplied photos.

---

## Manual kit builder (for kits the user creates at runtime)

The same `BrandKit` shape, plus a Wizard UI:

1. **Upload logo.** Drag-drop SVG; PNG fallback. System computes safe-area and capHeightFraction.
2. **Detect palette.** Sample dominant colours from the logo SVG fills + uploaded patterns/imagery. Show 8 swatches, user picks five for the named roles.
3. **Choose derivation rule.** Preview the derived palette under each rule and pick.
4. **Pick typography.** Google Fonts picker; upload custom OTF/TTF/WOFF2 as alternative.
5. **Optional motif.** Pick one of the parameterised motifs and tune sliders.
6. **Approved phrases.** Type up to 12 bilingual phrases that can appear on stand.
7. **Save.** Writes a `BrandKit` row + uploads asset bucket entries.

After save, the kit is available alongside the three baked kits in the brand picker.

## What the manual kit does NOT support in v1

- Auto-extract from a PDF brand book (post-pitch).
- Animated logo variants.
- Web-font subsetting (we load the full WOFF2; subset later if needed).
