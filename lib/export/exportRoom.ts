// Export orchestrator — runs the serialiser, fetches every referenced
// asset, rewrites them into a self-contained ZIP, and triggers a
// browser download.
//
// Flow:
//   1. serialiseRoom(state) → { room JSON, asset refs }
//   2. For each asset ref, resolve bytes:
//        • data: URL  → decode in-place
//        • /public    → fetch (asset() resolves the basePath)
//        • http(s)    → fetch (fal.ai result URLs are CORS-open)
//   3. Bundle room.json + assets/** into a STORE-method ZIP.
//   4. Download as `<roomname>_room.zip`.

import { serialiseRoom } from "./roomSerialiser";
import { buildZip, dataUrlToBytes, downloadBlob, type ZipEntry } from "./zip";
import { asset } from "@/lib/assetPath";

export type ExportProgress = { stage: string; done: number; total: number };

export async function exportRoomZip(
  state: Record<string, unknown>,
  onProgress?: (p: ExportProgress) => void,
): Promise<{ ok: true; filename: string } | { ok: false; error: string }> {
  try {
    const { room, assets } = serialiseRoom(state);
    const entries: ZipEntry[] = [];
    const enc = new TextEncoder();

    const total = assets.length;
    let done = 0;
    onProgress?.({ stage: "Collecting assets", done, total });

    // Fetch / decode each asset. Failures are non-fatal — we skip the
    // asset and leave its reference in the JSON (the ingest side can
    // resolve or report it). This keeps one dead URL from sinking the
    // whole export.
    const failed: string[] = [];
    for (const a of assets) {
      try {
        let bytes: Uint8Array | null = null;
        if (a.src.startsWith("data:")) {
          bytes = dataUrlToBytes(a.src)?.bytes ?? null;
        } else {
          const url = /^https?:/i.test(a.src) ? a.src : asset(a.src);
          const res = await fetch(url);
          if (res.ok) bytes = new Uint8Array(await res.arrayBuffer());
        }
        if (bytes) entries.push({ name: a.zipPath, data: bytes });
        else failed.push(a.src);
      } catch {
        failed.push(a.src);
      }
      done += 1;
      onProgress?.({ stage: "Collecting assets", done, total });
    }

    if (failed.length) {
      // eslint-disable-next-line no-console
      console.warn(`[exportRoom] ${failed.length} asset(s) could not be fetched and were skipped:`, failed);
      (room as { export_warnings?: string[] }).export_warnings = failed.map((f) => `asset not bundled: ${f.slice(0, 80)}`);
    }

    onProgress?.({ stage: "Writing JSON", done, total });
    entries.unshift({ name: "room.json", data: enc.encode(JSON.stringify(room, null, 1)) });

    onProgress?.({ stage: "Zipping", done, total });
    const blob = buildZip(entries);
    const safeName = String((room as { name?: string }).name ?? "tmrw_room")
      .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "tmrw_room";
    const filename = `${safeName}_room.zip`;
    downloadBlob(blob, filename);
    onProgress?.({ stage: "Done", done: total, total });
    return { ok: true, filename };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
