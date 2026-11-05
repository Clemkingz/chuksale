import { SiteFooter } from "@/components/layouts/SiteFooter";
import { SiteHeader } from "@/components/layouts/SiteHeader";

/** Public + contributor pages: header (nav, bell, Connect wallet) and footer. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col">
			<SiteHeader />
			<main className="min-w-0 flex-1">{children}</main>
			<SiteFooter />
		</div>
	);
}
