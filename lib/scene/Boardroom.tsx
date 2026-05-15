"use client";
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "@/lib/assetPath";
import { normalizeForBase } from "./KitProps";
import { useLogoTexture } from "./Textures";
import type { BrandKit } from "@/lib/schemas";

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

// Each chair GLB faces a different direction in its bind pose. We apply a
// per-variant offset so all of them end up facing the table once the slot
// rotation is applied. The ny_studio chair faces -Z natively (so we flip π);
// the executive + presenter chairs ship facing +Z so they need NO offset
// (otherwise they end up rotated 180° from where they should be).
const CHAIR_FACE_OFFSETS: Record<ChairVariant, number> = {
  studio: Math.PI,
  executive: 0,
  office: Math.PI,
  presenter: 0,
};

// ── Table ────────────────────────────────────────────────────────────────────
// Non-parametric resize: the GLB is recentred, its base pinned to the floor,
// its longer horizontal axis oriented along the room depth, then scaled to the
// requested length × width footprint with the height pinned to standard.

export function BoardroomTable({
  variant, lengthM, widthM, position, tintHex,
}: { variant: TableVariant; lengthM: number; widthM: number; position: [number, number, number]; tintHex?: string }) {
  const gltf = useGLTF(TABLE_VARIANTS[variant]);
  const { node, scale, rotY } = useMemo(() => {
    const s = (gltf?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true; m.receiveShadow = true;
        if (tintHex) {
          const mat = m.material as THREE.MeshStandardMaterial | undefined;
          if (mat && "color" in mat) { const nx = mat.clone(); nx.color = new THREE.Color(tintHex); m.material = nx; }
        }
      }
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
  }, [gltf, lengthM, widthM, variant, tintHex]);
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
  url, position, rotationY, tintHex, kit, variant,
}: { url: string; position: [number, number, number]; rotationY: number; tintHex?: string; kit?: BrandKit; variant: ChairVariant }) {
  const gltf = useGLTF(url);
  const node = useMemo(() => {
    const s = (gltf?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true; m.receiveShadow = true;
        if (tintHex) {
          const mat = m.material as THREE.MeshStandardMaterial | undefined;
          if (mat && "color" in mat) { const nx = mat.clone(); nx.color = new THREE.Color(tintHex); m.material = nx; }
        }
      }
    });
    return normalizeForBase(s, CHAIR_HEIGHT_M);
  }, [gltf, tintHex]);
  const offset = CHAIR_FACE_OFFSETS[variant];
  // Backrest direction in chair-local: for variants whose model natively
  // faces -Z (offset = π), the back is at local +Z; for variants whose
  // model faces +Z (offset = 0), the back is at local -Z.
  const backZ = offset === Math.PI ? 0.32 : -0.32;
  return (
    <group position={position} rotation-y={rotationY + offset}>
      <primitive object={node} />
      {/* Small brand decal on the back of the chair backrest, visible
          from outside the table circle. Sits ~0.95m up + ~0.3m behind the
          chair pivot (the chair's seat origin). */}
      {kit && <ChairBackLogoDecal kit={kit} backZ={backZ} />}
    </group>
  );
}

function ChairBackLogoDecal({ kit, backZ }: { kit: BrandKit; backZ: number }) {
  const url = kit.logos.primary.rasterUrl;
  if (!url) return null;
  const invert = !!kit.scene?.invertLogo;
  const chroma = kit.scene?.logoChroma ?? "";
  const tex = useLogoTexture(url, invert, chroma);
  const aspect = kit.logos.primary.viewBox[2] / Math.max(kit.logos.primary.viewBox[3], 1);
  const w = 0.12;
  const h = w / aspect;
  // backZ is the chair-local Z of the backrest. For chairs whose model faces
  // -Z (offset = π), backZ is +0.32; for chairs that face +Z (offset = 0),
  // backZ is -0.32 — and we flip the plane 180° around Y so its normal points
  // outward.
  const rotY = backZ > 0 ? 0 : Math.PI;
  return (
    <mesh position={[0, 0.92, backZ]} rotation-y={rotY}>
      <planeGeometry args={[w, Math.min(h, 0.1)]} />
      <meshStandardMaterial
        map={tex}
        emissiveMap={tex}
        emissive={new THREE.Color("#ffffff")}
        emissiveIntensity={0.35}
        color="#ffffff"
        transparent
        toneMapped={false}
        depthWrite={false}
        alphaTest={0.04}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Table-top brand decal — sits flat at the head + foot of the table so
// you read the brand once you sit down. Two plates per table; small so
// they don't fight the centrepiece cups.
export function TableTopBrandDecals({
  position, tableLengthM, tableWidthM, kit,
}: { position: [number, number, number]; tableLengthM: number; tableWidthM: number; kit: BrandKit }) {
  const url = kit.logos.primary.rasterUrl;
  if (!url) return null;
  return (
    <group position={[position[0], position[1] + TABLE_HEIGHT_M + 0.001, position[2]]}>
      <TableTopDecal kit={kit} url={url} z={tableLengthM / 2 - 0.22} />
      <TableTopDecal kit={kit} url={url} z={-(tableLengthM / 2 - 0.22)} flipped />
      <TableTopCentreDecal kit={kit} url={url} tableLengthM={tableLengthM} tableWidthM={tableWidthM} />
    </group>
  );
}

function TableTopDecal({ kit, url, z, flipped = false }: { kit: BrandKit; url: string; z: number; flipped?: boolean }) {
  const invert = !!kit.scene?.invertLogo;
  const chroma = kit.scene?.logoChroma ?? "";
  const tex = useLogoTexture(url, invert, chroma);
  const aspect = kit.logos.primary.viewBox[2] / Math.max(kit.logos.primary.viewBox[3], 1);
  const w = 0.22;
  const h = w / aspect;
  return (
    <mesh position={[0, 0.002, z]} rotation-x={-Math.PI / 2} rotation-z={flipped ? Math.PI : 0}>
      <planeGeometry args={[w, Math.min(h, 0.14)]} />
      <meshStandardMaterial
        map={tex}
        emissiveMap={tex}
        emissive={new THREE.Color("#ffffff")}
        emissiveIntensity={0.15}
        color="#ffffff"
        transparent
        toneMapped={false}
        depthWrite={false}
        alphaTest={0.04}
      />
    </mesh>
  );
}

function TableTopCentreDecal({ kit, url, tableLengthM, tableWidthM }: { kit: BrandKit; url: string; tableLengthM: number; tableWidthM: number }) {
  // Dim watermark-style centre logo — sized to the table footprint but
  // emissive low so it doesn't compete with the cups + meeting paperwork.
  const invert = !!kit.scene?.invertLogo;
  const chroma = kit.scene?.logoChroma ?? "";
  const tex = useLogoTexture(url, invert, chroma);
  const aspect = kit.logos.primary.viewBox[2] / Math.max(kit.logos.primary.viewBox[3], 1);
  const wMax = Math.min(tableWidthM * 0.55, tableLengthM * 0.25);
  const w = wMax;
  const h = Math.min(w / aspect, tableWidthM * 0.4);
  return (
    <mesh position={[0, 0.001, 0]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={tex}
        emissiveMap={tex}
        emissive={new THREE.Color("#ffffff")}
        emissiveIntensity={0.05}
        color="#ffffff"
        transparent
        opacity={0.55}
        toneMapped={false}
        depthWrite={false}
        alphaTest={0.04}
      />
    </mesh>
  );
}

// ── Chair formation ──────────────────────────────────────────────────────────
// `count` chairs arranged around a `tableLengthM` × `tableWidthM` table, every
// chair offset off the table edge and rotated to face the table centre.

export function ChairsAroundTable({
  count, tableLengthM, tableWidthM, chairVariant, position, tintHex, kit,
}: {
  count: number; tableLengthM: number; tableWidthM: number;
  chairVariant: ChairVariant; position: [number, number, number]; tintHex?: string;
  kit?: BrandKit;
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
        <BoardroomChair key={i} url={url} position={s.pos} rotationY={s.rot} tintHex={tintHex} kit={kit} variant={chairVariant} />
      ))}
    </group>
  );
}

// ── Branded coffee cups ─────────────────────────────────────────────────────
// One cup per chair, placed on the table in front of the seat. The brand
// logo wraps around the cup as a four-quadrant decal so it reads from any
// chair. Cups are linked to chair count + table dims so they re-flow when
// the user expands the boardroom.

const CUP_HEIGHT_M = 0.105;            // matches the GLB's normalised height
const CUP_RADIUS_M = 0.04;             // for the logo decal placement
// Tucked well inboard of the table edge — the cup is in front of the diner
// like a place-setting, not perched on the lip. Increased from 0.32m so the
// brand decal isn't fighting the edge highlight.
const CUP_INSET_M = 0.48;
const CUP_GLB_URL = asset("/glb/props/coffeecup.glb");
useGLTF.preload(CUP_GLB_URL);

export function BrandedCupsOnTable({
  count, tableLengthM, tableWidthM, position, kit,
}: {
  count: number; tableLengthM: number; tableWidthM: number;
  position: [number, number, number]; kit: BrandKit;
}) {
  // Mirror ChairsAroundTable's slot logic so cups line up with chair seats.
  const slots = useMemo(() => {
    const out: { pos: [number, number, number]; rot: number }[] = [];
    if (count <= 0) return out;
    const sideX = tableWidthM / 2 - CUP_INSET_M;
    const endZ = tableLengthM / 2 - CUP_INSET_M;
    const endN = count >= 4 ? Math.min(2, count) : 0;
    const sideTotal = count - endN;
    const leftN = Math.ceil(sideTotal / 2);
    const rightN = sideTotal - leftN;
    const spanZ = Math.max(0.01, tableLengthM - 0.8);
    const place = (n: number, i: number) => (n <= 1 ? 0 : -spanZ / 2 + (i * spanZ) / (n - 1));
    for (let i = 0; i < leftN; i++)  out.push({ pos: [-sideX, 0, place(leftN, i)],  rot: Math.PI / 2 });
    for (let i = 0; i < rightN; i++) out.push({ pos: [sideX, 0, place(rightN, i)],  rot: -Math.PI / 2 });
    if (endN >= 1) out.push({ pos: [0, 0, -endZ], rot: 0 });
    if (endN >= 2) out.push({ pos: [0, 0, endZ], rot: Math.PI });
    return out;
  }, [count, tableLengthM, tableWidthM]);

  return (
    <group position={[position[0], position[1] + TABLE_HEIGHT_M + 0.001, position[2]]}>
      {slots.map((s, i) => (
        <BrandedCoffeeCup key={i} position={s.pos} rotationY={s.rot} kit={kit} />
      ))}
    </group>
  );
}

function BrandedCoffeeCup({
  position, rotationY, kit,
}: { position: [number, number, number]; rotationY: number; kit: BrandKit }) {
  const url = kit.logos.primary.rasterUrl;
  const invert = !!kit.scene?.invertLogo;
  const chroma = kit.scene?.logoChroma ?? "";
  const tex = useLogoTexture(url ?? "", invert, chroma);
  const aspect = kit.logos.primary.viewBox[2] / Math.max(kit.logos.primary.viewBox[3], 1);
  // Decal: keep small relative to the cup radius so a flat plane on the
  // cylinder doesn't bow noticeably at the edges (chord-to-arc error).
  const decalW = CUP_RADIUS_M * 0.85;
  const decalH = Math.min(decalW / aspect, CUP_HEIGHT_M * 0.4);
  // Cup body: kit-specific cup colour wins; falls back to the kit's
  // neutralLight ceramic-cream.
  const cupColor = kit.scene?.cupColor ?? kit.palette.neutralLight ?? "#F4F4F4";
  // Real coffee-cup GLB (saucer + cup with handle). Tinted to the kit's
  // cupColor — the user shipped a clean GLB that takes a tint cleanly.
  const gltf = useGLTF(CUP_GLB_URL);
  const node = useMemo(() => {
    const s = (gltf?.scene ?? new THREE.Group()).clone(true);
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true; m.receiveShadow = true;
        const mat = m.material as THREE.MeshStandardMaterial | undefined;
        if (mat && "color" in mat) {
          const next = mat.clone();
          next.color = new THREE.Color(cupColor);
          m.material = next;
        }
      }
    });
    return normalizeForBase(s, CUP_HEIGHT_M);
  }, [gltf, cupColor]);
  // Two decals — front and back — so the logo reads from any seat without
  // becoming a busy orbit of marks around the cup.
  const facings = [0, Math.PI];
  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={node} />
      {url && facings.map((rotY, i) => {
        const r = CUP_RADIUS_M * 0.92 + 0.0008;
        return (
          <group key={i} rotation-y={rotY}>
            <mesh position={[0, CUP_HEIGHT_M * 0.55, r]}>
              <planeGeometry args={[decalW, decalH]} />
              <meshStandardMaterial
                map={tex}
                emissiveMap={tex}
                emissive={new THREE.Color("#ffffff")}
                emissiveIntensity={0.2}
                color="#ffffff"
                transparent
                toneMapped={false}
                depthWrite={false}
                alphaTest={0.04}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
