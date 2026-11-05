import { Suspense } from "react";
import type { Metadata } from "next";
import { ProfileHero } from "@/features/builder-projects/components/ProfileHero";
import { ProjectsSection } from "@/features/builder-projects/components/ProjectsSection";
import { ProjectsTableSkeleton } from "@/features/builder-projects/components/ProjectsTable";

export const metadata: Metadata = { title: "Dashboard" };

/** /builder/dashboard: designs "Dev add project 1" (no projects) and "Dev add project 3" (projects table). */
export default function Page() {
	return (
		<>
			<ProfileHero />
			{/* ProjectsSection reads ?tab/?q/?page (useSearchParams). */}
			<Suspense
				fallback={
					<div className="app-container pt-24 pb-16">
						<ProjectsTableSkeleton />
					</div>
				}
			>
				<ProjectsSection />
			</Suspense>
		</>
	);
}
