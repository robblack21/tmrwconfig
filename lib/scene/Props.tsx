"use client";
import { Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "@/lib/assetPath";

useGLTF.preload(asset("/glb/props/hanging_monitor.glb"));
useGLTF.preload(asset("/glb/props/formulate_counter_oval_tradeshow_display.glb"));
useGLTF.preload(asset("/glb/props/sofa_free_version.glb"));
useGLTF.preload(asset("/glb/props/coffee_table_avarta.glb"));
useGLTF.preload(asset("/glb/props/coffee_table_01.glb"));
useGLTF.preload(asset("/glb/props/kumo_white_coffee_table.glb"));
useGLTF.preload(asset("/glb/plants/snake_plant.glb"));
useGLTF.preload(asset("/glb/plants/hexapot.glb"));
useGLTF.preload(asset("/glb/plants/tree_s2.glb"));
useGLTF.preload(asset("/glb/plants/cactus.glb"));
useGLTF.preload(asset("/glb/plants/tarro_tipo_lechuza.glb"));

function useNormalizedScene(url: string, targetHeightM: number, tintHex?: string, yLift = 0) {
  const gltf = useGLTF(url);
  return useMemo(() => {
    if (!gltf?.scene) return new THREE.Group();
    const scene = gltf.scene.clone(true);

    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        if (m.geometry && !m.geometry.boundingBox) m.geometry.computeBoundingBox();
        m.castShadow = true;
        m.receiveShadow = true;
        if (tintHex) {
          const mat = m.material as THREE.MeshStandardMaterial | undefined;
          if (mat && "color" in mat) {
            const next = mat.clone();
            next.color = new THREE.Color(tintHex);
            m.material = next;
          }
        }
      }
    });

    // Strip out orphan sub-meshes that live far from the bulk of the object.
    // (Some glbs export hidden helpers / locators at extreme coordinates, which
    // then materialise as tiny far-away props in the scene.)
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) meshes.push(m);
    });
    if (meshes.length > 0) {
      // Find the largest mesh by volume — that's the "real" subject.
      let largest: THREE.Mesh | null = null;
      let largestVol = -1;
      for (const m of meshes) {
        const bb = m.geometry.boundingBox;
        if (!bb) continue;
        const v = (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z);
        if (v > largestVol) { largestVol = v; largest = m; }
      }
      if (largest) {
        const refBox = new THREE.Box3().setFromObject(largest);
        const refCenter = new THREE.Vector3();
        refBox.getCenter(refCenter);
        const refSize = new THREE.Vector3();
        refBox.getSize(refSize);
        const refRadius = Math.max(refSize.x, refSize.y, refSize.z);
        // Anything whose own bbox centre is > 3× refRadius from the main subject
        // is treated as a stray helper and removed.
        const stale: THREE.Object3D[] = [];
        for (const m of meshes) {
          if (m === largest) continue;
          const b = new THREE.Box3().setFromObject(m);
          const c = new THREE.Vector3();
          b.getCenter(c);
          if (c.distanceTo(refCenter) > refRadius * 3) stale.push(m);
        }
        for (const m of stale) {
          m.parent?.remove(m);
        }
      }
    }

    // Box3 from visible meshes only, using `precise=true` so skinned + morph
    // meshes are measured against actual vertex positions instead of their
    // bind-pose bounding box (which is often way larger).
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    box.makeEmpty();
    const tmp = new THREE.Box3();
    scene.traverseVisible((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (/(helper|debug|bound|collider|navmesh|shadowproxy|shadow|ground|floor|plane_floor|backdrop)/i.test(m.name)) return;
      tmp.setFromObject(m, true);
      if (isFinite(tmp.min.x)) box.union(tmp);
    });
    if (box.isEmpty() || !isFinite(box.min.x) || !isFinite(box.max.x)) {
      return new THREE.Group();
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Pass 1 — multiplyScalar instead of setScalar so we don't nuke a GLB's
    // baked-in root scale (cm→m, inch→m, etc.). The offset uses the
    // already-scaled extents from `box` × the new scale ratio.
    const k = targetHeightM / Math.max(size.y, 1e-6);
    scene.scale.multiplyScalar(k);
    scene.position.sub(new THREE.Vector3(center.x * k, box.min.y * k - yLift, center.z * k));

    // Pass 2 — re-measure post-scale and correct any residual offset.
    scene.updateMatrixWorld(true);
    const box2 = new THREE.Box3();
    box2.makeEmpty();
    const tmp2 = new THREE.Box3();
    scene.traverseVisible((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry) return;
      if (/(helper|debug|bound|collider|navmesh|shadowproxy|shadow|ground|floor|plane_floor|backdrop)/i.test(m.name)) return;
      tmp2.setFromObject(m, true);
      if (isFinite(tmp2.min.x)) box2.union(tmp2);
    });
    if (!box2.isEmpty() && isFinite(box2.min.y) && Math.abs(box2.min.y - yLift) > 1e-3) {
      scene.position.y += yLift - box2.min.y;
    }
    // Belt-and-braces: re-measure the FULL bbox (no helper filter) and
    // lift if the lowest visible point still dips below the intended
    // base. Catches plants whose saucer / pot mesh is literally named
    // "floor" / "ground" etc and got filtered out of the measurement
    // pass — left plant variants were embedding in the floor by ~10cm
    // for exactly this reason. Cap the lift at 0.5m so we don't paper
    // over a far-away stray helper (those should be removed, not lifted).
    scene.updateMatrixWorld(true);
    const fullBox = new THREE.Box3().setFromObject(scene, true);
    if (isFinite(fullBox.min.y) && fullBox.min.y < yLift) {
      const dip = yLift - fullBox.min.y;
      if (dip < 0.5) scene.position.y += dip;
    }
    return scene;
  }, [gltf, targetHeightM, tintHex, yLift]);
}

function PropMount({
  url,
  heightM,
  position,
  rotationY = 0,
  tintHex,
  yLift = 0,
}: {
  url: string;
  heightM: number;
  position: [number, number, number];
  rotationY?: number;
  tintHex?: string;
  yLift?: number;
}) {
  const obj = useNormalizedScene(url, heightM, tintHex, yLift);
  return (
    <Suspense fallback={null}>
      <primitive object={obj} position={position} rotation-y={rotationY} />
    </Suspense>
  );
}

export function TvOnStand(props: { position: [number, number, number]; rotationY?: number; heightM?: number }) {
  // Switched from the stand-mounted TV to a hanging monitor — pairs better
  // with wall-mounted placement next to the LED video wall.
  return <PropMount url={asset("/glb/props/hanging_monitor.glb")} heightM={props.heightM ?? 1.0} position={props.position} rotationY={props.rotationY} />;
}

export function Counter(props: { position: [number, number, number]; rotationY?: number; heightM?: number; tintHex?: string }) {
  return <PropMount url={asset("/glb/props/formulate_counter_oval_tradeshow_display.glb")} heightM={props.heightM ?? 1.05} position={props.position} rotationY={props.rotationY} tintHex={props.tintHex} />;
}

export function Sofa(props: { position: [number, number, number]; rotationY?: number; heightM?: number; tintHex?: string }) {
  return <PropMount url={asset("/glb/props/sofa_free_version.glb")} heightM={props.heightM ?? 0.85} position={props.position} rotationY={props.rotationY} tintHex={props.tintHex} />;
}

const COFFEE_TABLE_URL: Record<"avarta" | "kumo" | "geo", string> = {
  avarta: asset("/glb/props/coffee_table_avarta.glb"),
  kumo:   asset("/glb/props/kumo_white_coffee_table.glb"),
  geo:    asset("/glb/props/coffee_table_01.glb"),
};

export function CoffeeTable({
  variant = "avarta",
  ...props
}: { variant?: "avarta" | "kumo" | "geo"; position: [number, number, number]; rotationY?: number; heightM?: number }) {
  return <PropMount url={COFFEE_TABLE_URL[variant]} heightM={props.heightM ?? 0.45} position={props.position} rotationY={props.rotationY} />;
}

type PlantKind = "snake" | "hexapot" | "tree" | "cactus" | "tarro";
const plantUrl: Record<PlantKind, string> = {
  snake: asset("/glb/plants/snake_plant.glb"),
  hexapot: asset("/glb/plants/hexapot.glb"),
  tree: asset("/glb/plants/tree_s2.glb"),
  cactus: asset("/glb/plants/cactus.glb"),
  tarro: asset("/glb/plants/tarro_tipo_lechuza.glb"),
};

export function Plant({
  kind,
  position,
  rotationY = 0,
  heightM = 1.4,
}: {
  kind: PlantKind;
  position: [number, number, number];
  rotationY?: number;
  heightM?: number;
}) {
  return <PropMount url={plantUrl[kind]} heightM={heightM} position={position} rotationY={rotationY} />;
}
