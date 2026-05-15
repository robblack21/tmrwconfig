"use client";
import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "@/lib/assetPath";

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
      t.repeat.set(4, 4);
      t.anisotropy = 8;
    });
    map.colorSpace = THREE.SRGBColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    armMap.colorSpace = THREE.NoColorSpace;
  }, [map, normalMap, armMap]);
  return { map, normalMap, aoMap: armMap, roughnessMap: armMap };
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
 * Logo as an alpha-mapped decal.
 *
 * The source is always rasterised through a 2D canvas onto a transparent
 * ground — raw SVG textures were uploading with their transparent regions as
 * opaque black, so logos read as ink-on-black instead of ink-on-brand. Going
 * through the canvas preserves true alpha and also hosts the optional passes:
 *   `invert`   — flips RGB (dark marks that need to read on a dark wall).
 *   `chromaKey`— "white" / "black": pixels near that colour become transparent
 *                (for JPG logos with a flat baked background, e.g. the TMRW mark).
 */
export function useLogoTexture(url: string, invert = false, chromaKey: "white" | "black" | "" = "") {
  const tex = useTexture(url);
  return useMemo(() => {
    const img = tex.image as (HTMLImageElement | HTMLCanvasElement) | undefined;
    if (!img || typeof document === "undefined") {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    }
    // Rasterise at up to 1024px on the long edge. SVGs ship with a tiny
    // intrinsic size; drawing scaled keeps them crisp (vector source).
    const natW = (img as HTMLImageElement).naturalWidth || img.width || 1;
    const natH = (img as HTMLImageElement).naturalHeight || img.height || 1;
    const k = 1024 / Math.max(natW, natH, 1);
    const cw = Math.max(2, Math.round(natW * k));
    const ch = Math.max(2, Math.round(natH * k));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    }
    ctx.clearRect(0, 0, cw, ch);                       // transparent ground
    ctx.drawImage(img as CanvasImageSource, 0, 0, cw, ch);
    if (invert || chromaKey) {
      const data = ctx.getImageData(0, 0, cw, ch);
      const px = data.data;
      const keyHi = 235;  // brightness above which white is keyed out
      const keyLo = 25;   // brightness below which black is keyed out
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!;
        if (chromaKey === "white" && r > keyHi && g > keyHi && b > keyHi) { px[i + 3] = 0; continue; }
        if (chromaKey === "black" && r < keyLo && g < keyLo && b < keyLo) { px[i + 3] = 0; continue; }
        if (invert) {
          px[i] = 255 - r;
          px[i + 1] = 255 - g;
          px[i + 2] = 255 - b;
        }
      }
      ctx.putImageData(data, 0, 0);
    }
    const out = new THREE.CanvasTexture(canvas);
    out.colorSpace = THREE.SRGBColorSpace;
    out.anisotropy = 8;
    out.needsUpdate = true;
    return out;
  }, [tex, invert, chromaKey]);
}
