"use client";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { asset } from "@/lib/assetPath";

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

// ── Extruded RASTER logo ────────────────────────────────────────────────
// Raster fallback when the brand logo ships as PNG / JPG (TMRW, Rolex,
// most uploaded customer logos) — no vector paths to extrude. The
// approach: build silhouette polygons from the alpha mask via marching
// squares, then extrude each polygon with THREE.ExtrudeGeometry. This
// gives true 3D channel-letter-style signage instead of a flat decal.
//
// Algorithm:
//   1. Draw the image to a downsampled canvas (96 px on the long edge).
//   2. Read pixels into a binary mask (alpha > threshold).
//   3. Marching squares produces edge segments per cell; link them into
//      closed polylines.
//   4. Classify polygons by signed area: positive winding = outer
//      contour, negative = hole; assign each hole to the nearest
//      enclosing outer.
//   5. Build a THREE.Shape per outer + its holes; extrude.
//
// At 96×96 the silhouette is plenty crisp for boardroom-distance viewing
// while keeping the geometry under ~10k triangles.

export function ExtrudedRasterLogo({
  url, widthM, heightM, depthM, tintHex,
  invert = false, chroma = "",
  emissive = 0, metalness = 0.35, roughness = 0.45, clearcoat = 0.4,
}: {
  url: string;
  widthM: number;
  heightM: number;
  depthM: number;
  tintHex?: string;
  invert?: boolean;
  chroma?: "white" | "black" | "";
  emissive?: number;
  metalness?: number;
  roughness?: number;
  clearcoat?: number;
}) {
  const [geometry, setGeometry] = useState<THREE.ExtrudeGeometry | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    let cancelled = false;
    const resolved = url.startsWith("data:") || /^https?:/i.test(url) ? url : asset(url);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const natW = img.naturalWidth || img.width || 1;
      const natH = img.naturalHeight || img.height || 1;
      // Downsample to ~96px long edge. The silhouette stays recognisable
      // at this resolution and the extrusion stays under 10k tris.
      const target = 96;
      const k = target / Math.max(natW, natH, 1);
      const cw = Math.max(8, Math.round(natW * k));
      const ch = Math.max(8, Math.round(natH * k));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      const data = ctx.getImageData(0, 0, cw, ch).data;
      // Build binary mask. For chroma-keyed JPGs the alpha is always 1,
      // so we knock out pixels matching the chroma colour. Invert is a
      // visual concern (texture lookup) and doesn't affect silhouette.
      void invert;
      const mask = new Uint8Array(cw * ch);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!, a = data[i + 3]!;
        let on = a > 128;
        if (chroma === "white" && on && r > 235 && g > 235 && b > 235) on = false;
        if (chroma === "black" && on && r < 25 && g < 25 && b < 25) on = false;
        mask[p] = on ? 1 : 0;
      }
      // Trace contours. Returns an array of polylines (closed loops),
      // each as a list of [x, y] in pixel coordinates.
      const polys = traceContours(mask, cw, ch);
      if (polys.length === 0) return;
      // Map pixel coords → world-space coords centred at origin. Y flips
      // because image Y grows downward but three Y grows upward.
      const scaleX = widthM / cw;
      const scaleY = heightM / ch;
      const cx = cw / 2;
      const cy = ch / 2;
      const toShapePts = (pts: [number, number][]): THREE.Vector2[] =>
        pts.map(([x, y]) => new THREE.Vector2((x - cx) * scaleX, (cy - y) * scaleY));
      // Classify polygons by signed area sign. Positive = outer (CCW in
      // image coords ↔ CCW after Y-flip), negative = hole.
      const signedArea = (pts: [number, number][]) => {
        let s = 0;
        for (let i = 0; i < pts.length; i++) {
          const [x1, y1] = pts[i]!;
          const [x2, y2] = pts[(i + 1) % pts.length]!;
          s += (x1 * y2 - x2 * y1);
        }
        return s * 0.5;
      };
      const outers: { pts: [number, number][]; area: number }[] = [];
      const holes: { pts: [number, number][] }[] = [];
      for (const p of polys) {
        const a = signedArea(p);
        if (a >= 0) outers.push({ pts: p, area: a });
        else holes.push({ pts: p });
      }
      // Assign each hole to the smallest outer that geometrically
      // CONTAINS its first point. A point-in-polygon ray-cast does the
      // containment test; we then pick the outer with the smallest area
      // (innermost containing ring).
      const shapes: THREE.Shape[] = [];
      for (const outer of outers) {
        const shape = new THREE.Shape(toShapePts(outer.pts));
        for (const hole of holes) {
          if (!hole.pts.length) continue;
          const [hx, hy] = hole.pts[0]!;
          if (pointInPolygon(hx, hy, outer.pts)) {
            // Find SMALLEST outer that contains this hole (handles
            // nested rings — e.g. letter "B"'s two counters).
            let smallest = outer;
            for (const o of outers) {
              if (o === outer) continue;
              if (pointInPolygon(hx, hy, o.pts) && o.area < smallest.area) {
                smallest = o;
              }
            }
            if (smallest === outer) {
              const path = new THREE.Path(toShapePts(hole.pts));
              shape.holes.push(path);
            }
          }
        }
        shapes.push(shape);
      }
      if (shapes.length === 0) return;
      const settings = {
        depth: Math.max(depthM, 0.001),
        bevelEnabled: depthM > 0.01,
        bevelSize: Math.min(depthM * 0.18, 0.012),
        bevelThickness: Math.min(depthM * 0.18, 0.012),
        bevelSegments: 2,
        curveSegments: 4,
      };
      const geo = new THREE.ExtrudeGeometry(shapes, settings);
      // Recentre on Z so the back of the extrusion sits at z=0 (caller
      // controls the slab's z by positioning the parent group).
      geo.translate(0, 0, -settings.depth / 2);
      setGeometry(geo);
    };
    img.src = resolved;
    return () => { cancelled = true; };
  }, [url, widthM, heightM, depthM, invert, chroma]);
  if (!geometry) return null;
  const color = tintHex ?? "#1a1a1a";
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        clearcoat={clearcoat}
        clearcoatRoughness={0.2}
        emissive={emissive > 0 ? new THREE.Color(color) : new THREE.Color(0x000000)}
        emissiveIntensity={emissive}
        toneMapped={emissive < 1.2}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Contour tracing ────────────────────────────────────────────────────
// Marching-squares-flavoured boundary walker. For every "on" pixel that
// has at least one "off" neighbour we step around the silhouette using
// Moore-neighbour tracing. The result is a list of closed polylines,
// each representing either an outer contour (CCW) or a hole (CW).
//
// References: https://en.wikipedia.org/wiki/Moore_neighborhood

function traceContours(mask: Uint8Array, w: number, h: number): [number, number][][] {
  const get = (x: number, y: number) => (x < 0 || x >= w || y < 0 || y >= h ? 0 : mask[y * w + x]!);
  const visited = new Uint8Array(w * h);
  const polys: [number, number][][] = [];

  // Standard 8-neighbour offsets, clockwise starting from "right".
  const NX = [1, 1, 0, -1, -1, -1, 0, 1];
  const NY = [0, 1, 1, 1, 0, -1, -1, -1];

  const trace = (sx: number, sy: number, isOuter: boolean): [number, number][] => {
    const path: [number, number][] = [];
    let x = sx, y = sy;
    let prevDir = isOuter ? 6 : 2; // come from "above" for outer, "below" for hole
    let safety = w * h * 8;
    do {
      path.push([x, y]);
      visited[y * w + x] = 1;
      // Search neighbours starting from (prevDir + 2) % 8 (turn left).
      let found = false;
      for (let i = 0; i < 8; i++) {
        const dir = (prevDir + 2 + i) % 8;
        const nx = x + NX[dir]!;
        const ny = y + NY[dir]!;
        if (get(nx, ny)) {
          // Step into the neighbour. prevDir now points BACK to the
          // previous cell, so use (dir + 4) % 8 for the next iteration.
          prevDir = (dir + 4) % 8;
          x = nx;
          y = ny;
          found = true;
          break;
        }
      }
      if (!found) break;
      safety--;
    } while ((x !== sx || y !== sy) && safety > 0);
    return path;
  };

  // Outer contours — scan top-to-bottom for the first "on" pixel with an
  // "off" pixel above. That guarantees we start at a topmost boundary.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!get(x, y) || visited[y * w + x]) continue;
      // Outer: previous cell along scan was off, OR cell above is off.
      const above = get(x, y - 1);
      const left = get(x - 1, y);
      if (above) continue; // not a top edge
      // First outer encounter; trace.
      const p = trace(x, y, true);
      if (p.length >= 4) polys.push(p);
      // Skip rest of this filled run along the scan line — they're part
      // of the same shape. Subsequent rows will re-scan correctly.
      void left;
    }
  }

  // Hole contours — same idea but scan for "off" pixels INSIDE an "on"
  // region. We look for transitions where left=on, current=off, but the
  // cell is interior (off pixels surrounded by on).
  const holeVisited = new Uint8Array(w * h);
  const holeMask = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) holeMask[i] = mask[i] ? 0 : 1;
  // For each off-pixel, only trace if surrounded by on (i.e. it's a
  // hole, not the exterior background).
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!holeMask[y * w + x] || holeVisited[y * w + x]) continue;
      if (!mask[(y - 1) * w + x]) continue; // not bordered by "on" above
      // Trace the hole using the inverse mask.
      const path: [number, number][] = [];
      let cx = x, cy = y;
      let prevDir = 2;
      let safety = w * h * 8;
      do {
        path.push([cx, cy]);
        holeVisited[cy * w + cx] = 1;
        let found = false;
        for (let i = 0; i < 8; i++) {
          const dir = (prevDir + 2 + i) % 8;
          const nx = cx + NX[dir]!;
          const ny = cy + NY[dir]!;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && holeMask[ny * w + nx]) {
            prevDir = (dir + 4) % 8;
            cx = nx;
            cy = ny;
            found = true;
            break;
          }
        }
        if (!found) break;
        safety--;
      } while ((cx !== x || cy !== y) && safety > 0);
      // Only keep holes that DON'T touch the image edge (those are the
      // background, not real holes).
      let touchesEdge = false;
      for (const [px, py] of path) {
        if (px === 0 || py === 0 || px === w - 1 || py === h - 1) { touchesEdge = true; break; }
      }
      if (!touchesEdge && path.length >= 4) {
        // Reverse to make it a CW hole (negative signed area).
        polys.push(path.slice().reverse());
      }
    }
  }
  return polys;
}

function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]![0], yi = poly[i]![1];
    const xj = poly[j]![0], yj = poly[j]![1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
