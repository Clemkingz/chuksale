import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Toaster } from "@repo/ui/sonner";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { USE_MOCK_API } from "@/lib/api/source";
import { DemoControls } from "@/features/dev/DemoControls";
import { ConnectWalletDialog } from "@/features/wallet/components/ConnectWalletDialog";
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
const roboto = Roboto({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-roboto", display: "swap" });

const TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

/**
 * App metadata. Icons, the manifest and link previews come from file conventions in this folder
 * (favicon.ico · apple-icon.png · manifest.ts · opengraph-image.tsx · twitter-image.tsx). Pages set `title`
 * and get "%s | Chucksales"; project pages add their own description via generateMetadata (Phase 3).
 * Search engines index the landing site, not the app (robots.ts).
 */
export const metadata: Metadata = {
	metadataBase: SITE_URL,
	title: { default: TITLE, template: `%s | ${SITE_NAME}` },
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	keywords: SITE_KEYWORDS,
	authors: [{ name: SITE_NAME }],
	creator: SITE_NAME,
	// Amounts, dates and wallet addresses must not turn into tap-to-call or map links.
	formatDetection: { telephone: false, email: false, address: false, date: false },
	robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
	openGraph: { type: "website", locale: "en_US", siteName: SITE_NAME, title: TITLE, description: SHARE_DESCRIPTION, url: "/" },
	twitter: {
		card: "summary_large_image",
		site: TWITTER_HANDLE,
		creator: TWITTER_HANDLE,
		title: TITLE,
		description: SHARE_DESCRIPTION,
	},
};

export const viewport: Viewport = {
	themeColor: THEME_COLOR,
	// Shrink the layout viewport when the keyboard opens instead of covering inputs.
	interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={`${roboto.variable} antialiased`} suppressHydrationWarning>
			<head>
				<ScrollRevealScript />
			</head>
			<body>
				<ScrollReveal />
				<ReactQueryProvider>
					{children}
					{/* Mounted once; opened from anywhere with useWalletDialog / useRequireWallet. */}
					<ConnectWalletDialog />
					{USE_MOCK_API && <DemoControls />}
					{/* Below the header, so toasts never cover the bell or wallet button. */}
					<Toaster
						position="top-right"
						closeButton
						offset={{ top: 100, right: 24 }}
						mobileOffset={{ top: 80, left: 12, right: 12 }}
					/>
				</ReactQueryProvider>
			</body>
		</html>
	);
}
