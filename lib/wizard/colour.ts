// In-browser dominant-colour extraction.
//
// Loads an image (URL or data:URL), samples it onto a small canvas, runs a
// quick k-means pass to find the N most representative colours, then returns
// them as hex strings sorted by cluster weight (most-prevalent first).
//
// Designed to be cheap and synchronous-feeling (~30-80 ms on a 256² sample)
// so we can run it inline during the wizard's logo upload step. White and
// near-white pixels are filtered before clustering because the typical
// vector-logo PNG has an enormous white field that would otherwise dominate.

export async function extractDominantColours(
  url: string,
  count = 3,
  opts: { sampleSize?: number; iterations?: number; ignoreWhite?: boolean } = {},
): Promise<string[]> {
  const sampleSize = opts.sampleSize ?? 96;
  const iterations = opts.iterations ?? 8;
  const ignoreWhite = opts.ignoreWhite ?? true;

  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

  // Collect pixels, dropping transparent / near-white / near-black.
  const pixels: Array<[number, number, number]> = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!, g = data[i + 1]!, b = data[i + 2]!, a = data[i + 3]!;
    if (a < 200) continue;
    const isWhite = r > 240 && g > 240 && b > 240;
    const isBlack = r < 16 && g < 16 && b < 16;
    if (ignoreWhite && (isWhite || isBlack)) continue;
    pixels.push([r, g, b]);
  }
  if (pixels.length === 0) return [];

  // Pick `count` initial centroids by even-spacing through the pixel array.
  const centroids: Array<[number, number, number]> = [];
  for (let k = 0; k < count; k++) {
    const idx = Math.floor((k + 0.5) * pixels.length / count);
    centroids.push([...pixels[idx]!] as [number, number, number]);
  }

  // Lloyd's iterations.
  const assignments = new Uint8Array(pixels.length);
  for (let it = 0; it < iterations; it++) {
    // Assign each pixel to nearest centroid.
    for (let i = 0; i < pixels.length; i++) {
      let best = 0;
      let bestDist = Infinity;
      const p = pixels[i]!;
      for (let k = 0; k < count; k++) {
        const c = centroids[k]!;
        const dr = p[0] - c[0], dg = p[1] - c[1], db = p[2] - c[2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestDist) { bestDist = d; best = k; }
      }
      assignments[i] = best;
    }
    // Recompute centroids.
    const sums = Array.from({ length: count }, () => [0, 0, 0, 0]); // r,g,b,n
    for (let i = 0; i < pixels.length; i++) {
      const k = assignments[i]!;
      const p = pixels[i]!;
      sums[k]![0] += p[0];
      sums[k]![1] += p[1];
      sums[k]![2] += p[2];
      sums[k]![3] += 1;
    }
    for (let k = 0; k < count; k++) {
      const s = sums[k]!;
      if (s[3] > 0) {
        centroids[k] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
      }
    }
  }

  // Sort by cluster weight (most prevalent first).
  const counts = new Array(count).fill(0);
  for (let i = 0; i < pixels.length; i++) counts[assignments[i]!]++;
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => counts[b] - counts[a]);
  return order.map((k) => rgbToHex(centroids[k]!));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// ── Colour harmony ─────────────────────────────────────────────────────
// Given a single primary hex, derive a full surface palette via classical
// colour-wheel relationships. Used in the wizard's brand colour step so
// the user can switch between harmony schemes without re-uploading their
// logo.
//
// Returns EIGHT colours, mapping to every paintable surface in the
// room. The 4-tuple variant is kept (`harmoniseBrand`) for callers that
// only need the brand swatches.
//
// Surface mapping (consumer convention):
//   0  walls   (primary)
//   1  trim    (sibling 1)
//   2  accent  (sibling 2)
//   3  highlight (sibling 3, deepened)
//   4  floor   (primary, much darker)
//   5  table   (sibling 1, desaturated mid)
//   6  chairs  (sibling 2, mid lightness)
//   7  pendant (sibling 3, brightened metal-ish)

export type HarmonyRule = "complementary" | "triadic" | "splitComplementary" | "analogous";

export type HarmonyEight = [string, string, string, string, string, string, string, string];

export function harmonise(primaryHex: string, rule: HarmonyRule): HarmonyEight {
  const [h, s, l] = hexToHsl(primaryHex);
  // Hue offsets for the 4 base sibling families per rule.
  const base = (() => {
    switch (rule) {
      case "complementary":      return [0, 180, 180,   0];
      case "triadic":            return [0, 120, 240,   0];
      case "splitComplementary": return [0, 150, 210, 180];
      case "analogous":          return [0,  30, -30,  60];
    }
  })();
  // Brand-row lightness variants (existing behaviour kept stable so
  // brand swatches don't drift when callers upgrade).
  const brandL = [l, l, Math.max(0.25, l * 0.7), Math.max(0.18, l * 0.55)];
  const brandS = [s, s, s, Math.max(0.1, s * 0.5)];
  // Surface-row variants — derive room surfaces from the same hue
  // families but lean towards plausible material readings:
  //   floor: very dark + desaturated (concrete / parquet feel)
  //   table: neutral mid-lightness, half-saturated
  //   chairs: brand-ish mid (slightly darker than brand)
  //   pendant: light + low saturation (metal / cream)
  const surfaceL = [
    Math.max(0.10, l * 0.35),                 // floor
    clamp01(l * 0.6 + 0.18),                  // table
    Math.max(0.22, l * 0.55),                 // chairs
    Math.min(0.82, l + 0.25),                 // pendant
  ];
  const surfaceS = [
    Math.max(0.05, s * 0.4),                  // floor
    Math.max(0.08, s * 0.45),                 // table
    Math.max(0.15, s * 0.7),                  // chairs
    Math.max(0.04, s * 0.25),                 // pendant
  ];
  // Build the 8-tuple. First 4 use brand variants; last 4 use surface
  // variants applied to the SAME hue families.
  const out: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (i === 0 && rule !== "complementary" && rule !== "triadic") {
      // Keep the exact user hex for the primary in rules that don't
      // explicitly transform it; otherwise rotateHue at 0° + the user's
      // s/l roundtrip would re-encode and possibly drift by ~1 unit.
      out.push(primaryHex);
    } else if (i === 0) {
      out.push(primaryHex);                   // primary stays exact
    } else {
      out.push(rotateHue(h, base[i]!, brandS[i]!, brandL[i]!));
    }
  }
  for (let i = 0; i < 4; i++) {
    out.push(rotateHue(h, base[i]!, surfaceS[i]!, surfaceL[i]!));
  }
  return out as HarmonyEight;
}

// Clamp value into [0,1].
function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }

function rotateHue(h: number, deltaDeg: number, s: number, l: number): string {
  const h2 = ((h + deltaDeg) % 360 + 360) % 360;
  return hslToHex(h2, s, l);
}

function hexToHsl(hex: string): [number, number, number] {
  const p = hex.replace("#", "");
  const r = parseInt(p.slice(0, 2), 16) / 255;
  const g = parseInt(p.slice(2, 4), 16) / 255;
  const b = parseInt(p.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if      (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else                h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1)      { r1 = c;  g1 = x;  b1 = 0; }
  else if (hp < 2) { r1 = x;  g1 = c;  b1 = 0; }
  else if (hp < 3) { r1 = 0;  g1 = c;  b1 = x; }
  else if (hp < 4) { r1 = 0;  g1 = x;  b1 = c; }
  else if (hp < 5) { r1 = x;  g1 = 0;  b1 = c; }
  else             { r1 = c;  g1 = 0;  b1 = x; }
  const m = l - c / 2;
  const to = (n: number) => Math.max(0, Math.min(255, Math.round((n + m) * 255))).toString(16).padStart(2, "0");
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}
