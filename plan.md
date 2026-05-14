Yes. I’d scaffold it as a **credible configurator prototype**, not a full procurement platform. The strongest version is: “Here is how ET GLOBAL’s modular event design logic could become an intuitive client-facing planning tool.”

ET GLOBAL already gives you useful anchors: they publicly talk about **3D design/rendering**, **project management**, **logistics/warehousing**, **global scaling**, and turnkey execution as part of their exhibition construction offer. They also emphasise **modular systems, 80% material reuse, sustainability, and scalable brand spaces**. That is perfect framing for a configurator that is less “toy 3D editor” and more “early-stage design-to-cost planning interface.” ([ET Global](https://www.etglobal.com/services/exhibition-stand-construction "Exhibition Stands with Strong Brand Impact | ET GLOBAL"))

## The core idea

Build the demo around **three layers**:

1.  **Visual configurator**  
    The client drags sliders, picks finishes, resizes zones, swaps wall systems, chooses media walls, furniture, counters, ceiling elements, lighting mood, etc.
    
2.  **Rules engine**  
    The system quietly prevents physically stupid things: impossible spans, blocked access, floating structures, over-wide printed panels, unusable booth circulation, doors intersecting counters, etc.
    
3.  **Bill of materials / estimate layer**  
    Every visible choice maps to a simplified BOM: panels, profiles, print surfaces, flooring, lighting, AV, furniture, logistics, labour bands, reuse score.
    

That gives you the “interactive picture” feel while proving there is a grown-up operational model underneath.

## Don’t start with Three.js. Start with the product grammar.

Before modelling anything, define a small **event-space grammar**. For example:

```txt
Stand
 ├── Floor zone
 ├── Back wall
 ├── Side wall left
 ├── Side wall right
 ├── Header / fascia
 ├── Storage room
 ├── Reception counter
 ├── Media wall
 ├── Product plinths
 ├── Meeting area
 ├── Lighting rig / mood
 └── Branding / print surfaces

```

Then define which objects are:

```txt
Resizable
Swappable
Repeatable
Brandable
Costed
Constraint-bound
Provider-only
Client-editable

```

That is the foundation. Without this, sliders will produce nonsense very quickly. Nonsense, but with bloom.

## Pick one ET GLOBAL reference and turn it into a system

From their portfolio, I’d avoid trying to represent “all exhibitions.” Too broad. Pick one of their public project archetypes as your base: for example, a **medium or large trade fair stand**, because ET GLOBAL’s project page already categorises work by type, region, size, and industry, including exhibition sizes from **S <100m²** up to **XL >1000m²**. ([ET Global](https://www.etglobal.com/projects "Our Projects – Brand Spaces That Inspire | ET GLOBAL"))

Use that as the demo story:

> “Start from an ET GLOBAL-style modular exhibition concept. Resize the footprint, choose the configuration, customise brand surfaces, and see cost/material implications update live.”

This is much more believable than “build anything from scratch.”

## The right prototype scope

I would make **one beautiful, constrained configurator**, not a general-purpose editor.

Suggested demo configurations:

### Mode 1: Client view

The client can adjust:

```txt
Footprint: 6x4m, 8x6m, 10x8m, custom within grid
Wall height: 2.5m, 3m, 4m
Layout preset: open, semi-open, corner, island
Brand colour palette
Print package: basic / standard / premium
Media package: none / screen / LED wall
Meeting package: none / lounge / enclosed room
Storage: none / small / medium
Lighting mood: neutral / warm / dramatic

```

They see:

```txt
Estimated cost range
Material reuse score
Print area in m²
Logistics complexity
Build time band
BOM summary

```

### Mode 2: Provider view

The provider can edit:

```txt
Module dimensions
Panel types
Print material
Unit cost assumptions
Labour multipliers
Supplier placeholders
Constraint limits
Approval status

```

This makes the “client/provider access” idea tangible without pretending you’ve built a supplier network.

## The key is constraint-first interaction

Your concern about resizing violating geometry is exactly the right concern. The fix is: **do not let the user directly mutate arbitrary mesh geometry**.

Instead, make sliders control **semantic parameters**, then regenerate the layout from rules.

Bad:

```txt
Scale wall mesh on X

```

Better:

```txt
Set bay_count = 4
Wall length = bay_count × module_width
Rebuild wall from four valid panel modules
Update BOM with four panels

```

The geometry should always be derived from valid modules.

## Use a grid and module system

For exhibition stands, I’d use a grid like:

```txt
Base grid: 0.5m or 1m
Primary module: 1m wall bay
Panel widths: 1m / 1.5m / 2m
Wall heights: 2.5m / 3m / 4m
Print sheet max: e.g. 1.2m or 1.5m wide segments
Minimum walkway: 1.2m
Counter clearance: 0.9m
Meeting area minimum: 2.5m x 2.5m
Storage minimum: 1.5m x 1.5m

```

The exact values can be placeholder assumptions, but label them as **configurable provider rules**. That makes the prototype honest.

The visual magic comes from pretending the client is “free,” while actually giving them safe rails.

## Recommended data model

Something like this:

```ts
type StandConfig = {
  footprint: {
    widthM: number
    depthM: number
    gridSizeM: number
  }

  layout: {
    type: "open" | "corner" | "island" | "semi-enclosed"
    wallHeightM: 2.5 | 3 | 4
    storage: "none" | "small" | "medium"
    meeting: "none" | "lounge" | "enclosed"
    media: "none" | "screen" | "led-wall"
  }

  brand: {
    primaryColor: string
    secondaryColor: string
    logoUrl?: string
    printQuality: "basic" | "standard" | "premium"
  }

  providerRules: {
    moduleWidthM: number
    minWalkwayM: number
    maxUnsupportedSpanM: number
    allowedWallHeightsM: number[]
  }
}

```

Then derive:

```ts
type DerivedStand = {
  modules: ModuleInstance[]
  bom: BomLine[]
  warnings: ConstraintWarning[]
  estimate: CostEstimate
}

```

That separation is important. The user edits `StandConfig`; your system computes `DerivedStand`.

## BOM model

Keep it deliberately simple but believable:

```ts
type BomLine = {
  category: "structure" | "print" | "flooring" | "lighting" | "av" | "furniture" | "labour" | "logistics"
  item: string
  quantity: number
  unit: "each" | "m²" | "linear m" | "day" | "lot"
  unitCostLow: number
  unitCostHigh: number
  reuseEligible: boolean
}

```

Example lines:

```txt
Modular wall bay, 3m height — 12 each
Printed fabric graphic panels — 36 m²
Raised flooring — 48 m²
Reception counter — 1 each
55" display — 2 each
Track lighting package — 1 lot
Installation labour — 2 days
Transport / handling — 1 lot

```

Then show:

```txt
Estimated range: €42k–€58k
Print area: 36m²
Reusable structure: 72%
Custom print: 28%
Complexity: Medium

```

The numbers can be mocked, but they should be produced from transparent assumptions.

## “Interactive picture” without overbuilding

You probably do **not** need full drag-and-drop for the first version. I’d do:

```txt
Left: 3D view
Right: sliders and dropdowns
Bottom/right drawer: BOM and warnings
Top: Client / Provider toggle

```

Interaction types:

```txt
Click object → inspect/edit
Slider → resize valid parameter
Dropdown → swap module/preset
Colour picker → update material
Upload logo/template → apply to print zones

```

You can fake deep interactivity by making the model respond instantly and clearly.

## Three.js / rendering stack

Since you’re comfortable with Three.js, I’d strongly consider:

```txt
React Three Fiber
Drei
Zustand or Jotai for config state
Valtio if you like direct proxy-state editing
Three.js instancing for repeated panels
glTF for hero assets
KTX2 / Basis compressed textures
HDRI environment lighting
Lightmap / baked AO where possible

```

For realism without murdering performance:

### Lighting

Use:

```txt
1 HDRI environment map
1 soft directional/key light if needed
Baked ambient occlusion in textures
Contact shadows sparingly
No forest of real-time spotlights

```

For “event stand lighting”, cheat visually:

```txt
Use emissive materials for light strips
Use baked glow textures
Use bloom very selectively
Use light cones as transparent geometry, not actual lights

```

The scene will look much richer than the actual lighting cost.

### Materials

Use PBR materials, but keep them sane:

```txt
Powder-coated aluminium profiles
Satin laminate wall panels
Fabric print panels
Vinyl flooring
Brushed metal trims
Matte acrylic counters
LED screen material

```

Use `MeshStandardMaterial` or `MeshPhysicalMaterial` only where it matters. Don’t make every panel a shader diva.

### Colours

Use ET GLOBAL-like restrained neutrals plus client brand colours:

```txt
Warm whites
Soft greys
Black structural details
Orange/red accent capability
Client colour overrides

```

ET GLOBAL’s own site leans heavily into premium brand environments, global execution, sustainability, and smart solutions, so the visual language should feel operationally polished rather than “startup metaverse configurator from 2021.” ([ET Global](https://www.etglobal.com/ "Exhibitions. Event Construction. Brand Spaces. | ET GLOBAL"))

## Geometry strategy

I’d build most of it procedurally from simple primitives, then add a few high-quality glTF assets.

Procedural:

```txt
Walls
Floors
Fascias
Headers
Print panels
Counters
Plinths
Storage rooms
Truss-like simplified ceiling elements

```

glTF assets:

```txt
Chairs
Sofas
Plants
Screens
Product plinth details
People silhouettes
Light fixtures

```

Use instancing for repeated modules:

```txt
Wall panels
Floor tiles
Light fixtures
Structural posts

```

## Constraint examples worth showing visibly

This is where you can make the prototype feel smart.

When the user resizes:

```txt
“Wall length rounded to nearest 1m module.”
“Storage removed: insufficient depth.”
“Meeting room requires minimum 2.5m clearance.”
“LED wall exceeds recommended print/media budget for this footprint.”
“Open side preserved for aisle access.”
“Unsupported header span too wide; centre post added.”

```

Don’t just silently block things. Explain the operational reason. That is the difference between a configurator and a toy.

## A practical build sequence

### Phase 1: Static hero scene

Build one convincing ET GLOBAL-style modular stand.

No sliders yet.

Include:

```txt
Floor
Walls
Reception counter
Media wall
Print panels
Meeting area
Lighting mood
BOM sidebar with fixed data

```

Goal: make the client say, “Yes, this is the world.”

### Phase 2: Parameter-driven rebuild

Add only 5 controls:

```txt
Width
Depth
Wall height
Layout preset
Brand colour

```

Everything else recalculates.

This proves the system.

### Phase 3: BOM binding

Connect geometry to costs:

```txt
Panel count
Print m²
Floor m²
Furniture count
Lighting package
Labour complexity

```

At this point, the prototype becomes commercially interesting.

### Phase 4: Client/provider mode

Client sees:

```txt
Simple options
Cost range
Warnings
Visual changes

```

Provider sees:

```txt
Module count
Pricing assumptions
Geometry rules
Line-item BOM
Lock/unlock controls

```

### Phase 5: Polish interaction

Add:

```txt
Object click inspection
Material swatches
Logo placement
Camera bookmarks
Screenshot/export concept

```

Do not add arbitrary drag-and-drop until the rules are solid. Drag-and-drop is where good prototypes go to die wearing a little UX hat.

## Suggested demo narrative

Structure the presentation like this:

```txt
1. Start with an existing ET GLOBAL-style stand concept.
2. Client adjusts footprint and brand treatment.
3. System keeps the design within modular build rules.
4. BOM updates live.
5. Provider view reveals the operational model.
6. Result can be shared as a concept estimate, not a final quote.

```

That is plausible, valuable, and scoped.

## The main thing to avoid

Avoid making it feel like **SketchUp in the browser**.

That path leads to:

```txt
Complex UI
Invalid geometry
No clear buyer value
Lots of edge cases
Unconvincing cost model
Death by feature creep

```

Make it feel more like:

```txt
“Configure a proven modular event-space system.”

```

That is much stronger.

## My recommended MVP

Build one polished prototype with:

```txt
3 layout presets
3 footprint sizes
3 finish packages
3 media packages
Live BOM
Client/provider toggle
Constraint warnings
ET GLOBAL-inspired visual style

```

That is enough to sell the concept.

The most important design decision: **sliders should not manipulate meshes; they should manipulate business-valid parameters**. Then your system generates geometry, cost, and warnings from those parameters. That keeps the prototype credible, beautiful, and hard to break.
