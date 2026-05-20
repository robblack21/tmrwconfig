// ── fal.ai texture client ──────────────────────────────────────────────
// Direct browser → fal.ai call. The key lives in the static bundle as
// `NEXT_PUBLIC_FAL_KEY` — visible to anyone with DevTools. That's an
// explicit trade-off chosen for this private-preview deploy: no proxy
// worker setup, no token coordination, no .env coordination beyond
// dropping ONE variable in `.env.local`. If you ever ship this past
// preview, swap to the worker path in workers/fal-proxy/ instead.
//
// `.env.local` (gitignored):
//   NEXT_PUBLIC_FAL_KEY=fal-<your-key-here>
//
// That's it. Rebuild (`pnpm deploy`) and the long-press editor's
// texture-gen affordance lights up.
//
// The legacy proxy URL path is kept as a fallback so existing workers
// keep working — but for new setups, just set `NEXT_PUBLIC_FAL_KEY`.

export type FalModel = "fal-ai/gpt-image-1/text-to-image/byok" | "fal-ai/patina" | "fal-ai/flux/dev" | "fal-ai/flux/schnell";

export type FalTextureResult =
  | { ok: true;  url: string; raw?: unknown }
  | { ok: false; error: string };

// Direct API key — preferred for static-site previews. If set, we call
// fal.ai directly with `Authorization: Key <KEY>`.
export const FAL_KEY: string | undefined =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_FAL_KEY || undefined
    : undefined;

// Legacy proxy worker URL — used only when FAL_KEY isn't set.
export const FAL_PROXY_URL: string | undefined =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_FAL_PROXY_URL || undefined
    : undefined;

// Legacy proxy-worker shared secret.
export const FAL_PROXY_TOKEN: string | undefined =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_FAL_PROXY_TOKEN || undefined
    : undefined;

export function isFalConfigured(): boolean {
  return !!FAL_KEY || !!FAL_PROXY_URL;
}

/** Generate a texture by prompting fal.ai. Tries the DIRECT route first
 *  (key in the bundle) — if `NEXT_PUBLIC_FAL_KEY` is set we call
 *  `https://fal.run/<model>` straight from the browser. Falls back to
 *  the proxy worker for setups that still want a server-side key. */
export async function generateTexture(
  prompt: string,
  opts: { model?: FalModel; signal?: AbortSignal } & Record<string, unknown> = {},
): Promise<FalTextureResult> {
  const { model = "fal-ai/flux/dev", signal, ...rest } = opts;

  // Direct fal.ai path — preferred for previews. fal.ai's REST endpoint
  // accepts `Authorization: Key <KEY>` and returns a JSON envelope with
  // an `images[0].url` (or `image.url` for the patina model). CORS is
  // permissive on fal.run so browser → fal.run works without a proxy.
  if (FAL_KEY) {
    try {
      const r = await fetch(`https://fal.run/${model}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${FAL_KEY}`,
        },
        body: JSON.stringify({ prompt, ...rest }),
        signal,
      });
      const text = await r.text();
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!r.ok) {
        return { ok: false, error: extractError(data) ?? `fal.ai error ${r.status}` };
      }
      // Normalise the response shapes — most models return
      // { images: [{ url, content_type, ... }] }, patina uses
      // { image: { url } }, flux variants sometimes nest under `result`.
      const url = extractImageUrl(data);
      if (!url) return { ok: false, error: "fal.ai returned no image URL" };
      return { ok: true, url, raw: data };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // Proxy fallback — legacy path. Kept so existing worker deploys keep
  // working without code changes.
  if (FAL_PROXY_URL) {
    try {
      const r = await fetch(FAL_PROXY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(FAL_PROXY_TOKEN ? { Authorization: `Bearer ${FAL_PROXY_TOKEN}` } : {}),
        },
        body: JSON.stringify({ model, prompt, ...rest }),
        signal,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return { ok: false, error: typeof data?.error === "string" ? data.error : `Proxy error ${r.status}` };
      }
      if (!data?.url || typeof data.url !== "string") {
        return { ok: false, error: "Proxy returned no image URL" };
      }
      return { ok: true, url: data.url, raw: data.raw };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  return {
    ok: false,
    error: "fal.ai not configured. Set NEXT_PUBLIC_FAL_KEY in .env.local and rebuild.",
  };
}

function extractImageUrl(data: Record<string, unknown>): string | undefined {
  const d = data as Record<string, unknown>;
  const images = (d.images as Array<{ url?: string }> | undefined);
  if (Array.isArray(images) && images[0]?.url) return images[0].url;
  const image = d.image as { url?: string } | undefined;
  if (image?.url) return image.url;
  if (typeof d.url === "string") return d.url;
  // Some fal models wrap the result under `data` or `result`.
  for (const k of ["data", "result"] as const) {
    const inner = d[k] as Record<string, unknown> | undefined;
    if (inner) {
      const nested = extractImageUrl(inner);
      if (nested) return nested;
    }
  }
  return undefined;
}

function extractError(data: Record<string, unknown>): string | undefined {
  if (typeof data.error === "string") return data.error;
  const detail = data.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string; message?: string };
    return first.msg ?? first.message ?? JSON.stringify(detail);
  }
  if (typeof data.message === "string") return data.message;
  return undefined;
}
