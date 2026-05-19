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
        m.userData = { ...m.userData, kind: "table" };
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

/** Tag a chair material by its likely role from its name. Used so the
 *  brand-tint only paints the FABRIC (seat / backrest / upholstery) and
 *  leaves the FRAME (legs / metal base / chrome) alone — otherwise the
 *  whole chair becomes one monochrome lozenge. For ambiguous materials
 *  (single-material chairs like the executive variant) we still tint,
 *  but at reduced strength via a lerp toward the original colour. */
function classifyChairMaterialRole(name: string): "fabric" | "frame" | "ambiguous" {
  const n = name.toLowerCase();
  if (/(leg|metal|chrome|steel|base|frame|leather worn brown)/.test(n)) return "frame";
  // `Leather Worn Brown` is the upholstery on ny_studio (despite the
  // ambiguous wording — empirically THIS is the fabric, the legs material
  // is literally named "chair_legs").
  if (n === "leather worn brown") return "fabric";
  if (/(fabric|cloth|upholst|seat|cushion|back|chairs?$)/.test(n)) return "fabric";
  return "ambiguous";
}

function BoardroomChair({
  url, position, rotationY, tintHex, kit, variant,
}: { url: string; position: [number, number, number]; rotationY: number; tintHex?: string; kit?: BrandKit; variant: ChairVariant }) {
  const gltf = useGLTF(url);
  const node = useMemo(() => {
    const s = (gltf?.scene ?? new THREE.Group()).clone(true);
    const tint = tintHex ? new THREE.Color(tintHex) : null;
    s.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      m.userData = { ...m.userData, kind: "chair" };
      if (!tint) return;
      const mat = m.material as THREE.MeshStandardMaterial | undefined;
      if (!mat || !("color" in mat)) return;
      const role = classifyChairMaterialRole(mat.name ?? "");
      if (role === "frame") return;                                // leave legs / metal alone
      const next = mat.clone();
      if (role === "fabric") {
        next.color = tint.clone();
      } else {
        // ambiguous: lerp the existing colour 60% toward the brand tint so
        // single-material chairs still pick up the brand without fully
        // monochroming the legs + arms.
        next.color = next.color.clone().lerp(tint, 0.6);
      }
      m.material = next;
    });
    return normalizeForBase(s, CHAIR_HEIGHT_M);
  }, [gltf, tintHex]);
  const offset = CHAIR_FACE_OFFSETS[variant];
  // Backrest direction in chair-local: for variants whose model natively
  // faces -Z (offset = π), the back is at local +Z; for variants whose
  // model faces +Z (offset = 0), the back is at local -Z.
  const backZ = offset === Math.PI ? 0.32 : -0.32;
  return (
    <group position={position} rotation-y={rotationY + offset} userData={{ kind: "chair" }}>
      {/* Wrapped in an inner group with userData so the long-press editor's
          raycast walk finds "chair" even if the picked mesh happens to be
          the back-logo decal plane (which has no userData of its own). */}
      <group userData={{ kind: "chair" }}>
        <primitive object={node} />
      </group>
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
  // Doubled from 0.12m → 0.24m per user feedback (the back-of-chair mark
  // wasn't reading at conference-room distance). Cap height at 0.2m so
  // tall-narrow logos don't blow past the backrest.
  const w = 0.24;
  const h = Math.min(w / aspect, 0.2);
  // backZ is the chair-local Z of the backrest. For chairs whose model faces
  // -Z (offset = π), backZ is +0.32; for chairs that face +Z (offset = 0),
  // backZ is -0.32 — and we flip the plane 180° around Y so its normal points
  // outward.
  const rotY = backZ > 0 ? 0 : Math.PI;
  // Inward-facing decal sits on the FRONT of the backrest — slightly
  // inset from the back face (≈8cm forward) so it doesn't z-fight, and
  // dropped DOWN by half its height (~h/2) per user feedback so it sits
  // mid-backrest rather than rim-of-head height.
  const frontZ = backZ > 0 ? backZ - 0.08 : backZ + 0.08;
  const frontY = 0.92 - h * 0.5;
  return (
    <mesh position={[0, frontY, frontZ]} rotation-y={rotY + Math.PI} userData={{ kind: "chair" }}>
      <planeGeometry args={[w, h]} />
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
    // Gap between the chair PIVOT (centre of seat) and the table edge.
    // The chair model's seat extends ~0.30m forward of the pivot. With
    // gap = 0.18m the seat front overlapped the table by ~12cm — chairs
    // visually encroached on the table top. With gap = 0.36m the seat
    // front sits ~6cm clear of the table edge: knees go under the table
    // (natural seating posture), seat surface stays on the chair side
    // of the edge, no visual overlap.
    const gap = 0.36;                                  // chair offset from the table edge
    const sideX = tableWidthM / 2 + gap;
    const endZ = tableLengthM / 2 + gap;
    // Chair spacing constraint. Different chair variants render at
    // different widths (studio ~0.55m, executive ~0.65m, presenter
    // ~0.70m). Using 0.85m centre-to-centre min gives every variant at
    // least 0.15m of edge clearance — comfortably above the user's
    // 0.25× chair-width minimum gap. If the table side can't fit the
    // requested chairs at that spacing, we CAP the count (auto-thin)
    // rather than pack them in. Was packing visibly overlapping.
    const MIN_CHAIR_SPACING_M = 0.85;
    const spanZ = Math.max(0.01, tableLengthM - 0.8);  // keep chairs off the corners
    const sideCapacity = Math.max(1, Math.floor(spanZ / MIN_CHAIR_SPACING_M) + 1);
    const endN = count >= 4 ? Math.min(2, count) : 0;  // head + foot once there's room
    const sideTotal = count - endN;
    const leftN = Math.min(sideCapacity, Math.ceil(sideTotal / 2));
    const rightN = Math.min(sideCapacity, sideTotal - leftN);
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
// Tucked inboard of the table edge — cup is in front of the diner like a
// place setting. With chairs at 0.36m gap, 0.40m inset puts the cup in
// the diner's natural reach zone (just past where their hands rest).
const CUP_INSET_M = 0.40;
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
    // Clamp the inset on narrow / short tables so cups never fall off
    // the edge. CUP_INSET is the ideal "place setting" inset; for narrow
    // ovals (1.0m wide) it would put cups outside the half-width. Min
    // inset is the cup radius + 5cm safety so the cup body always sits
    // fully on the table.
    const minInset = CUP_RADIUS_M + 0.05;
    const insetX = Math.max(minInset, Math.min(CUP_INSET_M, tableWidthM / 2 - minInset));
    const insetZ = Math.max(minInset, Math.min(CUP_INSET_M, tableLengthM / 2 - minInset));
    const sideX = tableWidthM / 2 - insetX;
    const endZ  = tableLengthM / 2 - insetZ;
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

  // Sit cups on the table surface with a 1mm float to avoid z-fighting.
  // We used to sink the parent 4cm to hide the saucer (treating it as a
  // floating-cup optical illusion); turns out that buried the cup BODY
  // in the table top for most viewing angles. Saucer-on-table reads
  // correctly as a place setting at conference distance.
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
  // Cup body: kit-specific cup colour wins; falls back to the kit's
  // neutralLight ceramic-cream.
  const cupColor = kit.scene?.cupColor ?? kit.palette.neutralLight ?? "#F4F4F4";
  // Real coffee-cup GLB (saucer + cup with handle). Tinted to the kit's
  // cupColor — the user shipped a clean GLB that takes a tint cleanly.
  const gltf = useGLTF(CUP_GLB_URL);
  const { node, decalRadius } = useMemo(() => {
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
    const normalised = normalizeForBase(s, CUP_HEIGHT_M);
    // Measure the post-normalize bbox so we know the actual cup radius (the
    // GLB ships with a handle that throws off the X/Z extents — using the
    // SMALLER of the two halves keeps the decal on the cup body, not on
    // the handle). +2mm beyond the surface so it doesn't z-fight.
    normalised.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(normalised);
    const size = bbox.getSize(new THREE.Vector3());
    const radius = Math.min(size.x, size.z) / 2 + 0.002;
    return { node: normalised, decalRadius: radius };
  }, [gltf, cupColor]);
  // Logo wraps cylindrically around the cup body. Two facing arcs (front
  // + back) at ~120° each give legibility from every seat without
  // looking like a sticker the size of the cup. Previous values made
  // the logo dominate the body — shrunk to a max 28% of cup height and
  // moved up to sit mid-body (70% of cup height) so it reads as a
  // proper brand decal rather than a wrap.
  const decalH = Math.min((decalRadius * 0.9) / aspect, CUP_HEIGHT_M * 0.28);
  const ARC_RAD = (120 * Math.PI) / 180;
  const facings = [0, Math.PI];
  return (
    <group position={position} rotation-y={rotationY}>
      <primitive object={node} />
      {url && facings.map((rotY, i) => (
        <group key={i} rotation-y={rotY}>
          {/* Open partial-cylinder segment. CylinderGeometry args:
              radiusTop, radiusBottom, height, radialSegments, heightSegments,
              openEnded, thetaStart, thetaLength. thetaStart=-ARC/2 centres
              the arc on the +Z facing. */}
          <mesh position={[0, CUP_HEIGHT_M * 0.70, 0]}>
            <cylinderGeometry args={[decalRadius, decalRadius, decalH, 32, 1, true, -ARC_RAD / 2, ARC_RAD]} />
            <meshStandardMaterial
              map={tex}
              emissiveMap={tex}
              emissive={new THREE.Color("#ffffff")}
              emissiveIntensity={0.3}
              color="#ffffff"
              transparent
              toneMapped={false}
              depthWrite={false}
              alphaTest={0.04}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
