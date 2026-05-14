"use client";
import { Suspense, useMemo } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useLogoTexture } from "./Textures";
import type { BrandKit } from "@/lib/schemas";
import { asset } from "@/lib/assetPath";

useGLTF.preload(asset("/glb/props/white_shelf.glb"));
useGLTF.preload(asset("/glb/plants/plantwall.glb"));
useGLTF.preload(asset("/glb/brand-hero/swisskrono/worktable.glb"));
useGLTF.preload(asset("/glb/brand-hero/swisskrono/d4217ov.glb"));
useGLTF.preload(asset("/glb/brand-hero/nrwa/caravan.glb"));
useGLTF.preload(asset("/glb/brand-hero/nrwa/camping_chair.glb"));
useGLTF.preload(asset("/glb/brand-hero/nrwa/campfire_with_pot.glb"));
useGLTF.preload(asset("/glb/brand-hero/nrwa/log_bench.glb"));
useGLTF.preload(asset("/glb/brand-hero/nrwa/messy_tack_board.glb"));
useGLTF.preload(asset("/glb/brand-hero/nrwa/tree_stump.glb"));
useGLTF.preload(asset("/glb/props/standingdisplay.glb"));
useGLTF.preload(asset("/glb/brand-hero/tagheuer/chronograph_watch.glb"));
useGLTF.preload(asset("/glb/brand-hero/nissan/nissanpatrol.glb"));
useGLTF.preload(asset("/glb/brand-hero/still/warehouse_forklift_gameready.glb"));

// ── Per-kit prop manifest types ──────────────────────────────────────────────

export type KitProp =
  | { kind: "whiteShelfRow"; position: [number, number, number]; rotationY?: number; tintHex?: string; cubeTint?: string; cubeCount?: number; cubeSize?: number }
  | { kind: "plantWall"; position: [number, number, number]; rotationY?: number; widthM?: number; heightM?: number }
  | { kind: "worktable"; position: [number, number, number]; rotationY?: number; heightM?: number }
  | { kind: "ledTower"; position: [number, number, number]; heightM?: number; widthM?: number }
  | { kind: "floorSample"; position: [number, number, number]; rotationY?: number }
  // ── NRWA: glb-backed campsite props ─────────────────────────────────────
  | { kind: "airstream"; position: [number, number, number]; rotationY?: number; heightM?: number }
  | { kind: "logBench"; position: [number, number, number]; rotationY?: number; heightM?: number }
  | { kind: "campingChair"; position: [number, number, number]; rotationY?: number; heightM?: number }
  | { kind: "campfire"; position: [number, number, number]; rotationY?: number; heightM?: number }
  | { kind: "noticeboard"; position: [number, number, number]; rotationY?: number; heightM?: number }
  | { kind: "treeStump"; position: [number, number, number]; rotationY?: number; heightM?: number }
  // Booth-sized helpers — width / depth / height are auto-filled from the
  // active booth dimensions in the dispatcher, so brand authors only specify
  // the styling fields they care about.
  | { kind: "tentRoof"; color: string; eaveAmp?: number; cycles?: number; liftM?: number }
  | { kind: "spiralRibbon"; color: string; bandM?: number; liftM?: number }
  | { kind: "cinemaScreen"; imageUrl?: string; heightFrac?: number; yFrac?: number; widthFrac?: number }
  | { kind: "curvedBack"; color: string; heightM?: number; arcDeg?: number };

// ── KitProps dispatcher ──────────────────────────────────────────────────────

export type BoothDims = { widthM: number; depthM: number; wallHeightM: number; trussTopM: number; platformHeightM: number };

export function KitProps({ kit, booth }: { kit: BrandKit; booth: BoothDims }) {
  const props = (kit.scene?.props as KitProp[] | undefined) ?? [];
  return (
    <>
      {props.map((p, i) => (
        <Suspense key={i} fallback={null}>
          {renderProp(p, kit, booth, i)}
        </Suspense>
      ))}
    </>
  );
}

function renderProp(p: KitProp, kit: BrandKit, booth: BoothDims, key: number) {
  // For props that sit on the floor, lift their Y by platformHeightM so the
  // manifest's y=0 means "on top of the booth platform" rather than world ground.
  const onPlatform = (pos: [number, number, number]): [number, number, number] => [pos[0], pos[1] + booth.platformHeightM, pos[2]];
  // Brute-force lift used by the NRWA glbs (and similar rigged kits) where
  // normalizeForBase's yLift mechanism wasn't shifting the visible model up.
  // Apply directly at the call site so it's outside any bbox-pin math.
  const lifted = (pos: [number, number, number], extra: number): [number, number, number] => [pos[0], pos[1] + booth.platformHeightM + extra, pos[2]];
  switch (p.kind) {
    case "whiteShelfRow":
      return <WhiteShelfRow key={key} {...p} position={onPlatform(p.position)} />;
    case "plantWall":
      return <PlantWall key={key} {...p} position={onPlatform(p.position)} />;
    case "worktable":
      return <Worktable key={key} {...p} position={onPlatform(p.position)} />;
    case "ledTower":
      return <LedTower key={key} {...p} kit={kit} />;
    case "floorSample":
      return <FloorSample key={key} {...p} position={onPlatform(p.position)} />;
    // Raw +heightM*0.5 lift bypasses the yLift-in-normalize path which wasn't
    // sticking for these rigged NRWA glbs (bind-pose bbox dips below the
    // rendered model). Same approach the sofa + standing-display now use.
    case "airstream": {
      const h = p.heightM ?? 2.6;
      return <NrwaGlbProp key={key} url={asset("/glb/brand-hero/nrwa/caravan.glb")} heightM={h} position={lifted(p.position, h * 0.5)} rotationY={p.rotationY} cast />;
    }
    case "logBench": {
      const h = p.heightM ?? 0.45;
      return <NrwaGlbProp key={key} url={asset("/glb/brand-hero/nrwa/log_bench.glb")} heightM={h} position={lifted(p.position, h * 0.5)} rotationY={p.rotationY} cast />;
    }
    case "campingChair": {
      const h = p.heightM ?? 0.85;
      return <NrwaGlbProp key={key} url={asset("/glb/brand-hero/nrwa/camping_chair.glb")} heightM={h} position={lifted(p.position, h * 0.5)} rotationY={p.rotationY} cast />;
    }
    case "campfire":
      return <NrwaCampfire key={key} {...p} position={onPlatform(p.position)} accent={kit.palette.accent} />;
    case "noticeboard": {
      const h = p.heightM ?? 1.6;
      return <NrwaGlbProp key={key} url={asset("/glb/brand-hero/nrwa/messy_tack_board.glb")} heightM={h} position={lifted(p.position, h * 0.5)} rotationY={p.rotationY} cast />;
    }
    case "treeStump": {
      const h = p.heightM ?? 0.45;
      return <NrwaGlbProp key={key} url={asset("/glb/brand-hero/nrwa/tree_stump.glb")} heightM={h} position={lifted(p.position, h * 0.5)} rotationY={p.rotationY} cast />;
    }
    case "tentRoof":
      return (
        <TentRoof
          key={key}
          color={p.color}
          eaveAmp={p.eaveAmp}
          cycles={p.cycles}
          awningDecal={kit.scene?.awningDecal}
          widthM={booth.widthM + 1.0}
          depthM={booth.depthM + 0.4}
          heightM={booth.wallHeightM + (p.liftM ?? 0.6) + booth.platformHeightM}
        />
      );
    case "spiralRibbon":
      return (
        <SpiralRibbon
          key={key}
          color={p.color}
          bandM={p.bandM}
          widthM={booth.widthM}
          depthM={booth.depthM}
          heightM={booth.wallHeightM + (p.liftM ?? 1.2) + booth.platformHeightM}
        />
      );
    case "curvedBack": {
      return (
        <CurvedBack
          key={key}
          color={p.color}
          heightM={p.heightM ?? booth.wallHeightM * 0.8}
          arcDeg={p.arcDeg ?? 110}
          widthM={booth.widthM}
          depthM={booth.depthM}
          platformHeightM={booth.platformHeightM}
        />
      );
    }
    case "cinemaScreen": {
      const wFrac = p.widthFrac ?? 0.95;
      const hFrac = p.heightFrac ?? 0.45;
      const yFrac = p.yFrac ?? 0.7;
      const screenW = booth.widthM * wFrac;
      const screenH = booth.wallHeightM * hFrac;
      const yM = booth.platformHeightM + booth.wallHeightM * (0.6 + 0.4 * yFrac);
      const zM = -booth.depthM / 2 + 0.12;
      return <CinemaScreen key={key} imageUrl={p.imageUrl} widthM={screenW} heightM={screenH} yM={yM} zM={zM} />;
    }
  }
}

// ── Component implementations ───────────────────────────────────────────────

function useTintedGltf(url: string, tintHex?: string) {
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

function meshOnlyBox(scene: THREE.Object3D): THREE.Box3 {
  // GLBs ship a lot of noise: invisible armatures, empty groups, lights,
  // skinned bind-pose poses with bones way below the visible geometry, etc.
  // Restrict the bbox to visible meshes and use Box3.setFromObject's
  // `precise=true` path which iterates actual vertex positions (handles
  // skinned + morph meshes correctly).
  scene.updateMatrixWorld(true);
  const out = new THREE.Box3();
  out.makeEmpty();
  const tmp = new THREE.Box3();
  scene.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !m.geometry) return;
    // Skip helper/wireframe meshes by name heuristic — most GLBs name them.
    if (/(helper|debug|bound|collider|navmesh|shadowproxy|shadow|ground|floor|plane_floor|backdrop)/i.test(m.name)) return;
    tmp.setFromObject(m, true);
    if (isFinite(tmp.min.x)) out.union(tmp);
  });
  return out;
}

function normalizeForBase(scene: THREE.Object3D, heightM: number, yLift = 0) {
  // Pass 1 — bring the visible model to the target height + centre on origin.
  //
  // `meshOnlyBox` measures vertices in WORLD space (with whatever baked-in
  // root scale the GLB ships with — many authoring tools export cm→m or
  // inch→m as a root-level 0.01 / 0.0254 scale). To resize without nuking
  // that baked scale we MULTIPLY by the ratio instead of `setScalar`-ing it.
  // After scaling, the offset uses the un-scaled (`box`-measured) extents
  // multiplied by the new scale ratio.
  const box = meshOnlyBox(scene);
  if (box.isEmpty() || !isFinite(box.min.x)) return scene;
  const size = new THREE.Vector3();
  box.getSize(size);
  const centre = new THREE.Vector3();
  box.getCenter(centre);
  const k = heightM / Math.max(size.y, 1e-6);
  scene.scale.multiplyScalar(k);
  scene.position.sub(new THREE.Vector3(centre.x * k, box.min.y * k - yLift, centre.z * k));
  // Pass 2 — re-measure post-scale bbox. Belt-and-suspenders correction in
  // case a deep child transform shifted things in pass 1.
  scene.updateMatrixWorld(true);
  const box2 = meshOnlyBox(scene);
  if (!box2.isEmpty() && isFinite(box2.min.y) && Math.abs(box2.min.y - yLift) > 1e-3) {
    scene.position.y += yLift - box2.min.y;
  }
  return scene;
}

function WhiteShelfRow({
  position, rotationY = 0, tintHex, cubeTint, cubeCount = 6, cubeSize = 0.35,
}: Extract<KitProp, { kind: "whiteShelfRow" }>) {
  const shelf = useTintedGltf(asset("/glb/props/white_shelf.glb"), tintHex ?? "#1a1c22");
  const scene = useMemo(() => normalizeForBase(shelf.clone(true), 0.95), [shelf]);
  const spacing = cubeSize + 0.2;
  const totalSpan = (cubeCount - 1) * spacing;
  const finalCubeColor = cubeTint ?? "#f4f4f4";
  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={scene} />
      <group position={[0, 0.95 + cubeSize / 2, 0]}>
        {Array.from({ length: cubeCount }, (_, i) => (
          <mesh key={i} position={[-totalSpan / 2 + i * spacing, 0, 0]} castShadow>
            <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
            <meshPhysicalMaterial color={finalCubeColor} roughness={0.35} metalness={0.05} clearcoat={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function PlantWall({
  position, rotationY = 0, heightM = 2.4,
}: Extract<KitProp, { kind: "plantWall" }>) {
  const obj = useGLTF(asset("/glb/plants/plantwall.glb"));
  const scene = useMemo(() => {
    const s = (obj?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; }
    });
    return normalizeForBase(s, heightM);
  }, [obj, heightM]);
  return <primitive object={scene} position={position} rotation-y={rotationY} />;
}

function Worktable({
  position, rotationY = 0, heightM = 1.0,
}: Extract<KitProp, { kind: "worktable" }>) {
  const obj = useGLTF(asset("/glb/brand-hero/swisskrono/worktable.glb"));
  const scene = useMemo(() => {
    const s = (obj?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return normalizeForBase(s, heightM);
  }, [obj, heightM]);
  return <primitive object={scene} position={position} rotation-y={rotationY} />;
}

function FloorSample({
  position, rotationY = 0,
}: Extract<KitProp, { kind: "floorSample" }>) {
  const obj = useGLTF(asset("/glb/brand-hero/swisskrono/d4217ov.glb"));
  const scene = useMemo(() => {
    const s = (obj?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; }
    });
    return normalizeForBase(s, 1.6);
  }, [obj]);
  return <primitive object={scene} position={position} rotation-y={rotationY} />;
}

// ── LED Tower (Barry-style standing cuboid volume) ──────────────────────────

function LedTower({
  position, heightM = 2.6, widthM = 0.45, kit,
}: Extract<KitProp, { kind: "ledTower" }> & { kit: BrandKit }) {
  const url = kit.logos.primary.rasterUrl;
  return (
    <group position={position}>
      {/* The glowing volume — 4 emissive faces wrap brand primary as the "LED" body */}
      <mesh castShadow>
        <boxGeometry args={[widthM, heightM, widthM]} />
        <meshStandardMaterial
          color={kit.palette.primary}
          emissive={new THREE.Color(kit.palette.primary)}
          emissiveIntensity={1.4}
          toneMapped={false}
        />
      </mesh>
      {/* Logo decal on each of the 4 vertical faces */}
      {url && (
        <>
          <Suspense fallback={null}>
            <TowerFaceLogo url={url} viewBox={kit.logos.primary.viewBox} widthM={widthM} heightM={heightM} accent={kit.palette.neutralLight} face="front" />
          </Suspense>
          <Suspense fallback={null}>
            <TowerFaceLogo url={url} viewBox={kit.logos.primary.viewBox} widthM={widthM} heightM={heightM} accent={kit.palette.neutralLight} face="back" />
          </Suspense>
          <Suspense fallback={null}>
            <TowerFaceLogo url={url} viewBox={kit.logos.primary.viewBox} widthM={widthM} heightM={heightM} accent={kit.palette.neutralLight} face="left" />
          </Suspense>
          <Suspense fallback={null}>
            <TowerFaceLogo url={url} viewBox={kit.logos.primary.viewBox} widthM={widthM} heightM={heightM} accent={kit.palette.neutralLight} face="right" />
          </Suspense>
        </>
      )}
      {/* Internal lift — soft brand glow into the room */}
      <pointLight position={[0, heightM * 0.4, 0]} intensity={3} distance={5} decay={1.8} color={kit.palette.primary} />
    </group>
  );
}

function TowerFaceLogo({
  url, viewBox, widthM, heightM, accent, face,
}: { url: string; viewBox: [number, number, number, number]; widthM: number; heightM: number; accent: string; face: "front" | "back" | "left" | "right" }) {
  const tex = useLogoTexture(url);
  const aspect = viewBox[2] / Math.max(viewBox[3], 1);
  // Each face is widthM wide and we run the wordmark vertically (rotated 90°)
  const planeW = heightM * 0.78;        // long axis = vertical run
  const planeH = Math.min(widthM * 0.85, planeW / aspect);
  const halfW = widthM / 2 + 0.001;
  let pos: [number, number, number];
  let rotY = 0;
  switch (face) {
    case "front":  pos = [0, 0,  halfW]; rotY = 0; break;
    case "back":   pos = [0, 0, -halfW]; rotY = Math.PI; break;
    case "left":   pos = [-halfW, 0, 0]; rotY = -Math.PI / 2; break;
    case "right":  pos = [ halfW, 0, 0]; rotY = Math.PI / 2; break;
  }
  return (
    <mesh position={pos} rotation={[0, rotY, Math.PI / 2]}>
      <planeGeometry args={[planeW, planeH]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} color={accent} />
    </mesh>
  );
}

// ── Black quadrated wall texture (Swiss Krono back wall override) ───────────

const BQ_BASE = asset("/glb/textures/black_quadrated_wall_texture_pack");

useTexture.preload(`${BQ_BASE}/black_quadrated_wall_basecolor_2k.png`);
useTexture.preload(`${BQ_BASE}/black_quadrated_wall_normal_2k.png`);
useTexture.preload(`${BQ_BASE}/black_quadrated_wall_roughness_2k.png`);
useTexture.preload(`${BQ_BASE}/black_quadrated_wall_ao_2k.png`);

export function useBlackQuadratedTextures() {
  const [map, normalMap, roughnessMap, aoMap] = useTexture([
    `${BQ_BASE}/black_quadrated_wall_basecolor_2k.png`,
    `${BQ_BASE}/black_quadrated_wall_normal_2k.png`,
    `${BQ_BASE}/black_quadrated_wall_roughness_2k.png`,
    `${BQ_BASE}/black_quadrated_wall_ao_2k.png`,
  ]);
  return useMemo(() => {
    [map, normalMap, roughnessMap, aoMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1.8, 1.6);
      t.anisotropy = 8;
    });
    map.colorSpace = THREE.SRGBColorSpace;
    return { map, normalMap, roughnessMap, aoMap };
  }, [map, normalMap, roughnessMap, aoMap]);
}

// ── NRWA generic GLB prop wrapper ──────────────────────────────────────────
// Normalises height + casts shadows; used for the airstream caravan, log
// benches, camping chairs, tree stumps and noticeboard.

function NrwaGlbProp({
  url, position, rotationY = 0, heightM, cast, yLift = 0,
}: { url: string; position: [number, number, number]; rotationY?: number; heightM: number; cast: boolean; yLift?: number }) {
  const obj = useGLTF(url);
  const scene = useMemo(() => {
    const s = (obj?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = cast; m.receiveShadow = true; }
    });
    return normalizeForBase(s, heightM, yLift);
  }, [obj, heightM, cast, yLift]);
  return <primitive object={scene} position={position} rotation-y={rotationY} />;
}

// Campfire — glb model + a layered animated flame: an outer orange teardrop
// cone, a hotter inner yellow cone, and a flickering point-light. Each cone
// pulses + sways on useFrame so the flame doesn't look static.
function NrwaCampfire({
  position, rotationY = 0, heightM = 0.5, accent,
}: Extract<KitProp, { kind: "campfire" }> & { accent: string }) {
  const obj = useGLTF(asset("/glb/brand-hero/nrwa/campfire_with_pot.glb"));
  const scene = useMemo(() => {
    const s = (obj?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return normalizeForBase(s, heightM, 0.15);  // small lift — campfire pit GLB measures low
  }, [obj, heightM]);
  // Static glow: warm point-light + a single emissive nub sitting in the pit.
  // (The previous useFrame-driven flame stack was too on-the-nose for a
  // configurator; the brief asked to drop the animation.)
  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={scene} />
      <mesh position={[0, heightM * 0.28, 0]}>
        <sphereGeometry args={[heightM * 0.16, 12, 12]} />
        <meshStandardMaterial color="#ff8a3a" emissive={new THREE.Color("#ff8a3a")} emissiveIntensity={2.2} transparent opacity={0.65} toneMapped={false} />
      </mesh>
      <pointLight position={[0, heightM * 0.35, 0]} intensity={2.6} distance={3.5} decay={1.7} color={accent || "#ff7b3a"} castShadow={false} />
    </group>
  );
}

// ── NRWA tent roof: wooden corner posts + green canopy with a sine-wave eave ──
// Builds an awning-style canopy that wraps over the booth in place of the
// regular truss. Eaves on the front and sides are sine-wave-cut so the canopy
// looks scalloped like the reference photo.

function TentRoof({
  widthM, depthM, heightM, color, eaveAmp = 0.35, cycles = 5, awningDecal,
}: { widthM: number; depthM: number; heightM: number; color: string; eaveAmp?: number; cycles?: number; awningDecal?: string }) {
  const halfW = widthM / 2;
  const halfD = depthM / 2;
  const postR = 0.08;
  const woodColor = "#8b5a2b";

  // Build a scalloped-edge panel as a flat ExtrudeGeometry — the front (-eave)
  // edge is a sampled sine wave, the back edge is straight (it attaches to the
  // booth back wall).
  const frontPanel = useMemo(() => {
    const shape = new THREE.Shape();
    const N = Math.max(24, cycles * 12);
    shape.moveTo(-halfW, 0);
    shape.lineTo(-halfW, eaveAmp * 1.5);
    // top straight edge
    shape.lineTo(halfW, eaveAmp * 1.5);
    shape.lineTo(halfW, 0);
    // sampled sine going right→left along the front eave
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      const x = -halfW + t * widthM;
      const y = -eaveAmp * Math.abs(Math.sin(t * cycles * Math.PI));
      shape.lineTo(x, y);
    }
    return new THREE.ShapeGeometry(shape);
  }, [halfW, widthM, eaveAmp, cycles]);

  // Side scalloped strips (left + right run along Z)
  const sidePanel = useMemo(() => {
    const shape = new THREE.Shape();
    const N = Math.max(24, cycles * 8);
    shape.moveTo(-halfD, 0);
    shape.lineTo(-halfD, eaveAmp * 1.5);
    shape.lineTo(halfD, eaveAmp * 1.5);
    shape.lineTo(halfD, 0);
    for (let i = N; i >= 0; i--) {
      const t = i / N;
      const z = -halfD + t * depthM;
      const y = -eaveAmp * Math.abs(Math.sin(t * cycles * Math.PI * 0.7));
      shape.lineTo(z, y);
    }
    return new THREE.ShapeGeometry(shape);
  }, [halfD, depthM, eaveAmp, cycles]);

  return (
    <group>
      {/* Four wood corner posts (slightly inset so they sit on the platform) */}
      {[
        [-halfW + 0.4, halfD - 0.4],
        [ halfW - 0.4, halfD - 0.4],
        [-halfW + 0.4,-halfD + 0.4],
        [ halfW - 0.4,-halfD + 0.4],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x!, heightM / 2, z!]} castShadow receiveShadow>
          <cylinderGeometry args={[postR, postR * 1.1, heightM, 12]} />
          <meshStandardMaterial color={woodColor} roughness={0.9} metalness={0.02} />
        </mesh>
      ))}

      {/* Flat fabric canopy ceiling — meshPhysicalMaterial with sheen makes the
          green read as canvas rather than shiny plastic. */}
      <mesh position={[0, heightM, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[widthM, depthM]} />
        <meshPhysicalMaterial color={color} roughness={1.0} metalness={0} sheen={0.7} sheenColor={new THREE.Color(color).offsetHSL(0, -0.15, 0.15)} sheenRoughness={0.85} side={THREE.DoubleSide} />
      </mesh>

      {/* Front + back scalloped eaves (front carries the optional decal) */}
      <mesh geometry={frontPanel} position={[0, heightM, halfD]} castShadow receiveShadow>
        <meshPhysicalMaterial color={color} roughness={1.0} metalness={0} sheen={0.7} sheenColor={new THREE.Color(color).offsetHSL(0, -0.15, 0.15)} sheenRoughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {awningDecal && (
        <>
          {/* Front-eave decal — small (~22% of booth width) so it doesn't
              dominate the awning. */}
          <Suspense fallback={null}>
            <AwningDecal url={awningDecal} widthM={widthM * 0.22} heightM={eaveAmp * 1.4} position={[0, heightM + eaveAmp * 0.4, halfD + 0.01]} />
          </Suspense>
          {/* Mirror on the right-side eave — rotated to face out the side wall */}
          <Suspense fallback={null}>
            <AwningDecal url={awningDecal} widthM={depthM * 0.22} heightM={eaveAmp * 1.4} position={[halfW + 0.01, heightM + eaveAmp * 0.4, 0]} rotationY={Math.PI / 2} />
          </Suspense>
        </>
      )}
      <mesh geometry={frontPanel} position={[0, heightM, -halfD]} rotation-y={Math.PI} castShadow receiveShadow>
        <meshPhysicalMaterial color={color} roughness={1.0} metalness={0} sheen={0.7} sheenColor={new THREE.Color(color).offsetHSL(0, -0.15, 0.15)} sheenRoughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* Left + right scalloped eaves */}
      <mesh geometry={sidePanel} position={[-halfW, heightM, 0]} rotation-y={-Math.PI / 2} castShadow receiveShadow>
        <meshPhysicalMaterial color={color} roughness={1.0} metalness={0} sheen={0.7} sheenColor={new THREE.Color(color).offsetHSL(0, -0.15, 0.15)} sheenRoughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={sidePanel} position={[halfW, heightM, 0]} rotation-y={Math.PI / 2} castShadow receiveShadow>
        <meshPhysicalMaterial color={color} roughness={1.0} metalness={0} sheen={0.7} sheenColor={new THREE.Color(color).offsetHSL(0, -0.15, 0.15)} sheenRoughness={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function AwningDecal({ url, widthM, heightM, position, rotationY = 0 }: { url: string; widthM: number; heightM: number; position: [number, number, number]; rotationY?: number }) {
  const tex = useTexture(url);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
  }, [tex]);
  return (
    <mesh position={position} rotation-y={rotationY}>
      <planeGeometry args={[widthM, heightM]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

// ── Lufthansa spiral ribbon ────────────────────────────────────────────────
// A wide blue band that arcs from the front-left of the booth, up and over
// the cinema screen, and back down on the front-right. Built as an
// ExtrudeGeometry: a thin rectangle profile swept along a CatmullRom-curved
// 3D path.

function SpiralRibbon({
  widthM, depthM, heightM, color, bandM = 0.9,
}: { widthM: number; depthM: number; heightM: number; color: string; bandM?: number }) {
  const geom = useMemo(() => {
    const halfW = widthM / 2;
    const halfD = depthM / 2;
    const top = heightM;
    // Curve sweeps: front-left low → up to peak above stand → back centre →
    // back over → front-right low. Eight control points give a smooth arc.
    const pts = [
      new THREE.Vector3(-halfW - 0.4,  top * 0.15,  halfD + 0.6),
      new THREE.Vector3(-halfW * 0.85, top * 0.95,  halfD * 0.3),
      new THREE.Vector3(-halfW * 0.2,  top * 1.05, -halfD * 0.2),
      new THREE.Vector3( halfW * 0.4,  top * 1.10, -halfD * 0.4),
      new THREE.Vector3( halfW * 0.95, top * 1.00, -halfD * 0.1),
      new THREE.Vector3( halfW + 0.2,  top * 0.75,  halfD * 0.3),
      new THREE.Vector3( halfW + 0.1,  top * 0.40,  halfD + 0.4),
      new THREE.Vector3( halfW - 0.6,  top * 0.10,  halfD + 0.8),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
    // Cross-section: a thin upright rectangle (band height × small thickness)
    const shape = new THREE.Shape();
    const h = bandM, w = 0.06;
    shape.moveTo(-w / 2, -h / 2);
    shape.lineTo( w / 2, -h / 2);
    shape.lineTo( w / 2,  h / 2);
    shape.lineTo(-w / 2,  h / 2);
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      steps: 200,
      bevelEnabled: false,
      extrudePath: curve,
    });
  }, [widthM, depthM, heightM, bandM]);

  return (
    <mesh geometry={geom} castShadow>
      <meshStandardMaterial
        color={color}
        emissive={new THREE.Color(color)}
        emissiveIntensity={0.18}
        roughness={0.55}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Curved booth back ────────────────────────────────────────────────────
// A vertical curved panel at the FRONT of the booth (south side) that arcs
// inward — used for Lufthansa's customary lounge backdrop. Built as a
// CylinderGeometry segment, open both ends, rotated so the cylinder axis is
// vertical and the arc faces inward.

function CurvedBack({
  color, heightM, arcDeg, widthM, depthM, platformHeightM,
}: { color: string; heightM: number; arcDeg: number; widthM: number; depthM: number; platformHeightM: number }) {
  const radius = Math.max(widthM * 0.55, 3.0);
  const arc = (arcDeg * Math.PI) / 180;
  // Centre of the cylinder sits behind the front edge of the booth so the
  // visible chord of the arc fronts the lounge. thetaStart = -arc/2 + π/2
  // points the visible arc toward +Z (the front of the booth) — i.e. the
  // backdrop wraps in front of the camera as the user walks toward it.
  const cylinderZ = depthM / 2 - 1.8 - radius;
  return (
    <mesh
      position={[0, platformHeightM + heightM / 2, cylinderZ]}
      receiveShadow
      castShadow
    >
      <cylinderGeometry args={[radius, radius, heightM, 96, 1, true, Math.PI / 2 - arc / 2, arc]} />
      <meshPhysicalMaterial color={color} roughness={0.42} metalness={0.08} clearcoat={0.45} clearcoatRoughness={0.2} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Cinema screen: wide ultrawide panel suspended above the back wall ───────

function CinemaScreen({
  widthM, heightM, yM, zM, imageUrl,
}: { widthM: number; heightM: number; yM: number; zM: number; imageUrl?: string }) {
  return (
    <group position={[0, yM, zM]}>
      {/* Dark bezel */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthM + 0.12, heightM + 0.12, 0.06]} />
        <meshPhysicalMaterial color="#0a0c10" roughness={0.4} metalness={0.6} clearcoat={0.3} />
      </mesh>
      {imageUrl ? (
        <Suspense fallback={<CinemaFallbackPanel widthM={widthM} heightM={heightM} />}>
          <CinemaImagePanel url={imageUrl} widthM={widthM} heightM={heightM} />
        </Suspense>
      ) : (
        <CinemaFallbackPanel widthM={widthM} heightM={heightM} />
      )}
    </group>
  );
}

function CinemaFallbackPanel({ widthM, heightM }: { widthM: number; heightM: number }) {
  return (
    <mesh position={[0, 0, 0.034]}>
      <planeGeometry args={[widthM, heightM]} />
      <meshStandardMaterial color="#f5f6f8" emissive={new THREE.Color("#f5f6f8")} emissiveIntensity={0.4} toneMapped={false} />
    </mesh>
  );
}

function CinemaImagePanel({ url, widthM, heightM }: { url: string; widthM: number; heightM: number }) {
  const tex = useTexture(url);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
  }, [tex]);
  return (
    <mesh position={[0, 0, 0.034]}>
      <planeGeometry args={[widthM, heightM]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

// ── StandingDisplays: pairs of angled GLB displays (slider-driven, global) ────
// Rendered from Scene.tsx for every kit that doesn't opt out via
// `noDefaultDressing`. Each unit is rotated ±45° so they read as a herringbone
// of screens flanking the central walkway.

export function StandingDisplays({
  count, widthM, depthM, platformHeightM,
}: { count: number; widthM: number; depthM: number; platformHeightM: number }) {
  const slots = useMemo(() => {
    const out: { pos: [number, number, number]; rotY: number }[] = [];
    if (count <= 0) return out;
    const z = depthM / 4 - 0.4;
    // Pairs flanking the centre axis; widen the gap with more units.
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const tier = Math.floor(i / 2);
      const x = side * (widthM / 2 - 1.6 - tier * 1.4);
      // Raw +0.85 Y lift (half the 1.7 m target height) — standingdisplay.glb
      // bind-pose bbox dips below the visible base; normalize-based yLift
      // wasn't sticking, so just bump the world position directly.
      out.push({ pos: [x, platformHeightM + 0.85, z - tier * 1.4], rotY: side === -1 ? Math.PI / 4 : -Math.PI / 4 });
    }
    return out;
  }, [count, widthM, depthM, platformHeightM]);
  return (
    <>
      {slots.map((s, i) => (
        <Suspense key={i} fallback={null}>
          <StandingDisplayUnit position={s.pos} rotationY={s.rotY} />
        </Suspense>
      ))}
    </>
  );
}

function StandingDisplayUnit({ position, rotationY }: { position: [number, number, number]; rotationY: number }) {
  const obj = useGLTF(asset("/glb/props/standingdisplay.glb"));
  const scene = useMemo(() => {
    const s = (obj?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return normalizeForBase(s, 1.7);
  }, [obj]);
  return <primitive object={scene} position={position} rotation-y={rotationY} />;
}

// ── TAG Heuer chronograph — hero GLB scaled into a small vitrine plinth ───────
export function ChronographHero({ position, heightM = 0.6 }: { position: [number, number, number]; heightM?: number }) {
  const obj = useGLTF(asset("/glb/brand-hero/tagheuer/chronograph_watch.glb"));
  const scene = useMemo(() => {
    const s = (obj?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return normalizeForBase(s, heightM, heightM * 0.5);
  }, [obj, heightM]);
  return <primitive object={scene} position={position} />;
}

// Nissan Patrol — large vehicle hero, parked nose-out on the platform.
export function NissanPatrolHero({ position, rotationY = 0, heightM = 1.95 }: { position: [number, number, number]; rotationY?: number; heightM?: number }) {
  const obj = useGLTF(asset("/glb/brand-hero/nissan/nissanpatrol.glb"));
  const scene = useMemo(() => {
    const s = (obj?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return normalizeForBase(s, heightM);
  }, [obj, heightM]);
  return <primitive object={scene} position={position} rotation-y={rotationY} />;
}

// Still forklift — hero pair in the Still room.
export function StillForklift({ position, rotationY = 0, heightM = 2.0 }: { position: [number, number, number]; rotationY?: number; heightM?: number }) {
  const obj = useGLTF(asset("/glb/brand-hero/still/warehouse_forklift_gameready.glb"));
  const scene = useMemo(() => {
    const s = (obj?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return normalizeForBase(s, heightM);
  }, [obj, heightM]);
  return <primitive object={scene} position={position} rotation-y={rotationY} />;
}

// ── NRWA fairy lights — string of warm pinpoint sprites along the inside
// of the tent canopy. Lightweight: emissive spheres with a single shared
// ambient warm-light contribution instead of N point-lights.
export function FairyLights({
  widthM, depthM, heightM, count = 36, color = "#ffd28a",
}: { widthM: number; depthM: number; heightM: number; count?: number; color?: string }) {
  const dots = useMemo(() => {
    const out: { pos: [number, number, number] }[] = [];
    const halfW = widthM / 2;
    const halfD = depthM / 2;
    // Two strings running the depth, slightly slack mid-span (parabolic sag).
    const sag = 0.18;
    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      const x = (i % 2 === 0 ? -1 : 1) * (halfW - 0.35);
      const z = -halfD + 0.25 + t * (depthM - 0.5);
      const y = heightM - 0.06 - sag * Math.sin(t * Math.PI);
      out.push({ pos: [x, y, z] });
    }
    return out;
  }, [widthM, depthM, heightM, count]);
  return (
    <group>
      {dots.map((d, i) => (
        <mesh key={i} position={d.pos}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color={color} emissive={new THREE.Color(color)} emissiveIntensity={3.5} toneMapped={false} />
        </mesh>
      ))}
      {/* One soft warm fill so the dots look like they cast light, not pure
          billboards. Mounted at canopy centre. */}
      <pointLight position={[0, heightM - 0.4, 0]} intensity={1.2} distance={Math.max(widthM, depthM) * 0.9} decay={1.4} color={color} />
    </group>
  );
}
