import type { MetadataRoute } from "next";

/** Keep this app out of search; the landing site (apps/landing) is the indexable one. */
export default function robots(): MetadataRoute.Robots {
	return { rules: { userAgent: "*", disallow: "/" } };
}
