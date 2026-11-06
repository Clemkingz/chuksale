"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, ExternalLink, Eye, MessageSquareWarning, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { PROJECT_ACTION_LABEL, PROJECT_STAGE_LABEL, PROJECT_TYPE_LABEL, SUGGESTION_TYPE_LABEL } from "@repo/domain/labels";
import { formatAmount, progressPercent } from "@repo/domain/money";
import { isPubliclyVisible } from "@repo/domain/project-status";
import type { Project, ProjectStatus } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { errorDetails, errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { timeAgo } from "@/lib/time";
import { notify } from "@/lib/use-toast";
import { AddressChip } from "@/components/AddressChip";
import { BackLink } from "@/components/BackLink";
import { FundingDeadline } from "@/components/FundingDeadline";
import { ProjectUpdates } from "@/features/builder-projects/components/ProjectUpdates";
import { Pager } from "@/components/Pager";
import { ProjectLogo } from "@/components/ProjectLogo";
import { Progress } from "@/components/Progress";
import { EmptyState, ErrorState } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { summarize } from "@/features/contributions/summary";
import { useProjectSuggestions } from "@/features/projects/hooks";
import {
	BUILDER_CONTRIBUTIONS_PAGE,
	useBuilderContributionTotals,
	useBuilderContributions,
	useBuilderProject,
	useDeleteProject,
	useProjectFeedback,
	useProjectInsights,
	useSubmitProject,
} from "@/features/builder-projects/hooks";

/**
 * /builder/projects/[id]: where the project stands, a status timeline, the reviewer's reason (`latestFeedback`;
 * internal notes are never sent to builders), the full decision history, insights (views, contributions,
 * suggestions), confirmed contributions with full addresses, and published suggestions. Buttons follow
 * `permissions` (edit, submit, delete).
 */

const STEPS = ["Submitted", "Under review", "Decision", "Live"];

function stepState(status: ProjectStatus, i: number): "done" | "current" | "todo" | "stop" {
	const order: Record<ProjectStatus, number> = {
		draft: -1,
		submitted: 0,
		under_review: 1,
		changes_requested: 2,
		rejected: 2,
		approved: 3,
		archived: 3,
	};
	const at = order[status];
	if ((status === "rejected" || status === "changes_requested") && i === 2) return "stop";
	if (i < at || (status === "approved" && i === 3)) return "done";
	if (i === at) return "current";
	return "todo";
}

export function ProjectStatusView({ id }: { id: string }) {
	const router = useRouter();
	const q = useBuilderProject(id);
	const p = q.data;
	const submit = useSubmitProject(id);
	const [problems, setProblems] = useState<string[]>([]);
	const [confirmDelete, setConfirmDelete] = useState(false);

	if (q.isError)
		return (
			<div className="app-container py-16">
				{errorStatus(q.error) === 403 || errorStatus(q.error) === 404 ? (
					<EmptyState
						title="Project not found"
						description="It doesn’t exist, or it belongs to another builder."
						action={
							<Button asChild className="w-auto px-6">
								<Link href={routes.dashboard}>Back to dashboard</Link>
							</Button>
						}
					/>
				) : (
					<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
				)}
			</div>
		);
	if (!p)
		return (
			<div className="app-container py-12" aria-hidden>
				<span className="skeleton-shimmer block h-10 w-72 rounded" />
				<span className="skeleton-shimmer mt-6 block h-40 rounded-2xl" />
			</div>
		);

	const fb = p.latestFeedback;
	const live = isPubliclyVisible(p);
	const decided = p.status === "approved" || p.status === "archived";

	return (
		<div className="app-container py-8 md:py-12">
			<BackLink href={routes.dashboard} label="Dashboard" />

			<header className="mt-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
				<div className="flex min-w-0 items-center gap-4">
					<ProjectLogo title={p.title} src={p.logoUrl} className="animate-pop size-16 text-lg" />
					<div className="min-w-0">
						<h1 className="animate-rise truncate font-display text-[26px] font-bold md:text-[32px]">{p.title}</h1>
						<div className="animate-rise mt-1 flex flex-wrap items-center gap-2 [--i:1]">
							<StatusBadge status={p.status} />
							{p.status === "approved" && (
								<span className="text-xs text-white/55">
									{live ? "Listed publicly" : "Hidden from the public"}
									{p.featured && " · Featured"}
								</span>
							)}
							<span className="text-xs text-white/40">Revision {p.revision}</span>
						</div>
					</div>
				</div>
				<div className="animate-rise flex flex-wrap gap-2 [--i:2]">
					{p.permissions.canEdit && (
						<Button asChild variant="outline" className="h-11 w-auto gap-2 px-5">
							<Link href={routes.editProject(p.id)}>
								<Pencil className="size-4" /> Edit
							</Link>
						</Button>
					)}
					<Button asChild variant="outline" className="h-11 w-auto gap-2 px-5">
						<Link href={routes.previewProject(p.id)}>
							<Eye className="size-4" /> Preview
						</Link>
					</Button>
					{live && p.slug && (
						<Button asChild className="h-11 w-auto gap-2 px-5">
							<Link href={routes.project(p.slug)}>
								<ExternalLink className="size-4" /> Public page
							</Link>
						</Button>
					)}
					{p.permissions.canSubmit && (
						<Button
							className="h-11 w-auto gap-2 px-5"
							isLoading={submit.isPending}
							loadingLabel="Submitting"
							onClick={() => {
								setProblems([]);
								submit.mutate(undefined, {
									onSuccess: () => {
										notify.success("Submitted for review");
										router.push(routes.submitted(p.id));
									},
									onError: (e) => {
										const lines = errorDetails(e);
										if (errorStatus(e) === 400 && lines.length) setProblems(lines);
										else notify.fromError(e);
									},
								});
							}}
						>
							<Send className="size-4" /> {p.status === "changes_requested" ? "Resubmit" : "Submit for review"}
						</Button>
					)}
					{p.permissions.canDelete && (
						<Button
							variant="ghost"
							className="h-11 w-auto gap-2 px-4 text-error-200 hover:bg-error-400/10"
							onClick={() => setConfirmDelete(true)}
						>
							<Trash2 className="size-4" /> Delete draft
						</Button>
					)}
				</div>
			</header>

			{problems.length > 0 && (
				<div role="alert" className="animate-pop mt-6 rounded-2xl border border-error-400/30 bg-error-400/[0.07] px-5 py-4">
					<p className="flex items-center gap-2 font-medium text-error-100">
						<AlertTriangle className="size-4" /> A few things to fix before it can be reviewed
					</p>
					<ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-white/80">
						{problems.map((line) => (
							<li key={line}>{line.charAt(0).toUpperCase() + line.slice(1)}</li>
						))}
					</ul>
					{p.permissions.canEdit && (
						<Button asChild size="sm" className="mt-3 w-auto px-4">
							<Link href={routes.editProject(p.id)}>Fix them in the editor</Link>
						</Button>
					)}
				</div>
			)}

			{(p.status === "changes_requested" || p.status === "rejected" || p.status === "archived") && fb?.reason && (
				<section
					role="note"
					className={cn(
						"animate-pop mt-7 flex gap-4 rounded-2xl border px-5 py-4",
						p.status === "changes_requested"
							? "border-warning-400/30 bg-warning-400/[0.06]"
							: "border-error-400/30 bg-error-400/[0.06]",
					)}
				>
					{p.status === "changes_requested" ? (
						<MessageSquareWarning className="mt-0.5 size-5 shrink-0 text-warning-200" />
					) : (
						<XCircle className="mt-0.5 size-5 shrink-0 text-error-200" />
					)}
					<div>
						<p className="font-medium">
							{p.status === "rejected"
								? "This project wasn’t approved"
								: p.status === "archived"
									? "This project was archived"
									: "The reviewer asked for changes"}
						</p>
						<p className="mt-1 leading-7 whitespace-pre-line text-white/80">{fb.reason}</p>
						<p className="mt-1 text-xs text-white/45">{timeAgo(fb.at)}</p>
						{p.status === "changes_requested" && (
							<p className="mt-2 text-sm text-white/65">
								Edit the project, then resubmit it. Each submission is kept as a revision.
							</p>
						)}
					</div>
				</section>
			)}

			{p.status === "draft" ? (
				<p className="mt-8 rounded-xl border border-dashed border-white/15 px-5 py-4 text-sm text-white/60">
					Draft: only you can see it. Fill in the details, then submit it for review.
				</p>
			) : (
				<ol aria-label="Review progress" className="mt-8 grid grid-cols-4 gap-2">
					{STEPS.map((label0, i) => {
						const st = stepState(p.status, i);
						const label =
							i === 2 && p.status === "rejected"
								? "Not approved"
								: i === 2 && p.status === "changes_requested"
									? "Changes requested"
									: i === 2 && decided
										? "Approved"
										: i === 3 && p.status === "archived"
											? "Archived"
											: label0;
						return (
							<li key={label0} aria-current={st === "current" ? "step" : undefined} className="flex flex-col gap-2">
								<span
									className={cn(
										"h-1.5 rounded-full",
										st === "done"
											? "bg-success-300"
											: st === "current"
												? "bg-primary-500"
												: st === "stop"
													? p.status === "rejected"
														? "bg-error-300"
														: "bg-warning-300"
													: "bg-white/10",
									)}
								/>
								<span
									className={cn("flex items-center gap-1 text-xs md:text-sm", st === "todo" ? "text-white/40" : "text-white/85")}
								>
									{st === "done" && <Check className="size-3.5 text-success-200" />}
									{st === "stop" && (
										<AlertTriangle className={cn("size-3.5", p.status === "rejected" ? "text-error-200" : "text-warning-200")} />
									)}
									{label}
								</span>
							</li>
						);
					})}
				</ol>
			)}

			<div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
				<section aria-labelledby="details-title" className="min-w-0 rounded-2xl border border-white/10 bg-[#11121A] p-5 md:p-6">
					<h2 id="details-title" className="font-display text-xl font-bold">
						Project details
					</h2>
					<dl className="mt-4 grid gap-4 sm:grid-cols-2">
						<Fact label="Summary" value={p.summary} wide />
						<Fact label="Type" value={PROJECT_TYPE_LABEL[p.type]} />
						<Fact label="Category" value={p.category?.name ?? null} />
						<Fact label="Stage" value={p.stage ? PROJECT_STAGE_LABEL[p.stage] : null} />
						<Fact label="Team" value={p.teamMembers.length ? p.teamMembers.map((m) => m.name).join(", ") : null} />
						<Fact
							label="Fundraising"
							value={p.fundraisingEnabled ? `On · ${p.acceptedAssets.map((a) => a.code).join(", ") || "no assets yet"}` : "Off"}
						/>
						<Fact label="Target" value={p.targetAmount ? `${formatAmount(p.targetAmount)} ${p.targetAsset?.code ?? ""}` : null} />
						{p.fundraisingEnabled && (
							<div className="sm:col-span-2">
								<dt className="text-sm text-white/50">Payout wallet</dt>
								<dd className="mt-1">
									{p.payoutAddress ? (
										<AddressChip value={p.payoutAddress} className="text-sm" />
									) : (
										<span className="text-white/40">Not set</span>
									)}
								</dd>
							</div>
						)}
					</dl>
					{p.links.length > 0 && (
						<ul className="mt-5 flex flex-wrap gap-2">
							{p.links.map((l, i) => (
								<li key={`${l.url}-${i}`}>
									<a
										href={l.url}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/15 px-3 text-sm text-white/80 hover:text-white"
									>
										{l.label} <ExternalLink className="size-3.5" />
									</a>
								</li>
							))}
						</ul>
					)}
				</section>

				<aside className="flex flex-col gap-5">
					{decided && p.fundraisingEnabled && <FundingPanel project={p} />}
					<History id={p.id} enabled={p.status !== "draft"} />
				</aside>
			</div>

			{p.status === "approved" && <ProjectUpdates projectId={p.id} />}
			{decided && <Insights id={p.id} />}
			{decided && p.fundraisingEnabled && <Contributions id={p.id} />}
			{live && p.slug && <Suggestions slug={p.slug} />}

			{confirmDelete && <DeleteDialog project={p} onClose={() => setConfirmDelete(false)} />}
		</div>
	);
}

function FundingPanel({ project: p }: { project: Project }) {
	const q = useBuilderContributionTotals(p.id);
	const s = q.data ? summarize(q.data.result) : null;
	const inTarget = s?.totals.find((t) => t.asset.id === p.targetAsset?.id)?.amount ?? "0";
	const pct = p.targetAmount ? progressPercent(inTarget, p.targetAmount) : null;
	return (
		<section aria-labelledby="funding-title" className="rounded-2xl border border-white/10 bg-[#11121A] p-5">
			<h2 id="funding-title" className="text-sm text-white/55">
				Raised (confirmed)
			</h2>
			{!s ? (
				<span className="skeleton-shimmer mt-2 block h-9 w-40 rounded" aria-hidden />
			) : s.totals.length === 0 ? (
				<p className="mt-1 font-display text-3xl font-bold">
					0 <span className="text-base font-normal text-white/60">{p.targetAsset?.code ?? p.acceptedAssets[0]?.code}</span>
				</p>
			) : (
				s.totals.map((t) => (
					<p key={t.asset.id} className="mt-1 font-display text-3xl font-bold">
						{formatAmount(t.amount)} <span className="text-base font-normal text-white/60">{t.asset.code}</span>
					</p>
				))
			)}
			{p.targetAmount && <Progress percent={pct} className="mt-3 h-2" />}
			<p className="mt-2 text-sm text-white/60">
				{q.data?.paginationMeta.totalCount ?? 0} confirmed contribution{q.data?.paginationMeta.totalCount === 1 ? "" : "s"}
				{pct !== null && ` · ${pct}% of the ${p.targetAsset?.code} target`}
			</p>
			<FundingDeadline funding={{ endsAt: p.fundingEndsAt, ended: false }} variant="detail" className="mt-3" />
		</section>
	);
}

function History({ id, enabled }: { id: string; enabled: boolean }) {
	const q = useProjectFeedback(id, enabled);
	if (!enabled || !q.data?.length) return null;
	return (
		<section aria-labelledby="history-title" className="rounded-2xl border border-white/10 bg-[#11121A] p-5">
			<h2 id="history-title" className="font-display text-lg font-bold">
				Review history
			</h2>
			<ol className="mt-3 flex flex-col gap-3 text-sm">
				{[...q.data].reverse().map((r, i) => (
					<li key={`${r.at}-${i}`} className="border-l-2 border-white/15 pl-3">
						<p>
							{PROJECT_ACTION_LABEL[r.action]} <span className="text-white/40">· revision {r.revision}</span>
						</p>
						{r.reason && <p className="whitespace-pre-line text-white/60">{r.reason}</p>}
						<p className="text-xs text-white/40">{timeAgo(r.at)}</p>
					</li>
				))}
			</ol>
		</section>
	);
}

function Insights({ id }: { id: string }) {
	const q = useProjectInsights(id);
	const i = q.data;
	const tiles = [
		{ label: "Views (30 days)", value: i?.views },
		{ label: "Contributions started", value: i?.contributionsStarted },
		{ label: "Contributions confirmed", value: i?.contributionsConfirmed },
		{ label: "Suggestions received", value: i?.suggestionsReceived },
		{ label: "Suggestions published", value: i?.suggestionsPublished },
	];
	if (q.isError) return null;
	return (
		<section aria-labelledby="insights-title" className="mt-8">
			<h2 id="insights-title" data-reveal="up" className="font-display text-xl font-bold">
				Insights
			</h2>
			<ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
				{tiles.map((t, k) => (
					<li
						key={t.label}
						data-reveal="up"
						style={{ "--d": k } as React.CSSProperties}
						className="rounded-2xl border border-white/10 bg-[#11121A] px-4 py-4"
					>
						<p className="font-display text-2xl font-bold tabular-nums">
							{t.value === undefined ? <span className="skeleton-shimmer inline-block h-7 w-12 rounded" /> : t.value}
						</p>
						<p className="mt-0.5 text-xs text-white/60">{t.label}</p>
					</li>
				))}
			</ul>
		</section>
	);
}

function Contributions({ id }: { id: string }) {
	const [page, setPage] = useState(1);
	const q = useBuilderContributions(id, page);
	const d = q.data;
	return (
		<section aria-labelledby="contrib-title" data-reveal="up" className="mt-8 rounded-2xl border border-white/10 bg-[#11121A]">
			<h2 id="contrib-title" className="px-5 pt-5 font-display text-xl font-bold md:px-6">
				Confirmed contributions
			</h2>
			{q.isPending ? (
				<span className="skeleton-shimmer m-5 block h-24 rounded-xl" aria-hidden />
			) : q.isError ? (
				<p className="px-5 py-5 text-sm text-error-200 md:px-6">{errorMessage(q.error)}</p>
			) : !d?.result.length ? (
				<p className="px-5 pt-2 pb-5 text-white/55 md:px-6">None yet. They appear here once confirmed on Stellar.</p>
			) : (
				<>
					<ul className={cn("mt-3 divide-y divide-white/10 border-t border-white/10", q.isPlaceholderData && "opacity-60")}>
						{d.result.map((c) => (
							<li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 md:px-6">
								<div className="min-w-0">
									<AddressChip value={c.contributorAddress} head={6} tail={6} className="text-sm" />
									<p className="text-xs text-white/45">{timeAgo(c.confirmedAt ?? c.createdAt)}</p>
								</div>
								<div className="flex items-center gap-2">
									<span className="font-medium whitespace-nowrap tabular-nums">
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
						pages={Math.max(1, Math.ceil(d.paginationMeta.totalCount / BUILDER_CONTRIBUTIONS_PAGE))}
						onPage={setPage}
						className="my-4"
					/>
				</>
			)}
		</section>
	);
}

function Suggestions({ slug }: { slug: string }) {
	const q = useProjectSuggestions(slug);
	const list = q.data?.result ?? [];
	return (
		<section aria-labelledby="suggestions-title" className="mt-8">
			<h2 id="suggestions-title" className="font-display text-xl font-bold">
				Suggestions from the community{" "}
				{q.data && <span className="text-base font-normal text-white/45">({q.data.paginationMeta.totalCount})</span>}
			</h2>
			{q.isPending ? (
				<span className="skeleton-shimmer mt-4 block h-24 rounded-2xl" aria-hidden />
			) : !list.length ? (
				<p className="mt-3 text-white/55">No published suggestions yet. They appear here after moderation.</p>
			) : (
				<ul className="mt-4 grid gap-4 md:grid-cols-2">
					{list.map((s, i) => (
						<li
							key={s.id}
							data-reveal="up"
							style={{ "--d": i } as React.CSSProperties}
							className="rounded-2xl border border-white/10 px-5 py-4"
						>
							<span className="rounded-full bg-primary-500/15 px-2.5 py-0.5 text-xs text-primary-200">
								{SUGGESTION_TYPE_LABEL[s.type]}
							</span>
							<h3 className="mt-2 font-medium break-words">{s.title}</h3>
							<p className="mt-1.5 text-sm leading-6 break-words whitespace-pre-line text-white/75">{s.body}</p>
							{s.link && (
								<a
									href={s.link}
									target="_blank"
									rel="nofollow ugc noopener"
									className="mt-1.5 inline-flex items-center gap-1 text-sm break-all text-primary-300 hover:underline"
								>
									{s.link} <ExternalLink className="size-3.5 shrink-0" />
								</a>
							)}
							<p className="mt-2 text-xs text-white/45">
								{s.author} · {timeAgo(s.createdAt)}
							</p>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function DeleteDialog({ project, onClose }: { project: Project; onClose: () => void }) {
	const router = useRouter();
	const del = useDeleteProject(project.id);
	return (
		<Dialog open onOpenChange={(o) => !o && !del.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">Delete “{project.title}”?</DialogTitle>
					<DialogDescription className="text-white/65">This draft and its cover are removed for good.</DialogDescription>
				</DialogHeader>
				{del.isError && <p className="text-sm text-error-200">{errorMessage(del.error)}</p>}
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" className="w-auto px-5" onClick={onClose} disabled={del.isPending}>
						Keep it
					</Button>
					<Button
						variant="destructive"
						className="w-auto px-5"
						isLoading={del.isPending}
						loadingLabel="Deleting"
						onClick={() =>
							del.mutate(undefined, {
								onSuccess: () => {
									notify.info("Draft deleted");
									router.replace(routes.dashboard);
								},
							})
						}
					>
						Delete draft
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Fact({ label, value, wide }: { label: string; value: string | null; wide?: boolean }) {
	return (
		<div className={cn(wide && "sm:col-span-2")}>
			<dt className="text-sm text-white/50">{label}</dt>
			<dd className={cn("mt-1 break-words", !value && "text-white/40")}>{value || "Not set"}</dd>
		</div>
	);
}
