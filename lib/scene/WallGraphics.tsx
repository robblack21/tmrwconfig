"use client";
import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

/**
 * Loads a brand-specific full-bleed image as the back-wall texture.
 * Returned texture is colour-space corrected; UVs default to the whole plane.
 */
export function useWallGraphic(url: string) {
  const tex = useTexture(url);
  return useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, [tex]);
}

/**
 * Procedural motif tiled across a wall. Returns a `CanvasTexture` that we
 * draw with a 2D canvas at module-load time then repeat across the geometry.
 * Cached per `key` so re-renders don't re-allocate.
 */
const motifCache = new Map<string, THREE.CanvasTexture>();

export function useMotifTexture(
  motif: "stripes.diagonal" | "stripes.horizontal" | "dots" | "hex",
  colorPrimary: string,
  colorAccent: string
) {
  return useMemo(() => {
    const key = `${motif}|${colorPrimary}|${colorAccent}`;
    const cached = motifCache.get(key);
    if (cached) return cached;
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    const g = c.getContext("2d");
    if (!g) return null;
    // Base fill
    g.fillStyle = colorPrimary;
    g.fillRect(0, 0, 1024, 1024);
    g.fillStyle = colorAccent;
    if (motif === "stripes.diagonal") {
      // Bold "ACT ORANGE" style — diagonal accent stripes spaced wide
      g.save();
      g.translate(512, 512);
      g.rotate(-Math.PI / 4);
      for (let y = -1400; y < 1400; y += 220) {
        g.fillRect(-1400, y, 2800, 36);
      }
      g.restore();
    } else if (motif === "stripes.horizontal") {
      for (let y = 0; y < 1024; y += 180) {
        g.fillRect(0, y, 1024, 24);
      }
    } else if (motif === "dots") {
      for (let y = 32; y < 1024; y += 72) {
        for (let x = 32; x < 1024; x += 72) {
          g.beginPath();
          g.arc(x, y, 12, 0, Math.PI * 2);
          g.fill();
        }
      }
    } else if (motif === "hex") {
      g.strokeStyle = colorAccent;
      g.lineWidth = 3;
      const r = 36;
      for (let row = 0; row < 22; row++) {
        for (let col = 0; col < 22; col++) {
          const x = col * r * 1.732 + (row % 2 === 0 ? 0 : r * 0.866);
          const y = row * r * 1.5;
          drawHexagon(g, x, y, r);
        }
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    motifCache.set(key, tex);
    return tex;
  }, [motif, colorPrimary, colorAccent]);
}

function drawHexagon(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.stroke();
}
