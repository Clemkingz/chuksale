import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@repo/ui/og-card";

/** The link preview (Open Graph; twitter-image.tsx reuses it). Rendered once at build time. */
export const alt = "Chucksales admin console.";
export const size = OG_SIZE;
export const contentType = "image/png";

const png = (file: Buffer) => `data:image/png;base64,${file.toString("base64")}`;

export default async function Image() {
	// Literal paths: a dynamic path makes the build trace the whole repo.
	const [bold, medium, logo] = await Promise.all([
		readFile(join(process.cwd(), "../../packages/ui/src/assets/fonts/static/Roboto-Bold.ttf")),
		readFile(join(process.cwd(), "../../packages/ui/src/assets/fonts/static/Roboto-Medium.ttf")),
		readFile(join(process.cwd(), "src/app/apple-icon.png")).then(png),
	]);

	return new ImageResponse(
		<OgCard
			logo={logo}
			eyebrow="Admin console"
			title="Review, moderate and keep the platform safe."
			subtitle="Project reviews, suggestion moderation and contribution monitoring."
			domain="Chucksales admin"
			showFunding={false}
		/>,
		{
			...size,
			fonts: [
				{ name: "Roboto", data: bold, weight: 700, style: "normal" },
				{ name: "Roboto", data: medium, weight: 500, style: "normal" },
			],
		},
	);
}
