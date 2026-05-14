"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// WASD + QE flycam — translates the camera and the OrbitControls target
// together so subsequent orbiting stays around the new vantage point.
//
//   W / S  — forward / back along the camera's look vector (horizontal only)
//   A / D  — strafe left / right
//   Q / E  — ascend / descend (world Y)
//
// Hold Shift to triple the speed.

type OrbitControlsLike = { target: THREE.Vector3; update: () => void };

export function Flycam({ speed = 6 }: { speed?: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls as unknown as OrbitControlsLike | null);
  const keys = useRef({ w: false, a: false, s: false, d: false, q: false, e: false, shift: false });

  useEffect(() => {
    const map: Record<string, keyof typeof keys.current> = {
      w: "w", a: "a", s: "s", d: "d", q: "q", e: "e",
      arrowup: "w", arrowleft: "a", arrowdown: "s", arrowright: "d",
    };
    const down = (e: KeyboardEvent) => {
      // Ignore when typing into inputs/textareas (YouTube ID field, etc.)
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as HTMLElement).isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "shift") { keys.current.shift = true; return; }
      const slot = map[k];
      if (slot) { keys.current[slot] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "shift") { keys.current.shift = false; return; }
      const slot = map[k];
      if (slot) { keys.current[slot] = false; }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  useFrame((_, dt) => {
    const k = keys.current;
    const active = k.w || k.a || k.s || k.d || k.q || k.e;
    if (!active) return;
    const s = (k.shift ? 3 : 1) * speed * dt;

    camera.getWorldDirection(fwd);
    // Constrain forward to the horizontal plane so W/S don't tilt the camera.
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) return;
    fwd.normalize();
    right.crossVectors(fwd, up).normalize();

    const delta = new THREE.Vector3();
    if (k.w) delta.add(fwd);
    if (k.s) delta.sub(fwd);
    if (k.d) delta.add(right);
    if (k.a) delta.sub(right);
    // Q = up, E = down (was the other way around).
    if (k.q) delta.y += 1;
    if (k.e) delta.y -= 1;
    if (delta.lengthSq() < 1e-6) return;
    delta.normalize().multiplyScalar(s);

    camera.position.add(delta);
    if (controls?.target) {
      controls.target.add(delta);
      controls.update();
    }
  });

  return null;
}
