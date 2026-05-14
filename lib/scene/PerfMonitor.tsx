"use client";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useConfig } from "@/lib/store/configStore";

// Watches the rolling frame-rate. If it sags below the threshold for a
// sustained window, drops the DPR to 1× and then further to 0.5× (super-cheap
// half-resolution). NEVER touches render mode any more — the user wants
// visualisation kept on at all costs.
export function PerfMonitor({
  thresholdFps = 25,
  windowSec = 3,
}: { thresholdFps?: number; windowSec?: number }) {
  const highDpr = useConfig((s) => s.highDpr);
  const dprFloor = useConfig((s) => s.dprFloor);
  const apply = useConfig((s) => s.apply);
  const sluggishSince = useRef<number | null>(null);
  const fps = useRef(60);

  useFrame((_, dt) => {
    const inst = 1 / Math.max(dt, 1e-4);
    fps.current = fps.current * 0.92 + inst * 0.08;
    const now = performance.now();
    if (fps.current < thresholdFps) {
      sluggishSince.current ??= now;
      if (now - sluggishSince.current > windowSec * 1000) {
        if (highDpr) {
          apply({ type: "scene.setHighDpr", value: false });
          sluggishSince.current = now;
        } else if (dprFloor !== 0.5) {
          apply({ type: "scene.setDprFloor", value: 0.5 });
          sluggishSince.current = now;
        }
      }
    } else {
      sluggishSince.current = null;
    }
  });
  return null;
}
