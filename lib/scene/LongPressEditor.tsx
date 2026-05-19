"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useConfig, useBrandKit } from "@/lib/store/configStore";
import { generateTexture, isFalConfigured, type FalModel } from "@/lib/services/falTexture";

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
 *  with `userData.kind`, and reports it back via the `onOpen` callback.
 *  Optionally calls `onPressProgress(x, y, t)` continuously during the hold
 *  (t goes 0→1 over LONG_PRESS_MS) so a sibling can render a radial ring. */
export function LongPressDetector({ onOpen, onPressProgress }: {
  onOpen: (kind: SurfaceKind, screenX: number, screenY: number) => void;
  onPressProgress?: (x: number, y: number, t: number) => void;
}) {
  const { camera, scene, gl } = useThree();
  const downTimeRef = useRef(0);
  const downPosRef = useRef<[number, number] | null>(null);
  const draggingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = gl.domElement;

    const cancelTimer = () => {
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      onPressProgress?.(0, 0, 0);
    };

    // Each frame while a press is in flight: compute elapsed fraction and
    // ping the consumer. Stops automatically when the press is cancelled
    // (cancelTimer clears the rAF).
    const startProgressLoop = (clientX: number, clientY: number) => {
      const startedAt = Date.now();
      const tick = () => {
        if (!downPosRef.current || draggingRef.current) return;
        const t = Math.min(1, (Date.now() - startedAt) / LONG_PRESS_MS);
        onPressProgress?.(clientX, clientY, t);
        if (t < 1) rafRef.current = window.requestAnimationFrame(tick);
      };
      rafRef.current = window.requestAnimationFrame(tick);
    };

    const doRaycast = (clientX: number, clientY: number): boolean => {
      const rect = canvas.getBoundingClientRect();
      // Bail if the click was outside the canvas (clicked on a panel etc).
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return false;
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          const kind = (o.userData as { kind?: string } | undefined)?.kind;
          if (kind && kind in KIND_LABEL) {
            onOpen(kind as SurfaceKind, clientX, clientY);
            return true;
          }
          o = o.parent;
        }
      }
      return false;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // primary button only
      // Shift+Click — immediate alternative to long-press.
      if (e.shiftKey) {
        if (doRaycast(e.clientX, e.clientY)) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      downTimeRef.current = Date.now();
      downPosRef.current = [e.clientX, e.clientY];
      draggingRef.current = false;
      cancelTimer();
      // Only start the visible radial ring when the click landed on the
      // canvas — clicks on overlay panels won't produce a successful
      // raycast and shouldn't show the hold indicator either.
      const rect = canvas.getBoundingClientRect();
      const inCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (inCanvas) startProgressLoop(e.clientX, e.clientY);
      timerRef.current = window.setTimeout(() => {
        if (draggingRef.current || !downPosRef.current) return;
        doRaycast(downPosRef.current[0], downPosRef.current[1]);
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

    // Attach to DOCUMENT (not the canvas) so OrbitControls' pointer capture
    // on the canvas can't intercept the events before we see them. The
    // raycast helper bails when the click was outside the canvas bounds.
    const opts = { capture: true } as AddEventListenerOptions;
    document.addEventListener("pointerdown", onDown, opts);
    document.addEventListener("pointermove", onMove, opts);
    document.addEventListener("pointerup", onUp, opts);
    document.addEventListener("pointercancel", onUp, opts);
    return () => {
      document.removeEventListener("pointerdown", onDown, opts);
      document.removeEventListener("pointermove", onMove, opts);
      document.removeEventListener("pointerup", onUp, opts);
      document.removeEventListener("pointercancel", onUp, opts);
      cancelTimer();
    };
  }, [camera, scene, gl, onOpen]);

  return null;
}

// ── Long-press radial indicator ────────────────────────────────────────────
// Tiny SVG ring that fills up as the user holds. Drawn at the press
// location (offset slightly so the user's fingertip / cursor doesn't sit
// on top of it). Auto-hides when t==0. Pointer-events: none so it can't
// interfere with the press it's reporting on.
export function LongPressIndicator({ x, y, t }: { x: number; y: number; t: number }) {
  if (t <= 0) return null;
  const SIZE = 56;
  const STROKE = 3;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const dash = C * t;
  return createPortal(
    <div
      style={{
        position: "fixed",
        left: x - SIZE / 2,
        top: y - SIZE / 2,
        width: SIZE,
        height: SIZE,
        pointerEvents: "none",
        zIndex: 9999,
        // Subtle fade-in so a brief flick doesn't blink a half-drawn ring.
        opacity: Math.min(1, t * 3),
        transition: "opacity 0.08s linear",
      }}
      aria-hidden
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background track */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="rgba(20,22,28,0.32)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={STROKE * 0.6}
        />
        {/* Progress arc — starts at 12 o'clock, sweeps clockwise */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--color-accent, #3d7eff)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${C - dash}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
    </div>,
    document.body,
  );
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
      {/* Restyled to match the rest of the configurator UI — panel-glass
          background + neumorph chips on the controls, t-label / t-num
          typography. */}
      <div
        className="ui-overlay panel-glass"
        style={{
          position: "fixed",
          left: x,
          top: y,
          width: W,
          zIndex: 1001,
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div className="pb-2 mb-2 border-b border-[color:var(--color-border-soft)] flex items-center justify-between">
          <span className="t-label uppercase tracking-wider">{KIND_LABEL[kind]} colour</span>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-[6px] neumorph-raised grid place-items-center text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]"
            title="Close"
            aria-label="Close"
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Colour picker + hex readout */}
        <div className="flex items-center gap-2 mb-2.5">
          <label className="rounded-[6px] neumorph-raised h-8 w-9 grid place-items-center cursor-pointer overflow-hidden" style={{ background: colour }}>
            <input
              type="color"
              value={colour}
              onChange={(e) => apply({ type: "colourOverride.set", surface: kind, value: e.target.value })}
              className="opacity-0 w-9 h-8 cursor-pointer"
            />
          </label>
          <div className="t-num flex-1 text-[0.7rem]">{colour.toUpperCase()}</div>
          {colourOverrides[kind] != null && (
            <button
              onClick={() => apply({ type: "colourOverride.set", surface: kind, value: null })}
              title="Restore default"
              className="t-label text-[0.6rem] px-2 py-1 rounded-[5px] neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-accent)]"
            >reset</button>
          )}
        </div>

        {/* Brand swatches */}
        <div className="flex gap-1.5 mb-3">
          {[
            { hex: kit.palette.primary, label: "primary" },
            { hex: kit.palette.secondary, label: "secondary" },
            { hex: kit.palette.accent, label: "accent" },
            { hex: kit.palette.neutralLight, label: "light" },
            { hex: kit.palette.neutralDark, label: "dark" },
          ].map((s, i) => {
            const selected = colour.toUpperCase() === s.hex.toUpperCase();
            return (
              <button
                key={i}
                title={`${s.label} · ${s.hex}`}
                onClick={() => apply({ type: "colourOverride.set", surface: kind, value: s.hex })}
                className={"flex-1 aspect-square rounded-[6px] transition-all " + (selected ? "neumorph-inset" : "neumorph-raised")}
                style={{ background: s.hex, outline: selected ? "1.5px solid var(--color-accent)" : undefined, outlineOffset: -1 }}
              />
            );
          })}
        </div>

        {/* Texture/motif section — only for surfaces that carry one */}
        {kind === "walls" && (
          <>
            <div className="t-label uppercase tracking-wider text-[0.6rem] opacity-70 mb-1.5">Wall motif</div>
            <div className="grid grid-cols-4 gap-1">
              {MOTIFS.map((m) => {
                const selected = currentMotif === m;
                return (
                  <button
                    key={m}
                    title={m}
                    onClick={() => apply({ type: "kit.setWallMotif", kitId: kit.id, motif: m })}
                    className={"t-label text-[0.55rem] px-1 py-1.5 rounded-[5px] transition-all " + (selected ? "neumorph-inset text-[color:var(--color-accent)]" : "neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]")}
                  >{m.replace("stripes.", "")}</button>
                );
              })}
            </div>
          </>
        )}

        {kind === "floor" && (
          <>
            <div className="t-label uppercase tracking-wider text-[0.6rem] opacity-70 mb-1.5">Floor style</div>
            <div className="flex gap-1.5">
              {FLOOR_STYLES.map((s) => {
                const selected = floorStyle === s;
                return (
                  <button
                    key={s}
                    onClick={() => apply({ type: "scene.setFloorStyle", value: s })}
                    className={"t-label text-[0.65rem] flex-1 py-1.5 rounded-[5px] capitalize transition-all " + (selected ? "neumorph-inset text-[color:var(--color-accent)]" : "neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-text)]")}
                  >{s}</button>
                );
              })}
            </div>
          </>
        )}

        {/* AI texture generation — only for walls + floor for now. The
            client posts to a Cloudflare worker (see workers/fal-proxy/)
            that holds the FAL_KEY and returns an image URL. The URL gets
            written into kit.scene.wallGraphic so the back wall picks
            it up. */}
        {(kind === "walls" || kind === "floor") && (
          <FalTextureSection kitId={kit.id} />
        )}
      </div>
    </>,
    document.body,
  );
}

/** AI texture generation — POSTs to the fal.ai proxy worker, then writes
 *  the resulting image URL into `kit.scene.wallGraphic` via the existing
 *  intent. Disabled (with a clear notice) when NEXT_PUBLIC_FAL_PROXY_URL
 *  isn't set, so devs running locally don't see a broken affordance. */
function FalTextureSection({ kitId }: { kitId: string }) {
  const apply = useConfig((s) => s.apply);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<FalModel>("fal-ai/patina");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [err, setErr] = useState<string | null>(null);
  const configured = isFalConfigured();
  return (
    <div className="mt-3 pt-2.5 border-t border-[color:var(--color-border-soft)]">
      <div className="t-label uppercase tracking-wider text-[0.6rem] opacity-70 mb-1.5">Generate texture · AI</div>
      {!configured ? (
        <div className="t-label text-[0.6rem] opacity-60 leading-snug">
          Set <code>NEXT_PUBLIC_FAL_PROXY_URL</code> on the build to enable.
          See <code>workers/fal-proxy/</code> for the deploy template.
        </div>
      ) : (
        <>
          <div className="flex gap-1 mb-1.5">
            {([
              { id: "fal-ai/patina",                            label: "patina" },
              { id: "fal-ai/gpt-image-1/text-to-image/byok",    label: "gpt-image" },
              { id: "fal-ai/flux/schnell",                      label: "flux" },
            ] as const).map((m) => {
              const selected = model === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id as FalModel)}
                  className={"t-label text-[0.55rem] flex-1 py-1 rounded-[5px] transition-all " + (selected ? "neumorph-inset text-[color:var(--color-accent)]" : "neumorph-raised text-[color:var(--color-text-soft)]")}
                >{m.label}</button>
              );
            })}
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="brushed concrete with subtle warm undertones, tileable"
            className="t-num text-[0.65rem] w-full px-2 py-1.5 rounded-[5px] neumorph-inset bg-transparent outline-none"
          />
          <button
            disabled={!prompt.trim() || status === "loading"}
            onClick={async () => {
              setStatus("loading"); setErr(null);
              const result = await generateTexture(prompt.trim(), { model });
              if (!result.ok) {
                setErr(result.error); setStatus("error"); return;
              }
              apply({ type: "kit.setWallGraphic", kitId, url: result.url });
              setStatus("done");
            }}
            className={"mt-1.5 w-full t-label text-[0.65rem] py-1.5 rounded-[5px] transition-all flex items-center justify-center gap-1.5 " + ((!prompt.trim() || status === "loading") ? "neumorph-inset opacity-70" : "neumorph-raised text-[color:var(--color-accent)] hover:opacity-90")}
          >
            {status === "loading" && <RadialSpinner size={12} />}
            <span>{status === "loading" ? "Generating…" : status === "done" ? "Applied ✓" : "Generate"}</span>
          </button>
          {err && <div className="t-label text-[0.55rem] mt-1 opacity-70 leading-snug" style={{ color: "var(--color-accent)" }}>{err}</div>}
        </>
      )}
    </div>
  );
}

// Indeterminate circular spinner. CSS keyframes are inline so we don't
// have to touch globals.css for a one-shot animation.
function RadialSpinner({ size = 14 }: { size?: number }) {
  const stroke = Math.max(1.6, size / 8);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        animation: "longpress-spin 0.9s linear infinite",
      }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.22}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * 0.28} ${c * 0.72}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <style>{`@keyframes longpress-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
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
