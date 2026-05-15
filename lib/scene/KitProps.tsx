"use client";
import { Suspense, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { BrandKit } from "@/lib/schemas";
import { auditHeroAssetClearance } from "./placementAudit";

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
  /** XZ position relative to room centre; Y is added to the floor/plinth top
   *  so positive values float the model off the floor (used for the TMRW
   *  earth which hovers mid-room rather than sitting on the platform). */
  position: [number, number, number];
  rotationY?: number;
  /** Target height of the model in metres. */
  heightM: number;
  /** When set, drops a plinth under the model and stands it on top. */
  plinthHeightM?: number;
  plinthColor?: string;
  /** Regex pattern (string) — meshes whose name matches are pruned from the
   *  cloned scene before rendering. Used to drop atmosphere shells, helper
   *  spheres, undertray shadow proxies etc that some GLBs ship with. */
  meshFilter?: string;
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
  // The manifest's y is an offset above the floor — y=0 sits on the platform,
  // y>0 floats the prop (used for the TMRW earth hovering mid-room).
  const floorY = booth.platformHeightM + (p.position[1] ?? 0);
  return (
    <HeroAsset
      key={key}
      url={p.url}
      position={[p.position[0], floorY, p.position[2]]}
      rotationY={p.rotationY ?? 0}
      heightM={p.heightM}
      plinthHeightM={p.plinthHeightM}
      plinthColor={p.plinthColor}
      meshFilter={p.meshFilter}
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
  // Belt-and-suspenders: some GLBs (e.g. cars) carry visible undertray meshes
  // that the helper-name filter wrongly skips, so their actual lowest point
  // dips below the measured visible bbox and the model sinks into the floor.
  // Re-measure the FULL bbox (no name filter); if the dip is small enough to
  // plausibly be real geometry rather than a far-off helper, lift to clear it.
  scene.updateMatrixWorld(true);
  const fullBox = new THREE.Box3().setFromObject(scene, true);
  if (isFinite(fullBox.min.y) && fullBox.min.y < yLift) {
    const dip = yLift - fullBox.min.y;
    if (dip < 0.5) scene.position.y += dip;
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
  url, position, rotationY, heightM, plinthHeightM, plinthColor = "#1a1c22", meshFilter,
}: {
  url: string;
  position: [number, number, number];
  rotationY: number;
  heightM: number;
  plinthHeightM?: number;
  plinthColor?: string;
  meshFilter?: string;
}) {
  const gltf = useGLTF(url);
  const baseY = plinthHeightM ?? 0;
  const scene = useMemo(() => {
    const s = (gltf?.scene ?? new THREE.Group()).clone(true);
    // Prune meshes whose name matches `meshFilter` — used to drop atmosphere
    // shells / shadow proxies (e.g. the ATM mesh in the TMRW earth GLB).
    if (meshFilter) {
      const re = new RegExp(meshFilter, "i");
      const toRemove: THREE.Object3D[] = [];
      s.traverse((o) => {
        if (re.test(o.name)) toRemove.push(o);
      });
      for (const o of toRemove) o.parent?.remove(o);
    }
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    const normalised = normalizeForBase(s, heightM);
    // Dev-only audit — sometimes a GLB still dips below floor after normalise
    // (e.g. wheel arches that mesh-filter excludes). Surface it as a warning.
    if (process.env.NODE_ENV === "development") {
      normalised.updateMatrixWorld(true);
      const bbox = new THREE.Box3().setFromObject(normalised, true);
      if (isFinite(bbox.min.y)) {
        const label = url.split("/").pop() ?? "heroAsset";
        auditHeroAssetClearance({ label, lowestY: bbox.min.y, floorY: 0 });
      }
    }
    return normalised;
  }, [gltf, heightM, url, meshFilter]);

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
