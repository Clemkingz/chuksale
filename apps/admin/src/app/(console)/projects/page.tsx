import { Suspense } from "react";
import type { Metadata } from "next";
import { ProjectsView } from "@/features/projects/components/ProjectsView";

export const metadata: Metadata = { title: "Projects" };

/** /projects (PRD /admin/projects): designs "admin page 2–3". Filters in the URL (useSearchParams → Suspense). */
export default function Page() {
	return (
		<Suspense>
			<ProjectsView />
		</Suspense>
	);
}
