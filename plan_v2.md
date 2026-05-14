# ET Global Configurator — Plan v2 (post second tightening pass)

> Internal-pitch demo for ET Global leadership. Frankfurt, three weeks from 2026-05-13.
> Git: https://github.com/robblack21/etglobal
>
> Built on plan.md v1 + five rounds of spec Q&A + two tightening passes.
> This doc is the **index and overview**. Domain detail lives in `/specs/`.
> Reference assets live in `/references/`, `/stands/`, `/components/`, `/textures/`,
> `/hdri/`, `/logos/`, `/font/`.

---

## Spec map

| File | Contents |
|---|---|
| [specs/schemas.md](specs/schemas.md) | All Zod types — StandConfig, BrandKit, Template, Wall/Bay/Anchor, BomLine, Invoice, CameraShot, SliderSpec, ProfileAllocation, SceneEnvironment, Intent dispatcher. **Single source of truth.** |
| [specs/templates.md](specs/templates.md) | Three baked templates, each with **S / M / L size-tier presets** (Round 7): `tpl.tdk-fascia-island` (rectangle, LED-led), `tpl.tagheuer-glass-corner` (corner, glass-led), `tpl.cargill-curved-corner` (corner with curved-structural hero — halo ring + tiered drum + squircle counter + honeycomb arch, deconstructed from supplied Cargill references). |
| [specs/bom.md](specs/bom.md) | Price catalogue (synthesised) mapped to real glb assets, markup model, reuse formula, supplier mocks, labour rates, Eurozone invoice + VAT. |
| [specs/ui_spec.md](specs/ui_spec.md) | Typography (Tektur + Geist), neumorphic surface system, sliders, pick-and-place, 2D-edit overlay, camera director, wall-thickness ghost hover, i18n. |
| [specs/brand_kits.md](specs/brand_kits.md) | Three pre-baked kits — TDK (media-led, screens from /components/props/), Tag Heuer (chronograph in vitrines), Cargill (abstract, motif-led, deconstructed from real stand). Plus manual kit-builder. |
| [specs/scene_environment.md](specs/scene_environment.md) | Dual hall environments (gallery-light for presenting, warehouse-dark for designing), HDRI library + per-template defaults, lighting rigs, neighbour silhouettes, mode switch. |

---

## What we are building

A three-week prototype: one polished, deeply customisable trade-fair stand configurator. The demo lands three diverse saved scenes (TDK fascia island 12×8, Tag Heuer glass corner 8×5, Cargill printed L 9×9). Build credibility comes from a real extrusion-and-infill wall system, a live BOM that generates a Eurozone-compliant invoice, and visible sustainability (reuse score + CO₂e saving).

---

## The six guiding decisions (locked across Rounds 1–7)

1. **WebGPU.** three.js WebGPU build + TSL nodes. drei transmission / reflector / pmndrs postprocessing are WebGL2 only — we replicate on TSL.
2. **Parametric == content-aware.** Walls do not stretch; they regenerate around anchor regions (logo stays centred, screens don't jam into corners, doors snap to seams).
3. **Walls are colliders.** No free graphic design — 2D-edit mode snaps to grid and anchor zones only. Walls bound everything.
4. **BOM is the spine.** Live, headline = Total € + Reuse %, generates the Eurozone invoice on demand, in-house items bypass markup.
5. **Tektur is configurator-only.** In-scene typography is always the BrandKit's font. Strict.
6. **Design against CGI boxology.** Structural-hero elements (pendant signs, counters, archways) take a shape enum, not a fixed geometry. Brand kits set *preferred* shapes; users freely swap. No brand owns a shape.

---

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 15 (App Router) + React 19 |
| 3D | three.js **WebGPU** + R3F (WebGPU) + drei (selectively) |
| Shaders | TSL (Three Shading Language) nodes |
| Post / Reflections | Custom TSL SSR + planar render-target floor + BloomNode + TAA + DoFNode |
| Glass | `MeshPhysicalNodeMaterial` (transmission, IOR, thickness, dispersion) — hero vitrines only |
| State | Zustand (config) + Valtio (transient UI) + URL params (shareable) |
| Schema | Zod (UI + Supabase + future agent) |
| Storage | Supabase Postgres + Storage + Auth; signed URLs |
| Asset pipeline | KTX2 + Basis + Meshopt + Draco; HDRI → 2K + PMREM cube at build time |
| i18n | next-intl, DE first + EN toggle |
| UI primitives | Custom Radix + framer-motion + Tektur/Geist |
| Build | pnpm + Turbo, Vercel host |

**WebGPU caveats already factored in:**
- `MeshTransmissionMaterial`, `MeshReflectorMaterial`, pmndrs/postprocessing — all WebGL2 only; we ship TSL equivalents.
- KTX2 / Draco / Meshopt pipelines unchanged.
- Demo target is Chrome on M3 — solid WebGPU support.
- Fallback note: a WebGL2 path with cheaper glass + cubemap reflections is documented but not built unless WebGPU fails on demo day.

---

## Architecture in one picture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        StandConfig (Zod)                            │
│   footprint • layout • walls[] • placements[] • brand overrides     │
└──────────┬─────────────────────────────────────────────┬────────────┘
           │ derive (pure)                               │ persist
           ▼                                             ▼
   ┌──────────────────┐                          ┌──────────────────┐
   │  DerivedStand    │                          │  Supabase        │
   │  • modules       │                          │  projects        │
   │  • BOM lines     │                          │  brand_kits      │
   │  • warnings      │                          │  templates       │
   │  • cameraShots   │                          │  assets (R2/SB)  │
   └────┬─────────┬───┘                          └──────────────────┘
        │         │
        ▼         ▼
   ┌────────┐ ┌────────────┐
   │  R3F   │ │  BOM panel │
   │ scene  │ │  (live)    │
   └────┬───┘ └────────────┘
        │
        ▼
   ┌───────────────────────┐
   │  CameraDirector       │
   │  • bookmarks (6+4)    │
   │  • frame(target)      │
   │  • 2D-edit lock       │
   └───────────────────────┘

UI actions ──► dispatch(intent) ──► reducer(StandConfig, intent) ──► re-derive
                                    (same dispatcher will accept agent JSON later)
```

---

## What the demo does (the click-through)

1. Open in **Warehouse / dark mode** (provider). Default load is `tpl.tdk-fascia-island` with TDK brand kit applied. Camera flies to **Hero ¾**.
2. Hover a wall — extrusion profile (`alpine_42v` post + `aspen_slim` rail + `big_sky_32d` corner) reveals itself in a callout. Sells the "real build" point.
3. Drag the width slider 12 → 14m. Walls re-bay, anchors hold the logo near centre, screens stay > 0.5m from corners, BOM updates live. Reuse % barely moves (extrusion is fully reusable).
4. Switch brand kit: TDK → **Tag Heuer**. Autobrand applies — fascia goes dark, vitrines etch the chronograph kit, motif changes from chevron to lineGrid, palette inverts. Camera flies to **Vitrine close** to show the etched logo through real glass refraction.
5. Change template: `tpl.tdk-fascia-island` → `tpl.tagheuer-glass-corner` (corner footprint, glass-led). System cross-fades.
6. Pick-and-place: drag a `vitrine.glass` from the palette onto the back wall; Vision-Pro shadow grounds it; the chronograph hero glb instances inside.
7. Switch template again to `tpl.cargill-curved-corner`. Palette warms, pill motif fills the back wall, a **suspended pendant sign** appears overhead (default `shape: ring` for Cargill — but the Pendant Shape control in the dock lets the user click through `rectangle → squircle → oval → circle → ring` and watch the silhouette transform in real time). With shape=ring, an optional **tiered drum** drops through the centre hole; with any other shape it auto-hides. The green **honeycomb arch** opens onto the lounge. The BOM panel transparently shows the reuse-score tradeoff (~68% with ring + drum vs ~74% with a rectangular pendant); a "Maximise reuse" toggle would swap to flat fabric and recover ~10 points. This is the demo's "anti-boxology" moment — one control kills the CGI-stack feel.
8. Toggle to **Gallery / light mode** (client view) — hall environment cross-fades, lighting warms, exposure lifts. Camera flies to a cinematic shot.
9. Click "Generate invoice." A bilingual EU-compliant invoice renders in a panel; "Export PDF" produces the document.
10. Click "Save scene." The current state lands as one of the three saved demo scenes (the others are pre-saved fixtures matching the diversity envelope).

---

## Three-week build calendar (Round 5 reality)

### Week 1 — Spec lock + scaffolding (no scene yet)

- Day 1–2: Finalise schemas (`specs/schemas.md`); generate Zod + TS types.
- Day 2–3: Next.js + Supabase scaffold; auth; buckets; project/brand/template tables.
- Day 3–4: i18n wiring; Tektur + Geist load; neumorphic primitives (slider, card, tab, drawer); dark theme.
- Day 4–5: Brand kit pipeline (apply kit → derived palette → surface intents).
- Day 5: Three baked brand kits seeded as fixtures.

### Week 2 — Hero template + glass + live BOM

- Day 6–7: WebGPU renderer; HDRI pipeline; raised platform + hall context (concrete floor + neighbour silhouettes).
- Day 7–8: Extrusion wall system; profile glb loading; **content-aware parametric resize** with anchors (the vital-gold algorithm).
- Day 8–9: Hero template `tpl.tdk-fascia-island` end-to-end (walls, fascia, LED, vitrines, counter, lounge, lighting).
- Day 9–10: Glass via `MeshPhysicalNodeMaterial`; planar floor; TSL SSR baseline.
- Day 10: Camera director (6 shots + 4 pinnable, frame-to-surface).
- Day 10–11: Live BOM derivation + headline metrics; markup; reuse score.

### Week 3 — Second template, autobrand, invoice, polish

- Day 11–12: Second template `tpl.tagheuer-glass-corner` (corner footprint, glass-heavy).
- Day 12–13: Pick-and-place with Vision-Pro shadows; 2D-edit overlay with collider grid.
- Day 13–14: Wall-thickness ghost hover; supplier mocks panel; in-house markup logic.
- Day 14–15: Invoice generator + PDF export (Eurozone VAT logic, DE/EN bilingual).
- Day 15–16: Three saved scenes; shareable URL; PNG screenshot.
- Day 16–17: Perf pass (KTX2, instancing, device tier, SSR step tuning); pitch script run-throughs.
- Day 17–18: Buffer for the third template `tpl.cargill-printed-L` **if time permits**; else mock the third scene from static fixtures.

### Stretch / explicit deferrals

- Third fully-live template (only if Week 3 buffer allows).
- Auto-extract brand kit from PDF.
- WebGL2 fallback path (only ship if WebGPU fails on demo day).
- Supplier portal as a portal (vs the mocked list in scope).

---

## Out-of-scope (locked)

- Free-form mesh editing.
- Drag-to-resize layout panels.
- Mobile / tablet breakpoint.
- CRM / job-progress portal.
- Saved client accounts with email flows.
- Real supplier authentication.

---

## Open follow-ups (after this pass)

1. **Source real brand assets.** Fetch logo SVGs + exact palette hex + font names from the URLs in `reference_brand_links` memory. Substitute Google Fonts where licensing prevents real-font use. Drop fetched assets into `/brand/{tdk,tagheuer,cargill}/`.
2. **Inspect connector glbs in three.js editor.** Confirm the section/dimensions of each profile match the role allocation in [specs/schemas.md](specs/schemas.md). Tweak if reality differs.
3. **Cargill stand deconstruction.** Open `/components/stands/cargill_faic_2024_exhibition_stall.glb` and pull layout / proportion / branded-element placement notes into a `_design_notes/cargill_deconstruction.md` so the Template 3 implementation is faithful.
4. **Decide on neighbour silhouettes asset path.** Procedural blockout vs purchased Sketchfab low-poly booths. Current plan: procedural.
5. **Real Frankfurt rates.** Replace synthesised numbers in [specs/bom.md](specs/bom.md) with whatever real ET Global numbers Rob can pull from past projects.

**Done since the first tightening pass:**
- ✅ Git repo published.
- ✅ Connector profile allocations locked.
- ✅ Hero 3D assets resolved (chronograph for Tag Heuer; screens-from-props strategy for TDK; abstract / motif-led for Cargill with curved-structural hero).
- ✅ Hall environment decided (dual: gallery-light viewing + warehouse-dark designing).
- ✅ Templates 2 and 3 fleshed to TDK depth.
- ✅ **Round 7:** S/M/L stand-size tiers baked per shape; curved-geometry primitives added as first-class; honeycomb + arch motifs added to Cargill kit.
- ✅ **Anti-boxology refactor:** Pendant signs generalised to a shape-agnostic module (`PendantSign` with shape enum `rectangle | squircle | oval | circle | ring`). Brand kits declare *preferred* shape; users swap freely. TDK's fascia formalised as `pendant.rectangle`. Cargill's halo is `pendant.ring` by default. No brand owns a structural shape — multi-provider safe.

---

## Process — how we got here

Five rounds of structured Q&A from 2026-05-13. Each round's decisions are recorded in memory under `/Users/robblack/.claude/projects/-Users-robblack-etglobal/memory/`:

- [Round 1](../../.claude/projects/-Users-robblack-etglobal/memory/project_round1_decisions.md) — scope, audience, stack (WebGPU + Supabase, internal leadership pitch, M3 Chrome, EUR/DE, 33% markup, pick-and-place + Vision-Pro shadows).
- [Round 2](../../.claude/projects/-Users-robblack-etglobal/memory/project_round2_decisions.md) — templates & geometry (rectangle/corner/L, 1m+0.5m grid, parametric resize is "the vital gold"; extrusion components dropped in /components/connectors).
- [Round 3](../../.claude/projects/-Users-robblack-etglobal/memory/project_round3_decisions.md) — wall system & content-aware resize (anchor regions, 90° corners, wall-thickness ghost hover, Tektur + neumorphic UI).
- [Round 4](../../.claude/projects/-Users-robblack-etglobal/memory/project_round4_decisions.md) — brand kit & autobranding (SVG mandatory, derived palettes, walls are colliders, motif library, Tektur chrome-only).
- [Round 5](../../.claude/projects/-Users-robblack-etglobal/memory/project_round5_decisions.md) — BOM, suppliers, labour, perf, save/share, scope reality (hybrid pricing, kg-weighted CO₂e, EU invoice, DE rates, 2 templates baseline + 3rd stretch).
