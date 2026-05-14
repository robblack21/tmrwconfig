"use client";
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "@/lib/assetPath";
import { normalizeForBase } from "./KitProps";

// ── Boardroom furniture — the configurator centrepiece ───────────────────────
// User-supplied GLBs under /components/{tables,chairs}/. The table resizes
// non-parametrically (one rigid object scaled to a requested footprint at a
// fixed standard height); chairs are normalised to a standard height and
// arranged in a formation around the table, each facing the table centre.

export type TableVariant = "main" | "secondary" | "presenter" | "simple";
export type ChairVariant = "studio" | "executive" | "office" | "presenter";

export const TABLE_VARIANTS: Record<TableVariant, string> = {
  main:      asset("/glb/tables/ny_studio_main_table.glb"),
  secondary: asset("/glb/tables/ny_studio_secondary_table.glb"),
  presenter: asset("/glb/tables/presenter_table_white.glb"),
  simple:    asset("/glb/tables/simple_table_low_poly.glb"),
};

export const CHAIR_VARIANTS: Record<ChairVariant, string> = {
  studio:    asset("/glb/chairs/ny_studio_chair.glb"),
  executive: asset("/glb/chairs/executive_chair.glb"),
  office:    asset("/glb/chairs/executive_office_chair.glb"),
  presenter: asset("/glb/chairs/presenter_single_chair_white.glb"),
};

useGLTF.preload(TABLE_VARIANTS.main);
useGLTF.preload(CHAIR_VARIANTS.studio);

const TABLE_HEIGHT_M = 0.74;        // standard boardroom-table height
const CHAIR_HEIGHT_M = 1.05;        // office chair, floor to top of backrest

// The ny_studio chair GLB faces away from +Z in its bind pose, so the
// formation rotations land it facing outward — flip it 180° to face the table.
const CHAIR_FACE_OFFSET = Math.PI;

// ── Table ────────────────────────────────────────────────────────────────────
// Non-parametric resize: the GLB is recentred, its base pinned to the floor,
// its longer horizontal axis oriented along the room depth, then scaled to the
// requested length × width footprint with the height pinned to standard.

export function BoardroomTable({
  variant, lengthM, widthM, position,
}: { variant: TableVariant; lengthM: number; widthM: number; position: [number, number, number] }) {
  const gltf = useGLTF(TABLE_VARIANTS[variant]);
  const { node, scale, rotY } = useMemo(() => {
    const s = (gltf?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    s.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(s);
    const size = new THREE.Vector3(); box.getSize(size);
    const center = new THREE.Vector3(); box.getCenter(center);
    if (!isFinite(size.x) || size.x < 1e-4 || size.y < 1e-4 || size.z < 1e-4) {
      return { node: s, scale: [1, 1, 1] as [number, number, number], rotY: 0 };
    }
    // Recentre in the model's own frame: base to y=0, centred in XZ.
    s.position.set(-center.x, -box.min.y, -center.z);
    // Orient the longer horizontal axis along room depth (Z).
    const rotateToZ = size.x > size.z;
    const extentAlongX = rotateToZ ? size.z : size.x;
    const extentAlongZ = rotateToZ ? size.x : size.z;
    return {
      node: s,
      scale: [widthM / extentAlongX, TABLE_HEIGHT_M / size.y, lengthM / extentAlongZ] as [number, number, number],
      rotY: rotateToZ ? Math.PI / 2 : 0,
    };
  }, [gltf, lengthM, widthM, variant]);
  return (
    <group position={position}>
      <group scale={scale}>
        <group rotation-y={rotY}>
          <primitive object={node} />
        </group>
      </group>
    </group>
  );
}

// ── Chair ────────────────────────────────────────────────────────────────────

function BoardroomChair({
  url, position, rotationY,
}: { url: string; position: [number, number, number]; rotationY: number }) {
  const gltf = useGLTF(url);
  const node = useMemo(() => {
    const s = (gltf?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return normalizeForBase(s, CHAIR_HEIGHT_M);
  }, [gltf]);
  return (
    <group position={position} rotation-y={rotationY + CHAIR_FACE_OFFSET}>
      <primitive object={node} />
    </group>
  );
}

// ── Chair formation ──────────────────────────────────────────────────────────
// `count` chairs arranged around a `tableLengthM` × `tableWidthM` table, every
// chair offset off the table edge and rotated to face the table centre.

export function ChairsAroundTable({
  count, tableLengthM, tableWidthM, chairVariant, position,
}: {
  count: number; tableLengthM: number; tableWidthM: number;
  chairVariant: ChairVariant; position: [number, number, number];
}) {
  const url = CHAIR_VARIANTS[chairVariant];
  const slots = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number }[] = [];
    if (count <= 0) return out;
    const gap = 0.42;                                  // chair offset from the table edge
    const sideX = tableWidthM / 2 + gap;
    const endZ = tableLengthM / 2 + gap;
    const endN = count >= 4 ? Math.min(2, count) : 0;  // head + foot once there's room
    const sideTotal = count - endN;
    const leftN = Math.ceil(sideTotal / 2);
    const rightN = sideTotal - leftN;
    const spanZ = Math.max(0.01, tableLengthM - 0.8);  // keep chairs off the corners
    const place = (n: number, i: number) => (n <= 1 ? 0 : -spanZ / 2 + (i * spanZ) / (n - 1));
    // Left side faces +X, right side faces -X, ends face the centre along Z.
    for (let i = 0; i < leftN; i++)  out.push({ pos: [-sideX, 0, place(leftN, i)],  rot: Math.PI / 2 });
    for (let i = 0; i < rightN; i++) out.push({ pos: [sideX, 0, place(rightN, i)],  rot: -Math.PI / 2 });
    if (endN >= 1) out.push({ pos: [0, 0, -endZ], rot: 0 });
    if (endN >= 2) out.push({ pos: [0, 0, endZ], rot: Math.PI });
    return out;
  }, [count, tableLengthM, tableWidthM]);
  return (
    <group position={position}>
      {slots.map((s, i) => (
        <BoardroomChair key={i} url={url} position={s.pos} rotationY={s.rot} />
      ))}
    </group>
  );
}
