import { Suspense } from "react";
import type { Metadata } from "next";
import { ExploreView } from "@/features/projects/components/ExploreView";

export const metadata: Metadata = {
	title: "Explore projects",
	description: "Reviewed community projects you can support with Stellar contributions.",
};

/** /projects (PRD §6.3). Filters in the URL (useSearchParams → Suspense). */
export default function Page() {
	return (
		<Suspense>
			<ExploreView />
		</Suspense>
	);
}
