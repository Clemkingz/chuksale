"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";
import { FaDiscord, FaTelegram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { PROJECT_STAGE_LABEL } from "@repo/domain/labels";
import { progressPercent } from "@repo/domain/money";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { EXPLORER, fullDate, money, shortKey, timeAgo } from "@/lib/format";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { Avatar, WalletDot } from "@/components/Avatar";
import { EmptyState, ErrorState, Pager, RowsSkeleton, StatusPill } from "@/components/ui";
import { useAdminProject, useProjectContributions } from "@/features/projects/hooks";
import { ProjectActions } from "@/features/projects/components/ProjectActions";

/**
 * Design "admin page 4": banner, round logo, name, description, social handles, "Action" (review actions), then
 * "Recent Contributions" (Contributor, Amount, Percentage received, Time) with pages. Admin-only extras the
 * review needs (PRD §8): status, builder and contact, Stellar address, funding, and the review history with
 * internal notes.
 */

const SOCIAL: Record<string, { icon: ReactNode; className: string }> = {
	Twitter: { icon: <FaXTwitter className="size-3.5" />, className: "bg-black text-white ring-1 ring-white/20" },
	Discord: { icon: <FaDiscord className="size-4" />, className: "bg-[#5865F2] text-white" },
	Telegram: { icon: <FaTelegram className="size-4" />, className: "bg-[#2AABEE] text-white" },
	Website: { icon: <Globe className="size-4" />, className: "bg-white/10 text-white" },
};

/** "https://x.com/ether_shitcoin" → "@ether_shitcoin" (design shows handles). */
function handle(label: string, url: string) {
	try {
		const u = new URL(url);
		const last = u.pathname.split("/").filter(Boolean).pop();
		if (label === "Website" || !last) return u.hostname.replace(/^www\./, "");
		return label === "Discord" ? last : `@${last}`;
	} catch {
		return url;
	}
}

export function ProjectDetailView({ id }: { id: string }) {
	const project = useAdminProject(id);
	const [page, setPage] = useState(1);
	const contributions = useProjectContributions(id, page);
	const p = project.data;

	if (project.isError)
		return (
			<div className="admin-container pt-6">
				<BackLink />
				<div className="mt-6">
					{errorStatus(project.error) === 404 ? (
						<EmptyState
							title="Project not found"
							description="It may have been removed, or the link is wrong."
							action={
								<Link href={routes.projects} className="text-primary-300">
									Back to projects
								</Link>
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
			</div>
		);

	const pct = p ? progressPercent(p.raised_amount, p.target_amount) : null;

	return (
		<div>
			<div className="admin-container">
				<BackLink />
			</div>
			<div className="relative mt-3 h-[140px] overflow-hidden sm:h-[200px] lg:mx-8 lg:rounded-2xl xl:h-[250px]">
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
					<div className="min-w-0 flex-1">
						{p ? (
							<Avatar
								name={p.title}
								src={p.logo_url}
								className="animate-pop size-[88px] text-2xl ring-4 ring-surface-900 sm:size-[112px] sm:text-3xl"
							/>
						) : (
							<span className="skeleton-shimmer block size-[88px] rounded-full ring-4 ring-surface-900 sm:size-[112px]" />
						)}
					</div>
					{p && (
						<div className="animate-rise flex shrink-0 flex-col gap-2 [--i:2] lg:items-end">
							<ProjectActions project={p} variant="button" showView={false} />
						</div>
					)}
				</div>

				{p ? (
					<>
						<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
							<h1 className="animate-rise font-display text-[26px] leading-tight font-bold md:text-[32px]">{p.title}</h1>
							<StatusPill status={p.status} className="animate-rise text-sm [--i:1] md:text-[15px]" />
							{p.featured && (
								<span className="rounded-full bg-primary-500/15 px-2.5 py-0.5 text-xs text-primary-200">Featured</span>
							)}
						</div>
						<p className="animate-rise mt-2 max-w-[820px] text-base leading-7 text-white/90 [--i:2]">
							{p.summary || (
								<span className="text-white/45">No description yet. The builder’s submission only included the basics.</span>
							)}
						</p>
						{p.links.length > 0 && (
							<ul className="animate-rise mt-5 flex flex-wrap gap-x-8 gap-y-3 [--i:3]">
								{p.links.map((l) => (
									<li key={l.url}>
										<a
											href={l.url}
											target="_blank"
											rel="noopener noreferrer"
											className="group inline-flex items-center gap-3 text-base text-white/90 hover:text-white"
										>
											<span
												className={cn(
													"flex size-8 items-center justify-center rounded-full",
													SOCIAL[l.label]?.className ?? SOCIAL.Website!.className,
												)}
											>
												{SOCIAL[l.label]?.icon ?? SOCIAL.Website!.icon}
											</span>
											<span className="underline-offset-4 group-hover:underline">{handle(l.label, l.url)}</span>
										</a>
									</li>
								))}
							</ul>
						)}

						<dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
							<Fact i={0} label="Builder" value={p.builder_profile.name} sub={p.contact_email ?? p.builder_profile.email} />
							<Fact
								i={1}
								label="Raised"
								value={money(p.raised_amount, p.target_asset?.code)}
								sub={
									p.target_amount
										? `${pct}% of ${money(p.target_amount, p.target_asset?.code)} · ${p.contributor_count} contributors`
										: `${p.contributor_count} contributors · no target`
								}
								bar={pct}
							/>
							<Fact
								i={2}
								label="Wallet id (destination)"
								value={
									p.destination_address ? (
										<a
											href={`${EXPLORER}/account/${p.destination_address}`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 font-mono text-[15px] hover:text-primary-300"
											title={p.destination_address}
										>
											{shortKey(p.destination_address, 8, 6)} <ExternalLink className="size-3.5" />
										</a>
									) : (
										"—"
									)
								}
								sub={
									[p.category, p.stage && PROJECT_STAGE_LABEL[p.stage]].filter(Boolean).join(" · ") ||
									"Category and stage not set"
								}
							/>
							<Fact
								i={3}
								label="Time added"
								value={p.submitted_at ? timeAgo(p.submitted_at) : "—"}
								sub={p.submitted_at ? fullDate(p.submitted_at) : undefined}
							/>
						</dl>
					</>
				) : (
					<div aria-hidden className="mt-5 flex flex-col gap-3">
						<span className="skeleton-shimmer block h-8 w-72 rounded" />
						<span className="skeleton-shimmer block h-4 w-full max-w-[720px] rounded" />
						<span className="skeleton-shimmer block h-4 w-full max-w-[560px] rounded" />
					</div>
				)}

				<section data-reveal="up" aria-labelledby="contributions-title" className="admin-card mt-10 overflow-hidden md:mt-12">
					<h2 id="contributions-title" className="px-5 py-6 font-display text-2xl font-bold md:px-7 md:text-[28px]">
						Recent Contributions
					</h2>
					{contributions.isPending ? (
						<RowsSkeleton rows={5} cols={4} />
					) : contributions.isError ? (
						<div className="p-4">
							<ErrorState message={errorMessage(contributions.error)} onRetry={() => void contributions.refetch()} />
						</div>
					) : contributions.data.items.length === 0 ? (
						<EmptyState
							title="No contributions yet"
							description={
								p?.status === "approved"
									? "Confirmed contributions appear here."
									: "Contributions open once the project is approved."
							}
						/>
					) : (
						<div className={cn("overflow-x-auto transition-opacity", contributions.isPlaceholderData && "opacity-60")}>
							<table className="w-full min-w-[620px] text-left">
								<thead className="border-t border-white/10 text-base md:text-lg">
									<tr>
										<th scope="col" className="px-5 py-5 font-normal md:px-7">
											Contributor
										</th>
										<th scope="col" className="px-3 py-5 font-normal">
											Amount
										</th>
										<th
											scope="col"
											className="px-3 py-5 font-normal"
											title={
												contributions.data.items[0]?.share_of === "target"
													? "Share of the funding target"
													: "Share of everything raised"
											}
										>
											Percentage received
										</th>
										<th scope="col" className="px-3 py-5 text-right font-normal md:pr-7">
											Time
										</th>
									</tr>
								</thead>
								<tbody>
									{contributions.data.items.map((c, i) => (
										<tr
											key={c.id}
											data-reveal="up"
											style={{ "--d": i } as CSSProperties}
											className="border-t border-white/10 transition-colors hover:bg-white/[0.025]"
										>
											<td className="px-5 py-5 md:px-7">
												<span className="flex items-center gap-3">
													<WalletDot address={c.sender_address} className="size-7 ring-0" />
													<a
														href={`${EXPLORER}/tx/${c.tx_hash}`}
														target="_blank"
														rel="noopener noreferrer"
														title={`${c.sender_address} · view transaction`}
														className="font-mono text-[15px] hover:text-primary-300"
													>
														{shortKey(c.sender_address, 10, 8)}
													</a>
												</span>
											</td>
											<td className="px-3 text-base">{money(c.amount, c.asset_code)}</td>
											<td className="px-3 text-base tabular-nums">{c.share_percent === null ? "—" : `${c.share_percent}%`}</td>
											<td className="px-3 text-right text-base md:pr-7" title={fullDate(c.confirmed_at)}>
												{timeAgo(c.confirmed_at)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</section>
				{contributions.data && (
					<Pager page={contributions.data.meta.page} pages={contributions.data.meta.total_pages} onPage={setPage} />
				)}

				{p && p.reviews.length > 0 && (
					<section data-reveal="up" aria-labelledby="history-title" className="mt-10">
						<h2 id="history-title" className="font-display text-xl font-bold">
							Review history
						</h2>
						<ol className="mt-4 flex flex-col gap-3">
							{p.reviews.map((r) => (
								<li key={r.id} className="rounded-xl border border-white/10 px-5 py-4">
									<p className="text-sm text-white/60">
										<span className="text-white">{r.admin_name}</span> · {r.decision.replace("_", " ")} · {timeAgo(r.created_at)}
									</p>
									{r.reason && <p className="mt-1.5 text-[15px] leading-6">Builder sees: “{r.reason}”</p>}
									{r.internal_note && <p className="mt-1 text-sm leading-6 text-white/55">Internal: {r.internal_note}</p>}
								</li>
							))}
						</ol>
					</section>
				)}
			</div>
		</div>
	);
}

function BackLink() {
	return (
		<Link
			href={routes.projects}
			className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/5 hover:text-white"
		>
			<ArrowLeft className="size-4" /> All projects
		</Link>
	);
}

function Fact({ i, label, value, sub, bar }: { i: number; label: string; value: ReactNode; sub?: string; bar?: number | null }) {
	return (
		<div data-reveal="up" style={{ "--d": i } as CSSProperties} className="bg-surface-900 px-5 py-4">
			<dt className="text-sm text-white/55">{label}</dt>
			<dd className="mt-1 truncate text-lg">{value}</dd>
			{bar !== undefined && bar !== null && (
				<div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
					<div
						className={cn("h-full rounded-full", bar >= 100 ? "bg-success-300" : "bg-primary-500")}
						style={{ width: `${Math.min(bar, 100)}%` }}
					/>
				</div>
			)}
			{sub && <p className="mt-1.5 truncate text-sm text-white/55">{sub}</p>}
		</div>
	);
}
