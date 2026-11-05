"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";
import type { BuilderProjectGroup } from "@repo/domain/project-status";
import { progressPercent } from "@repo/domain/money";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { money, shortKey } from "@/lib/format";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/Avatar";
import { TimeLeft } from "@/components/TimeLeft";
import { EmptyState, ErrorState, Pager, RowsSkeleton, StatusPill } from "@/components/ui";
import { useBuilder, useBuilderProjects } from "@/features/builders/hooks";
import { BuilderActions } from "@/features/builders/components/BuilderActions";
import { ProjectActions } from "@/features/projects/components/ProjectActions";

/**
 * Design "admin developer D2": banner, photo, name, wallet + "Joined April 15th", pill tabs (All / Pending /
 * Completed, same grouping as the builder's own dashboard, D18), "Action" (builder actions), then "Projects (n)":
 * Name, Amount raised, Time left, No of contributors, Action (review actions per project).
 */

const TABS: { id: BuilderProjectGroup; label: string }[] = [
	{ id: "all", label: "All Projects" },
	{ id: "pending", label: "Pending projects" },
	{ id: "completed", label: "Completed projects" },
];

function joined(iso: string) {
	const d = new Date(iso);
	const n = d.getDate();
	const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
	const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : "";
	return `Joined ${d.toLocaleDateString("en-US", { month: "long" })} ${n}${suffix}${year}`;
}

export function BuilderDetailView({ id }: { id: string }) {
	const builder = useBuilder(id);
	const [group, setGroup] = useState<BuilderProjectGroup>("all");
	const [page, setPage] = useState(1);
	const projects = useBuilderProjects(id, group, page);
	const b = builder.data;
	const list = projects.data;

	if (builder.isError)
		return (
			<div className="admin-container pt-6">
				<Back />
				<div className="mt-6">
					{errorStatus(builder.error) === 404 ? (
						<EmptyState
							title="Builder not found"
							action={
								<Link href={routes.builders} className="text-primary-300">
									Back to builders
								</Link>
							}
						/>
					) : (
						<ErrorState
							message={errorMessage(builder.error)}
							onRetry={() => void builder.refetch()}
							retrying={builder.isFetching}
						/>
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
					src="/images/profile-banner.webp"
					alt=""
					data-parallax="0.15"
					className="absolute inset-x-0 -top-6 h-[calc(100%+3rem)] w-full object-cover"
				/>
			</div>

			<div className="admin-container">
				<div className="-mt-11 sm:-mt-14">
					{b ? (
						<Avatar
							name={b.name}
							src={b.avatar_url}
							className="animate-pop size-[88px] text-2xl ring-4 ring-surface-900 sm:size-[104px] sm:text-3xl"
						/>
					) : (
						<span className="skeleton-shimmer block size-[88px] rounded-full ring-4 ring-surface-900 sm:size-[104px]" />
					)}
				</div>
				{b ? (
					<>
						<div className="mt-3 flex flex-wrap items-center gap-3">
							<h1 className="animate-rise font-display text-[26px] leading-tight font-bold md:text-[32px]">{b.name}</h1>
							{b.status === "suspended" && (
								<span className="animate-pop rounded-full bg-error-400/15 px-2.5 py-0.5 text-sm text-error-200">Disabled</span>
							)}
						</div>
						<div className="animate-rise mt-2 flex flex-wrap items-center gap-x-7 gap-y-1 text-base text-white/90 [--i:1] md:ml-2.5">
							{b.wallet_address ? (
								<button
									type="button"
									title={b.wallet_address}
									onClick={async () => {
										try {
											await navigator.clipboard.writeText(b.wallet_address!);
											notify.success("Address copied");
										} catch {
											notify.error("Couldn’t copy");
										}
									}}
									className="group inline-flex items-center gap-2 font-mono text-[15px] hover:text-white"
								>
									{shortKey(b.wallet_address, 6, 4)}
									<Copy className="size-3.5 text-white/45 group-hover:text-primary-300" />
								</button>
							) : (
								<span className="text-white/50">No wallet linked</span>
							)}
							<span>{joined(b.joined_at)}</span>
							<a href={`mailto:${b.email}`} className="text-white/60 hover:text-primary-300">
								{b.email}
							</a>
						</div>
						{b.bio && <p className="mt-3 max-w-[720px] text-[15px] leading-6 text-white/70 md:ml-2.5">{b.bio}</p>}
					</>
				) : (
					<div aria-hidden className="mt-4 flex flex-col gap-2.5">
						<span className="skeleton-shimmer block h-8 w-56 rounded" />
						<span className="skeleton-shimmer block h-4 w-72 rounded" />
					</div>
				)}

				<div className="mt-8 flex flex-col gap-4 md:mt-11 lg:flex-row lg:items-center lg:justify-between">
					<div
						role="tablist"
						aria-label="Filter projects"
						className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0"
					>
						{TABS.map((t) => {
							const active = t.id === group;
							return (
								<button
									key={t.id}
									type="button"
									role="tab"
									aria-selected={active}
									onClick={() => {
										setGroup(t.id);
										setPage(1);
									}}
									className={cn(
										"shrink-0 rounded-lg px-3.5 py-2.5 whitespace-nowrap transition-colors duration-200 md:px-4 md:py-3",
										active ? "bg-[#1A1A22] font-bold md:text-lg" : "text-white/85 hover:bg-white/5",
									)}
								>
									{t.label}
									{list?.counts[t.id] !== undefined && (
										<span className="ml-1.5 text-xs font-normal text-white/45 tabular-nums">{list.counts[t.id]}</span>
									)}
								</button>
							);
						})}
					</div>
					{b && <BuilderActions builder={b} variant="button" showView={false} />}
				</div>

				<section
					data-reveal="up"
					aria-labelledby="builder-projects"
					className={cn(
						"mt-7 overflow-hidden rounded-2xl border border-white/15 transition-opacity md:mt-10",
						projects.isPlaceholderData && "opacity-60",
					)}
				>
					<h2 id="builder-projects" className="px-5 py-5 font-display text-2xl font-bold md:px-7 md:py-6 md:text-[28px]">
						Projects ({list?.meta.total ?? "…"})
					</h2>
					{projects.isPending ? (
						<RowsSkeleton rows={4} cols={5} />
					) : projects.isError && !list ? (
						<div className="p-4">
							<ErrorState message={errorMessage(projects.error)} onRetry={() => void projects.refetch()} />
						</div>
					) : list && list.items.length === 0 ? (
						<EmptyState
							title={group === "all" ? "No submitted projects" : `No ${group} projects`}
							description="Drafts stay private to the builder until they submit."
						/>
					) : list ? (
						<div className="overflow-x-auto">
							<table className="w-full min-w-[760px] table-fixed text-left">
								<thead className="border-t border-white/10 text-base md:text-lg">
									<tr>
										<th scope="col" className="w-[30%] px-5 py-5 font-normal md:px-7">
											Name
										</th>
										<th scope="col" className="w-[24%] px-3 py-5 font-normal">
											Amount raised
										</th>
										<th scope="col" className="w-[16%] px-3 py-5 font-normal">
											Time left
										</th>
										<th scope="col" className="w-[17%] px-3 py-5 text-center font-normal">
											No of contributors
										</th>
										<th scope="col" className="w-[13%] px-3 py-5 text-center font-normal">
											Action
										</th>
									</tr>
								</thead>
								<tbody>
									{list.items.map((p, i) => {
										const pct = progressPercent(p.raised_amount, p.target_amount);
										return (
											<tr
												key={p.id}
												data-reveal="up"
												style={{ "--d": i } as CSSProperties}
												className="border-t border-white/10 transition-colors hover:bg-white/[0.025]"
											>
												<td className="px-5 py-4 md:px-7">
													<div className="flex min-w-0 items-center gap-3.5">
														<Avatar name={p.title} src={p.logo_url} className="size-11 text-xs" />
														<div className="min-w-0">
															<Link href={routes.project(p.id)} className="block truncate hover:text-primary-300">
																{p.title}
															</Link>
															<StatusPill status={p.status} className="text-xs md:text-xs [&>span]:size-2" />
														</div>
													</div>
												</td>
												<td className="px-3">
													{money(p.raised_amount, p.target_asset?.code)}
													{p.target_amount && (
														<span className="text-white/55"> / {money(p.target_amount, p.target_asset?.code)}</span>
													)}
													{pct !== null && (
														<div className="mt-1.5 h-1 max-w-[160px] overflow-hidden rounded-full bg-white/10">
															<div
																className={cn("h-full rounded-full", pct >= 100 ? "bg-success-300" : "bg-primary-500")}
																style={{ width: `${Math.min(pct, 100)}%` }}
															/>
														</div>
													)}
												</td>
												<td className="px-3">
													<TimeLeft endsAt={p.ends_at} />
												</td>
												<td className="px-3 text-center tabular-nums">{p.contributor_count}</td>
												<td className="px-3 text-center">
													<ProjectActions project={p} />
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					) : null}
				</section>
				{list && <Pager page={list.meta.page} pages={list.meta.total_pages} onPage={setPage} />}
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
			<ArrowLeft className="size-4" /> All builders
		</Link>
	);
}
