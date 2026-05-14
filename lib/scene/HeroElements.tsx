"use client";
import { Suspense, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useLogoTexture } from "./Textures";
import type { BrandKit } from "@/lib/schemas";

// ── Light shafts (visible cones from the truss spotlights) ───────────────────

/**
 * Volumetric-feel beam stack: instead of one hard-edged transparent cone we
 * stack three coaxial cones with falling opacity (wide+faint → narrow+hot),
 * add a soft emissive floor disc where the beam lands, and a real spotLight
 * that pools light on the platform. The trio reads as a soft diffused beam
 * instead of a plastic cone of geometry.
 */
export function LightShafts({
  widthM, depthM, railY, color, count = 6, density = 0.5, floorY = 0.05,
}: {
  widthM: number; depthM: number; railY: number;
  color: string; count?: number; density?: number; floorY?: number;
}) {
  // Spread visible shafts along the back rail aimed inward + down
  const shafts = useMemo(() => {
    const out: { x: number; z: number; bottomR: number; height: number }[] = [];
    const inset = 0.6;
    for (let i = 0; i < count; i++) {
      const x = -widthM / 2 + inset + (i * (widthM - 2 * inset)) / Math.max(1, count - 1);
      const fromZ = -depthM / 2 + 0.2;
      out.push({ x, z: fromZ + 0.6, bottomR: 1.0, height: railY - floorY });
    }
    return out;
  }, [widthM, depthM, railY, count, floorY]);

  const midY = (railY + floorY) / 2;

  return (
    <group>
      {shafts.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]}>
          {/* Outermost soft halo — very wide, very faint */}
          <mesh position={[0, midY, 0]} renderOrder={2}>
            <coneGeometry args={[s.bottomR * 1.5, s.height, 48, 1, true]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.2 * density}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          {/* Mid cone — the visible beam */}
          <mesh position={[0, midY, 0]} renderOrder={3}>
            <coneGeometry args={[s.bottomR, s.height, 48, 1, true]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.4 * density}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          {/* Hot inner core — narrow + brighter */}
          <mesh position={[0, midY, 0]} renderOrder={4}>
            <coneGeometry args={[s.bottomR * 0.4, s.height, 32, 1, true]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.7 * density}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          {/* Soft floor pool — the beam landing on the platform */}
          <mesh position={[0, floorY + 0.001, 0]} rotation-x={-Math.PI / 2} renderOrder={5}>
            <circleGeometry args={[s.bottomR * 1.8, 48]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.9 * density}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          {/* Real spotlight grounding the beam on the floor */}
          <spotLight
            position={[0, railY - 0.05, 0]}
            target-position={[0, floorY, 0]}
            angle={0.45}
            penumbra={0.9}
            intensity={20 * density}
            distance={railY + 0.8}
            decay={1.3}
            color={color}
            castShadow={false}
          />
        </group>
      ))}
    </group>
  );
}

// ── Lightbox floating logo (suspended internally-lit sign) ───────────────────

export function LightboxLogo({
  kit, position, widthM = 2.4, depthM = 0.18, heightM = 1.0, emissive = 2.0,
}: {
  kit: BrandKit; position: [number, number, number]; widthM?: number; depthM?: number; heightM?: number; emissive?: number;
}) {
  const url = kit.logos.primary.rasterUrl;
  if (!url) return null;
  return (
    <Suspense fallback={null}>
      <LightboxBody url={url} viewBox={kit.logos.primary.viewBox} position={position} widthM={widthM} depthM={depthM} heightM={heightM} sideTint={kit.palette.primary} emissive={emissive} />
    </Suspense>
  );
}

function LightboxBody({
  url, viewBox, position, widthM, depthM, heightM, sideTint, emissive,
}: { url: string; viewBox: [number, number, number, number]; position: [number, number, number]; widthM: number; depthM: number; heightM: number; sideTint: string; emissive: number }) {
  const tex = useLogoTexture(url);
  const aspect = viewBox[2] / Math.max(viewBox[3], 1);
  // Sign aspect — if the logo is wider than the box, scale by width; otherwise by height.
  const wPlane = widthM * 0.92;
  const hPlane = Math.min(heightM * 0.85, wPlane / aspect);
  const finalW = hPlane * aspect;
  return (
    <group position={position}>
      {/* Suspension cables — two thin black cylinders going up to truss */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[(sx * widthM * 0.35), 0.6, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 1.4, 6]} />
          <meshStandardMaterial color="#0c0d10" />
        </mesh>
      ))}
      {/* Internally-lit box */}
      <mesh castShadow>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshPhysicalMaterial color={sideTint} roughness={0.32} metalness={0.06} clearcoat={0.4} clearcoatRoughness={0.2} emissive={new THREE.Color(sideTint)} emissiveIntensity={0.25} />
      </mesh>
      {/* Front face decal — both sides so the lightbox reads from either direction */}
      {[depthM / 2 + 0.002, -depthM / 2 - 0.002].map((zOff, i) => (
        <mesh key={i} position={[0, 0, zOff]} rotation-y={i === 0 ? 0 : Math.PI}>
          <planeGeometry args={[finalW, hPlane]} />
          <meshStandardMaterial
            map={tex}
            emissiveMap={tex}
            emissive={new THREE.Color("#ffffff")}
            emissiveIntensity={emissive}
            color="#ffffff"
            transparent
            toneMapped={false}
            depthWrite={false}
            alphaTest={0.02}
          />
        </mesh>
      ))}
      {/* Soft inner light */}
      <pointLight intensity={emissive * 2.5} distance={4} decay={1.6} color="#ffffff" />
    </group>
  );
}

// ── Radiating ring rig (SEW-Eurodrive concentric overhead rings) ─────────────

export function RadiatingRig({
  centerXZ, baseRadius, rings, yPos, color,
}: { centerXZ: [number, number]; baseRadius: number; rings: number; yPos: number; color: string }) {
  const list = useMemo(() => {
    const out: { r: number; tube: number }[] = [];
    for (let i = 0; i < rings; i++) {
      const r = baseRadius * (1 - i * 0.18);
      if (r <= 0.3) break;
      out.push({ r, tube: 0.05 });
    }
    return out;
  }, [baseRadius, rings]);

  return (
    <group position={[centerXZ[0], yPos, centerXZ[1]]} rotation-x={-Math.PI / 2}>
      {list.map((ring, i) => (
        <mesh key={i} castShadow>
          <torusGeometry args={[ring.r, ring.tube, 14, 96]} />
          <meshStandardMaterial color={color} emissive={new THREE.Color(color)} emissiveIntensity={2.0} toneMapped={false} />
        </mesh>
      ))}
      {/* Soft downlight from the rig */}
      <pointLight position={[0, 0, -0.5]} intensity={6} distance={8} decay={1.4} color={color} />
    </group>
  );
}

// ── Glass perimeter rails ────────────────────────────────────────────────
// Tracks the OPEN sides of the booth (front + flanks) with a glass + handrail
// pair at platform height, leaving entry gaps on the front centre and one
// flank. No floor — this is a low-rise perimeter, not a balcony.

export function GlassBalcony({
  widthM, depthM, platformHeightM, brandPrimary, brandAccent,
}: { widthM: number; depthM: number; platformHeightM: number; brandPrimary: string; brandAccent: string }) {
  const baseY = platformHeightM;                  // sit on top of the platform
  const glassH = 1.05;                            // 1.05 m glass — head-friendly
  const glassT = 0.018;
  const railT = 0.032;
  // Front opening: a 2 m gap centred at X=0.
  const entryWidth = Math.min(2.2, widthM * 0.35);
  const segWidth = (widthM - entryWidth) / 2;     // each front segment width
  const segHalfOffset = entryWidth / 2 + segWidth / 2;
  const glassMat = (
    <meshPhysicalMaterial transmission={0.94} roughness={0.05} ior={1.5} thickness={0.04} color="#ffffff" attenuationColor="#d6dde4" attenuationDistance={2.0} envMapIntensity={1.3} />
  );
  const railMat = (
    <meshPhysicalMaterial color={brandAccent} roughness={0.34} metalness={0.85} clearcoat={0.35} />
  );
  // Per-edge segment builder: spans either the full edge or stops short of
  // entry gaps. Each segment renders a glass pane + a top handrail.
  const Segment = ({ position, rotationY, length }: { position: [number, number, number]; rotationY: number; length: number }) => (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, baseY + glassH / 2, 0]}>
        <boxGeometry args={[length, glassH, glassT]} />
        {glassMat}
      </mesh>
      <mesh position={[0, baseY + glassH + railT / 2, 0]}>
        <boxGeometry args={[length + railT, railT, railT * 1.2]} />
        {railMat}
      </mesh>
      {/* Slim brand-accent stripe at glass base */}
      <mesh position={[0, baseY + 0.025, 0]}>
        <boxGeometry args={[length, 0.025, glassT * 1.1]} />
        <meshStandardMaterial color={brandPrimary} emissive={new THREE.Color(brandAccent)} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
    </group>
  );
  return (
    <group>
      {/* Front edge — two segments either side of the central entry gap */}
      <Segment position={[-segHalfOffset, 0,  depthM / 2 - glassT]} rotationY={0} length={segWidth} />
      <Segment position={[ segHalfOffset, 0,  depthM / 2 - glassT]} rotationY={0} length={segWidth} />
      {/* Left flank — single run; second flank dropped to leave a side entry */}
      <Segment position={[-widthM / 2 + glassT, 0, 0]} rotationY={Math.PI / 2} length={depthM - 0.4} />
      {/* Right flank: split into two short segments around a side entry near
          the front, so visitors can also walk in from the right. */}
      <Segment position={[ widthM / 2 - glassT, 0, -depthM / 4]} rotationY={Math.PI / 2} length={depthM / 2 - 0.6} />
      <Segment position={[ widthM / 2 - glassT,  0,  depthM / 2 - 1.0]} rotationY={Math.PI / 2} length={1.4} />
    </group>
  );
}

// ── Circular video screen (brand-tinted disc on back wall) ───────────────────

export function CircularScreen({
  kit, position, radius = 1.2,
}: { kit: BrandKit; position: [number, number, number]; radius?: number }) {
  const url = kit.logos.primary.rasterUrl;
  return (
    <group position={position}>
      {/* Outer frame ring */}
      <mesh>
        <torusGeometry args={[radius + 0.05, 0.04, 12, 96]} />
        <meshPhysicalMaterial color="#0e1014" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* Brand-coloured glowing disc */}
      <mesh position={[0, 0, 0.005]}>
        <circleGeometry args={[radius, 64]} />
        <meshStandardMaterial color={kit.palette.primary} emissive={new THREE.Color(kit.palette.primary)} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* Brand logo emissive overlay */}
      {url && (
        <Suspense fallback={null}>
          <CircularScreenLogo url={url} viewBox={kit.logos.primary.viewBox} radius={radius} />
        </Suspense>
      )}
      {/* YouTube fallback: a small html iframe if YouTube ID is set */}
      {kit.scene?.youtubeId && (
        <Html
          transform
          position={[0, 0, 0.012]}
          distanceFactor={1}
          style={{ pointerEvents: "auto", clipPath: "circle(50% at 50% 50%)" }}
        >
          <iframe
            width={Math.round(radius * 380)}
            height={Math.round(radius * 380)}
            src={`https://www.youtube-nocookie.com/embed/${kit.scene.youtubeId}?autoplay=1&mute=1&loop=1&playlist=${kit.scene.youtubeId}&controls=0&modestbranding=1&rel=0&playsinline=1`}
            title={`${kit.name} circular video`}
            allow="autoplay; encrypted-media; picture-in-picture"
            style={{ border: "0", display: "block", borderRadius: "50%" }}
          />
        </Html>
      )}
    </group>
  );
}

function CircularScreenLogo({ url, viewBox, radius }: { url: string; viewBox: [number, number, number, number]; radius: number }) {
  const tex = useLogoTexture(url);
  const aspect = viewBox[2] / Math.max(viewBox[3], 1);
  const w = radius * 1.2;
  const h = w / aspect;
  return (
    <mesh position={[0, 0, 0.01]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={tex}
        emissiveMap={tex}
        emissive={new THREE.Color("#ffffff")}
        emissiveIntensity={2.2}
        color="#ffffff"
        transparent
        toneMapped={false}
        depthWrite={false}
        alphaTest={0.04}
      />
    </mesh>
  );
}

// ── Wraparound 360 widescreen (curved LED panel along back) ──────────────────

export function WraparoundScreen({
  kit, widthM, depthM, heightM, brightness = 1.4, yBaseM = 0.5,
}: {
  kit: BrandKit; widthM: number; depthM: number; heightM: number; brightness?: number; yBaseM?: number;
}) {
  // Curved ring-segment plane along the back wall — covers a 100° arc with the booth's
  // back at the apex. Uses CylinderGeometry open at top and bottom for the curve.
  const radius = widthM * 0.85;
  const arcRad = (110 * Math.PI) / 180;
  return (
    <group position={[0, yBaseM + heightM / 2, -depthM / 2 + 0.18]}>
      <mesh castShadow rotation-y={Math.PI}>
        <cylinderGeometry
          args={[radius, radius, heightM, 64, 1, true, -arcRad / 2, arcRad]}
        />
        <meshStandardMaterial
          color={kit.palette.primary}
          emissive={new THREE.Color(kit.palette.primary)}
          emissiveIntensity={brightness}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Glow into the booth */}
      <pointLight intensity={brightness * 4} distance={radius * 2.5} decay={1.5} color={kit.palette.primary} />
    </group>
  );
}
