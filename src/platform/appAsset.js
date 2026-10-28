// Vite rewrites BASE_URL for each build. Keep runtime/public loads alongside the
// hosted app; module-owned assets (e.g. Matrix WOFF2) use new URL(import.meta.url).
// The explicit base argument lets Node verify paths without browser/Vite APIs.
export function appAsset(path, base = import.meta.env?.BASE_URL ?? '/') {
  return `${base.endsWith('/') ? base : base + '/'}${path.replace(/^\/+/, '')}`;
}
