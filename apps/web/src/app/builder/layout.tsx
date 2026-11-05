import { SiteFooter } from "@/components/layouts/SiteFooter";
import { BuilderBar } from "@/components/layouts/BuilderBar";
import { RequireBuilder } from "@/features/builder-auth/RequireBuilder";

/** Builder area: signed-in builders only, with the slim builder bar instead of the public header. The real gate is server-side later; this is the UX gate (PRD §10.1). */
export default function BuilderLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex min-h-dvh flex-col">
			<BuilderBar />
			<main className="min-w-0 flex-1">
				<RequireBuilder>{children}</RequireBuilder>
			</main>
			<SiteFooter />
		</div>
	);
}
