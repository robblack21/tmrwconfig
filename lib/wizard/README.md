# `@/lib/wizard`

Standalone, domain-agnostic five-step wizard for "design your space" flows.
Originally built for the Stuttgart-Messe trade-fair configurator; designed
to drop into any sibling React + Next.js project (e.g. a meeting-rooms
configurator, an apartment-layout picker) by just changing the host's data
and `onComplete` handler.

## Footprint

```
lib/wizard/
├── index.ts        — public exports
├── types.ts        — WizardSize / WizardDesignLine / WizardResult / WizardProps
├── colour.ts       — in-browser dominant-colour extraction (k-means)
├── Wizard.tsx      — the component (no host state coupling)
└── README.md       — this file
```

No three.js / scene / store dependencies. Just React + framer-motion.

## Five steps

1. **Size** — host-supplied list of `WizardSize` cards (each carries label
   / sqm / widthM / depthM / description).
2. **Logo upload** — drag-or-click. Auto-runs `extractDominantColours` on
   the uploaded image so step 4 is pre-filled.
3. **Artwork upload** — same uploader, intended for a back-wall hero.
4. **Brand colours** — three editable hex swatches.
5. **Design Line** — host-supplied list of `WizardDesignLine` cards (each
   with an inline SVG preview by default, override via `line.preview`).

Step 6 is a summary + CTA. On click the wizard emits a `WizardResult` to
`onComplete`. The host decides what to do with it.

## Minimal use

```tsx
import { Wizard, type WizardResult } from "@/lib/wizard";

function MyApp() {
  return (
    <Wizard
      sizes={[
        { id: "S", label: "Small",  sqm: 12, widthM: 4, depthM: 3, description: "4 people · hot desk" },
        { id: "M", label: "Medium", sqm: 25, widthM: 5, depthM: 5, description: "8 people · video conf"  },
        { id: "L", label: "Large",  sqm: 40, widthM: 8, depthM: 5, description: "16 people · all-hands"   },
      ]}
      designLines={[
        { id: "warm",    label: "Warm",    tagline: "Wood + plants",     description: "Oak veneer, soft fabrics, biophilia." },
        { id: "studio",  label: "Studio",  tagline: "Mid-century",       description: "Walnut + brass, leather lounge."     },
        { id: "minimal", label: "Minimal", tagline: "All-white acoustic", description: "Plaster + felt, clean lines."       },
      ]}
      ratePerSqm={1800}
      copy={{
        brandName: "home",
        sizeStep: { title: "Choose your room size" },
        coloursStep: { labels: ["Walls", "Carpet", "Accent"] },
        summaryStep: { cta: "Generate room →" },
      }}
      onClose={() => router.push("/")}
      onComplete={(result: WizardResult) => {
        // apply to your scene / config / state store
      }}
    />
  );
}
```

## `WizardResult` shape

```ts
type WizardResult = {
  size: WizardSize;                            // the full size object, not just an id
  logoUrl: string | null;                       // data: URL, or null if skipped
  artworkUrl: string | null;
  colours: [string, string, string];            // hex strings (#rrggbb)
  designLine: WizardDesignLine;
};
```

## Theming

The wizard reads these CSS variables from the host stylesheet:

| Variable | Use |
| --- | --- |
| `--color-accent` | Active state, CTA buttons, progress bar (rename via `accentVar` prop) |
| `--color-bg` | Page background gradient base |
| `--color-surface` | Card surfaces (via `color-mix`) |
| `--color-text` | Text + border tints (via `color-mix`) |
| `--color-text-soft` | n/a — wizard uses opacity instead |
| `--color-border-soft` | Footer / inactive progress-dot colour |

If your host doesn't define these, define them once on `:root`:

```css
:root {
  --color-accent: #ee7f1a;
  --color-bg: #f4f4f6;
  --color-surface: #ffffff;
  --color-text: #1a1d24;
  --color-border-soft: rgba(0,0,0,0.1);
}
```

## Dependencies

```
react           >= 18
framer-motion   >= 10
```

That's it. No three.js, no zustand, no kit/store coupling.

## Copy customisation

Every visible string is overridable via the optional `copy` prop. See
`WizardCopy` in `types.ts` — each step has its own `title` / `subtitle` /
`hint` slots, plus the `labels` for the three colour swatches.

## Colour extraction

`extractDominantColours(url, count = 3)` runs a small canvas-based k-means
on the uploaded image. Filters near-white and near-black pixels so vector
logos with large backgrounds don't dominate. ~30-80 ms on a typical
256² sample. Replace with a server / vision-API implementation later
without changing the wizard's call site — same async signature.

## What stays host-side

The wizard is intentionally not opinionated about:

- The list of sizes / design lines (passed as props)
- Pricing model beyond the simple `ratePerSqm` band
- How to apply the result (host wires the `onComplete` callback)
- Subsequent navigation (host owns the close + post-complete routing)

For the Stuttgart configurator, host-side wiring lives in
`lib/wizard-presets/stuttgart.ts` (data) and `app/page.tsx` (the
`applyWizardResult` callback that converts a `WizardResult` into a stream
of `apply()` intents on the configStore).
