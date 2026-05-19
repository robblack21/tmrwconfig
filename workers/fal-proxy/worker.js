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
//   5. (optional) `wrangler secret put CLIENT_TOKEN`    # shared secret
//   6. `wrangler deploy`                # → https://fal-proxy.<you>.workers.dev
//   7. In the gh-pages repo set NEXT_PUBLIC_FAL_PROXY_URL (and optionally
//      NEXT_PUBLIC_FAL_PROXY_TOKEN if you set CLIENT_TOKEN) and re-deploy.
//
// ── Security model ────────────────────────────────────────────────────
// This worker is a friction layer, not a real auth boundary. Anyone can
// open the static site in a browser, read the token out of devtools, and
// replay it. What this protects against is:
//   • Drive-by scanners hitting the URL from a random origin
//   • Curl / Postman replays without the token
//   • Casual scraping that doesn't bother to lift the token
// What it does NOT protect against:
//   • A determined attacker who scrapes the bundle for the token
//
// To actually stop those, you need a real backend that issues short-lived
// per-session tokens. For "I don't want random people burning my fal.ai
// credits," the combo of origin allow-list + shared secret is plenty.

const DEFAULT_ALLOWED_ORIGINS = [
  "https://robblack21.github.io",     // gh-pages production
  "http://localhost:3000",            // next dev (default)
  "http://localhost:3001",            // next dev (port-bumped)
];

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

/** Read the per-deploy allow-list. `env.ALLOWED_ORIGINS` (var, not secret)
 *  takes a comma-separated list; falls back to the constants above. Keeps
 *  the gh-pages + localhost combo as the safe default so a fresh deploy
 *  works without any env config beyond FAL_KEY. */
function getAllowedOrigins(env) {
  if (env.ALLOWED_ORIGINS && typeof env.ALLOWED_ORIGINS === "string") {
    return env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED_ORIGINS;
}

function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  return getAllowedOrigins(env).includes(origin);
}

function corsHeaders(origin, env) {
  // Echo back the request origin only if it's on the allow-list. Anything
  // else gets a non-matching value, which the browser then refuses. We
  // also vary on Origin so Cloudflare's cache doesn't serve a permissive
  // header to an evil origin.
  const allow = isAllowedOrigin(origin, env) ? origin : "null";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function jsonErr(status, body, origin, env) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    // ── 1. CORS preflight ──
    if (request.method === "OPTIONS") {
      // A preflight from a disallowed origin still gets a 204 — the CORS
      // headers (with a non-matching Allow-Origin) cause the browser to
      // refuse the follow-up request. We don't 403 the preflight because
      // that would also block legitimate same-origin checks.
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    if (request.method !== "POST") {
      return jsonErr(405, { error: "POST only" }, origin, env);
    }

    // ── 2. Origin allow-list ──
    // Belt-and-braces: CORS already blocks browsers, but a curl / Postman
    // call has NO Origin header (or sets it manually). Reject explicitly.
    if (!isAllowedOrigin(origin, env)) {
      return jsonErr(403, { error: "Origin not allowed" }, origin, env);
    }

    // ── 3. Shared-secret bearer token (optional but recommended) ──
    // Skipped entirely if CLIENT_TOKEN isn't set in worker env — keeps the
    // upgrade path smooth. When set, the client must send
    //   Authorization: Bearer <token>
    // matching env.CLIENT_TOKEN. Constant-time-ish compare via Buffer.
    if (env.CLIENT_TOKEN) {
      const auth = request.headers.get("Authorization") || "";
      const expected = `Bearer ${env.CLIENT_TOKEN}`;
      if (auth.length !== expected.length || auth !== expected) {
        return jsonErr(401, { error: "Bad or missing token" }, origin, env);
      }
    }

    // ── 4. Body sanity ──
    if (!env.FAL_KEY) {
      return jsonErr(500, { error: "FAL_KEY not configured" }, origin, env);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonErr(400, { error: "Invalid JSON body" }, origin, env);
    }

    const { model = "fal-ai/flux/dev", prompt, ...rest } = body || {};
    if (!prompt || typeof prompt !== "string") {
      return jsonErr(400, { error: "Missing 'prompt' string" }, origin, env);
    }
    if (!ALLOWED_MODELS.has(model)) {
      return jsonErr(400, { error: `Model not allowed: ${model}` }, origin, env);
    }

    // ── 5. Forward to fal.ai ──
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
      return jsonErr(502, { error: "fal.ai error", status: r.status, data }, origin, env);
    }

    // Most fal models return { images: [{ url, content_type }, ...] }.
    // Patina returns { image: { url } }. Normalise both into { url }.
    const url = data.images?.[0]?.url || data.image?.url || data.url;
    return new Response(JSON.stringify({ url, raw: data }), {
      headers: { "Content-Type": "application/json", ...corsHeaders(origin, env) },
    });
  },
};
