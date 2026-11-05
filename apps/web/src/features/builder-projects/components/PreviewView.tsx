"use client";

import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import type { PublicProject } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { ACCEPTED_ASSETS } from "@/lib/stellar/config";
import { ErrorState } from "@/components/States";
import { ProjectDetail } from "@/features/projects/components/ProjectDetail";
import { useBuilderProfile, useBuilderProject, type BuilderProjectDetail } from "@/features/builder-projects/hooks";

/** /builder/projects/[id]/preview (PRD §6.2): the real public page component, rendered with the builder's data. */

function toPublic(p: BuilderProjectDetail, owner: { display_name: string; organization_name: string | null }): PublicProject {
	return {
		...p,
		contact_email: null,
		owner: { ...owner, website: null },
		category: p.category,
		target_asset: ACCEPTED_ASSETS.find((a) => a.id === p.target_asset_id) ?? null,
		raised_amount: p.raised_amount,
		contributor_count: p.contributor_count,
		suggestion_count: p.suggestion_count,
	};
}

export function PreviewView({ id }: { id: string }) {
	const q = useBuilderProject(id);
	const profile = useBuilderProfile();
	if (q.isError)
		return (
			<div className="app-container py-16">
				<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
			</div>
		);
	if (!q.data || !profile.data) return <div className="skeleton-shimmer h-[60vh]" aria-hidden />;
	return (
		<>
			<div className="sticky top-16 z-20 border-b border-primary-500/30 bg-primary-500/15 backdrop-blur md:top-[72px]">
				<div className="app-container flex flex-wrap items-center justify-between gap-3 py-2.5">
					<p className="flex items-center gap-2 text-sm">
						<Eye className="size-4 text-primary-300" /> Preview: this is how your project page will look once approved.
					</p>
					<Button asChild size="sm" variant="outline" className="h-9 gap-1.5">
						<Link href={routes.builderProject(id)}>
							<ArrowLeft className="size-4" /> Back
						</Link>
					</Button>
				</div>
			</div>
			<ProjectDetail project={toPublic(q.data, profile.data)} preview />
		</>
	);
}
