// ── Placement audit (dev-only) ──────────────────────────────────────────────
// Loose-coupling collision checks so misplaced props surface as console
// warnings during development instead of silently intersecting walls or the
// floor. Three families of check:
//
//   1. Radius-aware planter / prop insets — given a footprint half-extent r
//      and a desired wall clearance c, the centre must stay within
//      |x| <= widthM/2 - r - c (and likewise for z). `safeInsetForRadius`
//      returns the minimum inset that always clears.
//   2. Footprint-vs-room intersection — given a placed prop (x,z,radius),
//      `auditPropOnFloor` warns when the prop pokes past the room interior.
//   3. Hero-asset floor clearance — `auditHeroAssetClearance` warns when a
//      normalised GLB's lowest visible Y dips below the floor by more than
//      a small tolerance.
//
// Runtime cost is zero outside dev: every entry-point bails on first line
// when `process.env.NODE_ENV !== "development"`.

// Approximate planter half-radii (metres). Real GLBs differ — these are
// conservative envelopes derived from the in-scene normaliseToHeight calls.
export const PROP_RADIUS_M: Record<string, number> = {
  tree: 0.55,
  hexapot: 0.45,
  tarro: 0.4,
  snake: 0.4,
  cactus: 0.35,
};

/** Minimum centre-inset for a prop with footprint radius `r` plus
 *  clearance `c` (default 5cm) so it never overlaps a wall. */
export function safeInsetForRadius(r: number, c = 0.05): number {
  return r + c;
}

/** Clamp a desired inset to at least the safe minimum for a prop of the
 *  given kind — used at slot-generation time so inset bugs become near
 *  impossible to introduce. */
export function safeInsetForKind(kind: keyof typeof PROP_RADIUS_M | string, c = 0.05): number {
  const r = PROP_RADIUS_M[kind] ?? 0.45;
  return safeInsetForRadius(r, c);
}

/** Warn when a prop with given x/z and radius falls outside the room
 *  interior bounds (centred on origin). Returns true when the placement
 *  is safe. */
export function auditPropOnFloor(opts: {
  label: string;
  x: number;
  z: number;
  r: number;
  widthM: number;
  depthM: number;
  /** Wall clearance kept between the prop's surface and the inner wall face. */
  clearance?: number;
}): boolean {
  if (process.env.NODE_ENV !== "development") return true;
  const { label, x, z, r, widthM, depthM, clearance = 0.05 } = opts;
  const xLim = widthM / 2 - r - clearance;
  const zLim = depthM / 2 - r - clearance;
  const dx = Math.max(0, Math.abs(x) - xLim);
  const dz = Math.max(0, Math.abs(z) - zLim);
  if (dx > 1e-3 || dz > 1e-3) {
    // eslint-disable-next-line no-console
    console.warn(
      `[placementAudit] ${label} overlaps a wall by (${dx.toFixed(3)}m, ${dz.toFixed(3)}m). ` +
      `Centre=(${x.toFixed(2)}, ${z.toFixed(2)}), r=${r}, room=${widthM}×${depthM}.`,
    );
    return false;
  }
  return true;
}

/** Hero-asset post-normalise check — `lowestY` is the prop's lowest
 *  visible y after normalizeForBase. Warns if it dips below the floor by
 *  more than a small tolerance. */
export function auditHeroAssetClearance(opts: {
  label: string;
  lowestY: number;
  floorY: number;
  tol?: number;
}): boolean {
  if (process.env.NODE_ENV !== "development") return true;
  const { label, lowestY, floorY, tol = 0.01 } = opts;
  if (lowestY < floorY - tol) {
    // eslint-disable-next-line no-console
    console.warn(
      `[placementAudit] ${label} dips ${(floorY - lowestY).toFixed(3)}m below floor. ` +
      `(lowestY=${lowestY.toFixed(3)}, floorY=${floorY.toFixed(3)})`,
    );
    return false;
  }
  return true;
}
