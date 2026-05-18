// ── fal.ai proxy worker ────────────────────────────────────────────────
// Tiny Cloudflare Worker that holds the FAL_KEY in its environment and
// forwards prompts to fal.ai on behalf of the static gh-pages site.
//
// Why a proxy? GitHub Pages is purely static — anything baked into the JS
// bundle (incl. `NEXT_PUBLIC_*` env vars) is visible to every visitor.
// The fal.ai key is a billing credential, so it MUST stay server-side.
// This worker is the smallest viable server-side layer.
//
// Deploy (Cloudflare Workers, free tier):
//   1. `npm i -g wrangler`
//   2. `cd workers/fal-proxy`
//   3. `wrangler login`
//   4. `wrangler secret put FAL_KEY`    # paste the fal.ai API key
//   5. `wrangler deploy`                # gives you https://fal-proxy.<you>.workers.dev
//   6. In the gh-pages repo, set NEXT_PUBLIC_FAL_PROXY_URL to that URL
//      (either in .env.production or as a build-time arg in CI) and
//      re-deploy.
//
// CORS is wide-open here so the gh-pages origin can call it directly.
// Tighten via an ALLOWED_ORIGIN env var if you ship this publicly.

const ALLOWED_MODELS = new Set([
  // OpenAI gpt-image-1 via fal.
  "fal-ai/gpt-image-1/text-to-image/byok",
  // Patina texture model (PBR material generator).
  "fal-ai/patina",
  // Sensible image-gen fallbacks.
  "fal-ai/flux/dev",
  "fal-ai/flux-pro/v1.1",
  "fal-ai/flux/schnell",
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "*";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    if (!env.FAL_KEY) {
      return new Response(JSON.stringify({ error: "FAL_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const { model = "fal-ai/flux/dev", prompt, ...rest } = body || {};
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing 'prompt' string" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }
    if (!ALLOWED_MODELS.has(model)) {
      return new Response(JSON.stringify({ error: `Model not allowed: ${model}` }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const r = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${env.FAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, ...rest }),
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!r.ok) {
      return new Response(JSON.stringify({ error: "fal.ai error", status: r.status, data }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    // Most fal models return { images: [{ url, content_type }, ...] }.
    // Patina returns { image: { url } }. Normalise both into { url }.
    const url = data.images?.[0]?.url || data.image?.url || data.url;
    return new Response(JSON.stringify({ url, raw: data }), {
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  },
};
