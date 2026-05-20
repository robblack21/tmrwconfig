"use client";
import { useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Scene } from "./Scene";
import { useConfig } from "@/lib/store/configStore";
import { LongPressDetector, LongPressIndicator, LongPressModal, type PressProgressRef } from "./LongPressEditor";
import { CubePickerModal } from "./CubePickerModal";

type SurfaceKind = "walls" | "floor" | "ceiling" | "table" | "chair" | "pendant" | "truss";

export default function CanvasShell() {
  const highDpr = useConfig((s) => s.highDpr);
  const dprFloor = useConfig((s) => s.dprFloor);
  // dprFloor (0.5 or 1) is the absolute lower bound — PerfMonitor drops to
  // 0.5 only when FPS stays under 25 for 3 s after DPR is already at 1×.
  const dpr: [number, number] = highDpr ? [dprFloor, 2] : [dprFloor, 1];
  // Long-press surface editor — the detector lives inside the canvas to
  // raycast, but the modal portals to document.body so it can render plain
  // DOM controls (colour input, swatch buttons) overlaid on the canvas.
  const [editor, setEditor] = useState<{ kind: SurfaceKind; screenX: number; screenY: number } | null>(null);
  // Long-press hold progress lives in a REF, not state. Previously this
  // was useState + setPress called per rAF tick — that re-rendered the
  // canvas wrapper 60×/sec which (a) churned the inline `onOpen` /
  // `onPressProgress` closure identities so LongPressDetector's
  // `useEffect` cancelled and reinstalled its timer every frame
  // (breaking long-press entirely), and (b) was wasteful. Ref-based
  // means LongPressDetector writes the current press, LongPressIndicator
  // self-ticks on rAF to read it; React only renders when the editor
  // opens or closes.
  const pressRef = useRef<PressProgressRef>({ x: 0, y: 0, t: 0 });
  const onPressProgress = useCallback((x: number, y: number, t: number) => {
    pressRef.current.x = x;
    pressRef.current.y = y;
    pressRef.current.t = t;
  }, []);
  const onOpen = useCallback((kind: SurfaceKind, screenX: number, screenY: number) => {
    pressRef.current.t = 0;
    setEditor({ kind, screenX, screenY });
  }, []);
  return (
    <>
      <Canvas
        shadows
        dpr={dpr}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: "high-performance",
        }}
        onCreated={(state) => {
          // Improve transmission-material quality so the windowed glass
          // actually transmits the HDR exterior cleanly. Default is 0.5
          // which over-blurs the through-glass view.
          if ("transmissionResolutionScale" in state.gl) {
            (state.gl as unknown as { transmissionResolutionScale: number }).transmissionResolutionScale = 1.0;
          }
          // ── Trackpad-pinch fix ──
          // macOS two-finger trackpad pinch fires a `wheel` event with
          // ctrlKey=true. OrbitControls treats this as dolly, BUT three's
          // event ordering can let some rotation bleed in before the
          // dolly settles — the user kept reporting "pinch rotates the
          // camera". Intercept ctrlKey wheel events at the CAPTURE phase
          // on the canvas element so they never reach OrbitControls;
          // implement the dolly ourselves by directly mutating the
          // camera-to-target distance.
          const canvasEl = state.gl.domElement;
          const camera = state.camera as THREE.PerspectiveCamera;
          const ctrlWheel = (e: WheelEvent) => {
            if (!e.ctrlKey) return; // normal wheel — let OrbitControls do its thing
            e.preventDefault();
            e.stopImmediatePropagation();
            // Direct dolly along the camera→target vector. We can pull
            // the target from drei's OrbitControls instance via the
            // r3f state (set when makeDefault).
            const ctrl = state.controls as unknown as { target: THREE.Vector3; minDistance: number; maxDistance: number; update: () => void } | null;
            const target = ctrl?.target ?? new THREE.Vector3();
            // wheel deltaY positive = scroll down = zoom OUT
            // negative = scroll up = zoom IN. Scale modestly so the gesture feels natural.
            const factor = Math.pow(1.0015, e.deltaY);
            const offset = camera.position.clone().sub(target);
            const newLen = THREE.MathUtils.clamp(offset.length() * factor, ctrl?.minDistance ?? 1.0, ctrl?.maxDistance ?? 50);
            offset.setLength(newLen);
            camera.position.copy(target).add(offset);
            ctrl?.update();
          };
          canvasEl.addEventListener("wheel", ctrlWheel, { capture: true, passive: false });
        }}
        camera={{ position: [10.5, 4.2, 13.5], fov: 75, near: 0.05, far: 200 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene />
        <LongPressDetector onOpen={onOpen} onPressProgress={onPressProgress} />
      </Canvas>
      <LongPressIndicator pressRef={pressRef} />
      {editor && (
        <LongPressModal
          kind={editor.kind}
          screenX={editor.screenX}
          screenY={editor.screenY}
          onClose={() => setEditor(null)}
        />
      )}
      {/* Cube-plinth picker — DOM-portal modal opened by the in-canvas
          "+" hotspot. Lives outside the canvas so its menu reads as a
          flat 2D editor menu instead of a webgl-scaled in-scene panel. */}
      <CubePickerModal />
    </>
  );
}
