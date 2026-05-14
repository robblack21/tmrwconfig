// Prepend the deployment base path to a public-asset URL.
//
// Next's `basePath` config automatically prefixes routes (e.g. `<Link href="/foo">`)
// and `next/image` URLs, but NOT hard-coded `/glb/foo.glb` strings passed to
// drei's `useGLTF`, `useTexture`, etc. Pipe those through `asset()` so the
// gh-pages-deployed bundle hits `/tmrwconfig/glb/foo.glb` instead of 404.
//
// In dev (`pnpm dev`) NEXT_PUBLIC_BASE_PATH is empty, so this is a no-op and
// `<canvas>` keeps loading from `/glb/...` as before.

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(path: string): string {
  if (!path) return path;
  if (!path.startsWith("/")) return path;       // relative / external (https://…) — leave alone
  if (path.startsWith("//")) return path;        // protocol-relative
  if (BASE_PATH && path.startsWith(`${BASE_PATH}/`)) return path; // already prefixed
  return `${BASE_PATH}${path}`;
}
