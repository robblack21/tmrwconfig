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
