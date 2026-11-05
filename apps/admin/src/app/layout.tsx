import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Toaster } from "@repo/ui/sonner";
import { Providers } from "@/components/providers/Providers";
import { ScrollReveal, ScrollRevealScript } from "@repo/ui/scroll-reveal";
import "./globals.css";

const roboto = Roboto({ subsets: ["latin"], weight: ["300", "400", "500", "700"], variable: "--font-roboto", display: "swap" });

/** Staff only: never indexed (robots.ts as well). Icons and previews come from file conventions in this folder. */
export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
	title: { default: "Chucksales Admin", template: "%s | Chucksales Admin" },
	description: "Chucksales admin console: project reviews, suggestion moderation and contribution monitoring.",
	applicationName: "Chucksales Admin",
	formatDetection: { telephone: false, email: false, address: false, date: false },
	robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
	openGraph: {
		type: "website",
		siteName: "Chucksales Admin",
		title: "Chucksales Admin",
		description: "Admin console (staff only).",
	},
	twitter: { card: "summary_large_image", title: "Chucksales Admin", description: "Admin console (staff only)." },
};

export const viewport: Viewport = { themeColor: "#05070c" };

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={`${roboto.variable} antialiased`} suppressHydrationWarning>
			<head>
				<ScrollRevealScript />
			</head>
			<body>
				<ScrollReveal />
				<Providers>
					{children}
					<Toaster position="top-right" richColors />
				</Providers>
			</body>
		</html>
	);
}
