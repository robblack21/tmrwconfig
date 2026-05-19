// ── fal.ai texture client ──────────────────────────────────────────────
// Thin wrapper around the proxy worker (workers/fal-proxy/worker.js)
// that lives outside this repo. The key never touches the browser bundle
// — every call goes through the proxy, which holds the fal.ai API key
// in its own environment.
//
// Set `NEXT_PUBLIC_FAL_PROXY_URL` to the deployed worker URL. If unset
// the client returns a clear error so the UI can disable the texture-gen
// affordance instead of silently failing.

export type FalModel = "fal-ai/gpt-image-1/text-to-image/byok" | "fal-ai/patina" | "fal-ai/flux/dev" | "fal-ai/flux/schnell";

export type FalTextureResult =
  | { ok: true;  url: string; raw?: unknown }
  | { ok: false; error: string };

export const FAL_PROXY_URL: string | undefined =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_FAL_PROXY_URL || undefined
    : undefined;

// Optional shared-secret token. If the worker is deployed with CLIENT_TOKEN
// set, the static site must echo the same value via this var. The token
// lives in the JS bundle (we have no choice — static site), so this is a
// friction layer, not real auth. See workers/fal-proxy/worker.js for the
// full security model.
export const FAL_PROXY_TOKEN: string | undefined =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_FAL_PROXY_TOKEN || undefined
    : undefined;

export function isFalConfigured(): boolean {
  return !!FAL_PROXY_URL;
}

/** POST `{ model, prompt, ...rest }` to the proxy. Returns the image URL
 *  on success. `rest` is forwarded verbatim — pass `image_size`,
 *  `num_inference_steps`, or any model-specific knobs.
 *
 *  Models we expose:
 *    • "fal-ai/gpt-image-1/text-to-image/byok" — GPT-Image-1 BYOK
 *    • "fal-ai/patina"                          — PBR texture
 *    • "fal-ai/flux/dev"                        — general image-gen
 *    • "fal-ai/flux/schnell"                    — faster flux variant
 *
 *  The CALLER picks the right model for the surface: walls / floor → use
 *  patina (real tileable PBR), brand graphics → flux or gptimage. */
export async function generateTexture(
  prompt: string,
  opts: { model?: FalModel; signal?: AbortSignal } & Record<string, unknown> = {},
): Promise<FalTextureResult> {
  if (!FAL_PROXY_URL) {
    return { ok: false, error: "fal.ai proxy URL not configured (set NEXT_PUBLIC_FAL_PROXY_URL)" };
  }
  const { model = "fal-ai/flux/dev", signal, ...rest } = opts;
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
      return { ok: false, error: data?.error ?? `Proxy error ${r.status}` };
    }
    if (!data?.url || typeof data.url !== "string") {
      return { ok: false, error: "Proxy returned no image URL" };
    }
    return { ok: true, url: data.url, raw: data.raw };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
