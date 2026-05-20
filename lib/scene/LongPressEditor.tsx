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

type SurfaceKind = "walls" | "floor" | "ceiling" | "table" | "chair" | "pendant" | "truss" | "picture-frame" | "poster";

const KIND_LABEL: Record<SurfaceKind, string> = {
  walls: "Walls",
  floor: "Floor",
  ceiling: "Ceiling",
  table: "Table",
  chair: "Chairs",
  pendant: "Pendant",
  truss: "Truss",
  "picture-frame": "Picture frame",
  poster: "Poster",
};

/** Inside the canvas: detects long-press, raycasts to find a meshed surface
 *  with `userData.kind`, and reports it back via the `onOpen` callback.
 *  Optionally calls `onPressProgress(x, y, t)` continuously during the hold
 *  (t goes 0→1 over LONG_PRESS_MS) so a sibling can render a radial ring. */
export function LongPressDetector({ onOpen, onPressProgress }: {
  /** `slot` is undefined for surfaces that are unique (walls, floor…)
   *  and a 0-based index for kinds where multiple instances exist
   *  (picture-frame: 0..3). The raycaster reads `userData.slot` off
   *  the hit object's userData. */
  onOpen: (kind: SurfaceKind, screenX: number, screenY: number, slot?: number) => void;
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
          const ud = o.userData as { kind?: string; slot?: number } | undefined;
          const kind = ud?.kind;
          if (kind && kind in KIND_LABEL) {
            onOpen(kind as SurfaceKind, clientX, clientY, ud?.slot);
            return true;
          }
          o = o.parent;
        }
      }
      return false;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return; // primary button only
      // Bail if the user is interacting with the wizard panel (or any
      // other UI overlay marked with `data-wizard-overlay`). Without
      // this, holding on a wizard control inside the wizard's
      // bounding box could trigger a long-press on whatever sits
      // BEHIND the wizard in 3D — surprising and unwanted.
      const target = e.target as Element | null;
      if (target && target.closest?.("[data-wizard-overlay], [data-no-long-press]")) return;
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
// Tiny SVG ring that fills up as the user holds. Self-ticks on rAF reading
// from a shared ref — that way LongPressDetector can publish progress 60×/sec
// without re-rendering its parent (CanvasShell), which used to churn the
// detector's effect deps and cancel its own timer.
export type PressProgressRef = { x: number; y: number; t: number };

export function LongPressIndicator({ pressRef }: { pressRef: React.RefObject<PressProgressRef> }) {
  // Mirror the ref into a state we only update once a frame, after the
  // detector has had a chance to write. Throttled-rerender = SVG repaints
  // smoothly but React doesn't reconcile faster than the browser repaints.
  const [snap, setSnap] = useState<PressProgressRef>({ x: 0, y: 0, t: 0 });
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const cur = pressRef.current;
      if (cur) {
        // Only call setSnap when something actually changed — otherwise we'd
        // be reconciling 60×/sec for no reason.
        setSnap((prev) => (prev.x === cur.x && prev.y === cur.y && prev.t === cur.t ? prev : { ...cur }));
      }
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [pressRef]);

  if (snap.t <= 0) return null;
  const SIZE = 56;
  const STROKE = 3;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  const dash = C * snap.t;
  return createPortal(
    <div
      style={{
        position: "fixed",
        left: snap.x - SIZE / 2,
        top: snap.y - SIZE / 2,
        width: SIZE,
        height: SIZE,
        pointerEvents: "none",
        zIndex: 9999,
        // Subtle fade-in so a brief flick doesn't blink a half-drawn ring.
        opacity: Math.min(1, snap.t * 3),
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
export function LongPressModal({ kind, slot, screenX, screenY, onClose }: {
  kind: SurfaceKind;
  /** 0-based instance index when `kind` is multi-instance (picture-frame). */
  slot?: number;
  screenX: number;
  screenY: number;
  onClose: () => void;
}) {
  // Picture frames + posterboards share a dedicated image editor
  // (upload + AI prompt + clear). They don't carry a base "colour" —
  // they're photo viewers. The `target` tells the modal which store
  // array + dispatch to use.
  if (kind === "picture-frame") {
    return <ImageSlotModal target="picture-frame" slot={slot ?? 0} screenX={screenX} screenY={screenY} onClose={onClose} />;
  }
  if (kind === "poster") {
    return <ImageSlotModal target="poster" slot={slot ?? 0} screenX={screenX} screenY={screenY} onClose={onClose} />;
  }
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

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close on click-outside via a document pointerdown listener that
  // respects the modal's hit-area. The previous transparent backdrop
  // closed the modal whenever a "click" event landed anywhere off the
  // panel — including the native colour-picker dialog's edges and any
  // stray mouseup from a canvas drag — which made the modal vanish
  // mid-pick. This pattern only closes when the user genuinely starts a
  // press OUTSIDE the modal panel.
  const panelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (panelRef.current && t && panelRef.current.contains(t)) return;
      onClose();
    };
    // Defer one tick so the press that OPENED the modal doesn't
    // immediately close it via document propagation.
    const tid = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDown, true);
    }, 0);
    return () => {
      window.clearTimeout(tid);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [onClose]);

  return createPortal(
    <>
      {/* Restyled to match the rest of the configurator UI — panel-glass
          background + neumorph chips on the controls, t-label / t-num
          typography. */}
      <div
        ref={panelRef}
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
          <label
            className="rounded-[6px] neumorph-raised h-8 w-9 grid place-items-center cursor-pointer overflow-hidden"
            style={{ background: colour }}
            // Belt-and-braces — stop pointerdown so the doc-level
            // click-outside listener can't see a downstream sibling
            // event from the native colour picker as an "outside" press.
            onPointerDown={(e) => e.stopPropagation()}
          >
            <input
              type="color"
              value={colour}
              onChange={(e) => apply({ type: "colourOverride.set", surface: kind, value: e.target.value })}
              onInput={(e) => apply({ type: "colourOverride.set", surface: kind, value: (e.target as HTMLInputElement).value })}
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
  // Default to flux/schnell — a pure TEXT-to-image model that only needs
  // a `prompt`. The old default was fal-ai/patina, an image-to-image
  // model that REQUIRES an `image_url`, so it errored "field required:
  // image_url" the moment you hit Generate. (gpt-image-1 BYOK was also
  // offered — it needs your own `openai_api_key` and errored the same
  // way.) Both removed in favour of flux variants that work with the
  // bundled fal key + a prompt alone.
  const [model, setModel] = useState<FalModel>("fal-ai/flux/schnell");
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
              { id: "fal-ai/flux/schnell",                      label: "flux · fast" },
              { id: "fal-ai/flux/dev",                          label: "flux · hi-q" },
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
              const result = await generateTexture(prompt.trim(), { model, image_size: "square_hd" });
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
    // Picture frames + posters have a dedicated image modal (no base
    // colour); these fallbacks are unused but the switch must be exhaustive.
    case "picture-frame": return "#1a1c22";
    case "poster":        return "#1a1c22";
  }
}

// Shared image-slot editor for the side-wall picture frames AND the
// posterboards. The slot carries either a user-uploaded data:URL or a
// fal.ai-generated URL — neither path needs a "colour" picker, so the
// modal is a small upload-or-generate panel only. `target` selects
// which store array + dispatch to write.
function ImageSlotModal({ target, slot, screenX, screenY, onClose }: {
  target: "picture-frame" | "poster";
  slot: number;
  screenX: number;
  screenY: number;
  onClose: () => void;
}) {
  const apply = useConfig((s) => s.apply);
  const pictureFrameUrls = useConfig((s) => s.pictureFrameUrls) ?? [null, null, null, null];
  const posterboardUrls = useConfig((s) => s.posterboardUrls) ?? [null, null, null, null];
  const urls = target === "poster" ? posterboardUrls : pictureFrameUrls;
  const current = urls[slot] ?? null;
  const label = target === "poster" ? "Poster" : "Picture frame";
  // Write one slot. Picture frames have a single-slot intent; posters
  // dispatch the full array (the store has no per-slot poster intent).
  const writeSlot = (url: string | null) => {
    if (target === "picture-frame") {
      apply({ type: "frames.setUrl", slot, url });
    } else {
      const next = [...posterboardUrls] as (string | null)[];
      while (next.length < 4) next.push(null);
      next[slot] = url;
      apply({ type: "layout.setPosterboardUrls", urls: next });
    }
  };
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape + outside-click — copy of the main modal's pattern
  // so the picture-frame editor feels identical.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (panelRef.current && t && panelRef.current.contains(t)) return;
      onClose();
    };
    const tid = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDown, true);
    }, 0);
    return () => {
      window.clearTimeout(tid);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [onClose]);

  const onUpload = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      if (typeof r.result !== "string") return;
      writeSlot(r.result);
      onClose();
    };
    r.readAsDataURL(file);
  };
  const onGenerate = async () => {
    const p = prompt.trim();
    if (!p) return;
    setBusy(true);
    setError(null);
    try {
      // Posters are portrait 2:3 boards; picture frames are square.
      const r = await generateTexture(
        target === "poster"
          ? `Portrait poster artwork for a corporate event wall: ${p}. Bold composition, gallery-grade, sharp focus, no people, no logos, no text.`
          : `Square framed artwork for a corporate boardroom wall: ${p}. Photoreal or fine-art photography, gallery-grade composition, sharp focus, no people, no logos, no text.`,
        {
          model: "fal-ai/flux/schnell",
          image_size: target === "poster" ? "portrait_4_3" : "square_hd",
        },
      );
      if (r.ok) {
        writeSlot(r.url);
        onClose();
      } else {
        const lower = r.error.toLowerCase();
        if (lower.includes("no user found") || lower.includes("unauthorized") || lower.includes("invalid") || lower.includes("forbidden")) {
          setError("fal.ai key rejected. Check .env.local + rebuild.");
        } else {
          setError(r.error);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const W = 300;
  const H = 280;
  const x = Math.min(Math.max(8, screenX + 12), window.innerWidth - W - 8);
  const y = Math.min(Math.max(8, screenY + 12), window.innerHeight - H - 8);

  return createPortal(
    <div
      ref={panelRef}
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
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="pb-2 mb-2 border-b border-[color:var(--color-border-soft)] flex items-center justify-between">
        <span className="t-label uppercase tracking-wider">{label} · slot {slot + 1}</span>
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

      {/* Live preview thumbnail — sits at the top so the user can see
          what's currently in the frame before deciding to upload or
          regenerate. */}
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={current}
          alt={`${label} ${slot + 1}`}
          className={"w-full object-cover rounded-[6px] mb-2.5 " + (target === "poster" ? "aspect-[2/3]" : "aspect-square")}
          style={{ border: "1px solid var(--color-border-soft)" }}
        />
      )}

      {/* Upload tile — accepts standard image formats. data:URLs get
          stored in pictureFrameUrls so the scene re-renders immediately. */}
      <label
        className="flex items-center justify-center neumorph-raised cursor-pointer mb-2"
        style={{ padding: "10px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500 }}
      >
        Upload image…
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.currentTarget.value = "";
          }}
        />
      </label>

      <div className="t-label uppercase tracking-wider text-[0.6rem] opacity-70 mb-1.5">Generate · AI</div>
      <input
        type="text"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="An abstract expressionist canvas…"
        className="t-num text-[0.7rem] w-full px-2 py-1.5 rounded-[5px] neumorph-inset bg-transparent outline-none mb-1.5"
        onKeyDown={(e) => { if (e.key === "Enter" && !busy && prompt.trim()) { void onGenerate(); } }}
      />
      <button
        type="button"
        disabled={busy || !prompt.trim()}
        onClick={() => void onGenerate()}
        className="w-full t-label text-[0.65rem] py-1.5 rounded-[5px] transition-all flex items-center justify-center gap-1.5 neumorph-raised"
        style={{
          color: busy || !prompt.trim() ? "var(--color-text-soft)" : "var(--color-accent)",
          opacity: busy || !prompt.trim() ? 0.6 : 1,
        }}
      >
        {busy && <RadialSpinner size={12} />}
        <span>{busy ? "Generating…" : "Generate"}</span>
      </button>
      {error && (
        <div className="t-label text-[0.55rem] mt-1 opacity-80 leading-snug" style={{ color: "var(--color-accent)" }}>
          {error}
        </div>
      )}
      {current && (
        <button
          type="button"
          onClick={() => { writeSlot(null); onClose(); }}
          className="w-full mt-2 t-label text-[0.6rem] py-1 rounded-[5px] neumorph-raised text-[color:var(--color-text-soft)] hover:text-[color:var(--color-accent)]"
        >
          Clear {label.toLowerCase()}
        </button>
      )}
    </div>,
    document.body,
  );
}
