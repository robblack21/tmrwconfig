"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useConfig } from "@/lib/store/configStore";
import { useLive } from "@/lib/store/liveStore";

// Minimal duck-type for drei's OrbitControls (avoids three-stdlib dep).
type OrbitControlsLike = {
  target: THREE.Vector3;
  update: () => void;
  /** Drei's OrbitControls dispatches "start" + "end" events around any
   *  drag / zoom / pan. We use these to suppress the yaw breathing
   *  animation while the user is actively interacting so it can't
   *  fight or compound their input. */
  addEventListener?: (event: string, fn: () => void) => void;
  removeEventListener?: (event: string, fn: () => void) => void;
};

/** Named camera presets — interior boardroom views { camera pos, look-at
 *  target, fov }. Tuned for the default mid-size room; OrbitControls handles
 *  the rest as the user resizes. */
// Default room is ~6×6m so the front wall sits at z=+3.0m. Every preset
// keeps the camera at least ~0.6m inside that wall so a tiny orbit drag
// can't immediately punch through. The per-frame clamp in `Scene.tsx`
// (OrbitControls maxDistance + room-bounds correction) handles wider
// rooms / aggressive user dragging.
export const CAMERA_PRESETS: Record<string, { pos: [number, number, number]; target: [number, number, number]; fov: number }> = {
  // Inside the room — 3/4 view from a front corner, across the table.
  hero:    { pos: [3.6, 2.0, 2.4],  target: [-0.4, 0.9, -0.6], fov: 42 },
  // From just inside the door, looking down the table at the back / video wall.
  front:   { pos: [0, 1.85, 2.4],   target: [0, 1.3, -3.0],    fov: 50 },
  // Along one side wall, looking across to the windowed wall opposite.
  side:    { pos: [4.2, 1.8, 0],    target: [-4.2, 1.1, 0],    fov: 50 },
  // High interior angle — reads the table + chair formation from above.
  top:     { pos: [0.01, 3.4, 2.8], target: [0, 0.7, -0.6],    fov: 52 },
  // Low, wide shot down the length of the room.
  pendant: { pos: [0, 1.2, 2.2],    target: [0, 1.6, -2.8],    fov: 56 },
  // Tight on the head of the table + nearest chairs.
  closeup: { pos: [1.6, 1.3, 1.9],  target: [0, 0.78, 0],      fov: 42 },
};

/** First-load "entry" view — camera pulls in from 2.5× further away with
 * 2.5× tighter FOV, then animates to the hero preset. Gives a cinematic
 * wide-then-zoom-in reveal. Computed once relative to hero. */
const HERO = CAMERA_PRESETS["hero"]!;
export const CAMERA_ENTRY = {
  pos: [
    HERO.target[0] + (HERO.pos[0] - HERO.target[0]) * 2.5,
    HERO.target[1] + (HERO.pos[1] - HERO.target[1]) * 2.5,
    HERO.target[2] + (HERO.pos[2] - HERO.target[2]) * 2.5,
  ] as [number, number, number],
  target: HERO.target,
  fov: HERO.fov / 2.5,
};

/**
 * Lives inside the Canvas. Subscribes to camera-related store fields and
 * applies them to the actual three.js camera; surfaces live camera state
 * back to the liveStore at 60Hz. Animation between presets uses framer-style
 * lerp toward the target until close enough.
 */
export function CameraSync() {
  const { camera, controls } = useThree();
  const cameraFov = useConfig((s) => s.cameraFov);
  const cameraPreset = useConfig((s) => s.cameraPreset);
  const yawBreathEnabled = useConfig((s) => s.cameraYawBreathEnabled);
  const cameraPresetOverrides = useConfig((s) => s.cameraPresetOverrides);
  const cameraEntryFired = useConfig((s) => s.cameraEntryFired);
  const apply = useConfig((s) => s.apply);

  // Target state being animated toward; null when at-rest.
  const animRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3; t: number } | null>(null);
  // Entry runs exactly once — guarded by a ref so dep changes (controls
  // arriving after mount, the store flag flipping) can't re-run it.
  const entryFiredRef = useRef(false);
  // Yaw breathing — small ±10° back-and-forth on the camera ORBIT around
  // its target, applied on top of OrbitControls. Pauses while the user is
  // dragging (drei's controls fire `start`/`end` events) so it can never
  // compound or fight user input.
  const interactingRef = useRef(false);
  // The "anchored" position the breathing oscillation orbits AROUND. This
  // gets re-captured whenever the user releases (the camera's resting
  // pose becomes the new anchor for the next breathe cycle).
  const anchorRef = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const lastYawDeltaRef = useRef(0);

  // Wire up the OrbitControls interaction events so we know when to
  // pause the breath. Re-runs when `controls` arrives after mount.
  useEffect(() => {
    const ctrl = controls as unknown as OrbitControlsLike | null;
    if (!ctrl?.addEventListener || !ctrl.removeEventListener) return;
    const onStart = () => {
      interactingRef.current = true;
      // Wipe any partial offset so the user starts from a clean pose.
      lastYawDeltaRef.current = 0;
      anchorRef.current = null;
    };
    const onEnd = () => {
      interactingRef.current = false;
      // Capture the new anchor lazily — defer to the next useFrame so
      // any in-flight damping settles first.
    };
    ctrl.addEventListener("start", onStart);
    ctrl.addEventListener("end", onEnd);
    return () => {
      ctrl.removeEventListener?.("start", onStart);
      ctrl.removeEventListener?.("end", onEnd);
    };
  }, [controls]);

  // When a preset transition starts, drop any existing anchor so the
  // breath relocks to wherever the preset lands.
  useEffect(() => {
    if (cameraPreset) {
      anchorRef.current = null;
      lastYawDeltaRef.current = 0;
    }
  }, [cameraPreset]);

  // Apply FOV whenever the slider changes.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.isPerspectiveCamera) {
      cam.fov = cameraFov;
      cam.updateProjectionMatrix();
    }
  }, [cameraFov, camera]);

  // First-load entry: snap to a wide pulled-back view, then animate to hero.
  // The hero-transition timer is fire-and-forget — deliberately NOT cleared on
  // cleanup, since a dep change (controls arriving, the flag flipping) would
  // otherwise cancel it and leave the camera stuck in the dollied entry pose.
  useEffect(() => {
    if (entryFiredRef.current || cameraEntryFired) return;
    entryFiredRef.current = true;
    const cam = camera as THREE.PerspectiveCamera;
    const ctrl = controls as unknown as OrbitControlsLike | null;
    if (cam.isPerspectiveCamera) {
      cam.position.set(...CAMERA_ENTRY.pos);
      cam.fov = CAMERA_ENTRY.fov;
      cam.lookAt(...CAMERA_ENTRY.target);
      cam.updateProjectionMatrix();
    }
    // Sync the orbit pivot to the look-at target so OrbitControls rotates
    // around what the camera is actually facing — not a stale origin.
    if (ctrl?.target) {
      ctrl.target.set(...CAMERA_ENTRY.target);
      ctrl.update();
    }
    apply({ type: "camera.setFov", value: CAMERA_ENTRY.fov });
    apply({ type: "camera.markEntryFired" });
    setTimeout(() => apply({ type: "camera.gotoPreset", preset: "hero" }), 350);
  }, [cameraEntryFired, camera, controls, apply]);

  // Trigger a preset move when cameraPreset is set; consume + clear it.
  useEffect(() => {
    if (!cameraPreset) return;
    const override = cameraPresetOverrides[cameraPreset];
    const p = override ?? CAMERA_PRESETS[cameraPreset];
    if (!p) return;
    animRef.current = {
      pos: new THREE.Vector3(...p.pos),
      target: new THREE.Vector3(...p.target),
      t: 0,
    };
    apply({ type: "camera.setFov", value: p.fov });
    apply({ type: "camera.gotoPreset", preset: "" });
  }, [cameraPreset, cameraPresetOverrides, apply]);

  // Each frame: animate the camera (if a preset is in flight) and push state.
  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const ctrl = controls as unknown as OrbitControlsLike | null;

    if (animRef.current) {
      const a = animRef.current;
      a.t = Math.min(1, a.t + dt * 0.9); // ~1.1s total — slower for cinematic feel
      const ease = easeOutCubic(a.t);
      cam.position.lerp(a.pos, ease - (a.t === 1 ? 0 : 0));
      if (ctrl?.target) {
        ctrl.target.lerp(a.target, ease);
        ctrl.update();
      }
      cam.lookAt(a.target);
      if (a.t >= 1) {
        cam.position.copy(a.pos);
        if (ctrl?.target) {
          ctrl.target.copy(a.target);
          ctrl.update();
        }
        animRef.current = null;
        // Anchor the breath to wherever the preset landed.
        anchorRef.current = {
          pos: cam.position.clone(),
          target: ctrl?.target?.clone() ?? new THREE.Vector3(),
        };
        lastYawDeltaRef.current = 0;
      }
    } else if (yawBreathEnabled && !interactingRef.current) {
      // Yaw breathing — orbit the camera ±10° around its target with a
      // VERY slow sine wave (60s period — 5× slower than the original 12s
      // so it reads as ambient room rotation rather than a moving camera).
      // Only runs when the wizard has opted in (cameraYawBreathEnabled in
      // the store) — main editor stays static so users can frame work.
      // Applied as an INCREMENTAL delta each frame so OrbitControls'
      // damping / inertia still act normally; we only inject the delta-
      // since-last-frame.
      //
      // The anchor is captured the first frame after a settle. Without
      // it, the very first breathe would jump because we'd be comparing
      // a fresh phase to no prior position.
      if (!anchorRef.current && ctrl?.target) {
        anchorRef.current = {
          pos: cam.position.clone(),
          target: ctrl.target.clone(),
        };
        lastYawDeltaRef.current = 0;
      }
      if (anchorRef.current && ctrl?.target) {
        // 60s period → 2π / 60 rad/s. Amplitude ±10° (0.1745 rad).
        const PERIOD_S = 60;
        const omega = (2 * Math.PI) / PERIOD_S;
        const amp = (10 * Math.PI) / 180;
        const phase = (Date.now() % (PERIOD_S * 1000)) / 1000;
        const yaw = Math.sin(phase * omega) * amp;
        const dYaw = yaw - lastYawDeltaRef.current;
        lastYawDeltaRef.current = yaw;
        if (Math.abs(dYaw) > 1e-5) {
          // Rotate the camera around the target's Y axis by dYaw.
          const t = ctrl.target;
          const v = cam.position.clone().sub(t);
          const sin = Math.sin(dYaw);
          const cos = Math.cos(dYaw);
          const x =  v.x * cos + v.z * sin;
          const z = -v.x * sin + v.z * cos;
          cam.position.set(t.x + x, cam.position.y, t.z + z);
          cam.lookAt(t);
          ctrl.update();
        }
      }
    }

    // Push live state at a tame interval (every frame is fine for one tiny store)
    const { camPos, camTarget } = useLive.getState();
    const target = ctrl?.target ?? new THREE.Vector3();
    const px = round2(cam.position.x), py = round2(cam.position.y), pz = round2(cam.position.z);
    const tx = round2(target.x),       ty = round2(target.y),       tz = round2(target.z);
    if (camPos[0] !== px || camPos[1] !== py || camPos[2] !== pz || camTarget[0] !== tx || camTarget[1] !== ty || camTarget[2] !== tz) {
      useLive.setState({ camPos: [px, py, pz], camTarget: [tx, ty, tz] });
    }
  });

  return null;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
