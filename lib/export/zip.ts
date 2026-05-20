// Minimal dependency-free ZIP writer (STORE method — no compression).
//
// Why hand-rolled instead of jszip: the app is a static export shipped to
// GitHub Pages and we keep the dependency surface tight. A stored
// (uncompressed) ZIP is a well-defined, simple container — local file
// headers + a central directory + an end-of-central-directory record,
// all little-endian. GLBs + JPEG/PNG are already compressed, so STORE
// costs almost nothing in size while keeping the code auditable.
//
// Spec: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT

export type ZipEntry = { name: string; data: Uint8Array };

// ── CRC32 (IEEE 802.3) — table-based. ──────────────────────────────────
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(d = new Date()): { time: number; date: number } {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

const enc = new TextEncoder();

/** Build a STORE-method ZIP from the given entries. Returns a Blob with
 *  `application/zip`. Folder structure is encoded by forward slashes in
 *  entry names (e.g. "assets/models/foo.glb"). */
export function buildZip(entries: ZipEntry[]): Blob {
  const { time, date } = dosDateTime();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);
    const size = data.length;

    // ── Local file header (30 bytes + name) ──
    const lfh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lfh.buffer);
    lv.setUint32(0, 0x04034b50, true);   // local file header signature
    lv.setUint16(4, 20, true);           // version needed (2.0)
    lv.setUint16(6, 0, true);            // flags
    lv.setUint16(8, 0, true);            // compression = 0 (store)
    lv.setUint16(10, time, true);        // mod time
    lv.setUint16(12, date, true);        // mod date
    lv.setUint32(14, crc, true);         // crc32
    lv.setUint32(18, size, true);        // compressed size
    lv.setUint32(22, size, true);        // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // file name length
    lv.setUint16(28, 0, true);           // extra field length
    lfh.set(nameBytes, 30);
    chunks.push(lfh, data);

    // ── Central directory header (46 bytes + name) ──
    const cdh = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdh.buffer);
    cv.setUint32(0, 0x02014b50, true);   // central dir header signature
    cv.setUint16(4, 20, true);           // version made by
    cv.setUint16(6, 20, true);           // version needed
    cv.setUint16(8, 0, true);            // flags
    cv.setUint16(10, 0, true);           // compression
    cv.setUint16(12, time, true);        // mod time
    cv.setUint16(14, date, true);        // mod date
    cv.setUint32(16, crc, true);         // crc32
    cv.setUint32(20, size, true);        // compressed size
    cv.setUint32(24, size, true);        // uncompressed size
    cv.setUint16(28, nameBytes.length, true); // name length
    cv.setUint16(30, 0, true);           // extra length
    cv.setUint16(32, 0, true);           // comment length
    cv.setUint16(34, 0, true);           // disk number start
    cv.setUint16(36, 0, true);           // internal attrs
    cv.setUint32(38, 0, true);           // external attrs
    cv.setUint32(42, offset, true);      // local header offset
    cdh.set(nameBytes, 46);
    central.push(cdh);

    offset += lfh.length + data.length;
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const centralOffset = offset;

  // ── End of central directory record (22 bytes) ──
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);     // EOCD signature
  ev.setUint16(4, 0, true);              // disk number
  ev.setUint16(6, 0, true);              // disk with central dir
  ev.setUint16(8, entries.length, true); // entries on this disk
  ev.setUint16(10, entries.length, true);// total entries
  ev.setUint32(12, centralSize, true);   // central dir size
  ev.setUint32(16, centralOffset, true); // central dir offset
  ev.setUint16(20, 0, true);             // comment length

  // Concatenate into ONE ArrayBuffer-backed Uint8Array. Besides being a
  // single Blob part, this sidesteps the TS 5.7 variance gripe where a
  // bare `Uint8Array` is `Uint8Array<ArrayBufferLike>` (possibly
  // SharedArrayBuffer-backed) and therefore not assignable to BlobPart.
  const allParts = [...chunks, ...central, eocd];
  let totalLen = 0;
  for (const p of allParts) totalLen += p.length;
  const merged = new Uint8Array(totalLen);
  let o = 0;
  for (const p of allParts) { merged.set(p, o); o += p.length; }
  return new Blob([merged], { type: "application/zip" });
}

/** Decode a data: URL into raw bytes + a sensible file extension. */
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; ext: string } | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = m[1] ?? "application/octet-stream";
  const isB64 = !!m[2];
  const payload = m[3] ?? "";
  let bytes: Uint8Array;
  if (isB64) {
    const bin = atob(payload);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = enc.encode(decodeURIComponent(payload));
  }
  const ext = MIME_EXT[mime] ?? (mime.split("/")[1] ?? "bin");
  return { bytes, ext };
}

const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "model/gltf-binary": "glb",
  "application/octet-stream": "glb",
};

/** Trigger a browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the download has a chance to start.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
