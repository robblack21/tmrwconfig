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

Copy the worker URL it prints. Add it to the static-site env so the build
picks it up:

```sh
# Local dev + the local deploy (since pnpm deploy runs next build on your
# machine and force-pushes out/ to gh-pages):
cat >> .env.local <<EOF
NEXT_PUBLIC_FAL_PROXY_URL=https://fal-proxy.<your-acct>.workers.dev
EOF
```

`.env.local` is already in `.gitignore` so it never gets committed. Now
run `pnpm deploy` and the URL is baked into the production bundle.

Note: the URL itself is NOT a secret — only the FAL_KEY is. The worker
URL appears in the static bundle (that's fine, it's just an endpoint).

## Locking down for production

The worker now ships with two friction layers enabled out of the box:

### 1. Origin allow-list (active by default)

`worker.js` only accepts requests whose `Origin` header matches the
allow-list. The defaults are:

- `https://robblack21.github.io` (your gh-pages production)
- `http://localhost:3000`, `http://localhost:3001` (next dev)

If you ship to a different origin (custom domain, preview deploy, etc),
override via `wrangler.toml`:

```toml
[vars]
ALLOWED_ORIGINS = "https://robblack21.github.io,https://custom.example.com"
```

Then `wrangler deploy` again. Requests from anywhere else get a 403 plus
a non-matching CORS header (browsers refuse, curl gets the error body).

### 2. Shared-secret bearer token (recommended)

Set a token on both sides so non-browser callers (Postman, curl) can't
hit your worker without it. Pick a long random string — anything 32+
chars of `openssl rand -hex 32` is fine.

On the worker:

```sh
wrangler secret put CLIENT_TOKEN     # paste the random string
wrangler deploy
```

On the static site:

```sh
echo "NEXT_PUBLIC_FAL_PROXY_TOKEN=<that-same-string>" >> .env.local
pnpm deploy
```

The client now sends `Authorization: Bearer <token>` on every request;
the worker compares against `env.CLIENT_TOKEN` and returns 401 on
mismatch. Skip this step entirely if `CLIENT_TOKEN` is unset on the
worker — the check is opt-in to keep the upgrade path smooth.

### What this protects against

- **Drive-by scanners** hitting your worker URL from a random origin:
  blocked by the origin allow-list.
- **Curl / Postman replays** without the token: blocked by the bearer
  check (assuming you set CLIENT_TOKEN).
- **Casual scraping** that doesn't bother to lift the token from the
  bundle: blocked by both layers.

### What this does NOT protect against

A determined attacker who scrapes your bundle for the token and the
proxy URL can still call the worker. The only way to stop that on a
static site is to put real auth in front of it (Cloudflare Access, a
session-issuing backend, etc). For "I don't want random people burning
my fal.ai credits," origin + token is plenty.

## Models exposed

The worker has an `ALLOWED_MODELS` allow-list. Adjust `worker.js` to
add / remove:

- `fal-ai/gpt-image-1/text-to-image/byok` — GPT-image-1
- `fal-ai/patina` — PBR texture
- `fal-ai/flux/dev` — general image-gen
- `fal-ai/flux-pro/v1.1` — higher quality
- `fal-ai/flux/schnell` — faster
