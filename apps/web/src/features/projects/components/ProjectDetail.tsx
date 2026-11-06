"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
	BadgeCheck,
	ExternalLink,
	Flag,
	Globe,
	HandCoins,
	ImageOff,
	Lightbulb,
	Megaphone,
	Share2,
	ShieldCheck,
	Users,
} from "lucide-react";
import { PROJECT_STAGE_LABEL, PROJECT_TYPE_LABEL, SUGGESTION_TYPE_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import type { PublicProject, PublicProjectUpdate } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { withBasePath } from "@/lib/site";
import { timeAgo } from "@/lib/time";
import { notify } from "@/lib/use-toast";
import { AddressChip } from "@/components/AddressChip";
import { BackLink } from "@/components/BackLink";
import { FundingDeadline } from "@/components/FundingDeadline";
import { SocialLinks } from "@/components/SocialLinks";
import { Pager } from "@/components/Pager";
import { ProjectLogo } from "@/components/ProjectLogo";
import { Progress } from "@/components/Progress";
import { EmptyState, ErrorState } from "@/components/States";
import { fundingProgress, raisedIn } from "@/features/projects/funding";
import {
	PROJECT_CONTRIBUTIONS_PAGE,
	useProjectContributions,
	useProjectSuggestions,
	useProjectUpdates,
} from "@/features/projects/hooks";
import { ReportDialog, type ReportTarget } from "@/features/suggestions/components/ReportDialog";
import { preloadWallets } from "@/features/wallet/kit";

/**
 * Project details (`GET /projects/{slug}`): header, story, team, links and the builder's public profile, a funding
 * panel (confirmed totals per asset, the deadline; a sticky Contribute bar on phones), and tabs for the builder's
 * updates, contributions and suggestions.
 * The builder's Preview renders this same component with `preview` (nothing to fetch, buttons disabled).
 */

const d = (i: number) => ({ "--d": i }) as CSSProperties;

export function ProjectDetail({
	project: p,
	preview = false,
	partial = false,
}: {
	project: PublicProject;
	preview?: boolean;
	/** Only the card's fields so far (opened from a card); the story and builder fill in when the page lands. */
	partial?: boolean;
}) {
	const f = p.funding;
	const code = f?.targetAsset?.code ?? f?.acceptedAssets[0]?.code ?? "XLM";
	const pct = fundingProgress(f);
	const mainRaised = raisedIn(f, f?.targetAsset?.id ?? f?.acceptedAssets[0]?.id);
	const otherRaised = (f?.raised ?? []).filter(
		(r) => r.asset.id !== (f?.targetAsset?.id ?? f?.acceptedAssets[0]?.id) && r.amount !== "0",
	);
	const ended = !!f?.ended;
	const open = p.fundraisingEnabled && !!f && f.acceptedAssets.length > 0 && !ended;
	const builderName = p.builder.organizationName ?? p.builder.displayName ?? "A Chucksales builder";
	const [reporting, setReporting] = useState<ReportTarget | null>(null);

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
					src={p.coverImageUrl ?? withBasePath("/images/profile-banner.webp")}
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
						src={p.logoUrl}
						className="animate-pop size-24 text-2xl ring-4 ring-surface-900 sm:size-28 sm:text-3xl"
					/>
					{!preview && (
						<div className="flex gap-2">
							<Button variant="outline" size="sm" className="h-10 w-auto gap-2" onClick={share}>
								<Share2 className="size-4" /> Share
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="h-10 w-auto gap-2 text-white/70"
								onClick={() => setReporting({ kind: "project", slug: p.slug })}
							>
								<Flag className="size-4" /> Report
							</Button>
						</div>
					)}
				</div>

				{!preview && <BackLink href={routes.projects} label="All projects" className="mt-3" />}

				<div className="mt-3 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
					<div className="min-w-0">
						<div className="flex flex-wrap gap-2 text-xs">
							{p.category && <span className="rounded-full bg-primary-500/15 px-3 py-1 text-primary-200">{p.category.name}</span>}
							{p.stage && (
								<span className="rounded-full bg-white/[0.07] px-3 py-1 text-white/80">{PROJECT_STAGE_LABEL[p.stage]}</span>
							)}
							<span className="rounded-full bg-white/[0.07] px-3 py-1 text-white/80">{PROJECT_TYPE_LABEL[p.type]}</span>
							{p.featured && <span className="rounded-full bg-warning-400/15 px-3 py-1 text-warning-100">Featured</span>}
						</div>
						<h1 className="animate-rise mt-3 font-display text-[30px] leading-tight font-bold md:text-[40px]">{p.title}</h1>
						<p className="animate-rise mt-2 flex items-center gap-2 text-white/60 [--i:1]">
							<ProjectLogo title={builderName} src={p.builder.avatarUrl} className="size-7 text-[10px]" />
							<span>
								by <span className="text-white/85">{builderName}</span>
								{p.builder.organizationName && p.builder.displayName && <span> · {p.builder.displayName}</span>}
							</span>
						</p>
						<p className="animate-rise mt-5 text-lg leading-8 text-white/90 [--i:2]">{p.summary || "No summary yet."}</p>

						{p.links.length > 0 && (
							<ul className="mt-5 flex flex-wrap gap-2">
								{p.links.map((l) => (
									<li key={`${l.label}-${l.url}`}>
										<a
											href={l.url}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex h-9 items-center gap-2 rounded-full border border-white/15 px-3.5 text-sm text-white/85 transition-colors hover:border-primary-400 hover:text-white"
										>
											<Globe className="size-4" /> {l.label}
										</a>
									</li>
								))}
							</ul>
						)}

						<div className="mt-10 flex flex-col gap-8">
							{partial && (
								<div aria-hidden className="flex flex-col gap-3">
									<span className="skeleton-shimmer block h-6 w-40 rounded" />
									<span className="skeleton-shimmer block h-4 w-full rounded" />
									<span className="skeleton-shimmer block h-4 w-11/12 rounded" />
									<span className="skeleton-shimmer block h-4 w-4/5 rounded" />
									<span className="skeleton-shimmer mt-5 block h-6 w-36 rounded" />
									<span className="skeleton-shimmer block h-4 w-full rounded" />
									<span className="skeleton-shimmer block h-4 w-3/4 rounded" />
								</div>
							)}
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
							{p.teamMembers.length > 0 && (
								<section data-reveal="up">
									<h2 className="font-display text-xl font-bold">Team</h2>
									<ul className="mt-3 grid gap-3 sm:grid-cols-2">
										{p.teamMembers.map((m, i) => (
											<li key={`${m.name}-${i}`} className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3">
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
							<BuilderCard builder={p.builder} name={builderName} />
						</div>

						<div className="mt-12">
							{preview ? (
								<PreviewTabs />
							) : (
								<ProjectTabs slug={p.slug} onReport={(id) => setReporting({ kind: "suggestion", id })} />
							)}
						</div>
					</div>

					<aside className="lg:sticky lg:top-28 lg:self-start">
						<section
							aria-labelledby="funding-title"
							className="animate-rise rounded-2xl border border-white/10 bg-[#11121A] p-5 [--i:2] md:p-6"
						>
							<h2 id="funding-title" className="sr-only">
								Funding
							</h2>
							{!f ? (
								<>
									<p className="text-sm text-white/55">Fundraising</p>
									<p className="mt-1 text-white/80">This project isn’t raising funds. You can still suggest improvements.</p>
								</>
							) : (
								<>
									<p className="text-sm text-white/55">Raised (confirmed)</p>
									<p className="mt-1 font-display text-[32px] leading-none font-bold">
										{formatAmount(mainRaised)} <span className="text-lg font-normal text-white/70">{code}</span>
									</p>
									{otherRaised.map((r) => (
										<p key={r.asset.id} className="mt-1 text-white/80">
											+ {formatAmount(r.amount)} {r.asset.code}
										</p>
									))}
									{f.targetAmount ? (
										<>
											<p className="mt-2 text-sm text-white/60">
												of {formatAmount(f.targetAmount)} {f.targetAsset?.code ?? code} target ·{" "}
												<span className="tabular-nums">{pct}%</span>
											</p>
											<Progress percent={pct} className="mt-3 h-2" />
										</>
									) : (
										<p className="mt-2 text-sm text-white/55">No target set</p>
									)}
									<FundingDeadline funding={f} variant="detail" className="mt-4" />
									<dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
										<div className="rounded-xl bg-white/[0.04] px-3.5 py-3">
											<dt className="flex items-center gap-1.5 text-white/55">
												<Users className="size-3.5" aria-hidden /> Contributions
											</dt>
											<dd className="mt-1 font-display text-lg font-bold">{f.contributionCount}</dd>
										</div>
										<div className="rounded-xl bg-white/[0.04] px-3.5 py-3">
											<dt className="text-white/55">Accepts</dt>
											<dd className="mt-1 font-display text-lg font-bold">{f.acceptedAssets.map((a) => a.code).join(" · ")}</dd>
										</div>
									</dl>
								</>
							)}
							{p.payoutAddress && (
								<div className="mt-4 rounded-xl border border-white/10 px-3.5 py-3 text-sm">
									<p className="text-white/55">Builder’s wallet (receives contributions)</p>
									<AddressChip value={p.payoutAddress} className="mt-1 text-white/90" />
								</div>
							)}
							<div className="mt-5 hidden flex-col gap-2.5 lg:flex">
								<ContributeButton href={contributeHref} open={open} ended={ended} preview={preview} />
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
							{f ? (
								<>
									{formatAmount(mainRaised)} {code}
									{f.targetAmount && <span className="text-white/55"> of {formatAmount(f.targetAmount)}</span>}
								</>
							) : (
								<span className="text-white/70">Not raising funds</span>
							)}
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
					<ContributeButton href={contributeHref} open={open} ended={ended} preview={preview} compact />
				</div>
			</div>
			{reporting && <ReportDialog target={reporting} onClose={() => setReporting(null)} />}
		</div>
	);
}

function ContributeButton({
	href,
	open,
	ended,
	preview,
	compact,
}: {
	href: string;
	open: boolean;
	ended: boolean;
	preview: boolean;
	compact?: boolean;
}) {
	if (!open || preview)
		return (
			<Button disabled className={cn("h-12 gap-2 text-base", compact && "w-auto shrink-0 px-5")}>
				<HandCoins className="size-4" />{" "}
				{preview ? "Contribute" : ended ? "Funding ended" : compact ? "Not accepting" : "Not accepting contributions"}
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

/** The builder's public profile: banner, avatar, bio, links and the wallet they proved they control. */
function BuilderCard({ builder: b, name }: { builder: PublicProject["builder"]; name: string }) {
	const hasLinks = !!(b.websiteUrl || b.contactEmail || b.socialLinks.length);
	if (!b.bio && !hasLinks && !b.walletAddress && !b.avatarUrl) return null;
	return (
		<section data-reveal="up" className="overflow-hidden rounded-2xl border border-white/10 bg-[#11121A]">
			<div className="relative h-24 bg-gradient-to-r from-primary-700/50 via-primary-500/20 to-transparent sm:h-28">
				{b.bannerUrl && (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={b.bannerUrl} alt="" className="absolute inset-0 size-full object-cover" />
				)}
			</div>
			<div className="px-5 pb-5">
				<ProjectLogo title={name} src={b.avatarUrl} className="-mt-8 size-16 text-lg ring-4 ring-[#11121A]" />
				<h2 className="mt-3 font-display text-xl font-bold">About the builder</h2>
				<p className="mt-0.5 text-white/85">
					{name}
					{b.organizationName && b.displayName && <span className="text-white/55"> · {b.displayName}</span>}
				</p>
				{b.bio && <p className="mt-3 leading-7 whitespace-pre-line text-white/75">{b.bio}</p>}
				<SocialLinks websiteUrl={b.websiteUrl} contactEmail={b.contactEmail} socialLinks={b.socialLinks} className="mt-4" />
				{b.walletAddress && (
					<div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/[0.04] px-3.5 py-3 text-sm">
						<span className="inline-flex items-center gap-1.5 text-success-100">
							<BadgeCheck className="size-4" aria-hidden /> Verified builder wallet
						</span>
						<AddressChip value={b.walletAddress} className="text-white/85" />
					</div>
				)}
			</div>
		</section>
	);
}

type Tab = "updates" | "contributions" | "suggestions";

function TabBar({ tab, onTab, counts }: { tab: Tab; onTab: (t: Tab) => void; counts?: Partial<Record<Tab, number>> }) {
	return (
		<div role="tablist" aria-label="Project activity" className="flex gap-1 border-b border-white/10">
			{(["updates", "contributions", "suggestions"] as Tab[]).map((t) => (
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
			<TabBar tab="updates" onTab={() => undefined} />
			<p className="mt-6 rounded-xl border border-dashed border-white/15 px-5 py-8 text-center text-sm text-white/55">
				Your updates, contributions and suggestions appear here once the project is approved and listed.
			</p>
		</>
	);
}

function ProjectTabs({ slug, onReport }: { slug: string; onReport: (suggestionId: string) => void }) {
	const [tab, setTab] = useState<Tab>("updates");
	const [page, setPage] = useState(1);
	const contributions = useProjectContributions(slug, page);
	const suggestions = useProjectSuggestions(slug);
	const updates = useProjectUpdates(slug);

	return (
		<>
			<TabBar
				tab={tab}
				onTab={setTab}
				counts={{
					updates: updates.data?.pages[0]?.paginationMeta.totalCount,
					contributions: contributions.data?.paginationMeta.totalCount,
					suggestions: suggestions.data?.paginationMeta.totalCount,
				}}
			/>
			<div role="tabpanel" className="mt-6">
				{tab === "updates" &&
					(updates.isPending ? (
						<ListSkeleton />
					) : updates.isError ? (
						<ErrorState message={errorMessage(updates.error)} onRetry={() => void updates.refetch()} />
					) : updates.data.pages[0]!.result.length === 0 ? (
						<EmptyState title="No updates yet" description="The builder’s progress reports will appear here." />
					) : (
						<>
							<ol className="relative flex flex-col gap-5 border-l border-white/10 pl-5 md:pl-6">
								{updates.data.pages
									.flatMap((pg) => pg.result)
									.map((u, i) => (
										<li key={u.id} data-reveal="up" style={d(i % 4)} className="relative">
											<span
												aria-hidden
												className="absolute top-2 -left-[25px] size-2.5 rounded-full bg-primary-400 ring-4 ring-surface-900 md:-left-[29px]"
											/>
											<UpdateArticle update={u} />
										</li>
									))}
							</ol>
							{updates.hasNextPage && (
								<Button
									variant="outline"
									className="mt-5 w-auto px-5"
									isLoading={updates.isFetchingNextPage}
									loadingLabel="Loading older updates"
									onClick={() => void updates.fetchNextPage()}
								>
									Load older updates
								</Button>
							)}
						</>
					))}

				{tab === "contributions" &&
					(contributions.isPending ? (
						<ListSkeleton />
					) : contributions.isError ? (
						<ErrorState message={errorMessage(contributions.error)} onRetry={() => void contributions.refetch()} />
					) : contributions.data.result.length === 0 ? (
						<EmptyState title="No contributions yet" description="Be the first to support this project." />
					) : (
						<>
							<ul className="divide-y divide-white/10 rounded-2xl border border-white/10">
								{contributions.data.result.map((c, i) => (
									<li
										key={c.id}
										data-reveal="up"
										style={d(i)}
										className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5"
									>
										<div className="min-w-0">
											<p className="font-mono text-sm text-white/85">{c.contributor}</p>
											<p className="text-xs text-white/45">{timeAgo(c.confirmedAt)}</p>
										</div>
										<div className="flex items-center gap-2">
											<span className="font-medium whitespace-nowrap">
												{formatAmount(c.amount)} {c.asset.code}
											</span>
											<a
												href={c.explorerUrl}
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
								page={page}
								pages={Math.max(1, Math.ceil(contributions.data.paginationMeta.totalCount / PROJECT_CONTRIBUTIONS_PAGE))}
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
					) : suggestions.data.result.length === 0 ? (
						<EmptyState
							title="No public suggestions yet"
							description="Suggestions appear here after a moderator approves them."
							action={
								<Button asChild variant="outline" className="w-auto px-5">
									<Link href={routes.suggest(slug)}>Suggest an improvement</Link>
								</Button>
							}
						/>
					) : (
						<ul className="flex flex-col gap-4">
							{suggestions.data.result.map((s, i) => (
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
											onClick={() => onReport(s.id)}
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
											rel="nofollow ugc noopener"
											className="mt-2 inline-flex items-center gap-1 text-sm break-all text-primary-300 hover:underline"
										>
											{s.link} <ExternalLink className="size-3.5 shrink-0" />
										</a>
									)}
									<p className="mt-3 text-xs text-white/45">
										{s.author} · {timeAgo(s.createdAt)}
									</p>
								</li>
							))}
						</ul>
					))}
			</div>
		</>
	);
}

/** One update: plain text (never HTML), line breaks kept, optional image (a signed link that expires). */
export function UpdateArticle({ update: u, className }: { update: PublicProjectUpdate; className?: string }) {
	const [broken, setBroken] = useState(false);
	return (
		<article className={cn("rounded-2xl border border-white/10 bg-[#11121A] p-5", className)}>
			<p className="flex items-center gap-1.5 text-xs text-white/50">
				<Megaphone className="size-3.5" aria-hidden /> {timeAgo(u.createdAt)}
				{u.updatedAt !== u.createdAt && <span>· edited</span>}
			</p>
			<h3 className="mt-1.5 font-display text-lg font-bold break-words">{u.title}</h3>
			<p className="mt-2 leading-7 break-words whitespace-pre-line text-white/80">{u.body}</p>
			{u.imageUrl &&
				(broken ? (
					<p className="mt-3 flex items-center gap-2 text-xs text-white/45">
						<ImageOff className="size-4" aria-hidden /> Image unavailable. Reload the page to see it.
					</p>
				) : (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={u.imageUrl}
						alt=""
						loading="lazy"
						onError={() => setBroken(true)}
						className="mt-4 max-h-[420px] w-full rounded-xl object-cover"
					/>
				))}
		</article>
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
