"use client";
import { useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

// Local type — `SVGResult` isn't a runtime symbol in three.js 0.172, only
// the SVGLoader class is. Defining the shape here keeps the type-only
// import out of the build (which was causing "m.paths is not iterable"
// crashes in production when the loader payload arrived shaped slightly
// differently than the type assumed).
type SVGResult = {
  paths?: Array<{ userData?: { style?: { fill?: string } } }>;
};

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
  const loaded = useLoader(SVGLoader, url) as SVGResult | SVGResult[];

  const groups = useMemo(() => {
    const out: { shapes: THREE.Shape[]; color: string }[] = [];
    // Tolerate the two shapes useLoader can return — single result or
    // array-of-results — plus the production-build edge case where the
    // result loses its prototype and `paths` isn't iterable.
    const svg = Array.isArray(loaded) ? loaded[0] : loaded;
    const paths = svg?.paths;
    if (!paths || typeof paths[Symbol.iterator] !== "function") return out;
    for (const path of paths) {
      try {
        const shapes = SVGLoader.createShapes(path as never);
        if (!shapes || shapes.length === 0) continue;
        const style = (path.userData as { style?: { fill?: string } } | undefined)?.style;
        const color = tintHex ?? (style?.fill && style.fill !== "none" ? style.fill : "#1a1a1a");
        out.push({ shapes, color });
      } catch {
        // Skip malformed paths rather than crash the scene.
      }
    }
    return out;
  }, [loaded, tintHex]);

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

  // Fallback when SVG parsing produced no shapes — render a flat plane
  // textured with a runtime-rasterised version of the SVG. Looks like the
  // pre-extrusion treatment we used before; better than no logo at all.
  if (groups.length === 0) {
    return <RasterisedSvgFallback url={url} widthM={widthM} heightM={heightM} tintHex={tintHex} emissive={emissive} />;
  }

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

/** Rasterises the SVG via a fetch + browser `<img>` and applies it as a
 *  texture on a flat plane. Used as a fall-back when SVGLoader can't
 *  produce extrudable shapes (malformed paths, missing browser support,
 *  build-time edge cases). */
function RasterisedSvgFallback({ url, widthM, heightM, tintHex, emissive = 0 }: { url: string; widthM: number; heightM: number; tintHex?: string; emissive?: number }) {
  const tex = useMemo(() => {
    if (typeof document === "undefined") return null;
    // The browser <img> path resolves the SVG natively; we hand-roll the
    // canvas rasterisation so this fallback doesn't depend on any react
    // hook that might already have been registered upstream.
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    if (!ctx) return t;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ratio = img.width / img.height;
      let w = canvas.width, h = canvas.width / ratio;
      if (h > canvas.height) { h = canvas.height; w = h * ratio; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      t.needsUpdate = true;
    };
    img.src = url;
    return t;
  }, [url]);
  return (
    <mesh castShadow receiveShadow>
      <planeGeometry args={[widthM, heightM]} />
      <meshStandardMaterial
        map={tex ?? null}
        emissiveMap={tex ?? null}
        emissive={new THREE.Color(tintHex ?? "#ffffff")}
        emissiveIntensity={emissive}
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

/** True when a logo URL ends in .svg — we can use the extruded SVG path
 *  for these. JPGs (TMRW, Rolex) need to keep using the rasterized canvas
 *  approach until they get proper transparent assets. */
export function canExtrude(url: string): boolean {
  return /\.svg(\?.*)?$/i.test(url);
}
