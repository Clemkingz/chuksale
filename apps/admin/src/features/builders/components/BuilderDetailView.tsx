"use client";

import { type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, AtSign, BadgeCheck, ExternalLink, Globe, Mail, MonitorSmartphone } from "lucide-react";
import { PROJECT_STATUS_LABEL, SOCIAL_PLATFORM_LABEL } from "@repo/domain/labels";
import type { ProjectStatus, UserDetail } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { EXPLORER, fullDate, shortKey, timeAgo } from "@/lib/format";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, RowsSkeleton, StatusPill } from "@/components/ui";
import { useUser } from "@/features/builders/hooks";
import { useAdminProjects } from "@/features/projects/hooks";
import { BuilderActions } from "@/features/builders/components/BuilderActions";
import { ProjectActions } from "@/features/projects/components/ProjectActions";

/**
 * Design "admin developer D2", tailored to `GET /admin/users/{id}`: the builder's banner and picture, name, email,
 * role, status, suspension (reason, by whom, when), "Action"; account activity (email verified, last sign-in,
 * signed-in devices); for builders the public profile (bio, links, socials, verified wallet) and project counts by
 * status, then their submitted projects (`/admin/projects?q=email`; drafts never reach admins).
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
					src={u?.profile?.bannerUrl ?? withBasePath("/images/profile-banner.webp")}
					alt=""
					data-parallax="0.15"
					className="absolute inset-x-0 -top-6 h-[calc(100%+3rem)] w-full object-cover"
				/>
			</div>
			<div className="admin-container">
				<div className="-mt-11 flex flex-col gap-6 sm:-mt-14 lg:flex-row lg:items-end lg:justify-between">
					{u ? (
						<Avatar
							name={u.name}
							src={u.avatarUrl}
							className="animate-pop size-[88px] text-2xl ring-4 ring-surface-900 sm:size-[112px] sm:text-3xl"
						/>
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
								<p className="mt-1 text-xs text-white/45">
									By {u.suspension.suspendedByName ?? "an admin whose account is gone"} · {fullDate(u.suspension.suspendedAt)}
								</p>
							</div>
						)}
						<div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
							{u.profile ? <PublicProfile profile={u.profile} /> : <div className="hidden xl:block" />}
							<AccountFacts user={u} />
						</div>
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
						{u.projects && u.projects.total > 0 && <ProjectCounts counts={u.projects} />}
						{projects.isPending ? (
							<RowsSkeleton rows={4} cols={3} />
						) : projects.isError ? (
							<div className="p-4">
								<ErrorState message={errorMessage(projects.error)} onRetry={() => void projects.refetch()} />
							</div>
						) : mine.length === 0 ? (
							<EmptyState
								title="Nothing submitted yet"
								description="Drafts stay private to the builder until they submit them."
							/>
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

function PublicProfile({ profile: p }: { profile: NonNullable<UserDetail["profile"]> }) {
	const pill = "inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-sm text-white/85 hover:border-primary-400";
	const hasLinks = !!(p.websiteUrl || p.contactEmail || p.socialLinks.length);
	return (
		<section data-reveal="up" aria-labelledby="profile-title" className="admin-card px-5 py-5 md:px-7">
			<h2 id="profile-title" className="font-display text-xl font-bold">
				Public profile
			</h2>
			<p className="mt-1 text-sm text-white/55">
				Shown as <span className="text-white/85">{p.displayName}</span>
				{p.organizationName && <> · {p.organizationName}</>}
			</p>
			{/* Plain text, as the builder wrote it. */}
			<p className={cn("mt-3 leading-7 whitespace-pre-line", !p.bio && "text-white/40")}>{p.bio || "No bio yet."}</p>
			{hasLinks && (
				<ul className="mt-4 flex flex-wrap gap-2">
					{p.websiteUrl && (
						<li>
							<a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className={pill}>
								<Globe className="size-3.5" /> Website
							</a>
						</li>
					)}
					{p.socialLinks.map((s) => (
						<li key={`${s.platform}-${s.url}`}>
							<a href={s.url} target="_blank" rel="noopener noreferrer" className={pill} title={s.url}>
								<AtSign className="size-3.5" /> {SOCIAL_PLATFORM_LABEL[s.platform]}
							</a>
						</li>
					))}
					{p.contactEmail && (
						<li>
							<a href={`mailto:${p.contactEmail}`} className={pill}>
								<Mail className="size-3.5" /> {p.contactEmail}
							</a>
						</li>
					)}
				</ul>
			)}
			<div className="mt-4 rounded-xl bg-white/[0.04] px-4 py-3 text-sm">
				{p.walletAddress ? (
					<p className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<span className="inline-flex items-center gap-1.5 text-success-200">
							<BadgeCheck className="size-4" /> Verified wallet
						</span>
						<a
							href={`${EXPLORER}/account/${p.walletAddress}`}
							target="_blank"
							rel="noopener noreferrer"
							title={p.walletAddress}
							className="inline-flex items-center gap-1 font-mono text-white/85 hover:text-primary-300"
						>
							{shortKey(p.walletAddress, 6, 6)} <ExternalLink className="size-3.5" />
						</a>
						{p.walletVerifiedAt && <span className="text-xs text-white/45">since {fullDate(p.walletVerifiedAt)}</span>}
					</p>
				) : (
					<p className="text-white/50">No verified wallet.</p>
				)}
			</div>
		</section>
	);
}

function AccountFacts({ user: u }: { user: UserDetail }) {
	const rows: [string, React.ReactNode][] = [
		["Joined", fullDate(u.createdAt)],
		["Email verified", u.emailVerifiedAt ? fullDate(u.emailVerifiedAt) : <span className="text-warning-200">Not yet</span>],
		["Last sign-in", u.lastLoginAt ? <span title={fullDate(u.lastLoginAt)}>{timeAgo(u.lastLoginAt)}</span> : "Never"],
		[
			"Signed-in devices",
			<span key="s" className="inline-flex items-center gap-1.5">
				<MonitorSmartphone className="size-4 text-white/50" /> {u.activeSessions}
			</span>,
		],
		["Profile last changed", <span key="c" title={fullDate(u.updatedAt)}>{timeAgo(u.updatedAt)}</span>],
	];
	return (
		<section data-reveal="up" style={{ "--d": 1 } as CSSProperties} aria-labelledby="account-title" className="admin-card px-5 py-5 md:px-7">
			<h2 id="account-title" className="font-display text-xl font-bold">
				Account
			</h2>
			<dl className="mt-3 flex flex-col divide-y divide-white/10">
				{rows.map(([label, value]) => (
					<div key={label} className="flex items-center justify-between gap-4 py-2.5 text-[15px]">
						<dt className="text-white/55">{label}</dt>
						<dd className="text-right">{value}</dd>
					</div>
				))}
			</dl>
		</section>
	);
}

/** All the builder's projects by status, drafts included (the list below only has submitted ones). */
function ProjectCounts({ counts }: { counts: NonNullable<UserDetail["projects"]> }) {
	const entries = Object.entries(counts.byStatus) as [ProjectStatus, number][];
	return (
		<div className="-mt-2 flex flex-wrap gap-2 px-5 pb-5 md:px-7">
			<span className="rounded-full bg-white/[0.08] px-3 py-1 text-sm">{counts.total} in total</span>
			{entries.map(([status, n]) => (
				<span key={status} className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/80">
					{PROJECT_STATUS_LABEL[status]} <span className="text-white/50 tabular-nums">{n}</span>
				</span>
			))}
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
