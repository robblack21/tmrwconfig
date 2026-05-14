# BOM, pricing, invoice & supplier mocks

The BOM is the operational spine of the demo (Round 1 + Round 7 addendum). It is always visible, always live, and produces a Eurozone-compliant invoice on demand.

## Price source policy (Round 5 lock)

**Hybrid.** Numbers in this doc are *synthesised* indicative Frankfurt-2026 ranges, footnoted with assumptions. They will be overwritten with real ET Global numbers as Rob supplies them. The system is designed so swapping the price catalogue does not require re-deployment — it is a JSON fixture loaded at build time.

Every BOM line carries an `assumption` string in provider mode (e.g. "Indicative — SEG fabric per Modulares Display Frankfurt rate card 2025") and a `confidence: 1..5` field. Hovering the line in provider mode shows the assumption.

## Margin / markup model

```ts
MarginPolicy {
  defaultPct: 0.33,
  perCategory: {
    structure: 0.30,
    graphics:  0.40,
    glass:     0.35,
    lighting:  0.35,
    av:        0.40,
    furniture: 0.30,
    labour:    0.15,      // labour traditionally low-margin
    services:  0.10,      // mostly pass-through to subs
    logistics: 0.15
  },
  applyToInHouse: false   // in-house lines bypass markup (Round 5)
}
```

Source code never stores the marked-up "sell" number — it derives it. The UI shows whichever side is appropriate for the active Role:

- **Client view** — sell range only.
- **Provider view** — cost + sell columns side by side, with margin %, with assumption tooltip.

## BOM categories vs invoice groups

The BOM has fine-grained `BomCategory` for internal reporting. The invoice consolidates into a smaller set of `BomGroup` that maps to standard German trade-fair invoice conventions (anchored by Rob's example).

| BomCategory | rolls up to BomGroup |
|---|---|
| structure | stand.construction |
| glass | stand.construction (or graphics if etched logo) |
| lighting | stand.construction |
| graphics | graphics |
| av | av |
| furniture | furniture.rental |
| labour (install + electrical + AV + graphics) | install.dismantle.labour |
| services (wifi, power, water, cleaning) | services.utilities |
| services (rigging) | rigging |
| logistics | logistics |

## Indicative price catalogue (synthesised)

All EUR, cost (pre-margin), assumptions footnoted.

### Structure — extrusion & connectors (Round 6 lock, mapped to glb assets)

Default profile allocation (see [schemas.md](schemas.md) `ProfileAllocation`):

| Role | glb asset | Unit | Low | High | Reuse | Mass kg | CO₂e kg |
|---|---|---|---|---|---|---|---|
| `post.vertical` | `profile_alpine_42v_extrusion.glb` | each (3m) | 95 | 130 | yes | 5.4 | 12 |
| `post.heavy` | `profile_vail_120db_extrusion.glb` | each (3m) | 175 | 235 | yes | 11.0 | 24 |
| `rail.top` (rotated) | `profile_aspen_slim_extrusion.glb` | linear m | 32 | 48 | yes | 1.8 | 4.0 |
| `rail.bottom` (rotated) | `profile_aspen_slim_extrusion.glb` | linear m | 32 | 48 | yes | 1.8 | 4.0 |
| `rail.heavy` (wide spans) | `profile_big_sky_ic_extrusion.glb` | linear m | 48 | 72 | yes | 3.2 | 7.2 |
| `corner.90` | `profile_big_sky_32d_extrusion.glb` | each | 38 | 56 | yes | 0.8 | 1.8 |
| `connector.inline` | `profile_vail_40c_extrusion.glb` | each | 18 | 28 | yes | 0.4 | 0.9 |
| `endcap` | `profile_big_sky_cg_extrusion.glb` | each | 14 | 22 | yes | 0.25 | 0.5 |
| (double-sided wall variant) | `profile_vail_40d_extrusion.glb` | each (3m) | 110 | 155 | yes | 6.4 | 14 |
| (legacy horizontal) | `profile_alpine_42h_extrusion.glb` | linear m | 35 | 50 | yes | 1.9 | 4.2 |

### Platform

| Item | Unit | Low | High | Reuse | Mass kg | CO₂e kg |
|---|---|---|---|---|---|---|
| Raised platform module 1×1m, 100mm | each | 95 | 135 | yes | 22 | 35 |
| Raised platform module 1×0.5m, 100mm | each | 55 | 80 | yes | 12 | 19 |
| Ramp edge 1m | each | 75 | 110 | yes | 14 | 22 |

### Suspended pendant signs (Round 7 — shape-agnostic, anti-boxology)

Pendant sign is the single highest-impact element for avoiding the "CGI box" look. Same module, varied shape. All include perimeter LED edge + driver. Sizes given are for the dominant template band (~4–6m bounding box).

| Shape | Unit | Low | High | Reuse | Mass kg | CO₂e kg | Build complexity |
|---|---|---|---|---|---|---|---|
| `rectangle` (flat fascia box, 4×3m bbox) | each | 2,400 | 3,800 | yes | 64 | 140 | simple — extrusion + fabric |
| `squircle` (rounded-rect, r=0.6m) | each | 3,400 | 5,200 | partial (70%) | 78 | 175 | medium — CNC corners |
| `oval` (4×2.4m bbox) | each | 3,800 | 5,800 | partial (60%) | 86 | 195 | medium — bent extrusion |
| `circle` (solid disc, Ø 4m) | each | 3,600 | 5,400 | partial (60%) | 82 | 185 | medium — bent extrusion |
| `ring` (donut, Ø 5.2m outer / Ø 3.6m inner) | each | 4,200 | 6,800 | partial (50%) | 110 | 280 | complex — twin bent extrusions + spider mount |
| LED driver / controller (any shape) | each | 240 | 360 | yes | 1.8 | 4 |

### Other curved / custom structural (Round 7 lock)

CNC-cut + spray-painted + assembled; lower reuse than extrusion-and-fabric.

| Item | Unit | Low | High | Reuse | Mass kg | CO₂e kg |
|---|---|---|---|---|---|---|
| Tiered drum (3 levels, Ø 3 → 1.8m, backlit fabric — drops through ring pendant) | each | 3,400 | 5,400 | partial (50%) | 84 | 220 |
| Squircle counter (custom CNC, w 3m, painted MDF + solid surface top) | each | 1,800 | 2,800 | partial (60%) | 95 | 180 |
| Curved arc counter (Ø 2.5m, 180°) | each | 1,400 | 2,200 | partial (60%) | 72 | 140 |
| Rectangular counter (laminate, w 3m) — see Furniture row above | each | — | — | yes | — | — |
| Curved arch frame, freestanding (2.5m span, 3m peak, squircle) | each | 880 | 1,400 | yes (frame); partial (panel) | 38 | 84 |
| Honeycomb hex panel (custom, m²) | m² | 220 | 340 | yes | 6.4 | 16 |
| LED edge accent strip (custom, linear m) | linear m | 38 | 58 | yes (rental) | 0.15 | 0.4 |

### Decotruss

| Item | Unit | Low | High | Reuse | Mass kg | CO₂e kg |
|---|---|---|---|---|---|---|
| 290mm box truss, 1m | linear m | 95 | 140 | yes | 6.8 | 15 |
| 290mm corner junction | each | 110 | 165 | yes | 4.4 | 10 |
| 290mm vertical leg, 4m | each | 380 | 540 | yes | 28 | 62 |
| Rigging point (hall-rigged mode) | point | 180 | 260 | yes (service) | 0 | 0 |

### Graphics

| Item | Unit | Low | High | Reuse | Mass kg | CO₂e kg |
|---|---|---|---|---|---|---|
| SEG fabric print (PES, dye-sub) | m² | 32 | 48 | partial (reprint) | 0.25 | 1.8 |
| Rigid laminate print 18mm | m² | 78 | 115 | yes | 12 | 22 |
| Vinyl applied graphics | m² | 22 | 38 | no | 0.15 | 1.2 |
| Etched glass logo | each | 65 | 120 | yes (glass) | 0 | 0.4 |
| Carpet insert print (shape) | m² | 28 | 42 | partial | 0.6 | 3.4 |

### Glass

| Item | Unit | Low | High | Reuse | Mass kg | CO₂e kg |
|---|---|---|---|---|---|---|
| Tempered clear glass 6mm | m² | 85 | 125 | yes | 15 | 8 |
| Tempered satin/frit glass 6mm | m² | 110 | 165 | yes | 15 | 9 |
| Display vitrine (1×0.5×1.2 + light) | each | 580 | 820 | yes | 38 | 64 |
| Glass meeting door (hinged) | each | 720 | 980 | yes | 32 | 52 |

### Lighting

| Item | Unit | Low | High | Reuse | Mass kg | CO₂e kg |
|---|---|---|---|---|---|---|
| LED track spotlight 25W | each | 48 | 78 | yes | 0.4 | 2 |
| Hanging blade luminaire (truss-mounted) | each | 195 | 285 | yes | 1.8 | 6 |
| Vitrine internal LED strip | linear m | 22 | 35 | yes | 0.1 | 0.6 |
| Recessed downlight (in soffit) | each | 38 | 58 | yes | 0.3 | 1.2 |

### AV

| Item | Unit | Low | High | Reuse | Mass kg | CO₂e kg |
|---|---|---|---|---|---|---|
| 55" 4K display (rental, 4 days) | each | 320 | 460 | rental | 0 | 0 |
| Ultrawide portrait kiosk (rental) | each | 480 | 680 | rental | 0 | 0 |
| LED wall tile 0.5×0.5m, 2.5mm pitch (rental) | tile | 220 | 320 | rental | 0 | 0 |
| Audio package (4×spk + mixer) | lot | 480 | 720 | rental | 0 | 0 |

### Furniture

| Item | Unit | Low | High | Reuse | Mass kg | CO₂e kg |
|---|---|---|---|---|---|---|
| Reception counter (laminate, 2m) | each | 380 | 540 | yes | 38 | 62 |
| Bar counter (3m) | each | 480 | 680 | yes | 52 | 88 |
| Lounge chair | each | 95 | 140 | rental | 8 | n/a |
| Low table | each | 65 | 95 | rental | 5 | n/a |
| Meeting table 4-seater | each | 180 | 260 | rental | 22 | n/a |
| Plant (silk) | each | 35 | 55 | yes | 4 | n/a |

### Labour (DE-realistic, Round 5 lock)

| Role | Day rate | Notes |
|---|---|---|
| Fitter | 520 | standard |
| Electrician (certified) | 720 | required for any 230V install |
| AV technician | 780 | LED walls require AV tech onsite |
| Graphics installer | 480 | SEG tensioning specialist |
| Site supervisor | 880 | mandatory > €25k builds |
| Dismantle (fitter, half-rate) | 420 | post-show |

### Services (Frankfurt fair indicative)

| Item | Unit | Low | High | Source | In-house? |
|---|---|---|---|---|---|
| Wifi basic (5 users, 50 Mbps) | day | 95 | 140 | Messe | sub |
| Wifi event (50 users, 250 Mbps) | day | 380 | 540 | Messe | sub |
| Wifi production (500 users, 1 Gbps + dedicated) | day | 980 | 1,400 | Messe | sub |
| Power hookup 16A | day | 110 | 160 | Messe | sub |
| Power hookup 32A | day | 220 | 320 | Messe | sub |
| Power hookup 63A | day | 460 | 680 | Messe | sub |
| Water + waste | day | 140 | 220 | Messe | sub |
| Cleaning (daily) | day | 95 | 145 | ET Global | **in-house** |
| Storage crate (per crate per day) | day | 12 | 22 | ET Global | **in-house** |
| Forklift slot | slot | 180 | 280 | Messe | sub |
| Rigging point (hall) | point | 180 | 260 | Messe | sub |
| Overnight security | night | 240 | 360 | ET Global | **in-house** |

### Logistics

| Item | Unit | Low | High | Notes |
|---|---|---|---|---|
| 7.5t truck (short haul, < 200km) | each | 380 | 540 | ET Global in-house fleet |
| 7.5t truck (long haul) | each | 880 | 1,280 | |
| Crate (large, returnable) | each | 45 | 65 | per round trip |
| Crate (small, returnable) | each | 22 | 35 | per round trip |

---

## Reuse score (Round 5 lock — material-honest)

```
reuseScore = Σ(massKg × reuseEligible) / Σ(massKg)
```

- Rentals (AV, some furniture) count as reused with a 0.8 weighting (they're pooled but eventually scrapped).
- One-shot prints (vinyl) count 0.
- SEG fabric counts as 0.5 (the extrusion frame is fully reused; fabric is often reprinted but the substrate is recycled).

**CO₂e versus full-new baseline.**

```
baselineCO2 = Σ(massKg × co2FactorKgPerKg)        // if everything were built new
realCO2     = Σ(massKg × co2FactorKgPerKg × (reuseEligible ? 0.10 : 1.0))
saving      = (baselineCO2 - realCO2) / baselineCO2
```

The `co2FactorKgPerKg` defaults sit in a separate table (`co2Factors.json`), grouped by material family: aluminium (8.3), MDF (1.4), steel (1.9), glass (0.85), PVC fabric (3.1), polyester carpet (3.6). Sourced from public EPD averages.

---

## Supplier mock list (provider-side panel, Round 5 lock)

The provider sees a `Suppliers` panel — not a portal, a static list — with rates per category. Each row marks **in-house** vs **subcontracted**.

```
Wifi
  ⌑ Messe Frankfurt — Basic / Event / Production tiers   [sub]
Power hookup
  ⌑ Messe Frankfurt — 16A / 32A / 63A bands              [sub]
Water + waste
  ⌑ Messe Frankfurt                                       [sub]
Cleaning
  ⌑ ET Global Cleaning Crew (Frankfurt)                  [in-house]
Storage / crates
  ⌑ ET Global Warehouse Frankfurt-Ost                    [in-house]
Forklift slots
  ⌑ Messe Frankfurt logistics                             [sub]
Rigging points
  ⌑ Messe Frankfurt rigging desk                          [sub]
Security (overnight)
  ⌑ ET Global Onsite Security                            [in-house]
AV rental
  ⌑ ET Global AV pool (in-house)                         [in-house]
  ⌑ Megavision Rental Frankfurt (overflow)                [sub]
Graphics print
  ⌑ ET Global Print Studio                               [in-house]
Truck haulage
  ⌑ ET Global fleet                                       [in-house]
```

Each supplier is clickable to a panel that lists the rate card matching the price catalogue above. Provider can override any rate on a per-project basis.

---

## Eurozone invoice (Round 5 lock)

Produced from the BOM by `bomToInvoice(bom, project, parties)`. Layout matches Rob's example exactly:

```
[Provider header — ET Global, address, VAT DE…]
INVOICE
Invoice Number: EXP-2026-001
Date: 13 May 2026
Customer ID: CUST-987

Bill To:
[Client name + address + VAT]

Project: [Exhibition name] — Booth [number]
Description: Custom Stand Design & Build — Nm² Island Stand

╔════════════════════════════════════╤═════╤═══════════╤═══════════╗
║ Description                        │ Qty │ Unit (EUR)│ Amount EUR║
╠════════════════════════════════════╪═════╪═══════════╪═══════════╣
║ Custom Stand Construction          │  1  │  22,000   │  22,000   ║
║ Graphics Printing & Application    │  1  │   3,500   │   3,500   ║
║ Furniture Rental Package           │  1  │   1,200   │   1,200   ║
║ AV Equipment                       │  1  │     800   │     800   ║
║ Stand Cleaning Services            │  1  │     300   │     300   ║
║ Installation & Dismantling Labour  │  1  │   1,500   │   1,500   ║
╠════════════════════════════════════╧═════╧═══════════╪═══════════╣
║ Subtotal                                              │  29,300   ║
║ VAT (0% — Reverse Charge / International)             │       0   ║
║ Total Amount Due                                      │  29,300   ║
╚═══════════════════════════════════════════════════════╧═══════════╝

Payment Terms & Banking Information
Due Date: 1 June 2026
Payment Method: Bank Transfer (IBAN)
Bank Name: [Bank]
IBAN: DE99 8888 7777 6666 5555 44
BIC/SWIFT: [BIC]
Reference: EXP-2026-001
```

### VAT logic

| Client country | Has VAT ID? | Treatment | Rate |
|---|---|---|---|
| DE | any | DE_19 | 19% |
| EU (non-DE) | yes | EU_REVERSE_CHARGE | 0%, "Reverse charge applies — recipient liable for VAT" |
| EU (non-DE) | no | DE_19 | 19% |
| Non-EU | any | NON_EU_ZERO | 0%, "Export — VAT exempt" |

PDF export uses the same data; layout is reproduced via React-PDF or a server-side Puppeteer render. Bilingual: header row toggles DE / EN; line item descriptions stored bilingually (`{ de, en }`).

---

## Headline metrics shown to leadership (Round 5 lock)

Always-on, top of the BOM panel:

- **Total (EUR sell range)** — biggest, brightest, Tektur 600.
- **Reuse score %** — second-biggest, neumorphic ring chart, Tektur 500.

Everything else (labour days, lead-time band, print m², decotruss linear-m) is collapsed under a "Operational detail" disclosure expand.
