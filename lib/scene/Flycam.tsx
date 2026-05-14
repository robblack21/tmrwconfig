"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// WASD + QE flycam, IJKL look — translates and rotates the camera while
// keeping the OrbitControls target in sync, so subsequent orbiting stays
// around the new vantage point.
//
//   W / S  — forward / back along the camera's look vector (horizontal only)
//   A / D  — strafe left / right
//   Q / E  — ascend / descend (world Y)
//   I / K  — look up / down
//   J / L  — look left / right
//
// Hold Shift to speed up.

type OrbitControlsLike = { target: THREE.Vector3; update: () => void };

export function Flycam({ speed = 6 }: { speed?: number }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls as unknown as OrbitControlsLike | null);
  const keys = useRef({
    w: false, a: false, s: false, d: false, q: false, e: false,
    i: false, j: false, k: false, l: false, shift: false,
  });

  useEffect(() => {
    const map: Record<string, keyof typeof keys.current> = {
      w: "w", a: "a", s: "s", d: "d", q: "q", e: "e",
      i: "i", j: "j", k: "k", l: "l",
      arrowup: "w", arrowleft: "a", arrowdown: "s", arrowright: "d",
    };
    const down = (e: KeyboardEvent) => {
      // Ignore when typing into inputs/textareas (YouTube ID field, etc.)
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (key === "shift") { keys.current.shift = true; return; }
      const slot = map[key];
      if (slot) { keys.current[slot] = true; e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "shift") { keys.current.shift = false; return; }
      const slot = map[key];
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
    const moveActive = k.w || k.a || k.s || k.d || k.q || k.e;
    const lookActive = k.i || k.j || k.k || k.l;
    if (!moveActive && !lookActive) return;

    // ── Translation (WASD + QE) ──────────────────────────────────────────────
    if (moveActive) {
      const s = (k.shift ? 3 : 1) * speed * dt;
      camera.getWorldDirection(fwd);
      fwd.y = 0;                                       // keep W/S horizontal
      if (fwd.lengthSq() >= 1e-6) {
        fwd.normalize();
        right.crossVectors(fwd, up).normalize();
        const delta = new THREE.Vector3();
        if (k.w) delta.add(fwd);
        if (k.s) delta.sub(fwd);
        if (k.d) delta.add(right);
        if (k.a) delta.sub(right);
        if (k.q) delta.y += 1;
        if (k.e) delta.y -= 1;
        if (delta.lengthSq() >= 1e-6) {
          delta.normalize().multiplyScalar(s);
          camera.position.add(delta);
          if (controls?.target) {
            controls.target.add(delta);
            controls.update();
          }
        }
      }
    }

    // ── Look (IJKL) — orbit the look-at target around the camera position ────
    if (lookActive && controls?.target) {
      const rot = (k.shift ? 2.4 : 1.1) * dt;          // radians / second-ish
      const toTarget = controls.target.clone().sub(camera.position);
      // Yaw — rotate around world up.
      let yaw = 0;
      if (k.j) yaw += rot;
      if (k.l) yaw -= rot;
      if (yaw) toTarget.applyAxisAngle(up, yaw);
      // Pitch — rotate around the camera's right axis, clamped off-vertical.
      let pitch = 0;
      if (k.i) pitch += rot;
      if (k.k) pitch -= rot;
      if (pitch) {
        const r = new THREE.Vector3().crossVectors(up, toTarget);
        if (r.lengthSq() > 1e-6) {
          r.normalize();
          const horiz = Math.hypot(toTarget.x, toTarget.z);
          const cur = Math.atan2(toTarget.y, horiz);
          const next = THREE.MathUtils.clamp(cur + pitch, -1.35, 1.35);
          if (next !== cur) toTarget.applyAxisAngle(r, next - cur);
        }
      }
      controls.target.copy(camera.position).add(toTarget);
      controls.update();
    }
  });

  return null;
}
