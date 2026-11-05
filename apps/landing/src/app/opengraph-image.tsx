import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@repo/ui/og-card";

/** The link preview (Open Graph; twitter-image.tsx reuses it). Rendered once at build time. */
export const alt = "Chucksales: discover reviewed community projects and support them with Stellar contributions.";
export const size = OG_SIZE;
export const contentType = "image/png";

const png = (file: Buffer) => `data:image/png;base64,${file.toString("base64")}`;

export default async function Image() {
	// Literal paths: a dynamic path makes the build trace the whole repo.
	const [bold, medium, logo, illustration] = await Promise.all([
		readFile(join(process.cwd(), "../../packages/ui/src/assets/fonts/static/Roboto-Bold.ttf")),
		readFile(join(process.cwd(), "../../packages/ui/src/assets/fonts/static/Roboto-Medium.ttf")),
		readFile(join(process.cwd(), "src/app/apple-icon.png")).then(png),
		readFile(join(process.cwd(), "../../packages/ui/src/assets/images/transparent-img.png")).then(png),
	]);

	return new ImageResponse(
		<OgCard
			logo={logo}
			illustration={illustration}
			eyebrow="Live on Stellar Testnet"
			title="Back the projects your community needs."
			subtitle="Reviewed projects, transparent Stellar contributions, real feedback."
			domain="chucksales.com"
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
