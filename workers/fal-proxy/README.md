# `fal-proxy` worker

Cloudflare Worker that holds the fal.ai API key and forwards prompts from
the static gh-pages site. Necessary because GitHub Pages is purely
static — anything baked into the JS bundle (incl. `NEXT_PUBLIC_*` env
vars) is visible to every visitor, and the fal.ai key is a billing
credential.

## One-time setup

```sh
npm i -g wrangler            # if you haven't already
cd workers/fal-proxy
wrangler login               # opens browser → authorise
wrangler secret put FAL_KEY  # paste your fal.ai API key
wrangler deploy              # prints https://fal-proxy.<your-acct>.workers.dev
```

Copy the worker URL it prints. Add it to the gh-pages repo as a
build-time env var:

```sh
# Local dev:
echo "NEXT_PUBLIC_FAL_PROXY_URL=https://fal-proxy.<your-acct>.workers.dev" >> .env.local

# Production build (GitHub Action):
# Add NEXT_PUBLIC_FAL_PROXY_URL as a repo secret, then reference it from
# the workflow:
#
#   env:
#     NEXT_PUBLIC_FAL_PROXY_URL: ${{ secrets.NEXT_PUBLIC_FAL_PROXY_URL }}
```

Note: the URL itself is NOT a secret — only the FAL_KEY is. The worker
URL appears in the static bundle (that's fine, it's just an endpoint).

## Models exposed

The worker has an `ALLOWED_MODELS` allow-list. Adjust `worker.js` to
add / remove:

- `fal-ai/gpt-image-1/text-to-image/byok` — GPT-image-1
- `fal-ai/patina` — PBR texture
- `fal-ai/flux/dev` — general image-gen
- `fal-ai/flux-pro/v1.1` — higher quality
- `fal-ai/flux/schnell` — faster

## Tightening for production

The default CORS policy is wide-open (`*`). For a public deploy:

1. Replace `corsHeaders` to whitelist your gh-pages origin.
2. Consider rate-limiting via Cloudflare's per-IP throttles.
3. Optionally add a shared-secret header check (`Authorization: Bearer
   <client-side-token>`) so only your site can call the proxy.
