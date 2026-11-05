/**
 * Where the admin console is mounted. With Vercel Services it lives under `/admin` (next.config sets basePath and
 * NEXT_PUBLIC_BASE_PATH); with plain `pnpm dev` it is the root of localhost:3001. <Link> and router paths get the base
 * path automatically; plain <img src> / <a href> to this app's own files don't, so they go through withBasePath().
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(src: string) {
	return BASE_PATH && src.startsWith("/") && !src.startsWith(`${BASE_PATH}/`) ? `${BASE_PATH}${src}` : src;
}

/** Strips the base path from a browser pathname so it can be handed back to the router (which adds it again). */
export function withoutBasePath(pathname: string) {
	return BASE_PATH && pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) || "/" : pathname;
}

/** The public web app (apps/web): `/app` on the shared domain, localhost:3000 in plain dev. */
export const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? (BASE_PATH ? "/app" : "http://localhost:3000");
