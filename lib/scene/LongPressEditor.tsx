"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useConfig, useBrandKit } from "@/lib/store/configStore";

// ── Long-press surface editor ──────────────────────────────────────────────
// Hold the pointer on a wall / floor / pendant / chair etc for 400ms without
// dragging — and we open a small floating modal at the click location with a
// colour swatch + (for textured surfaces) a motif / style picker. Closes on
// Escape or click-outside.

const LONG_PRESS_MS = 350;
const DRAG_THRESHOLD_PX = 10;

type SurfaceKind = "walls" | "floor" | "ceiling" | "table" | "chair" | "pendant" | "truss";

const KIND_LABEL: Record<SurfaceKind, string> = {
  walls: "Walls",
  floor: "Floor",
  ceiling: "Ceiling",
  table: "Table",
  chair: "Chairs",
  pendant: "Pendant",
  truss: "Truss",
};

/** Inside the canvas: detects long-press, raycasts to find a meshed surface
 *  with `userData.kind`, and reports it back via the `onOpen` callback. */
export function LongPressDetector({ onOpen }: { onOpen: (kind: SurfaceKind, screenX: number, screenY: number) => void }) {
  const { camera, scene, gl } = useThree();
  const downTimeRef = useRef(0);
  const downPosRef = useRef<[number, number] | null>(null);
  const draggingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = gl.domElement;

    const cancelTimer = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // primary button only
      downTimeRef.current = Date.now();
      downPosRef.current = [e.clientX, e.clientY];
      draggingRef.current = false;
      cancelTimer();
      timerRef.current = window.setTimeout(() => {
        // Long-press completed without significant drag — try to identify.
        if (draggingRef.current || !downPosRef.current) return;
        const rect = canvas.getBoundingClientRect();
        const x = ((downPosRef.current[0] - rect.left) / rect.width) * 2 - 1;
        const y = -((downPosRef.current[1] - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        for (const h of hits) {
          let o: THREE.Object3D | null = h.object;
          while (o) {
            const kind = (o.userData as { kind?: string } | undefined)?.kind;
            if (kind && kind in KIND_LABEL) {
              onOpen(kind as SurfaceKind, downPosRef.current[0], downPosRef.current[1]);
              return;
            }
            o = o.parent;
          }
        }
      }, LONG_PRESS_MS);
    };

    const onMove = (e: PointerEvent) => {
      if (!downPosRef.current) return;
      const dx = e.clientX - downPosRef.current[0];
      const dy = e.clientY - downPosRef.current[1];
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        draggingRef.current = true;
        cancelTimer();
      }
    };

    const onUp = () => {
      downPosRef.current = null;
      cancelTimer();
    };

    // Shift+Click — explicit alternative to long-press. Fires immediately
    // on pointerdown when Shift is held, so users have a guaranteed shortcut
    // even if their finger / trackpad makes the long-press timer flaky.
    const onShiftClick = (e: PointerEvent) => {
      if (!e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          const kind = (o.userData as { kind?: string } | undefined)?.kind;
          if (kind && kind in KIND_LABEL) {
            onOpen(kind as SurfaceKind, e.clientX, e.clientY);
            return;
          }
          o = o.parent;
        }
      }
    };

    // Use capture phase so we fire BEFORE OrbitControls' own listeners and
    // before any stopPropagation it might do.
    const opts = { capture: true } as AddEventListenerOptions;
    canvas.addEventListener("pointerdown", onDown, opts);
    canvas.addEventListener("pointermove", onMove, opts);
    canvas.addEventListener("pointerup", onUp, opts);
    canvas.addEventListener("pointercancel", onUp, opts);
    // Note: NO pointerleave listener — the cursor briefly leaving the canvas
    // during a slow long-press shouldn't cancel the gesture.
    canvas.addEventListener("pointerdown", onShiftClick, opts);
    return () => {
      canvas.removeEventListener("pointerdown", onDown, opts);
      canvas.removeEventListener("pointermove", onMove, opts);
      canvas.removeEventListener("pointerup", onUp, opts);
      canvas.removeEventListener("pointercancel", onUp, opts);
      canvas.removeEventListener("pointerdown", onShiftClick, opts);
      cancelTimer();
    };
  }, [camera, scene, gl, onOpen]);

  return null;
}

const MOTIFS = [
  "stripes.diagonal", "stripes.horizontal", "stripes.vertical",
  "dots", "hex", "monogram", "chevron", "circuit", "grid", "triangles",
  "crown", "swoosh", "stars",
];
const FLOOR_STYLES = ["herringbone", "diagonal", "rectangular"] as const;

/** Modal rendered OUTSIDE the Canvas (via portal to body). Shows a colour
 *  swatch + texture controls for the target surface. */
export function LongPressModal({ kind, screenX, screenY, onClose }: {
  kind: SurfaceKind;
  screenX: number;
  screenY: number;
  onClose: () => void;
}) {
  const colourOverrides = useConfig((s) => s.colourOverrides);
  const floorStyle = useConfig((s) => s.floorStyle);
  const apply = useConfig((s) => s.apply);
  const kit = useBrandKit();
  const currentMotif = kit.scene?.wallMotif;

  // Resolve the current colour. Fall back through kit palette for kinds the
  // user hasn't overridden yet.
  const colour = colourOverrides[kind] ?? defaultColourForKind(kind, kit);

  // Anchor the modal to the click, but flip-in horizontally if it would
  // run off-screen.
  const W = 280;
  const H = kind === "walls" ? 340 : kind === "floor" ? 250 : 200;
  const x = Math.min(Math.max(8, screenX + 12), window.innerWidth - W - 8);
  const y = Math.min(Math.max(8, screenY + 12), window.innerHeight - H - 8);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <>
      {/* Click-outside catcher */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 1000, background: "transparent" }}
      />
      <div
        style={{
          position: "fixed",
          left: x,
          top: y,
          width: W,
          zIndex: 1001,
          background: "var(--color-bg-elev, #1b1d22)",
          border: "1px solid color-mix(in srgb, var(--color-border-soft, #3a3d44) 80%, transparent)",
          borderRadius: 16,
          padding: 14,
          boxShadow: "0 14px 38px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04) inset",
          color: "var(--color-text, #e8e9ec)",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, opacity: 0.7, textTransform: "uppercase" }}>{KIND_LABEL[kind]} colour</div>
          <button onClick={onClose} style={{ width: 22, height: 22, borderRadius: 6, background: "transparent", border: "1px solid var(--color-border-soft, #3a3d44)", color: "inherit", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>✕</button>
        </div>

        {/* Colour picker + native input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <input
            type="color"
            value={colour}
            onChange={(e) => apply({ type: "colourOverride.set", surface: kind, value: e.target.value })}
            style={{ width: 38, height: 38, border: "none", borderRadius: 8, padding: 0, background: "transparent", cursor: "pointer" }}
          />
          <div style={{ flex: 1, fontFamily: "ui-monospace, SF Mono, Menlo, monospace", fontSize: 12, opacity: 0.85 }}>{colour}</div>
          {colourOverrides[kind] != null && (
            <button
              onClick={() => apply({ type: "colourOverride.set", surface: kind, value: null })}
              title="Restore default"
              style={{ background: "transparent", border: "1px solid var(--color-border-soft, #3a3d44)", color: "inherit", borderRadius: 6, fontSize: 10, padding: "4px 8px", cursor: "pointer" }}
            >reset</button>
          )}
        </div>

        {/* Brand swatches */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {[
            { hex: kit.palette.primary, label: "primary" },
            { hex: kit.palette.secondary, label: "secondary" },
            { hex: kit.palette.accent, label: "accent" },
            { hex: kit.palette.neutralLight, label: "light" },
            { hex: kit.palette.neutralDark, label: "dark" },
          ].map((s, i) => (
            <button
              key={i}
              title={`${s.label} · ${s.hex}`}
              onClick={() => apply({ type: "colourOverride.set", surface: kind, value: s.hex })}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: s.hex,
                border: colour.toUpperCase() === s.hex.toUpperCase() ? "2px solid #fff" : "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        {/* Texture/motif section — only for surfaces that carry one */}
        {kind === "walls" && (
          <>
            <div style={{ fontSize: 10, letterSpacing: 1.2, opacity: 0.6, textTransform: "uppercase", marginBottom: 6 }}>Wall motif</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4 }}>
              {MOTIFS.map((m) => (
                <button
                  key={m}
                  title={m}
                  onClick={() => apply({ type: "kit.setWallMotif", kitId: kit.id, motif: m })}
                  style={{
                    fontSize: 9,
                    padding: "5px 2px",
                    background: currentMotif === m ? "var(--color-accent, #3d7eff)" : "transparent",
                    border: "1px solid var(--color-border-soft, #3a3d44)",
                    borderRadius: 6,
                    color: currentMotif === m ? "#fff" : "inherit",
                    cursor: "pointer",
                    textTransform: "lowercase",
                  }}
                >{m.replace("stripes.", "")}</button>
              ))}
            </div>
          </>
        )}

        {kind === "floor" && (
          <>
            <div style={{ fontSize: 10, letterSpacing: 1.2, opacity: 0.6, textTransform: "uppercase", marginBottom: 6 }}>Floor style</div>
            <div style={{ display: "flex", gap: 6 }}>
              {FLOOR_STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => apply({ type: "scene.setFloorStyle", value: s })}
                  style={{
                    flex: 1,
                    fontSize: 11,
                    padding: "8px 4px",
                    background: floorStyle === s ? "var(--color-accent, #3d7eff)" : "transparent",
                    border: "1px solid var(--color-border-soft, #3a3d44)",
                    borderRadius: 6,
                    color: floorStyle === s ? "#fff" : "inherit",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >{s}</button>
              ))}
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}

function defaultColourForKind(kind: SurfaceKind, kit: { palette: { primary: string; secondary: string; accent: string; neutralLight: string; neutralDark: string }; scene?: { wallColor?: string; floorColor?: string; tableColor?: string } }): string {
  switch (kind) {
    case "walls":   return kit.scene?.wallColor ?? kit.palette.primary;
    case "floor":   return kit.scene?.floorColor ?? "#dde0e6";
    case "ceiling": return "#f4f4f4";
    case "table":   return kit.scene?.tableColor ?? kit.palette.neutralDark;
    case "chair":   return kit.palette.secondary;
    case "pendant": return kit.palette.primary;
    case "truss":   return "#15171c";
  }
}
