"use client";

import { type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { fullDate, timeAgo } from "@/lib/format";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, RowsSkeleton, StatusPill } from "@/components/ui";
import { useUser } from "@/features/builders/hooks";
import { useAdminProjects } from "@/features/projects/hooks";
import { BuilderActions } from "@/features/builders/components/BuilderActions";
import { ProjectActions } from "@/features/projects/components/ProjectActions";

/**
 * Design "admin developer D2", tailored to `GET /admin/users/{id}`: banner, initials, name, email, role, joined,
 * suspension (reason, by whom, when), "Action", then the builder's submitted projects (`/admin/projects?q=email`;
 * drafts never reach admins).
 */
export function BuilderDetailView({ id }: { id: string }) {
	const user = useUser(id);
	const u = user.data;
	const projects = useAdminProjects({
		status: "",
		q: u?.role === "builder" ? u.email : "",
		categoryId: "",
		published: "",
		featured: "",
		sort: "recently_updated",
		page: 1,
	});
	const mine = u ? (projects.data?.result.filter((p) => p.owner.id === u.id) ?? []) : [];

	if (user.isError)
		return (
			<div className="admin-container pt-6">
				<Back />
				<div className="mt-6">
					{errorStatus(user.error) === 404 ? (
						<EmptyState
							title="Account not found"
							action={
								<Link href={routes.builders} className="text-primary-300">
									Back to users
								</Link>
							}
						/>
					) : (
						<ErrorState message={errorMessage(user.error)} onRetry={() => void user.refetch()} retrying={user.isFetching} />
					)}
				</div>
			</div>
		);

	return (
		<div>
			<div className="admin-container">
				<Back />
			</div>
			<div className="relative mt-3 h-[130px] overflow-hidden sm:h-[190px] lg:mx-8 lg:rounded-2xl xl:h-[230px]">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={withBasePath("/images/profile-banner.webp")}
					alt=""
					data-parallax="0.15"
					className="absolute inset-x-0 -top-6 h-[calc(100%+3rem)] w-full object-cover"
				/>
			</div>
			<div className="admin-container">
				<div className="-mt-11 flex flex-col gap-6 sm:-mt-14 lg:flex-row lg:items-end lg:justify-between">
					{u ? (
						<Avatar name={u.name} className="animate-pop size-[88px] text-2xl ring-4 ring-surface-900 sm:size-[112px] sm:text-3xl" />
					) : (
						<span className="skeleton-shimmer block size-[88px] rounded-full ring-4 ring-surface-900 sm:size-[112px]" />
					)}
					{u && <BuilderActions builder={u} variant="button" showView={false} />}
				</div>
				{u ? (
					<>
						<div className="mt-4 flex flex-wrap items-center gap-3">
							<h1 className="animate-rise font-display text-[26px] font-bold md:text-[32px]">{u.name}</h1>
							<span className="rounded-full bg-white/[0.07] px-2.5 py-0.5 text-xs capitalize">{u.role}</span>
							{u.suspended ? (
								<span className="rounded-full bg-error-400/15 px-2.5 py-0.5 text-xs text-error-200">Suspended</span>
							) : (
								<span className="rounded-full bg-success-400/10 px-2.5 py-0.5 text-xs text-success-200">Active</span>
							)}
							{!u.emailVerified && <span className="text-xs text-warning-200">Email not verified</span>}
						</div>
						<p className="animate-rise mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-white/80 [--i:1]">
							<a href={`mailto:${u.email}`} className="inline-flex items-center gap-1.5 hover:text-primary-300">
								<Mail className="size-4" /> {u.email}
							</a>
							<span title={fullDate(u.createdAt)}>Joined {timeAgo(u.createdAt)}</span>
						</p>
						{u.suspension && (
							<div role="note" className="animate-pop mt-5 rounded-2xl border border-error-400/30 bg-error-400/[0.06] px-5 py-4">
								<p className="text-sm font-medium text-error-200">Suspended {timeAgo(u.suspension.suspendedAt)}</p>
								<p className="mt-1 leading-7 whitespace-pre-line text-white/85">{u.suspension.reason}</p>
								<p className="mt-1 text-xs text-white/45">By admin {u.suspension.suspendedBy}</p>
							</div>
						)}
					</>
				) : (
					<div aria-hidden className="mt-5 flex flex-col gap-3">
						<span className="skeleton-shimmer block h-8 w-60 rounded" />
						<span className="skeleton-shimmer block h-4 w-72 rounded" />
					</div>
				)}

				{u?.role === "builder" && (
					<section data-reveal="up" aria-labelledby="projects-title" className="admin-card mt-10 overflow-hidden">
						<h2 id="projects-title" className="px-5 py-6 font-display text-2xl font-bold md:px-7">
							Submitted projects {projects.data && <span className="text-lg font-normal text-white/45">({mine.length})</span>}
						</h2>
						{projects.isPending ? (
							<RowsSkeleton rows={4} cols={3} />
						) : projects.isError ? (
							<div className="p-4">
								<ErrorState message={errorMessage(projects.error)} onRetry={() => void projects.refetch()} />
							</div>
						) : mine.length === 0 ? (
							<EmptyState title="Nothing submitted yet" description="Drafts stay private to the builder until they submit them." />
						) : (
							<ul>
								{mine.map((p, i) => (
									<li
										key={p.id}
										data-reveal="up"
										style={{ "--d": i } as CSSProperties}
										className={cn("flex items-center gap-4 border-t border-white/10 px-5 py-4 md:px-7")}
									>
										<Avatar name={p.title} className="size-10 text-xs" />
										<div className="min-w-0 flex-1">
											<Link href={routes.project(p.id)} className="block truncate hover:text-primary-300">
												{p.title}
											</Link>
											<p className="text-xs text-white/50">
												{p.category?.name ?? "No category"} · updated {timeAgo(p.updatedAt)}
											</p>
										</div>
										<StatusPill status={p.status} className="hidden sm:inline-flex" />
										<ProjectActions project={p} />
									</li>
								))}
							</ul>
						)}
					</section>
				)}
			</div>
		</div>
	);
}

function Back() {
	return (
		<Link
			href={routes.builders}
			className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/5 hover:text-white"
		>
			<ArrowLeft className="size-4" /> All users
		</Link>
	);
}
