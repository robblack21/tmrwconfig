"use client";
import { useEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { asset } from "@/lib/assetPath";

const FLOOR_BASE = asset("/textures/concrete_floor_worn_001_4k.gltf/textures");
const WALL_BASE = asset("/textures/plastered_wall_02_4k.gltf/textures");
const PARQUET_BASE = asset("/textures/herringbone_parquet_2k.gltf/textures");

useTexture.preload(`${FLOOR_BASE}/concrete_floor_worn_001_diff_4k.jpg`);
useTexture.preload(`${FLOOR_BASE}/concrete_floor_worn_001_nor_gl_4k.jpg`);
useTexture.preload(`${FLOOR_BASE}/concrete_floor_worn_001_rough_4k.jpg`);
useTexture.preload(`${WALL_BASE}/plastered_wall_02_diff_4k.jpg`);
useTexture.preload(`${WALL_BASE}/plastered_wall_02_nor_gl_4k.jpg`);
useTexture.preload(`${WALL_BASE}/plastered_wall_02_arm_4k.jpg`);
useTexture.preload(`${PARQUET_BASE}/herringbone_parquet_diff_2k.jpg`);
useTexture.preload(`${PARQUET_BASE}/herringbone_parquet_nor_gl_2k.jpg`);
useTexture.preload(`${PARQUET_BASE}/herringbone_parquet_arm_2k.jpg`);

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
 * Logo as an alpha-mapped decal. Source PNG should have transparent background.
 * `invert` flips RGB (for dark logos on dark walls — Neura).
 * `chromaKey` is "white" or "black" — pixels near that colour are made transparent.
 * Used for JPGs that have a flat background (e.g. Nissan).
 */
export function useLogoTexture(url: string, invert = false, chromaKey: "white" | "black" | "" = "") {
  const tex = useTexture(url);
  return useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if (!invert && !chromaKey) {
      tex.needsUpdate = true;
      return tex;
    }
    const img = tex.image as HTMLImageElement | HTMLCanvasElement | undefined;
    if (!img || !("width" in img) || !img.width) {
      tex.needsUpdate = true;
      return tex;
    }
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return tex;
    ctx.drawImage(img as CanvasImageSource, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    const keyHi = 235;  // brightness above which white is keyed out
    const keyLo = 25;   // brightness below which black is keyed out
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i]!, g = px[i + 1]!, b = px[i + 2]!;
      if (chromaKey === "white" && r > keyHi && g > keyHi && b > keyHi) {
        px[i + 3] = 0;     // make near-white transparent
        continue;
      }
      if (chromaKey === "black" && r < keyLo && g < keyLo && b < keyLo) {
        px[i + 3] = 0;
        continue;
      }
      if (invert) {
        px[i]     = 255 - r;
        px[i + 1] = 255 - g;
        px[i + 2] = 255 - b;
      }
    }
    ctx.putImageData(data, 0, 0);
    const out = new THREE.CanvasTexture(canvas);
    out.colorSpace = THREE.SRGBColorSpace;
    out.anisotropy = 8;
    out.needsUpdate = true;
    return out;
  }, [tex, invert, chromaKey]);
}
