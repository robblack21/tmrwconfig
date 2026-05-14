# UI / Visual / Interaction Spec

Goal: the configurator should feel like a tool a designer wants to keep using. Tactile, calm, premium, with one or two moments of disclosure that make the underlying system feel real.

Decisions are locked across Rounds 3–5. This doc collects them in one place and adds the implementation detail.

## Voice — Tektur first

- **Display / numerics / brand-side configurator text:** Tektur (`/font/Tektur/Tektur-VariableFont_wdth,wght.ttf`, variable wdth 75–125, wght 400–900).
- **UI body / labels:** Geist Sans, fallback IBM Plex Sans.
- **Mono / SKU codes / dimensions where tabular:** Geist Mono, fallback JetBrains Mono.
- **In-scene typography:** **never** Tektur — always the active BrandKit's display/body face. This is the strict rule from Round 4.

Variable-axis policy for Tektur:

| Role | wght | wdth | Tracking |
|---|---|---|---|
| Hero numeric (BOM total) | 600 | 100 | -1% |
| Section header | 600 | 100 | 0 |
| Slider label | 500 | 87 | 1% |
| Compact numeric chip | 600 | 75 | 0 |
| In-app sublabel | 400 | 100 | 2% |

## Surface system — slightly neumorphic, modern

Inspired by Linear + visionOS, not 2020 neumorphism.

### Lighting model

- **Top-left highlight.** Cool, 8% lift, 4px offset, 8px blur.
- **Bottom-right shadow.** Warm, 6% drop, 4px offset, 10px blur.
- Together they give "pillow depth" — objects look slightly raised or recessed without sharp lines.

### Surface roles & tokens

```css
:root[data-theme="dark"] {
  --bg:           #161821;
  --surface:      #1c1e28;
  --surface-sub:  #11131a;      /* inset/recessed */
  --surface-hi:   #232634;      /* raised hover */
  --text:         #e4e6ec;
  --text-soft:    #8d93a2;
  --border-soft:  rgba(255,255,255,0.04);
  --hi-light:     rgba(255,255,255,0.05);   /* tl highlight */
  --hi-shadow:    rgba(0,0,0,0.45);         /* br shadow */
  --accent:       /* driven by active BrandKit in client mode, ET-Global orange in provider mode */;
  --glass-bg:     rgba(28,30,40,0.55);
  --glass-blur:   blur(20px) saturate(140%);
}
:root[data-theme="light"] {
  --bg:           #e8eaee;
  --surface:      #f1f3f7;
  --surface-sub:  #dde0e6;
  --surface-hi:   #ffffff;
  --text:         #1a1c22;
  --text-soft:    #5a6070;
  --border-soft:  rgba(0,0,0,0.04);
  --hi-light:     rgba(255,255,255,0.7);
  --hi-shadow:    rgba(0,0,0,0.10);
  --glass-bg:     rgba(241,243,247,0.55);
}
```

### Container patterns

```css
.raised {
  background: var(--surface);
  box-shadow:
    -4px -4px 8px var(--hi-light),
     4px  4px 10px var(--hi-shadow);
  border-radius: 24px;
}
.inset {
  background: var(--surface-sub);
  box-shadow:
    inset  4px  4px 8px var(--hi-shadow),
    inset -3px -3px 6px var(--hi-light);
  border-radius: 12px;
}
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--border-soft);
  border-radius: 24px;
}
```

### Corner radii (3 tiers only)

- **6px** — tags, chips, numeric pills.
- **12px** — buttons, sliders, inputs, tabs.
- **24px** — cards, panels, drawers.

### Motion

All depth/selection/value transitions use a framer-motion spring `{ stiffness: 320, damping: 28 }`. Page-level routing uses `{ stiffness: 240, damping: 32 }` (slightly slower).

### Theme default

**Dark** — the 3D scene reads better with a dark chrome and the demo runs in a meeting room. Light is supported as a setting.

## Layout — three zones

```
┌──────────────────────────────────────────────────────────────────┐
│ TopBar:  project name · role switch · DE/EN · share · screenshot │
├──────────────────────────────────────────────────────────────────┤
│                                              ┌─────────────────┐ │
│                                              │ BOM PANEL       │ │
│                                              │ (always live)   │ │
│       3D SCENE                               │                 │ │
│       (full-bleed)                           │ Total €60–82k   │ │
│                                              │ Reuse 71%       │ │
│                                              │ ────────────── │ │
│                                              │ ▸ Structure     │ │
│                                              │ ▸ Decotruss     │ │
│                                              │ ▸ Graphics      │ │
│                                              │ …               │ │
│                                              │                 │ │
│ ┌────────────────────────────────────────┐   │                 │ │
│ │ CONTROLS DOCK (collapsible)           │   │                 │ │
│ │ Footprint  Walls  Brand  Place  Camera│   │                 │ │
│ └────────────────────────────────────────┘   │                 │ │
└──────────────────────────────────────────────┴─────────────────┘
```

- **TopBar** — 56px high, glass treatment, never scrolls.
- **3D Scene** — fills behind everything; UI overlays float in glass containers.
- **Controls Dock** — bottom-left, collapsible by tab, raised neumorphic.
- **BOM Panel** — right-edge full-height, raised neumorphic, sticky.

## Slider primitive

Aesthetic, performant, customisable bounds (Round 1 addendum #6, Round 3 lock).

### Visual

- Track: inset (recessed) bar, height 6px, radius 6px, low-contrast.
- Filled portion: accent gradient + 2px inner highlight.
- Thumb: raised disc, 22px diameter, radius 11px, dual-shadow neumorph, contains a small Tektur 600 numeric chip showing the current value.
- Tick marks: 1px tall, 0.5 alpha, only at snap points where `step > 0.25 × range`.
- Range bracket: small Tektur 400 wdth 87 labels at min/max.

### Behaviour

- Click & drag thumb → smooth value change, respect `step`.
- Click track → snap thumb toward click (animated).
- Keyboard `←/→` → ±step. Shift = ×10 (fine mode).
- Scroll over thumb → ±step.
- Hover → thumb lifts +1px, halo glow.
- Drag → cursor disappears, full-screen value chip appears at top-centre.
- Out-of-bounds attempt → thumb springs back; toast in red explains constraint.

### Provider-locking

Provider mode shows two extra handles on the track ends: drag to set client-allowed `[min, max]` within `[hardMin, hardMax]`. A lock icon flips `bounds.providerLocked`.

## Pick-and-place interaction (Round 1 lock)

- **Palette** — a drawer of allowed modules for the current template. Tap a module → drag a ghost mesh into the 3D scene.
- **Slot highlighting** — valid drop targets glow accent-coloured; invalid slots are dim red.
- **Snap** — to FloorSlot grid (1m primary), to WallSlot anchor points, to TrussSlot positions.
- **Move existing object** — click → drag handle appears → drag to a new valid slot. Rotation: `R` + drag to rotate by 90° snaps; hold shift for free.
- **Vision-Pro shadows** — while dragging, the object floats ~3cm above its destination with a soft contact shadow; on release it "drops" with a small spring (60ms).
- **Reject animation** — invalid drop springs back to origin with a damped wobble.

## Camera director — UI for shots

The CameraDirector exposes:

- **Shot strip** — 6 fixed template shots as thumbnails (tiny baked renders) along the bottom. Click → fly to. Active shot highlighted in accent.
- **Pin shot** — at any custom camera position the user can hit "+" to pin (up to 4). Pinned shots appear after the 6 fixed ones.
- **Frame target** — clicking an object's "edit surface" button initiates a `framed` shot to that surface; the 2D-edit overlay engages once the camera arrives.
- **Cinematic toggle** — disables OrbitControls and locks to shot-strip-only navigation. Used during pitch.

## 2D-edit overlay (Round 4 lock)

When the camera flies head-on to a brandable surface:

- A SVG overlay snaps to the surface's projected rect on screen (recomputed per frame).
- Anchors render as draggable handles within the surface's `bayIndex` grid.
- **Walls are colliders.** Logos and screens cannot leave the wall projection; drag attempts past the safe-area margin stop at the margin.
- **Grid magnet.** Snap to: anchor positions, panel seams, `panelW/8` grid, other element edges (within 8px).
- **No free text.** Headline picker is a dropdown of `brandKit.phrases`.
- Editing affects `StandConfig.brandOverrides[]`; exit returns camera to previous shot.

## Wall-thickness ghost hover (Round 3 lock)

On hover/inspect of a wall (in default — not edit — mode):

1. The wall fades its infill to 30% opacity for 150ms.
2. A subtle wireframe of the extrusion profile + horizontal rails appears.
3. A neumorph callout at the top-right of the wall shows the profile name + cross-section axonometric (a tiny 2D SVG).
4. Mouse-out reverses the sequence over 200ms.

This is the "this is a real build, not a CGI panel" disclosure moment.

## Localisation (Round 1 lock)

- next-intl, JSON message catalogues per locale.
- All strings keyed from day one; dev defaults to EN.
- DE is canonical at demo time.
- Toggle in TopBar; persists per user via Supabase profile.
- Bilingual fields in data (`{ de, en }`) for template/brand/surface names and BOM line descriptions.
- Numerals: format with `Intl.NumberFormat('de-DE')` in DE mode; EUR sign always trailing in DE, leading in EN.

## Accessibility (within reason for v1)

- All interactive elements keyboard-reachable in left-to-right reading order.
- Slider thumbs `role="slider"` with valuemin/valuemax/valuenow.
- Color contrast min 4.5:1 for body text, 3:1 for chrome of UI elements.
- Reduced-motion media query disables springs (instant transitions).

## What we will NOT build in v1 (UI side)

- No drag-to-reposition panels (layout is fixed).
- No keybinding customisation.
- No theme editor for the chrome (the only variable accent is from the active BrandKit).
- No mobile / tablet breakpoint — demo is desktop Chrome on M3 only.
