"use client";

import Link from "next/link";
import { Button } from "@repo/ui/button";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { EmptyState, ErrorState } from "@/components/States";
import { useProject } from "@/features/projects/hooks";
import { ProjectDetail } from "@/features/projects/components/ProjectDetail";

/** /projects/[slug]: loads the public project (404 unless approved + published, FR-REV-05). */
export function ProjectPage({ slug }: { slug: string }) {
	const project = useProject(slug);
	if (project.data) return <ProjectDetail project={project.data} />;
	if (project.isError)
		return (
			<div className="app-container py-16">
				{errorStatus(project.error) === 404 ? (
					<EmptyState
						title="This project isn’t available"
						description="It may not be approved yet, or it was taken down. Explore other projects instead."
						action={
							<Button asChild>
								<Link href={routes.projects}>Explore projects</Link>
							</Button>
						}
					/>
				) : (
					<ErrorState
						message={errorMessage(project.error)}
						onRetry={() => void project.refetch()}
						retrying={project.isFetching}
					/>
				)}
			</div>
		);
	return (
		<div aria-hidden>
			<div className="skeleton-shimmer h-[140px] sm:h-[200px] md:h-[240px]" />
			<div className="app-container">
				<span className="skeleton-shimmer -mt-12 block size-24 rounded-full ring-4 ring-surface-900 sm:size-28" />
				<div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
					<div className="flex flex-col gap-3">
						<span className="skeleton-shimmer block h-9 w-2/3 rounded" />
						<span className="skeleton-shimmer block h-4 w-1/3 rounded" />
						<span className="skeleton-shimmer mt-3 block h-5 w-full rounded" />
						<span className="skeleton-shimmer block h-5 w-5/6 rounded" />
					</div>
					<span className="skeleton-shimmer block h-[360px] rounded-2xl" />
				</div>
			</div>
		</div>
	);
}
