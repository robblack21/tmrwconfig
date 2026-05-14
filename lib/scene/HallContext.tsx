"use client";
import { Suspense, useMemo, useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "@/lib/assetPath";

useGLTF.preload(asset("/glb/exhibitionhall/vr_exhibition_gallery_baked.glb"));
useGLTF.preload(asset("/glb/exhibitionhall/warehouse_fbx_model_free.glb"));

const HALL_URLS: Record<"gallery.light" | "warehouse.dark", string> = {
  "gallery.light": asset("/glb/exhibitionhall/vr_exhibition_gallery_baked.glb"),
  "warehouse.dark": asset("/glb/exhibitionhall/warehouse_fbx_model_free.glb"),
};

export function HallContext({
  mode,
  targetWidthM = 50,
  opacity = 0.9,
  darkness = 0,
}: {
  mode: "gallery.light" | "warehouse.dark";
  targetWidthM?: number;
  opacity?: number;
  darkness?: number;
}) {
  return (
    <Suspense fallback={null}>
      <HallContextInner mode={mode} targetWidthM={targetWidthM} opacity={opacity} darkness={darkness} />
    </Suspense>
  );
}

function HallContextInner({
  mode, targetWidthM, opacity, darkness,
}: { mode: "gallery.light" | "warehouse.dark"; targetWidthM: number; opacity: number; darkness: number }) {
  const url = HALL_URLS[mode];
  const gltf = useGLTF(url);

  // Build the clone + geometry once per (gltf, targetWidthM); store originals in a ref.
  const originalsRef = useRef<Map<THREE.Material, { color: THREE.Color; emissive?: THREE.Color; metalness: number; roughness: number }>>(new Map());

  const scene = useMemo(() => {
    if (!gltf?.scene) return new THREE.Group();
    const s = gltf.scene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry && !m.geometry.boundingBox) m.geometry.computeBoundingBox();
    });
    const rawBox = new THREE.Box3().setFromObject(s);
    if (!isFinite(rawBox.min.x) || !isFinite(rawBox.max.x)) return new THREE.Group();
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);
    const k = targetWidthM / Math.max(rawSize.x, 1e-6);
    s.scale.setScalar(k);
    const scaledBox = new THREE.Box3().setFromObject(s);
    const scaledCentre = new THREE.Vector3();
    scaledBox.getCenter(scaledCentre);
    s.position.set(-scaledCentre.x, -scaledBox.min.y - 0.01, -scaledCentre.z);

    // Snapshot original materials so we can lerp from them each render.
    const origs = new Map<THREE.Material, { color: THREE.Color; emissive?: THREE.Color; metalness: number; roughness: number }>();
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = false;
        const mat = m.material as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial | undefined;
        if (mat && "color" in mat && !origs.has(mat)) {
          origs.set(mat, {
            color: mat.color.clone(),
            emissive: "emissive" in mat && mat.emissive ? mat.emissive.clone() : undefined,
            metalness: "metalness" in mat ? mat.metalness ?? 0 : 0,
            roughness: "roughness" in mat ? mat.roughness ?? 0.5 : 0.5,
          });
        }
      }
    });
    originalsRef.current = origs;
    return s;
  }, [gltf, targetWidthM]);

  // Re-apply darkening + opacity on every render based on originals (no mutation drift).
  useEffect(() => {
    for (const [mat, orig] of originalsRef.current) {
      const phys = mat as THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
      const targetGray = (0.299 * orig.color.r + 0.587 * orig.color.g + 0.114 * orig.color.b) * 0.18;
      phys.color.setRGB(
        orig.color.r * (1 - darkness) + targetGray * darkness,
        orig.color.g * (1 - darkness) + targetGray * darkness,
        orig.color.b * (1 - darkness) + targetGray * darkness,
      );
      if (orig.emissive && "emissive" in phys && phys.emissive) {
        phys.emissive.copy(orig.emissive).multiplyScalar(1 - darkness);
      }
      if ("metalness" in phys) phys.metalness = orig.metalness * (1 - darkness);
      if ("roughness" in phys) phys.roughness = Math.min(1, orig.roughness + darkness * 0.4);
      phys.transparent = opacity < 1;
      phys.opacity = opacity;
      phys.depthWrite = opacity >= 0.95;
      phys.needsUpdate = true;
    }
  }, [darkness, opacity, scene]);

  return <primitive object={scene} />;
}
