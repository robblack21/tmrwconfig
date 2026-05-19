// Measure the natural width × height of an image referenced by URL
// (works for `/static`, `https:`, and `data:` URLs). Resolves to {0, 0}
// on error so callers can dispatch unconditionally. Used by every logo
// upload path so the kit's effective viewBox reflects the user's actual
// logo aspect — without this every upload renders SQUASHED into the
// default kit's aspect (e.g. TMRW's 2:1).

export function measureImageDims(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}
