"use client";
import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { Scene } from "./Scene";
import { useConfig } from "@/lib/store/configStore";
import { LongPressDetector, LongPressModal } from "./LongPressEditor";

export default function CanvasShell() {
  const highDpr = useConfig((s) => s.highDpr);
  const dprFloor = useConfig((s) => s.dprFloor);
  // dprFloor (0.5 or 1) is the absolute lower bound — PerfMonitor drops to
  // 0.5 only when FPS stays under 25 for 3 s after DPR is already at 1×.
  const dpr: [number, number] = highDpr ? [dprFloor, 2] : [dprFloor, 1];
  // Long-press surface editor — the detector lives inside the canvas to
  // raycast, but the modal portals to document.body so it can render plain
  // DOM controls (colour input, swatch buttons) overlaid on the canvas.
  const [editor, setEditor] = useState<{ kind: "walls" | "floor" | "ceiling" | "table" | "chair" | "pendant" | "truss"; screenX: number; screenY: number } | null>(null);
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
        }}
        camera={{ position: [10.5, 4.2, 13.5], fov: 30, near: 0.05, far: 200 }}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene />
        <LongPressDetector onOpen={(kind, screenX, screenY) => setEditor({ kind, screenX, screenY })} />
      </Canvas>
      {editor && (
        <LongPressModal
          kind={editor.kind}
          screenX={editor.screenX}
          screenY={editor.screenY}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
