"use client";

import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import type { Me, Project, PublicProject } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { ErrorState } from "@/components/States";
import { ProjectDetail } from "@/features/projects/components/ProjectDetail";
import { useMe } from "@/features/builder-auth/hooks";
import { useBuilderProject } from "@/features/builder-projects/hooks";

/** /builder/projects/[id]/preview (PRD §6.2): the real public page component, rendered with the builder's data. */

function toPublic(p: Project, me: Me): PublicProject {
	return {
		id: p.id,
		slug: p.slug ?? "",
		title: p.title,
		summary: p.summary ?? "",
		type: p.type,
		stage: p.stage ?? "idea",
		category: p.category ?? { id: "", name: "No category yet", slug: "" },
		coverImageUrl: p.coverImageUrl,
		logoUrl: p.logoUrl,
		featured: false,
		builder: {
			displayName: me.profile?.displayName ?? me.name,
			organizationName: me.profile?.organizationName ?? null,
			avatarUrl: me.avatarUrl,
			bio: me.profile?.bio ?? null,
			websiteUrl: me.profile?.websiteUrl ?? null,
			contactEmail: me.profile?.contactEmail ?? null,
			socialLinks: me.profile?.socialLinks ?? [],
			walletAddress: me.profile?.walletAddress ?? null,
			bannerUrl: me.profile?.bannerUrl ?? null,
		},
		fundraisingEnabled: p.fundraisingEnabled,
		funding: p.fundraisingEnabled
			? {
					raised: [],
					contributionCount: 0,
					targetAmount: p.targetAmount,
					targetAsset: p.targetAsset,
					acceptedAssets: p.acceptedAssets,
					endsAt: p.fundingEndsAt,
					ended: false,
				}
			: null,
		publishedAt: p.publishedAt ?? p.updatedAt,
		problem: p.problem ?? "",
		solution: p.solution ?? "",
		beneficiaries: p.beneficiaries ?? "",
		teamMembers: p.teamMembers,
		links: p.links,
		payoutAddress: p.fundraisingEnabled ? p.payoutAddress : null,
		updatedAt: p.updatedAt,
	};
}

export function PreviewView({ id }: { id: string }) {
	const q = useBuilderProject(id);
	const me = useMe();
	if (q.isError)
		return (
			<div className="app-container py-16">
				<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
			</div>
		);
	if (!q.data || !me.data) return <div className="skeleton-shimmer h-[60vh]" aria-hidden />;
	return (
		<>
			<div className="sticky top-16 z-20 border-b border-primary-500/30 bg-primary-500/15 backdrop-blur md:top-[72px]">
				<div className="app-container flex flex-wrap items-center justify-between gap-3 py-2.5">
					<p className="flex items-center gap-2 text-sm">
						<Eye className="size-4 text-primary-300" /> Preview: this is how your project page will look once approved and listed.
					</p>
					<Button asChild size="sm" variant="outline" className="h-9 gap-1.5">
						<Link href={routes.builderProject(id)}>
							<ArrowLeft className="size-4" /> Back
						</Link>
					</Button>
				</div>
			</div>
			<ProjectDetail project={toPublic(q.data, me.data)} preview />
		</>
	);
}
