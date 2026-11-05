import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** The landing site is the indexable one; web and admin disallow everything. */
export default function robots(): MetadataRoute.Robots {
	return { rules: { userAgent: "*", allow: "/" }, host: SITE_URL.origin, sitemap: new URL("/sitemap.xml", SITE_URL).toString() };
}
