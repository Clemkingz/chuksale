"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, Flag, MessageSquareText, XCircle } from "lucide-react";
import { PROJECT_ACTION_LABEL } from "@repo/domain/labels";
import { CountUp } from "@repo/ui/count-up";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { fullDate, timeAgo } from "@/lib/format";
import { routes } from "@/lib/routes";
import { EmptyState, ErrorState, PageTitle, RowsSkeleton } from "@/components/ui";
import { rate, useAnalytics, useOverview, type AnalyticsRange } from "@/features/overview/hooks";
import { FunnelChart } from "@/features/overview/components/Charts";

/**
 * Admin home, tailored to `/admin/overview` and `/admin/analytics`: the work queues (each links to its queue),
 * payment alerts (stuck, and the last 24 h), the PRD success measures for a chosen period with two funnels, and the
 * latest review decisions.
 */

const d = (i: number) => ({ "--d": i }) as CSSProperties;
const RANGES: { id: AnalyticsRange; label: string }[] = [
	{ id: 7, label: "7 days" },
	{ id: 30, label: "30 days" },
	{ id: 90, label: "90 days" },
];

export function OverviewView() {
	const overview = useOverview();
	const o = overview.data;
	const [days, setDays] = useState<AnalyticsRange>(30);
	const analytics = useAnalytics(days);
	const a = analytics.data;
	const m = a?.metrics;

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Dashboard</PageTitle>

			{overview.isError && !o ? (
				<div className="mt-8">
					<ErrorState message={errorMessage(overview.error)} onRetry={() => void overview.refetch()} retrying={overview.isFetching} />
				</div>
			) : (
				<>
					<h2 className="sr-only">Queues</h2>
					<ul className="mt-4 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4 xl:gap-7">
						<Stat
							i={0}
							href={`${routes.projects}?tab=submitted`}
							icon={<ClipboardList className="size-11" />}
							label="Projects awaiting review"
							value={o?.queue.projectsAwaitingReview}
						/>
						<Stat
							i={1}
							href={routes.suggestions}
							icon={<MessageSquareText className="size-11" />}
							label="Suggestions pending"
							value={o?.queue.suggestionsPending}
						/>
						<Stat
							i={2}
							href={`${routes.suggestions}?tab=reports`}
							icon={<Flag className="size-11" />}
							label="Open reports"
							value={o?.queue.reportsOpen}
						/>
						<Stat
							i={3}
							href={`${routes.contributions}?status=pending`}
							icon={<AlertTriangle className="size-11" />}
							label={o ? `Payments stuck > ${o.contributions.stuckAfterMinutes} min` : "Stuck payments"}
							value={o?.contributions.stuckPending}
							warn={!!o?.contributions.stuckPending}
						/>
					</ul>

					<section aria-labelledby="day-title" className="mt-8">
						<h2 id="day-title" className="font-display text-xl font-bold md:text-2xl">
							Payments in the last 24 hours
						</h2>
						<ul className="mt-4 grid grid-cols-3 gap-3 md:gap-5">
							<Mini i={0} icon={<CheckCircle2 className="size-5" />} tone="good" label="Confirmed" value={o?.contributions.confirmed24h} />
							<Mini i={1} icon={<XCircle className="size-5" />} tone="bad" label="Failed" value={o?.contributions.failed24h} />
							<Mini i={2} icon={<Clock className="size-5" />} label="Expired" value={o?.contributions.expired24h} />
						</ul>
					</section>
				</>
			)}

			<section aria-labelledby="analytics-title" className="mt-12">
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<h2 id="analytics-title" className="font-display text-2xl font-bold md:text-[28px]">
							Analytics
						</h2>
						<p className="mt-1 text-sm text-white/55">
							{a ? `${new Date(a.from).toLocaleDateString("en-GB")} – ${new Date(a.to).toLocaleDateString("en-GB")} (end exclusive)` : " "}
						</p>
					</div>
					<div role="group" aria-label="Period" className="flex gap-1 rounded-lg bg-white/[0.05] p-1">
						{RANGES.map((r) => (
							<button
								key={r.id}
								type="button"
								aria-pressed={days === r.id}
								onClick={() => setDays(r.id)}
								className={cn(
									"h-9 rounded-md px-3.5 text-sm transition-colors",
									days === r.id ? "bg-primary-500 text-white" : "text-white/65 hover:text-white",
								)}
							>
								{r.label}
							</button>
						))}
					</div>
				</div>

				{analytics.isError && !a ? (
					<div className="mt-5">
						<ErrorState message={errorMessage(analytics.error)} onRetry={() => void analytics.refetch()} retrying={analytics.isFetching} />
					</div>
				) : (
					<div className={cn("transition-opacity", analytics.isPlaceholderData && "opacity-60")}>
						<ul className="mt-5 grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-4">
							<Metric
								i={0}
								label="Submission completion"
								value={m ? rate(m.submissionCompletion.rate) : undefined}
								hint={m ? `${m.submissionCompletion.submitted} of ${m.submissionCompletion.draftsCreated} drafts submitted` : ""}
							/>
							<Metric
								i={1}
								label="Median review time"
								value={m ? (m.reviewTurnaround.medianHours === null ? "–" : `${m.reviewTurnaround.medianHours.toFixed(1)} h`) : undefined}
								hint={m ? `${m.reviewTurnaround.decisions} decisions` : ""}
							/>
							<Metric
								i={2}
								label="Approved → funded"
								value={m ? rate(m.approvalToFunding.rate) : undefined}
								hint={m ? `${m.approvalToFunding.funded} of ${m.approvalToFunding.approved} approved projects` : ""}
							/>
							<Metric
								i={3}
								label="Contribution success"
								value={m ? rate(m.contributions.successRate) : undefined}
								hint={m ? `Failed transactions: ${rate(m.contributions.failedTransactionRate)}` : ""}
							/>
							<Metric i={4} label="Project views" value={m?.projectViews.toLocaleString()} hint="Public project page loads" />
							<Metric
								i={5}
								label="Suggestions"
								value={m?.suggestions.submitted.toLocaleString()}
								hint={m ? `From ${m.suggestions.wallets} wallet${m.suggestions.wallets === 1 ? "" : "s"}` : ""}
							/>
							<Metric i={6} label="Builders signed up" value={a?.events.builder_registered.toLocaleString()} hint="New accounts" />
							<Metric i={7} label="Wallets connected" value={a?.events.wallet_connected.toLocaleString()} hint="Wallet sign-ins" />
						</ul>
						<div className="mt-5 grid gap-5 xl:grid-cols-2">
							<FunnelChart
								title="Project funnel"
								caption="Drafts to published projects in this period"
								data={
									a && [
										{ label: "Drafts", value: a.events.project_draft_created },
										{ label: "Submitted", value: a.events.project_submitted },
										{ label: "Decided", value: a.events.project_review_decided },
										{ label: "Published", value: a.events.project_published },
									]
								}
							/>
							<FunnelChart
								title="Contribution funnel"
								caption="Payments started to confirmed in this period"
								data={
									a && [
										{ label: "Started", value: a.events.contribution_started },
										{ label: "Submitted", value: a.events.contribution_submitted },
										{ label: "Confirmed", value: a.events.contribution_confirmed },
										{ label: "Failed", value: a.events.contribution_failed },
									]
								}
							/>
						</div>
					</div>
				)}
			</section>

			<section data-reveal="up" aria-labelledby="decisions-title" className="admin-card mt-12 overflow-hidden">
				<div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4 md:px-6">
					<div>
						<h2 id="decisions-title" className="font-display text-2xl font-bold md:text-[28px]">
							Recent decisions
						</h2>
						<p className="mt-1 text-base text-white/80">The latest review actions by admins</p>
					</div>
					<Link
						href={routes.projects}
						className="inline-flex h-11 shrink-0 items-center rounded-lg bg-primary-500 px-4 text-base text-white transition-colors hover:bg-primary-600"
					>
						Projects
					</Link>
				</div>
				{!o ? (
					<RowsSkeleton rows={5} cols={3} />
				) : o.recentDecisions.length === 0 ? (
					<EmptyState title="No decisions yet" description="Approvals, rejections and change requests show up here." />
				) : (
					<ul>
						{o.recentDecisions.map((r, i) => (
							<li
								key={`${r.projectId}-${r.createdAt}-${i}`}
								className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 px-5 py-4 md:px-6"
							>
								<div className="min-w-0">
									<Link href={routes.project(r.projectId)} className="block truncate text-lg hover:text-primary-300">
										{r.projectTitle}
									</Link>
									<p className="text-sm text-white/60">
										{PROJECT_ACTION_LABEL[r.action]} by {r.adminName ?? "an admin"}
									</p>
								</div>
								<time dateTime={r.createdAt} title={fullDate(r.createdAt)} className="text-sm text-white/55">
									{timeAgo(r.createdAt)}
								</time>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

function Stat({
	i,
	href,
	icon,
	label,
	value,
	warn,
}: {
	i: number;
	href: string;
	icon: ReactNode;
	label: string;
	value?: number;
	warn?: boolean;
}) {
	return (
		<li style={d(i)} data-reveal="up">
			<Link
				href={href}
				className={cn(
					"group flex items-center justify-between gap-4 rounded-xl border-2 px-6 py-6 transition-colors duration-200 md:px-8 md:py-7",
					warn ? "border-warning-400/80 hover:bg-warning-400/[0.06]" : "border-primary-500/80 hover:bg-primary-500/[0.06]",
				)}
			>
				<div className="min-w-0">
					<p
						className={cn(
							"truncate font-display text-[28px] leading-none font-bold md:text-[34px]",
							warn ? "text-warning-300" : "text-primary-500",
						)}
					>
						{value === undefined ? <span className="skeleton-shimmer inline-block h-8 w-16 rounded" /> : <CountUp value={value} />}
					</p>
					<p className="mt-2 text-base text-white/90 md:text-lg">{label}</p>
				</div>
				<span
					className={cn(
						"shrink-0 transition-transform duration-300 ease-(--ease-settle) group-hover:scale-110",
						warn ? "text-warning-300" : "text-primary-500",
					)}
					aria-hidden
				>
					{icon}
				</span>
			</Link>
		</li>
	);
}

function Mini({ i, icon, label, value, tone }: { i: number; icon: ReactNode; label: string; value?: number; tone?: "good" | "bad" }) {
	return (
		<li data-reveal="up" style={d(i)} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 md:px-5">
			<p
				className={cn(
					"flex items-center gap-1.5 text-sm",
					tone === "good" ? "text-success-200" : tone === "bad" ? "text-error-200" : "text-white/65",
				)}
			>
				{icon} {label}
			</p>
			<p className="mt-2 font-display text-2xl font-bold tabular-nums md:text-3xl">
				{value === undefined ? <span className="skeleton-shimmer inline-block h-7 w-10 rounded" /> : <CountUp value={value} />}
			</p>
		</li>
	);
}

function Metric({ i, label, value, hint }: { i: number; label: string; value?: string; hint: string }) {
	return (
		<li data-reveal="up" style={d(i)} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 md:px-5 md:py-5">
			<p className="text-sm text-white/65">{label}</p>
			<p className="mt-1.5 font-display text-2xl font-bold tabular-nums md:text-[28px]">
				{value === undefined ? <span className="skeleton-shimmer inline-block h-7 w-14 rounded" /> : value}
			</p>
			<p className="mt-1 text-xs text-white/45">{hint}</p>
		</li>
	);
}
