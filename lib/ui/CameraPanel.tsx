"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useConfig } from "@/lib/store/configStore";
import { useLive } from "@/lib/store/liveStore";
import { CAMERA_PRESETS } from "@/lib/scene/CameraSync";
import { Slider } from "./Slider";

const PRESETS: { id: string; label: string }[] = [
  { id: "hero",    label: "Hero" },
  { id: "front",   label: "Front" },
  { id: "side",    label: "Side" },
  { id: "top",     label: "Top" },
  { id: "pendant", label: "Pendant" },
  { id: "closeup", label: "Close-up" },
];

export function CameraPanel() {
  const fov = useConfig((s) => s.cameraFov);
  const apply = useConfig((s) => s.apply);
  const active = useConfig((s) => s.cameraActivePreset);
  const [showCoords, setShowCoords] = useState(false);

  const goTo = (id: string) => apply({ type: "camera.gotoPreset", preset: id });
  const saveCurrent = () => {
    const live = useLive.getState();
    apply({
      type: "camera.savePreset",
      preset: active,
      pos: live.camPos,
      target: live.camTarget,
      fov,
    });
  };
  const restore = () => {
    const defaults = CAMERA_PRESETS[active];
    if (!defaults) return;
    apply({
      type: "camera.savePreset",
      preset: active,
      pos: defaults.pos,
      target: defaults.target,
      fov: defaults.fov,
    });
    goTo(active);
  };

  return (
    <div className="ui-overlay absolute right-3 top-14 w-[240px]">
      <div className="panel-glass rounded-[12px] overflow-hidden">
        {/* Header — inline FOV slider replaces the static label */}
        <div className="px-3 h-9 flex items-center gap-2.5 border-b border-[color:var(--color-border-soft)]">
          <span className="t-label flex items-center gap-1.5"><CameraIcon /> FOV</span>
          <div className="flex-1">
            <Slider
              label=""
              value={fov}
              onChange={(v) => apply({ type: "camera.setFov", value: v })}
              min={20}
              max={70}
              step={1}
              unit="°"
            />
          </div>
        </div>

        <div className="px-3 pt-2 pb-2.5 space-y-2.5">
          <div>
            <div className="t-label mb-1">Presets</div>
            <div className="grid grid-cols-3 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => goTo(p.id)}
                  className={
                    "h-6 rounded-[6px] text-[0.66rem] transition-colors " +
                    (active === p.id
                      ? "neumorph-inset text-[color:var(--color-accent)]"
                      : "neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-accent)]")
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1">
            <button
              onClick={saveCurrent}
              className="flex-1 h-6 rounded-[6px] text-[0.66rem] neumorph-raised text-[color:var(--color-accent)] hover:brightness-110"
              title={`Save current camera to "${active}"`}
            >
              Save to {active}
            </button>
            <button
              onClick={restore}
              className="h-6 px-2 rounded-[6px] text-[0.66rem] neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]"
              title="Restore preset to built-in default"
            >
              ↺
            </button>
          </div>

          {/* Collapsible coords */}
          <button
            onClick={() => setShowCoords((v) => !v)}
            className="w-full flex items-center justify-between t-label hover:text-[color:var(--color-text)] transition-colors"
            aria-expanded={showCoords}
          >
            <span className="flex items-center gap-1.5">
              <motion.svg animate={{ rotate: showCoords ? 90 : 0 }} width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M2 1L5 4L2 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
              Coordinates
            </span>
          </button>
          <AnimatePresence initial={false}>
            {showCoords && (
              <motion.div
                key="coords"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 30 }}
                className="overflow-hidden"
              >
                <LivePositionEditor />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function LivePositionEditor() {
  const camPos = useLive((s) => s.camPos);
  const camTarget = useLive((s) => s.camTarget);
  return (
    <div className="space-y-1.5 pt-0.5">
      <div>
        <div className="t-label mb-0.5">Position</div>
        <Triplet x={camPos[0]} y={camPos[1]} z={camPos[2]} />
      </div>
      <div>
        <div className="t-label mb-0.5">Target</div>
        <Triplet x={camTarget[0]} y={camTarget[1]} z={camTarget[2]} />
      </div>
      <div>
        <div className="t-label mb-0.5">Rotation (deg)</div>
        <RotationTriplet camPos={camPos} camTarget={camTarget} />
      </div>
    </div>
  );
}

function Triplet({ x, y, z }: { x: number; y: number; z: number }) {
  return (
    <div className="grid grid-cols-3 gap-1 t-num text-[0.66rem]">
      <span className="neumorph-inset rounded-[4px] px-1.5 py-[1px] text-center"><span className="text-[color:var(--color-text-soft)]">x </span>{x.toFixed(2)}</span>
      <span className="neumorph-inset rounded-[4px] px-1.5 py-[1px] text-center"><span className="text-[color:var(--color-text-soft)]">y </span>{y.toFixed(2)}</span>
      <span className="neumorph-inset rounded-[4px] px-1.5 py-[1px] text-center"><span className="text-[color:var(--color-text-soft)]">z </span>{z.toFixed(2)}</span>
    </div>
  );
}

function RotationTriplet({ camPos, camTarget }: { camPos: [number, number, number]; camTarget: [number, number, number] }) {
  const dx = camTarget[0] - camPos[0];
  const dy = camTarget[1] - camPos[1];
  const dz = camTarget[2] - camPos[2];
  const horiz = Math.hypot(dx, dz);
  const yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
  const pitch = (Math.atan2(dy, horiz) * 180) / Math.PI;
  return (
    <div className="grid grid-cols-3 gap-1 t-num text-[0.66rem]">
      <span className="neumorph-inset rounded-[4px] px-1.5 py-[1px] text-center"><span className="text-[color:var(--color-text-soft)]">yaw </span>{yaw.toFixed(1)}°</span>
      <span className="neumorph-inset rounded-[4px] px-1.5 py-[1px] text-center"><span className="text-[color:var(--color-text-soft)]">p </span>{pitch.toFixed(1)}°</span>
      <span className="neumorph-inset rounded-[4px] px-1.5 py-[1px] text-center"><span className="text-[color:var(--color-text-soft)]">r </span>0.0°</span>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
      <path d="M2 4h2l1-1.5h2L8 4h2v6H2V4z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="6" cy="7" r="1.6" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
