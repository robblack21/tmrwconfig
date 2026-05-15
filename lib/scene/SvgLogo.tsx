"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { SVGLoader, type SVGResult } from "three/examples/jsm/loaders/SVGLoader.js";

// ── Extruded SVG logo ──────────────────────────────────────────────────────
// Loads an SVG, converts each path to one or more THREE.Shape, then extrudes
// them as 3D geometry. Replaces the older "rectangular backing box + flat
// decal" rendering for sign-style logos. Real lettering / mark silhouettes
// extrude into the room, catch light from the HDRI, cast shadows, and read
// equally from front and back.
//
// SVG paths arrive with their own fill colours; we group by colour so a
// multi-coloured mark (Google, Ferrari, Disney) keeps its identity. When
// `tintHex` is set we override every path with one colour — useful for
// monochrome signage / pendant faces.

export function ExtrudedSvgLogo({
  url, widthM, heightM, depthM, tintHex, metalness = 0.35, roughness = 0.45, clearcoat = 0.4, emissive = 0,
}: {
  url: string;
  widthM: number;
  heightM: number;
  depthM: number;
  /** When set, paints every path in this colour; otherwise uses SVG fills. */
  tintHex?: string;
  metalness?: number;
  roughness?: number;
  clearcoat?: number;
  /** Self-illumination intensity (0..3). Useful when the sign is meant to
   *  read as backlit signage rather than painted metal. */
  emissive?: number;
}) {
  const svg = useLoader(SVGLoader, url) as SVGResult;

  const groups = useMemo(() => {
    const out: { shapes: THREE.Shape[]; color: string }[] = [];
    for (const path of svg.paths) {
      const shapes = SVGLoader.createShapes(path);
      if (shapes.length === 0) continue;
      const style = (path.userData as { style?: { fill?: string } } | undefined)?.style;
      const color = tintHex ?? (style?.fill && style.fill !== "none" ? style.fill : "#1a1a1a");
      out.push({ shapes, color });
    }
    return out;
  }, [svg, tintHex]);

  const { scale, offsetX, offsetY } = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const g of groups) {
      for (const shape of g.shapes) {
        for (const pt of shape.getPoints(24)) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxX) maxX = pt.x;
          if (pt.y < minY) minY = pt.y;
          if (pt.y > maxY) maxY = pt.y;
        }
        // Include holes
        for (const hole of shape.holes) {
          for (const pt of hole.getPoints(24)) {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y < minY) minY = pt.y;
            if (pt.y > maxY) maxY = pt.y;
          }
        }
      }
    }
    const w = Math.max(maxX - minX, 1e-6);
    const h = Math.max(maxY - minY, 1e-6);
    const s = Math.min(widthM / w, heightM / h);
    return { scale: s, offsetX: -(minX + maxX) / 2, offsetY: -(minY + maxY) / 2 };
  }, [groups, widthM, heightM]);

  const extrudeSettings = useMemo(() => ({
    depth: Math.max(depthM, 0.0005),
    bevelEnabled: depthM > 0.005,
    bevelSize: Math.min(depthM * 0.18, 0.012),
    bevelThickness: Math.min(depthM * 0.18, 0.012),
    bevelSegments: 2,
  }), [depthM]);

  // SVG Y is positive-down; three Y is positive-up. Flip Y via negative scale
  // and use DoubleSide on the material so the inverted face winding still
  // reads correctly.
  return (
    <group scale={[scale, -scale, scale]} position={[offsetX * scale, offsetY * -scale, 0]}>
      {groups.map((g, gi) => (
        <group key={gi}>
          {g.shapes.map((shape, si) => (
            <mesh key={`${gi}-${si}`} castShadow receiveShadow>
              <extrudeGeometry args={[shape, extrudeSettings]} />
              <meshPhysicalMaterial
                color={g.color}
                roughness={roughness}
                metalness={metalness}
                clearcoat={clearcoat}
                clearcoatRoughness={0.2}
                emissive={emissive > 0 ? new THREE.Color(g.color) : new THREE.Color(0x000000)}
                emissiveIntensity={emissive}
                side={THREE.DoubleSide}
                toneMapped={emissive < 1.2}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** True when a logo URL ends in .svg — we can use the extruded SVG path
 *  for these. JPGs (TMRW, Rolex) need to keep using the rasterized canvas
 *  approach until they get proper transparent assets. */
export function canExtrude(url: string): boolean {
  return /\.svg(\?.*)?$/i.test(url);
}
