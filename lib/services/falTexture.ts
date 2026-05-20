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

// ── Text → 3D model ────────────────────────────────────────────────────
// Generate a GLB from a text prompt. fal.ai's text-to-3D path is a
// two-stage pipeline on most accounts (text→image then image→3D), but
// several models accept a prompt directly. We try a direct text-to-3D
// model first; the result envelope carries the GLB under `model_mesh.url`
// (Trellis / Hunyuan3D shape) or `model_glb` / `glb.url` depending on
// the model. Returns the GLB URL on success.
export type FalModelResult =
  | { ok: true; url: string; raw?: unknown }
  | { ok: false; error: string };

export async function generateModel(
  prompt: string,
  opts: { model?: string; signal?: AbortSignal } & Record<string, unknown> = {},
): Promise<FalModelResult> {
  // Default to a text-to-3D model. `fal-ai/hunyuan3d/v2` and
  // `fal-ai/trellis` are image-to-3D; for text we use the text variant
  // when available. The model id is overridable so the caller can pick
  // whatever their fal account has enabled.
  const { model = "fal-ai/hunyuan3d/v2/text-to-3d", signal, ...rest } = opts;
  if (!FAL_KEY && !FAL_PROXY_URL) {
    return { ok: false, error: "fal.ai not configured. Set NEXT_PUBLIC_FAL_KEY in .env.local and rebuild." };
  }
  const endpoint = FAL_KEY ? `https://fal.run/${model}` : FAL_PROXY_URL!;
  try {
    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(FAL_KEY ? { Authorization: `Key ${FAL_KEY}` } : (FAL_PROXY_TOKEN ? { Authorization: `Bearer ${FAL_PROXY_TOKEN}` } : {})),
      },
      body: JSON.stringify(FAL_KEY ? { prompt, ...rest } : { model, prompt, ...rest }),
      signal,
    });
    const text = await r.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!r.ok) return { ok: false, error: extractError(data) ?? `fal.ai error ${r.status}` };
    const url = extractGlbUrl(data);
    if (!url) return { ok: false, error: "fal.ai returned no model URL" };
    return { ok: true, url, raw: data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function extractGlbUrl(data: Record<string, unknown>): string | undefined {
  const d = data as Record<string, unknown>;
  // Common shapes across fal 3D models.
  const candidates: (unknown)[] = [
    (d.model_mesh as { url?: string } | undefined)?.url,
    (d.model_glb as { url?: string } | undefined)?.url,
    (d.glb as { url?: string } | undefined)?.url,
    (d.mesh as { url?: string } | undefined)?.url,
    typeof d.model_glb === "string" ? d.model_glb : undefined,
    typeof d.url === "string" ? d.url : undefined,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /\.glb(\?.*)?$/i.test(c)) return c;
    if (typeof c === "string" && c.startsWith("http")) return c; // some return signed urls w/o extension
  }
  // Recurse into nested envelopes.
  for (const k of ["data", "result", "output"] as const) {
    const inner = d[k] as Record<string, unknown> | undefined;
    if (inner) {
      const nested = extractGlbUrl(inner);
      if (nested) return nested;
    }
  }
  return undefined;
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
    // fal.ai validation errors are FastAPI-style:
    //   { detail: [{ loc: ["body","image_url"], msg: "field required", type }] }
    // Previously we returned just `msg` ("field required") which dropped
    // the field name — the user saw a useless "it needed a field". Now we
    // append the offending field path from `loc` so the message is
    // actionable, e.g. "field required: image_url".
    const parts = detail.map((d) => {
      const e = d as { loc?: unknown[]; msg?: string; message?: string };
      const field = Array.isArray(e.loc)
        ? e.loc.filter((x) => x !== "body" && typeof x === "string").join(".")
        : "";
      const msg = e.msg ?? e.message ?? "invalid";
      return field ? `${msg}: ${field}` : msg;
    });
    return parts.join("; ");
  }
  if (typeof data.message === "string") return data.message;
  return undefined;
}
