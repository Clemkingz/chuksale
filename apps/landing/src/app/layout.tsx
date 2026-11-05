import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import {
	SHARE_DESCRIPTION,
	SITE_DESCRIPTION,
	SITE_KEYWORDS,
	SITE_NAME,
	SITE_TAGLINE,
	SITE_URL,
	THEME_COLOR,
	TWITTER_HANDLE,
} from "@/lib/site";
import { ScrollReveal, ScrollRevealScript } from "@repo/ui/scroll-reveal";
import "./globals.css";

/** Body font. Headings use SF Pro Display through `font-display` (packages/ui globals.css). */
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto", display: "swap" });

const TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

/**
 * Icons and link previews come from file conventions in this folder: favicon.ico, apple-icon.png,
 * opengraph-image.tsx and twitter-image.tsx (1200×630, rendered at build time). robots.ts and sitemap.ts too.
 */
export const metadata: Metadata = {
	metadataBase: SITE_URL,
	title: { default: TITLE, template: `%s | ${SITE_NAME}` },
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	keywords: SITE_KEYWORDS,
	authors: [{ name: SITE_NAME }],
	creator: SITE_NAME,
	publisher: SITE_NAME,
	category: "community funding",
	alternates: { canonical: "/" },
	formatDetection: { telephone: false, email: false, address: false },
	openGraph: {
		type: "website",
		locale: "en_US",
		url: "/",
		siteName: SITE_NAME,
		title: TITLE,
		description: SHARE_DESCRIPTION,
	},
	twitter: {
		card: "summary_large_image",
		site: TWITTER_HANDLE,
		creator: TWITTER_HANDLE,
		title: TITLE,
		description: SHARE_DESCRIPTION,
	},
	robots: {
		index: true,
		follow: true,
		googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
	},
};

export const viewport: Viewport = { themeColor: THEME_COLOR, colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={`${roboto.variable} antialiased`} suppressHydrationWarning>
			<head>
				<ScrollRevealScript />
			</head>
			<body>
				<ScrollReveal />
				{children}
			</body>
		</html>
	);
}
