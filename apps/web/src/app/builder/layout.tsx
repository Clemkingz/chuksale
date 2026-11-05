import { SiteFooter } from "@/components/layouts/SiteFooter";
import { SiteHeader } from "@/components/layouts/SiteHeader";
import { RequireBuilder } from "@/features/builder-auth/RequireBuilder";

/** Builder area: signed-in builders only. The real gate is server-side later; this is the UX gate (PRD §10.1). */
export default function BuilderLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col">
			<SiteHeader />
			<main className="min-w-0 flex-1">
				<RequireBuilder>{children}</RequireBuilder>
			</main>
			<SiteFooter />
		</div>
	);
}
