"use client";
import { Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { BrandKit } from "@/lib/schemas";

// ── Per-kit hero-asset manifest ──────────────────────────────────────────────
// Each brand "room" can show a handful of brand-hero GLBs (the models in
// /components/brand-hero/<slug>/). A kit lists them in `scene.props`; the
// dispatcher below loads, normalises and places each one — optionally on a
// plinth so small objects (watches, shoes, phones) read at eye line while
// large ones (cars) sit straight on the floor.

export type KitProp = {
  kind: "heroAsset";
  /** Public path, e.g. "/glb/brand-hero/apple/apple_mac_studio.glb". */
  url: string;
  /** XZ position relative to room centre; Y is auto-pinned to the floor/plinth. */
  position: [number, number, number];
  rotationY?: number;
  /** Target height of the model in metres. */
  heightM: number;
  /** When set, drops a plinth under the model and stands it on top. */
  plinthHeightM?: number;
  plinthColor?: string;
};

export type BoothDims = { widthM: number; depthM: number; wallHeightM: number; trussTopM: number; platformHeightM: number };

export function KitProps({ kit, booth }: { kit: BrandKit; booth: BoothDims }) {
  const props = (kit.scene?.props as KitProp[] | undefined) ?? [];
  return (
    <>
      {props.map((p, i) => (
        <Suspense key={i} fallback={null}>
          {renderProp(p, booth, i)}
        </Suspense>
      ))}
    </>
  );
}

function renderProp(p: KitProp, booth: BoothDims, key: number) {
  if (p.kind !== "heroAsset") return null;
  // y=0 in the manifest means "on the room floor" (top of the platform).
  const floorY = booth.platformHeightM;
  return (
    <HeroAsset
      key={key}
      url={p.url}
      position={[p.position[0], floorY, p.position[2]]}
      rotationY={p.rotationY ?? 0}
      heightM={p.heightM}
      plinthHeightM={p.plinthHeightM}
      plinthColor={p.plinthColor}
    />
  );
}

// ── GLB helpers (shared with furniture + props) ──────────────────────────────

export function meshOnlyBox(scene: THREE.Object3D): THREE.Box3 {
  // GLBs ship a lot of noise: invisible armatures, empty groups, lights,
  // skinned bind-pose poses with bones way below the visible geometry. Restrict
  // the bbox to visible meshes and use Box3.setFromObject's precise path.
  scene.updateMatrixWorld(true);
  const out = new THREE.Box3();
  out.makeEmpty();
  const tmp = new THREE.Box3();
  scene.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    if (/(helper|debug|bound|collider|navmesh|shadowproxy|shadow|ground|floor|plane_floor|backdrop)/i.test(m.name)) return;
    tmp.setFromObject(m, true);
    if (isFinite(tmp.min.x)) out.union(tmp);
  });
  return out;
}

// Scale a GLB scene to `heightM` tall and pin its base to y=0 (local). `yLift`
// shifts the pinned base up, for rigged models whose bind-pose bbox dips below
// the rendered mesh.
export function normalizeForBase(scene: THREE.Object3D, heightM: number, yLift = 0) {
  const box = meshOnlyBox(scene);
  if (box.isEmpty() || !isFinite(box.min.x)) return scene;
  const size = new THREE.Vector3();
  box.getSize(size);
  const centre = new THREE.Vector3();
  box.getCenter(centre);
  const k = heightM / Math.max(size.y, 1e-6);
  scene.scale.multiplyScalar(k);
  scene.position.sub(new THREE.Vector3(centre.x * k, box.min.y * k - yLift, centre.z * k));
  scene.updateMatrixWorld(true);
  const box2 = meshOnlyBox(scene);
  if (!box2.isEmpty() && isFinite(box2.min.y) && Math.abs(box2.min.y - yLift) > 1e-3) {
    scene.position.y += yLift - box2.min.y;
  }
  return scene;
}

export function useTintedGltf(url: string, tintHex?: string) {
  const gltf = useGLTF(url);
  return useMemo(() => {
    if (!gltf?.scene) return new THREE.Group();
    const s = gltf.scene.clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
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
    return s;
  }, [gltf, tintHex]);
}

// ── Hero asset — a brand GLB, optionally on a plinth ─────────────────────────

function HeroAsset({
  url, position, rotationY, heightM, plinthHeightM, plinthColor = "#1a1c22",
}: {
  url: string;
  position: [number, number, number];
  rotationY: number;
  heightM: number;
  plinthHeightM?: number;
  plinthColor?: string;
}) {
  const gltf = useGLTF(url);
  const baseY = plinthHeightM ?? 0;
  const scene = useMemo(() => {
    const s = (gltf?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return normalizeForBase(s, heightM);
  }, [gltf, heightM]);

  return (
    <group position={position} rotation-y={rotationY}>
      {plinthHeightM != null && plinthHeightM > 0 && (
        <mesh position={[0, plinthHeightM / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[Math.max(0.5, heightM * 0.9), plinthHeightM, Math.max(0.5, heightM * 0.9)]} />
          <meshPhysicalMaterial color={plinthColor} roughness={0.4} metalness={0.2} clearcoat={0.4} clearcoatRoughness={0.2} />
        </mesh>
      )}
      <primitive object={scene} position={[0, baseY, 0]} />
    </group>
  );
}
