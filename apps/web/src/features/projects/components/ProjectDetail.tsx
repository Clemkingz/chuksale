"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink, Flag, Globe, HandCoins, Lightbulb, Share2, ShieldCheck, Users } from "lucide-react";
import { FaDiscord, FaTelegram } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { PROJECT_STAGE_LABEL, SUGGESTION_TYPE_LABEL } from "@repo/domain/labels";
import { formatAmount, progressPercent } from "@repo/domain/money";
import type { PublicProject } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { explorer, shortKey } from "@/lib/stellar/config";
import { timeAgo } from "@/lib/time";
import { notify } from "@/lib/use-toast";
import { AddressChip } from "@/components/AddressChip";
import { Pager } from "@/components/Pager";
import { ProjectLogo } from "@/components/ProjectLogo";
import { Progress } from "@/components/Progress";
import { EmptyState, ErrorState } from "@/components/States";
import { TimeLeft } from "@/features/builder-projects/components/TimeLeft";
import { useProjectContributions, useProjectSuggestions, useProjectUpdates } from "@/features/projects/hooks";
import { ReportDialog } from "@/features/suggestions/components/ReportDialog";
import { preloadWallets } from "@/features/wallet/kit";

/**
 * Project details (PRD §6.3 step 4): header, story, team and links, a funding panel (confirmed amounts only, a
 * sticky Contribute bar on phones), and tabs for contributions, suggestions and updates. The builder's
 * Preview renders this same component with `preview` (nothing to fetch, buttons disabled).
 */

const LINK_ICON: Record<string, ReactNode> = {
	Twitter: <FaXTwitter className="size-4" />,
	Discord: <FaDiscord className="size-4" />,
	Telegram: <FaTelegram className="size-4" />,
	Website: <Globe className="size-4" />,
};

const d = (i: number) => ({ "--d": i }) as CSSProperties;

export function ProjectDetail({ project: p, preview = false }: { project: PublicProject; preview?: boolean }) {
	const code = p.target_asset?.code ?? "XLM";
	const pct = progressPercent(p.raised_amount, p.target_amount);
	const open = p.fundraising && !!p.destination_address;

	async function share() {
		const url = window.location.href;
		try {
			if (navigator.share) await navigator.share({ title: p.title, text: p.summary, url });
			else {
				await navigator.clipboard.writeText(url);
				notify.success("Link copied");
			}
		} catch {
			// Closing the share sheet isn't an error.
		}
	}

	const contributeHref = routes.contribute(p.slug);

	return (
		<div className="pb-28 lg:pb-16">
			<div className="relative h-[140px] overflow-hidden sm:h-[200px] md:h-[240px]">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={p.cover_image_url ?? withBasePath("/images/profile-banner.webp")}
					alt=""
					data-parallax="0.2"
					className="absolute inset-x-0 -top-8 h-[calc(100%+4rem)] w-full object-cover"
				/>
				<div aria-hidden className="absolute inset-0 bg-gradient-to-t from-surface-900/80 to-transparent" />
			</div>

			<div className="app-container">
				<div className="-mt-12 flex items-end justify-between gap-4 sm:-mt-14">
					<ProjectLogo
						title={p.title}
						src={p.logo_url}
						className="animate-pop size-24 text-2xl ring-4 ring-surface-900 sm:size-28 sm:text-3xl"
					/>
					{!preview && (
						<div className="flex gap-2">
							<Button variant="outline" size="sm" className="h-10 gap-2" onClick={share}>
								<Share2 className="size-4" /> Share
							</Button>
						</div>
					)}
				</div>

				{!preview && (
					<Link href={routes.projects} className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
						<ArrowLeft className="size-4" /> All projects
					</Link>
				)}

				<div className="mt-3 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
					<div className="min-w-0">
						<div className="flex flex-wrap gap-2 text-xs">
							{p.category && <span className="rounded-full bg-primary-500/15 px-3 py-1 text-primary-200">{p.category.name}</span>}
							{p.stage && (
								<span className="rounded-full bg-white/[0.07] px-3 py-1 text-white/80">{PROJECT_STAGE_LABEL[p.stage]}</span>
							)}
							<span className="rounded-full bg-white/[0.07] px-3 py-1 text-white/80">
								{p.project_type === "existing_project" ? "Existing project" : "New idea"}
							</span>
							{p.featured && <span className="rounded-full bg-warning-400/15 px-3 py-1 text-warning-100">Featured</span>}
						</div>
						<h1 className="animate-rise mt-3 font-display text-[30px] leading-tight font-bold md:text-[40px]">{p.title}</h1>
						<p className="animate-rise mt-1.5 text-white/60 [--i:1]">
							by <span className="text-white/85">{p.owner.organization_name ?? p.owner.display_name}</span>
							{p.owner.organization_name && <span> · {p.owner.display_name}</span>}
						</p>
						<p className="animate-rise mt-5 text-lg leading-8 text-white/90 [--i:2]">{p.summary || "No summary yet."}</p>

						{p.links.length > 0 && (
							<ul className="mt-5 flex flex-wrap gap-2">
								{p.links.map((l) => (
									<li key={l.url}>
										<a
											href={l.url}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-3.5 text-sm text-white/85 transition-colors hover:border-primary-400 hover:text-white"
										>
											{LINK_ICON[l.label] ?? <Globe className="size-4" />} {l.label}
										</a>
									</li>
								))}
							</ul>
						)}

						<div className="mt-10 flex flex-col gap-8">
							{[
								{ title: "The problem", body: p.problem },
								{ title: "The solution", body: p.solution },
								{ title: "Who it helps", body: p.beneficiaries },
							]
								.filter((s) => s.body)
								.map((s, i) => (
									<section key={s.title} data-reveal="up" style={d(i)}>
										<h2 className="font-display text-xl font-bold">{s.title}</h2>
										<p className="mt-2 leading-7 whitespace-pre-line text-white/80">{s.body}</p>
									</section>
								))}
							{p.team.length > 0 && (
								<section data-reveal="up">
									<h2 className="font-display text-xl font-bold">Team</h2>
									<ul className="mt-3 grid gap-3 sm:grid-cols-2">
										{p.team.map((m) => (
											<li key={m.name} className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3">
												<ProjectLogo title={m.name} src={null} className="size-10 text-xs" />
												<div className="min-w-0">
													<p className="truncate">{m.name}</p>
													<p className="text-sm text-white/55">{m.role}</p>
												</div>
											</li>
										))}
									</ul>
								</section>
							)}
						</div>

						<div className="mt-12">{preview ? <PreviewTabs /> : <ProjectTabs slug={p.slug} />}</div>
					</div>

					<aside className="lg:sticky lg:top-28 lg:self-start">
						<section
							aria-labelledby="funding-title"
							className="animate-rise rounded-2xl border border-white/10 bg-[#11121A] p-5 [--i:2] md:p-6"
						>
							<h2 id="funding-title" className="sr-only">
								Funding
							</h2>
							<p className="text-sm text-white/55">Raised (confirmed)</p>
							<p className="mt-1 font-display text-[32px] leading-none font-bold">
								{formatAmount(p.raised_amount)} <span className="text-lg font-normal text-white/70">{code}</span>
							</p>
							{p.target_amount ? (
								<>
									<p className="mt-2 text-sm text-white/60">
										of {formatAmount(p.target_amount)} {code} target · <span className="tabular-nums">{pct}%</span>
									</p>
									<Progress percent={pct} className="mt-3 h-2" />
								</>
							) : (
								<p className="mt-2 text-sm text-white/55">No target set</p>
							)}
							<dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
								<div className="rounded-xl bg-white/[0.04] px-3.5 py-3">
									<dt className="flex items-center gap-1.5 text-white/55">
										<Users className="size-3.5" aria-hidden /> Contributors
									</dt>
									<dd className="mt-1 font-display text-lg font-bold">{p.contributor_count}</dd>
								</div>
								<div className="rounded-xl bg-white/[0.04] px-3.5 py-3">
									<dt className="flex items-center gap-1.5 text-white/55">
										<Clock className="size-3.5" aria-hidden /> Time left
									</dt>
									<dd className="mt-1 font-display text-lg font-bold">
										<TimeLeft endsAt={p.ends_at} />
									</dd>
								</div>
							</dl>
							{p.destination_address && (
								<div className="mt-4 rounded-xl border border-white/10 px-3.5 py-3 text-sm">
									<p className="text-white/55">Project wallet (receives contributions)</p>
									<AddressChip value={p.destination_address} className="mt-1 text-white/90" />
								</div>
							)}
							<div className="mt-5 hidden flex-col gap-2.5 lg:flex">
								<ContributeButton href={contributeHref} open={open} preview={preview} />
								<Button asChild={!preview} variant="outline" className="h-12 gap-2 text-base" disabled={preview}>
									{preview ? (
										<span>
											<Lightbulb className="size-4" /> Suggest an improvement
										</span>
									) : (
										<Link href={routes.suggest(p.slug)}>
											<Lightbulb className="size-4" /> Suggest an improvement
										</Link>
									)}
								</Button>
							</div>
							<p className="mt-4 flex gap-2 text-xs leading-5 text-white/55">
								<ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary-300" aria-hidden />
								<span>
									Contributions go straight from your wallet to the project. Chucksales never holds funds, and payments can’t be
									refunded. Approval isn’t a guarantee of success.{" "}
									<Link href={routes.risk} className="text-primary-300 hover:underline">
										Risk disclosure
									</Link>
								</span>
							</p>
						</section>
					</aside>
				</div>
			</div>

			{/* Phones: the Contribute action stays in reach. */}
			<div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-surface-900/95 px-4 py-3 backdrop-blur lg:hidden">
				<div className="mx-auto flex max-w-[640px] items-center gap-3">
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium">
							{formatAmount(p.raised_amount)} {code}
							{p.target_amount && <span className="text-white/55"> of {formatAmount(p.target_amount)}</span>}
						</p>
						<Progress percent={pct} className="mt-1.5" />
					</div>
					{!preview && (
						<Button asChild variant="outline" size="icon" className="size-12 shrink-0" aria-label="Suggest an improvement">
							<Link href={routes.suggest(p.slug)}>
								<Lightbulb className="size-5" />
							</Link>
						</Button>
					)}
					<ContributeButton href={contributeHref} open={open} preview={preview} compact />
				</div>
			</div>
		</div>
	);
}

function ContributeButton({
	href,
	open,
	preview,
	compact,
}: {
	href: string;
	open: boolean;
	preview: boolean;
	compact?: boolean;
}) {
	if (!open || preview)
		return (
			<Button disabled className={cn("h-12 gap-2 text-base", compact && "w-auto shrink-0 px-5")}>
				<HandCoins className="size-4" /> {preview ? "Contribute" : "Not accepting contributions"}
			</Button>
		);
	return (
		<Button asChild className={cn("h-12 gap-2 text-base", compact && "w-auto shrink-0 px-5")}>
			<Link href={href} onMouseEnter={preloadWallets} onFocus={preloadWallets}>
				<HandCoins className="size-4" /> Contribute
			</Link>
		</Button>
	);
}

type Tab = "contributions" | "suggestions" | "updates";

function TabBar({ tab, onTab, counts }: { tab: Tab; onTab: (t: Tab) => void; counts?: Partial<Record<Tab, number>> }) {
	return (
		<div role="tablist" aria-label="Project activity" className="flex gap-1 border-b border-white/10">
			{(["contributions", "suggestions", "updates"] as Tab[]).map((t) => (
				<button
					key={t}
					type="button"
					role="tab"
					aria-selected={tab === t}
					onClick={() => onTab(t)}
					className={cn(
						"relative px-3 pb-3 text-base capitalize transition-colors md:px-4 md:text-lg",
						tab === t ? "font-bold text-white" : "text-white/55 hover:text-white",
					)}
				>
					{t}
					{counts?.[t] !== undefined && (
						<span className="ml-1.5 text-xs font-normal text-white/45 tabular-nums">{counts[t]}</span>
					)}
					<span
						aria-hidden
						className={cn(
							"absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-500 transition-transform duration-300",
							tab === t ? "scale-x-100" : "scale-x-0",
						)}
					/>
				</button>
			))}
		</div>
	);
}

function PreviewTabs() {
	return (
		<>
			<TabBar tab="contributions" onTab={() => undefined} />
			<p className="mt-6 rounded-xl border border-dashed border-white/15 px-5 py-8 text-center text-sm text-white/55">
				Contributions, suggestions and updates appear here once the project is approved.
			</p>
		</>
	);
}

function ProjectTabs({ slug }: { slug: string }) {
	const [tab, setTab] = useState<Tab>("contributions");
	const [page, setPage] = useState(1);
	const contributions = useProjectContributions(slug, page);
	const suggestions = useProjectSuggestions(slug);
	const updates = useProjectUpdates(slug);
	const [reporting, setReporting] = useState<string | null>(null);

	return (
		<>
			<TabBar
				tab={tab}
				onTab={setTab}
				counts={{
					contributions: contributions.data?.meta.total,
					suggestions: suggestions.data?.meta.total,
					updates: updates.data?.length,
				}}
			/>
			<div role="tabpanel" className="mt-6">
				{tab === "contributions" &&
					(contributions.isPending ? (
						<ListSkeleton />
					) : contributions.isError ? (
						<ErrorState message={errorMessage(contributions.error)} onRetry={() => void contributions.refetch()} />
					) : contributions.data.items.length === 0 ? (
						<EmptyState title="No contributions yet" description="Be the first to support this project." />
					) : (
						<>
							<ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
								{contributions.data.items.map((c, i) => (
									<li
										key={c.id}
										data-reveal="up"
										style={d(i)}
										className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5"
									>
										<div className="min-w-0">
											<AddressChip
												value={c.sender_address}
												head={5}
												tail={5}
												explorerLink={false}
												className="text-sm text-white/85"
											/>
											<p className="text-xs text-white/45">{timeAgo(c.confirmed_at)}</p>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-medium whitespace-nowrap">
												{formatAmount(c.amount)} {c.asset_id === "usdc" ? "USDC" : "XLM"}
											</span>
											<a
												href={explorer.tx(c.tx_hash)}
												target="_blank"
												rel="noopener noreferrer"
												aria-label="View transaction on Stellar Expert"
												className="flex size-8 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
											>
												<ExternalLink className="size-4" />
											</a>
										</div>
									</li>
								))}
							</ul>
							<Pager
								page={contributions.data.meta.page}
								pages={contributions.data.meta.total_pages}
								onPage={setPage}
								className="mt-5"
							/>
						</>
					))}

				{tab === "suggestions" &&
					(suggestions.isPending ? (
						<ListSkeleton />
					) : suggestions.isError ? (
						<ErrorState message={errorMessage(suggestions.error)} onRetry={() => void suggestions.refetch()} />
					) : suggestions.data.items.length === 0 ? (
						<EmptyState
							title="No public suggestions yet"
							description="Suggestions appear here after a moderator approves them."
							action={
								<Button asChild variant="outline">
									<Link href={routes.suggest(slug)}>Suggest an improvement</Link>
								</Button>
							}
						/>
					) : (
						<ul className="flex flex-col gap-4">
							{suggestions.data.items.map((s, i) => (
								<li key={s.id} data-reveal="up" style={d(i)} className="rounded-2xl border border-white/10 px-5 py-4">
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<span className="rounded-full bg-primary-500/15 px-2.5 py-0.5 text-xs text-primary-200">
												{SUGGESTION_TYPE_LABEL[s.type]}
											</span>
											{/* Plain text only: user content is never rendered as HTML. */}
											<h3 className="mt-2 font-display text-lg font-bold break-words">{s.title}</h3>
										</div>
										<button
											type="button"
											onClick={() => setReporting(s.id)}
											className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-white/50 hover:bg-white/5 hover:text-white"
											aria-label={`Report “${s.title}”`}
										>
											<Flag className="size-3.5" /> Report
										</button>
									</div>
									<p className="mt-2 leading-7 break-words whitespace-pre-line text-white/80">{s.body}</p>
									{s.link && (
										<a
											href={s.link}
											target="_blank"
											rel="noopener noreferrer nofollow ugc"
											className="mt-2 inline-flex items-center gap-1 text-sm break-all text-primary-300 hover:underline"
										>
											{s.link} <ExternalLink className="size-3.5 shrink-0" />
										</a>
									)}
									<p className="mt-3 text-xs text-white/45">
										{shortKey(s.wallet_address, 5, 5)} · {timeAgo(s.created_at)}
									</p>
								</li>
							))}
						</ul>
					))}

				{tab === "updates" &&
					(updates.isPending ? (
						<ListSkeleton />
					) : updates.isError ? (
						<ErrorState message={errorMessage(updates.error)} onRetry={() => void updates.refetch()} />
					) : updates.data.length === 0 ? (
						<EmptyState title="No updates yet" description="The builder hasn’t posted a progress update." />
					) : (
						<ol className="flex flex-col gap-4">
							{updates.data.map((u) => (
								<li key={u.id} className="rounded-2xl border border-white/10 px-5 py-4">
									<h3 className="font-display text-lg font-bold">{u.title}</h3>
									<p className="mt-1 text-xs text-white/45">{timeAgo(u.created_at)}</p>
									<p className="mt-2 leading-7 whitespace-pre-line text-white/80">{u.body}</p>
								</li>
							))}
						</ol>
					))}
			</div>
			{reporting && <ReportDialog suggestionId={reporting} onClose={() => setReporting(null)} />}
		</>
	);
}

function ListSkeleton() {
	return (
		<div aria-hidden className="flex flex-col gap-3">
			{Array.from({ length: 4 }, (_, i) => (
				<span key={i} className="skeleton-shimmer block h-14 rounded-xl" />
			))}
		</div>
	);
}
