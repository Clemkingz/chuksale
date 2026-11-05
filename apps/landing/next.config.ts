import type { NextConfig } from "next";

/**
 * The public marketing site (stellance-v3 `apps/landing` pattern). No basePath: it owns the domain root. With Vercel
 * Services (vercel.json) the app is at `/app` and the admin console at `/admin` on the same domain; links to them are
 * plain <a> (src/lib/site.ts).
 */
const nextConfig: NextConfig = {
	env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "" },
	distDir: process.env.NEXT_DIST_DIR || ".next",
	reactCompiler: true,
	transpilePackages: ["@repo/ui"],
	allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
	// Images are pre-sized WebP in public/images (Vercel Services doesn't route /_next/image).
	images: { unoptimized: true },
};

export default nextConfig;
