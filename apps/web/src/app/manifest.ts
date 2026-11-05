import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, THEME_COLOR, withBasePath } from "@/lib/site";

/** Installable app; opens on Explore. Paths carry the preview base path by hand. */
export default function manifest(): MetadataRoute.Manifest {
	return {
		id: withBasePath("/"),
		name: SITE_NAME,
		short_name: SITE_NAME,
		description: SITE_DESCRIPTION,
		start_url: withBasePath("/projects"),
		scope: withBasePath("/"),
		display: "standalone",
		background_color: THEME_COLOR,
		theme_color: THEME_COLOR,
		categories: ["finance", "social"],
		icons: [
			{ src: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
			{ src: withBasePath("/icons/icon-512.png"), sizes: "512x512", type: "image/png" },
		],
	};
}
