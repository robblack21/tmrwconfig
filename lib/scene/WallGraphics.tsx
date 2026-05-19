"use client";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { asset } from "@/lib/assetPath";

// Always-valid 2×2 transparent placeholder so callers never get null.
let wallPlaceholder: THREE.Texture | null = null;
function getWallPlaceholder(): THREE.Texture {
  if (wallPlaceholder) return wallPlaceholder;
  if (typeof document === "undefined") {
    wallPlaceholder = new THREE.Texture();
    return wallPlaceholder;
  }
  const c = document.createElement("canvas");
  c.width = 2; c.height = 2;
  wallPlaceholder = new THREE.CanvasTexture(c);
  wallPlaceholder.colorSpace = THREE.SRGBColorSpace;
  return wallPlaceholder;
}

/**
 * Loads a brand-specific full-bleed image as a back-wall / display texture.
 *
 * Manual `Image()` + `CanvasTexture` loader instead of drei's `useTexture`
 * Suspense pipe. The cache layer in `useTexture` was returning stale
 * handles for data: URLs (wizard artwork uploads) and `/public/...` paths
 * on the deployed basePath, so the wall texture would set in the store
 * but never repaint.
 *
 * Always returns a valid `THREE.Texture` — a 2×2 transparent placeholder
 * while the real image is decoding — so callers don't need null-checks.
 */
export function useWallGraphic(url: string): THREE.Texture {
  const [tex, setTex] = useState<THREE.Texture>(() => getWallPlaceholder());
  useEffect(() => {
    if (!url) { setTex(getWallPlaceholder()); return; }
    let cancelled = false;
    const resolved = url.startsWith("data:") || /^https?:/i.test(url) ? url : asset(url);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const t = new THREE.CanvasTexture(img as unknown as HTMLCanvasElement);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.needsUpdate = true;
      setTex(t);
    };
    img.onerror = (e) => {
      if (cancelled) return;
      // eslint-disable-next-line no-console
      console.warn(`[useWallGraphic] failed to load ${resolved}`, e);
      setTex(getWallPlaceholder());
    };
    img.src = resolved;
    return () => { cancelled = true; };
  }, [url]);
  return tex;
}

/**
 * Procedural motif tiled across a wall. Returns a `CanvasTexture` that we
 * draw with a 2D canvas at module-load time then repeat across the geometry.
 * Cached per `key` so re-renders don't re-allocate.
 */
const motifCache = new Map<string, THREE.CanvasTexture>();

export type MotifKind =
  | "stripes.diagonal"
  | "stripes.horizontal"
  | "stripes.vertical"
  | "dots"
  | "hex"
  | "monogram"
  | "chevron"
  | "circuit"
  | "grid"
  | "triangles"
  | "crown"
  | "swoosh"
  | "stars";

export function useMotifTexture(
  motif: MotifKind,
  colorPrimary: string,
  colorAccent: string,
  initial?: string,
) {
  return useMemo(() => {
    const key = `${motif}|${colorPrimary}|${colorAccent}|${initial ?? ""}`;
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
    drawMotif(g, motif, colorPrimary, colorAccent, initial);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    motifCache.set(key, tex);
    return tex;
  }, [motif, colorPrimary, colorAccent, initial]);
}

function drawMotif(g: CanvasRenderingContext2D, motif: MotifKind, colorPrimary: string, colorAccent: string, initial?: string) {
  if (motif === "stripes.diagonal") {
    g.save();
    g.translate(512, 512);
    g.rotate(-Math.PI / 4);
    for (let y = -1400; y < 1400; y += 220) g.fillRect(-1400, y, 2800, 36);
    g.restore();
  } else if (motif === "stripes.horizontal") {
    for (let y = 0; y < 1024; y += 180) g.fillRect(0, y, 1024, 24);
  } else if (motif === "stripes.vertical") {
    // BMW M-stripe style — three thin stripes per band
    for (let x = 0; x < 1024; x += 200) {
      g.fillRect(x, 0, 18, 1024);
      g.fillRect(x + 30, 0, 18, 1024);
      g.fillRect(x + 60, 0, 18, 1024);
    }
  } else if (motif === "dots") {
    for (let y = 32; y < 1024; y += 72) {
      for (let x = 32; x < 1024; x += 72) {
        g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill();
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
  } else if (motif === "monogram") {
    // Repeated initial letter, offset on alternating rows — LV-style damier.
    g.font = "600 56px 'Cormorant Garamond', Georgia, serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    const cell = 110;
    for (let row = 0; row < 12; row++) {
      const xOff = (row % 2) ? cell / 2 : 0;
      for (let col = -1; col < 12; col++) {
        const x = col * cell + xOff + cell / 2;
        const y = row * cell + cell / 2;
        g.fillText(initial ?? "M", x, y);
      }
    }
  } else if (motif === "chevron") {
    // V-shape repeated — Mercedes / Ferrari aerodynamic feel.
    g.lineWidth = 16;
    g.strokeStyle = colorAccent;
    const step = 140;
    for (let y = -step; y < 1024 + step; y += step) {
      g.beginPath();
      for (let x = -100; x < 1100; x += 200) {
        g.moveTo(x, y);
        g.lineTo(x + 100, y + 80);
        g.lineTo(x + 200, y);
      }
      g.stroke();
    }
  } else if (motif === "circuit") {
    // Etched chip-board: thin grid + bigger nodes at intersections.
    g.strokeStyle = colorAccent;
    g.lineWidth = 1.5;
    const cell = 64;
    for (let i = 0; i <= 1024; i += cell) {
      g.beginPath(); g.moveTo(0, i); g.lineTo(1024, i); g.stroke();
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke();
    }
    // Sparse nodes
    for (let y = cell; y < 1024; y += cell * 2) {
      for (let x = cell; x < 1024; x += cell * 2) {
        g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
      }
    }
  } else if (motif === "grid") {
    // Clean, minimal grid — Apple / Tesla / TMRW.
    g.strokeStyle = colorAccent;
    g.lineWidth = 1;
    const cell = 96;
    for (let i = 0; i <= 1024; i += cell) {
      g.beginPath(); g.moveTo(0, i); g.lineTo(1024, i); g.stroke();
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke();
    }
  } else if (motif === "triangles") {
    // Tessellated equilateral triangles — Disney / Mercedes geometric.
    const s = 110;
    const h = s * 0.866;
    g.lineWidth = 2.5;
    g.strokeStyle = colorAccent;
    for (let row = 0; row * h < 1024; row++) {
      for (let col = 0; col < 11; col++) {
        const x = col * s + ((row % 2) ? s / 2 : 0);
        const y = row * h;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + s, y);
        g.lineTo(x + s / 2, y + h);
        g.closePath();
        g.stroke();
      }
    }
  } else if (motif === "crown") {
    // Tiny crowns — Rolex texture. Stylised as a 5-point coronet.
    g.fillStyle = colorAccent;
    const step = 130;
    for (let row = 0; row < 9; row++) {
      const xOff = (row % 2) ? step / 2 : 0;
      for (let col = -1; col < 9; col++) {
        const cx = col * step + xOff + step / 2;
        const cy = row * step + step / 2;
        drawCrown(g, cx, cy, 22);
      }
    }
  } else if (motif === "swoosh") {
    // Nike-ish curved tick repeated, oriented along the wall.
    g.strokeStyle = colorAccent;
    g.lineWidth = 8;
    g.lineCap = "round";
    for (let row = 0; row < 8; row++) {
      const xOff = (row % 2) ? 60 : 0;
      for (let col = -1; col < 10; col++) {
        const cx = col * 130 + xOff + 65;
        const cy = row * 130 + 65;
        g.beginPath();
        g.moveTo(cx - 36, cy + 8);
        g.bezierCurveTo(cx - 8, cy + 20, cx + 6, cy + 8, cx + 36, cy - 22);
        g.stroke();
      }
    }
  } else if (motif === "stars") {
    // Disney / Mercedes — 5-point stars scattered.
    g.fillStyle = colorAccent;
    const positions = [
      [120, 90], [320, 180], [600, 100], [880, 220], [180, 380], [500, 360], [800, 460],
      [60, 580], [380, 600], [700, 680], [940, 760], [220, 800], [560, 880], [840, 920],
    ];
    for (const [x, y] of positions) drawStar(g, x, y, 5, 26, 11);
    // Tile vertically by drawing a faded second pass shifted
    g.globalAlpha = 0.55;
    for (const [x, y] of positions) drawStar(g, (x + 480) % 1024, (y + 320) % 1024, 5, 18, 7);
    g.globalAlpha = 1;
  }
}

function drawCrown(g: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  // 5 points + a banded base
  g.beginPath();
  g.moveTo(cx - s, cy);
  g.lineTo(cx - s * 0.6, cy - s * 0.8);
  g.lineTo(cx - s * 0.2, cy - s * 0.25);
  g.lineTo(cx, cy - s);
  g.lineTo(cx + s * 0.2, cy - s * 0.25);
  g.lineTo(cx + s * 0.6, cy - s * 0.8);
  g.lineTo(cx + s, cy);
  g.lineTo(cx + s * 0.85, cy + s * 0.45);
  g.lineTo(cx - s * 0.85, cy + s * 0.45);
  g.closePath();
  g.fill();
}

function drawStar(g: CanvasRenderingContext2D, cx: number, cy: number, points: number, outer: number, inner: number) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
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
