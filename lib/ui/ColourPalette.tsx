"use client";
import { Section } from "./Section";
import { useConfig, useBrandKit } from "@/lib/store/configStore";

type SurfaceId = "walls" | "floor" | "trim" | "pendant" | "truss" | "sofa" | "counter" | "vitrine" | "monitor";
const SURFACES: { id: SurfaceId; label: string; defaultFor: (k: ReturnType<typeof useBrandKit>) => string }[] = [
  { id: "walls",   label: "Walls",   defaultFor: (k) => k.scene?.wallColor  ?? k.palette.primary },
  { id: "floor",   label: "Floor",   defaultFor: (k) => k.scene?.floorColor ?? k.palette.neutralLight },
  { id: "trim",    label: "Trim",    defaultFor: (k) => k.palette.accent },
  { id: "pendant", label: "Pendant", defaultFor: (k) => k.scene?.defaultPendantColor ?? k.palette.primary },
  { id: "truss",   label: "Truss",   defaultFor: () => "#15171c" },
  { id: "sofa",    label: "Sofa",    defaultFor: (k) => k.palette.primary },
  { id: "counter", label: "Counter", defaultFor: (k) => k.palette.accent },
  { id: "vitrine", label: "Vitrines",defaultFor: (k) => k.palette.accent },
  { id: "monitor", label: "Monitors",defaultFor: (k) => k.palette.primary },
];

export function ColourPalette() {
  const overrides = useConfig((s) => s.colourOverrides);
  const apply = useConfig((s) => s.apply);
  const kit = useBrandKit();

  return (
    <Section label="Surface colours" defaultOpen={false}>
      <div className="space-y-1.5">
        {SURFACES.map((s) => {
          const current = overrides[s.id] ?? s.defaultFor(kit);
          const overridden = overrides[s.id] != null;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <span className="t-label w-[55px] flex-shrink-0">{s.label}</span>
              <label className="relative inline-block w-6 h-6 rounded-[6px] cursor-pointer flex-shrink-0 neumorph-raised overflow-hidden">
                <input
                  type="color"
                  value={current}
                  onChange={(e) => apply({ type: "colourOverride.set", surface: s.id, value: e.target.value })}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="absolute inset-[3px] rounded-[4px]" style={{ background: current }} />
              </label>
              <span className="t-num text-[0.66rem] text-[color:var(--color-text-soft)] flex-1 truncate">{current}</span>
              {overridden && (
                <button
                  onClick={() => apply({ type: "colourOverride.set", surface: s.id, value: null })}
                  className="t-label text-[0.6rem] hover:text-[color:var(--color-accent)]"
                  title="Reset to kit default"
                >
                  ↺
                </button>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}
