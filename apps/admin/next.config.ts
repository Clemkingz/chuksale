import type { NextConfig } from "next";

/**
 * Vercel Services (vercel.json): one domain, landing at `/`, web at `/app`, admin at `/admin`. On Vercel (builds and
 * `vercel dev`, where VERCEL=1) this app is mounted under `/admin`; with plain `pnpm dev` it is the root of
 * localhost:3001. `BASE_PATH` overrides both. Anything building a URL by hand reads NEXT_PUBLIC_BASE_PATH.
 */
const BASE_PATH = process.env.BASE_PATH ?? (process.env.VERCEL ? "/admin" : "");

/** The real API (once it exists). Mock mode never calls it: the axios adapter answers in the browser. */
const API_ORIGIN = process.env.API_PROXY_TARGET || "http://localhost:8080/api/v1";

const API_URL = process.env.NEXT_PUBLIC_API_URL || `${BASE_PATH}/api/v1`;

const nextConfig: NextConfig = {
	basePath: BASE_PATH,
	env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH, NEXT_PUBLIC_API_URL: API_URL, NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "" },
	// One-off verification builds (`NEXT_DIST_DIR=.next-verify next build`) never overwrite a running dev server's `.next`.
	distDir: process.env.NEXT_DIST_DIR || ".next",
	images: { unoptimized: true },
	reactCompiler: true,
	transpilePackages: ["@repo/ui", "@repo/mock-api", "@repo/domain", "@repo/api"],
	allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
	async rewrites() {
		return [{ source: "/api/v1/:path*", destination: `${API_ORIGIN}/:path*` }];
	},
};

export default nextConfig;
