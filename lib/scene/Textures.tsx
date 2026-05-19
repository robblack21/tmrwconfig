"use client";
import { useEffect, useMemo, useState } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "@/lib/assetPath";

// Module-level placeholder texture — always-valid, returned by the
// Image()-based loaders below while the real image is decoding so the
// consuming material has SOMETHING to map. Created lazily on first BROWSER
// access (server renders just get the raw Texture stub).
let placeholderTex: THREE.Texture | null = null;
function getPlaceholderTexture(): THREE.Texture {
  if (placeholderTex) return placeholderTex;
  if (typeof document === "undefined") {
    placeholderTex = new THREE.Texture();
    return placeholderTex;
  }
  const c = document.createElement("canvas");
  c.width = 2; c.height = 2;
  placeholderTex = new THREE.CanvasTexture(c);
  placeholderTex.colorSpace = THREE.SRGBColorSpace;
  return placeholderTex;
}

const FLOOR_BASE = asset("/textures/concrete_floor_worn_001_4k.gltf/textures");
const WALL_BASE = asset("/textures/plastered_wall_02_4k.gltf/textures");
const PARQUET_BASE = asset("/textures/herringbone_parquet_2k.gltf/textures");
const QUADRATED_BASE = asset("/textures/black_quadrated_wall_texture_pack");

useTexture.preload(`${FLOOR_BASE}/concrete_floor_worn_001_diff_4k.jpg`);
useTexture.preload(`${FLOOR_BASE}/concrete_floor_worn_001_nor_gl_4k.jpg`);
useTexture.preload(`${FLOOR_BASE}/concrete_floor_worn_001_rough_4k.jpg`);
useTexture.preload(`${WALL_BASE}/plastered_wall_02_diff_4k.jpg`);
useTexture.preload(`${WALL_BASE}/plastered_wall_02_nor_gl_4k.jpg`);
useTexture.preload(`${WALL_BASE}/plastered_wall_02_arm_4k.jpg`);
useTexture.preload(`${PARQUET_BASE}/herringbone_parquet_diff_2k.jpg`);
useTexture.preload(`${PARQUET_BASE}/herringbone_parquet_nor_gl_2k.jpg`);
useTexture.preload(`${PARQUET_BASE}/herringbone_parquet_arm_2k.jpg`);
useTexture.preload(`${QUADRATED_BASE}/black_quadrated_wall_basecolor_2k.png`);
useTexture.preload(`${QUADRATED_BASE}/black_quadrated_wall_normal_2k.png`);
useTexture.preload(`${QUADRATED_BASE}/black_quadrated_wall_roughness_2k.png`);
useTexture.preload(`${QUADRATED_BASE}/black_quadrated_wall_ao_2k.png`);

/**
 * Floor textures share a single instance across uses — we set the repeat once at
 * load time. `needsUpdate=true` was forcing per-frame GPU re-uploads — removed.
 */
export function useFloorTextures() {
  const [map, normalMap, roughnessMap] = useTexture([
    `${FLOOR_BASE}/concrete_floor_worn_001_diff_4k.jpg`,
    `${FLOOR_BASE}/concrete_floor_worn_001_nor_gl_4k.jpg`,
    `${FLOOR_BASE}/concrete_floor_worn_001_rough_4k.jpg`,
  ]);
  useEffect(() => {
    [map, normalMap, roughnessMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(12, 12);
      t.anisotropy = 8;
    });
    map.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    roughnessMap.colorSpace = THREE.NoColorSpace;
  }, [map, normalMap, roughnessMap]);
  return { map, normalMap, roughnessMap };
}

/**
 * Wall textures — single shared instance with fixed repeat. Different wall sizes
 * are accommodated by the UV mapping rather than mutating texture repeat per use
 * (which would race across walls since they share the GPU resource).
 */
// Pre-load all three parquet variants so swapping is instant.
const PARQUET_VARIANTS: Record<"herringbone" | "diagonal" | "rectangular", string> = {
  herringbone: asset("/textures/herringbone_parquet_2k.gltf/textures/herringbone_parquet"),
  diagonal:    asset("/textures/diagonal_parquet_2k.gltf/textures/diagonal_parquet"),
  rectangular: asset("/textures/rectangular_parquet_2k.gltf/textures/rectangular_parquet"),
};
for (const base of Object.values(PARQUET_VARIANTS)) {
  useTexture.preload(`${base}_diff_2k.jpg`);
  useTexture.preload(`${base}_nor_gl_2k.jpg`);
  useTexture.preload(`${base}_arm_2k.jpg`);
}

export function useParquetTextures(variant: "herringbone" | "diagonal" | "rectangular" = "herringbone") {
  const base = PARQUET_VARIANTS[variant];
  const [map, normalMap, armMap] = useTexture([
    `${base}_diff_2k.jpg`,
    `${base}_nor_gl_2k.jpg`,
    `${base}_arm_2k.jpg`,
  ]);
  useEffect(() => {
    [map, normalMap, armMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      // 6×6 repeat (was 4×4) — finer per-tile footprint so the parquet
      // pattern reads on larger rooms without obvious tile seams.
      // Anisotropy 16 sharpens parquet at grazing angles.
      t.repeat.set(6, 6);
      t.anisotropy = 16;
    });
    map.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    armMap.colorSpace = THREE.NoColorSpace;
  }, [map, normalMap, armMap]);
  return { map, normalMap, aoMap: armMap, roughnessMap: armMap };
}

// ── Procedural carpet ─────────────────────────────────────────────────────
// Canvas-built loop-pile carpet. Built once per session (module-level
// cache). Looks like a warm neutral carpet from any distance — no obvious
// tiling because the noise is uniform.
const carpetCache: { tex: THREE.CanvasTexture | null } = { tex: null };
export function useCarpetTexture() {
  return useMemo(() => {
    if (carpetCache.tex) return carpetCache.tex;
    if (typeof document === "undefined") return null as unknown as THREE.CanvasTexture;
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const g = c.getContext("2d");
    if (!g) return null as unknown as THREE.CanvasTexture;
    g.fillStyle = "#c8c5be";                       // warm neutral grey base
    g.fillRect(0, 0, 1024, 1024);
    // Symmetric ±delta noise grain → loop-pile texture.
    const img = g.getImageData(0, 0, 1024, 1024);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const d = (Math.random() - 0.5) * 28;
      px[i]     = Math.max(0, Math.min(255, px[i]!     + d));
      px[i + 1] = Math.max(0, Math.min(255, px[i + 1]! + d));
      px[i + 2] = Math.max(0, Math.min(255, px[i + 2]! + d));
    }
    g.putImageData(img, 0, 0);
    // Faint horizontal nap so the carpet has a directional sheen.
    g.globalAlpha = 0.04;
    g.strokeStyle = "#fff";
    for (let y = 0; y < 1024; y += 4) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(1024, y + (Math.random() - 0.5) * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.anisotropy = 16;
    carpetCache.tex = tex;
    return tex;
  }, []);
}

// ── Procedural tile ──────────────────────────────────────────────────────
// 8×8 grid of stone-coloured tiles with thin dark grout. Per-tile colour
// jitter so the floor reads as natural stone rather than a printed grid.
const tileCache: { tex: THREE.CanvasTexture | null } = { tex: null };
export function useTileTexture() {
  return useMemo(() => {
    if (tileCache.tex) return tileCache.tex;
    if (typeof document === "undefined") return null as unknown as THREE.CanvasTexture;
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const g = c.getContext("2d");
    if (!g) return null as unknown as THREE.CanvasTexture;
    g.fillStyle = "#3a3833";                       // dark grout fill
    g.fillRect(0, 0, 1024, 1024);
    const tileSize = 126;
    const gap = 2;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const jitter = (Math.random() - 0.5) * 18;
        const base = 218 + jitter;
        g.fillStyle = `rgb(${base},${base - 4},${base - 12})`;
        const x = col * tileSize + gap;
        const y = row * tileSize + gap;
        g.fillRect(x, y, tileSize - 2 * gap, tileSize - 2 * gap);
        // Inner per-tile noise for a stone-y micro-texture.
        const img = g.getImageData(x, y, tileSize - 2 * gap, tileSize - 2 * gap);
        const px = img.data;
        for (let i = 0; i < px.length; i += 4) {
          const d = (Math.random() - 0.5) * 12;
          px[i]     = Math.max(0, Math.min(255, px[i]!     + d));
          px[i + 1] = Math.max(0, Math.min(255, px[i + 1]! + d));
          px[i + 2] = Math.max(0, Math.min(255, px[i + 2]! + d));
        }
        g.putImageData(img, x, y);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.anisotropy = 16;
    tileCache.tex = tex;
    return tex;
  }, []);
}

export function useWallTextures() {
  const [map, normalMap, armMap] = useTexture([
    `${WALL_BASE}/plastered_wall_02_diff_4k.jpg`,
    `${WALL_BASE}/plastered_wall_02_nor_gl_4k.jpg`,
    `${WALL_BASE}/plastered_wall_02_arm_4k.jpg`,
  ]);
  useEffect(() => {
    [map, normalMap, armMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(2.5, 2);
      t.anisotropy = 8;
    });
    map.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    armMap.colorSpace = THREE.NoColorSpace;
  }, [map, normalMap, armMap]);
  return { map, normalMap, aoMap: armMap, roughnessMap: armMap };
}

/**
 * Black quadrated wall — square panelling with gentle relief. Used on the
 * interior front (door) wall by default; brand-tinted at the material
 * level so each kit gets its own panelled aesthetic.
 */
export function useQuadratedWallTextures() {
  const [map, normalMap, roughnessMap, aoMap] = useTexture([
    `${QUADRATED_BASE}/black_quadrated_wall_basecolor_2k.png`,
    `${QUADRATED_BASE}/black_quadrated_wall_normal_2k.png`,
    `${QUADRATED_BASE}/black_quadrated_wall_roughness_2k.png`,
    `${QUADRATED_BASE}/black_quadrated_wall_ao_2k.png`,
  ]);
  useEffect(() => {
    [map, normalMap, roughnessMap, aoMap].forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1.8, 1.4);
      t.anisotropy = 8;
    });
    map.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    roughnessMap.colorSpace = THREE.NoColorSpace;
    aoMap.colorSpace = THREE.NoColorSpace;
  }, [map, normalMap, roughnessMap, aoMap]);
  return { map, normalMap, roughnessMap, aoMap };
}

/**
 * Logo as an alpha-mapped decal. Loaded via a manual `Image()` element +
 * `CanvasTexture` instead of drei's `useTexture` Suspense pipeline.
 *
 * Why bypass `useTexture`: its cache layer kept stale handles for new
 * uploads and data URLs (wizard logo uploads, `kit.setLogoOverride`
 * intents) so the logo would update in the store but never repaint. The
 * manual loader re-fetches on every URL change.
 *
 * Behaviour:
 *   1. Always returns a valid `THREE.Texture` (placeholder while loading)
 *      so callers never have to null-check.
 *   2. Re-runs on `url` / `invert` / `chromaKey` changes.
 *   3. Rasterises through a canvas onto a transparent ground so SVG
 *      transparency is preserved (raw SVG → texture used to upload
 *      transparent regions as opaque black).
 *   4. `invert`    — flips RGB (dark marks that need to read on dark walls).
 *      `chromaKey` — "white"/"black": pixels near that colour → transparent
 *                    (for JPG logos with a flat baked background).
 */
export function useLogoTexture(url: string, invert = false, chromaKey: "white" | "black" | "" = ""): THREE.Texture {
  const [tex, setTex] = useState<THREE.Texture>(() => getPlaceholderTexture());
  useEffect(() => {
    if (!url) { setTex(getPlaceholderTexture()); return; }
    let cancelled = false;
    // data: URLs (wizard uploads) skip `asset()` since the basePath
    // prefix is meaningless for them. http(s):// URLs also pass through.
    const resolved = url.startsWith("data:") || /^https?:/i.test(url) ? url : asset(url);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const natW = img.naturalWidth || img.width || 1;
      const natH = img.naturalHeight || img.height || 1;
      // Rasterise at up to 1024px on the long edge — SVGs ship with a
      // tiny intrinsic size; scaling at draw time keeps them crisp.
      const k = 1024 / Math.max(natW, natH, 1);
      const cw = Math.max(2, Math.round(natW * k));
      const ch = Math.max(2, Math.round(natH * k));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);                       // transparent ground
      ctx.drawImage(img, 0, 0, cw, ch);
      if (invert || chromaKey) {
        const data = ctx.getImageData(0, 0, cw, ch);
        const px = data.data;
        const keyHi = 235;
        const keyLo = 25;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!;
          if (chromaKey === "white" && r > keyHi && g > keyHi && b > keyHi) { px[i + 3] = 0; continue; }
          if (chromaKey === "black" && r < keyLo && g < keyLo && b < keyLo) { px[i + 3] = 0; continue; }
          if (invert) { px[i] = 255 - r; px[i + 1] = 255 - g; px[i + 2] = 255 - b; }
        }
        ctx.putImageData(data, 0, 0);
      }
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      setTex(t);
    };
    img.onerror = (e) => {
      if (cancelled) return;
      // eslint-disable-next-line no-console
      console.warn(`[useLogoTexture] failed to load ${resolved}`, e);
      setTex(getPlaceholderTexture());
    };
    img.src = resolved;
    return () => { cancelled = true; };
  }, [url, invert, chromaKey]);
  return tex;
}
