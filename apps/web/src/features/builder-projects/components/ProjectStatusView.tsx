"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Eye, ExternalLink, MessageSquareWarning, Pencil, Send, XCircle } from "lucide-react";
import { PROJECT_STAGE_LABEL, SUGGESTION_TYPE_LABEL } from "@repo/domain/labels";
import { formatAmount, progressPercent } from "@repo/domain/money";
import { isPubliclyVisible } from "@repo/domain/project-status";
import type { ProjectStatus } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { shortKey } from "@/lib/stellar/config";
import { timeAgo } from "@/lib/time";
import { notify } from "@/lib/use-toast";
import { AddressChip } from "@/components/AddressChip";
import { ProjectLogo } from "@/components/ProjectLogo";
import { Progress } from "@/components/Progress";
import { EmptyState, ErrorState } from "@/components/States";
import { StatusBadge } from "@/components/StatusBadge";
import { useBuilderProject, useBuilderProjectSuggestions, useSubmitProject } from "@/features/builder-projects/hooks";

/**
 * /builder/projects/[id] (PRD §6.2 steps 8–10): where the project stands, a status timeline, the admin's reason
 * when changes were requested or it was declined (never internal notes), funding so far, published suggestions,
 * and the right next action for its status (edit and resubmit only while editable, FR-PROJ-06).
 */

const STEPS: { id: string; label: string }[] = [
	{ id: "submitted", label: "Submitted" },
	{ id: "under_review", label: "Under review" },
	{ id: "decision", label: "Decision" },
	{ id: "live", label: "Live" },
];

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
	const suggestions = useBuilderProjectSuggestions(id, !!p && p.status === "approved");

	if (q.isError)
		return (
			<div className="app-container py-16">
				{errorStatus(q.error) === 403 || errorStatus(q.error) === 404 ? (
					<EmptyState
						title="Project not found"
						description="It doesn’t exist, or it belongs to another builder."
						action={
							<Button asChild>
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

	const latest = p.reviews[0];
	const code = p.target_asset?.code ?? "XLM";
	const pct = progressPercent(p.raised_amount, p.target_amount);
	const live = isPubliclyVisible(p);

	return (
		<div className="app-container py-8 md:py-12">
			<Link href={routes.dashboard} className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white">
				<ArrowLeft className="size-4" /> Dashboard
			</Link>

			<header className="mt-5 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
				<div className="flex min-w-0 items-center gap-4">
					<ProjectLogo title={p.title} src={p.logo_url} className="animate-pop size-16 text-lg" />
					<div className="min-w-0">
						<h1 className="animate-rise truncate font-display text-[26px] font-bold md:text-[32px]">{p.title}</h1>
						<div className="animate-rise mt-1 flex flex-wrap items-center gap-2 [--i:1]">
							<StatusBadge status={p.status} />
							{p.status === "approved" && (
								<span className="text-xs text-white/55">{live ? "Public" : "Hidden from the public"}</span>
							)}
						</div>
					</div>
				</div>
				<div className="animate-rise flex flex-wrap gap-2 [--i:2]">
					{p.editable && (
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
					{live && (
						<Button asChild className="h-11 w-auto gap-2 px-5">
							<Link href={routes.project(p.slug)}>
								<ExternalLink className="size-4" /> Public page
							</Link>
						</Button>
					)}
					{p.editable && (
						<Button
							className="h-11 w-auto gap-2 px-5"
							isLoading={submit.isPending}
							loadingLabel="Submitting"
							onClick={() =>
								submit.mutate(undefined, {
									onSuccess: () => {
										notify.success("Submitted for review");
										router.push(routes.submitted(p.id));
									},
									onError: (e) => notify.fromError(e),
								})
							}
						>
							<Send className="size-4" /> {p.status === "changes_requested" ? "Resubmit" : "Submit for review"}
						</Button>
					)}
				</div>
			</header>

			{(p.status === "changes_requested" || p.status === "rejected") && latest?.reason && (
				<section
					role="note"
					className={cn(
						"animate-pop mt-7 flex gap-4 rounded-2xl border px-5 py-4",
						p.status === "rejected" ? "border-error-400/30 bg-error-400/[0.06]" : "border-warning-400/30 bg-warning-400/[0.06]",
					)}
				>
					{p.status === "rejected" ? (
						<XCircle className="mt-0.5 size-5 shrink-0 text-error-200" />
					) : (
						<MessageSquareWarning className="mt-0.5 size-5 shrink-0 text-warning-200" />
					)}
					<div>
						<p className="font-medium">
							{p.status === "rejected" ? "This project wasn’t approved" : "The reviewer asked for changes"}
						</p>
						<p className="mt-1 leading-7 text-white/80">“{latest.reason}”</p>
						<p className="mt-1 text-xs text-white/45">{timeAgo(latest.created_at)}</p>
						{p.status === "changes_requested" && (
							<p className="mt-2 text-sm text-white/65">
								Edit the project, then resubmit it. Your earlier version is kept as a revision.
							</p>
						)}
					</div>
				</section>
			)}

			<ol aria-label="Review progress" className="mt-8 grid grid-cols-4 gap-2">
				{STEPS.map((s, i) => {
					const st = stepState(p.status, i);
					const label =
						i === 2 && p.status === "rejected"
							? "Not approved"
							: i === 2 && p.status === "changes_requested"
								? "Changes requested"
								: i === 2 && p.status === "approved"
									? "Approved"
									: s.label;
					return (
						<li key={s.id} aria-current={st === "current" ? "step" : undefined} className="flex flex-col gap-2">
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

			<div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
				<section aria-labelledby="details-title" className="rounded-2xl border border-white/10 bg-[#11121A] p-5 md:p-6">
					<h2 id="details-title" className="font-display text-xl font-bold">
						Submission
					</h2>
					<dl className="mt-4 grid gap-4 sm:grid-cols-2">
						<Fact label="Summary" value={p.summary} wide />
						<Fact label="Category" value={p.category?.name ?? null} />
						<Fact label="Stage" value={p.stage ? PROJECT_STAGE_LABEL[p.stage] : null} />
						<Fact label="Contact email" value={p.contact_email} />
						<div>
							<dt className="text-sm text-white/50">Receiving wallet</dt>
							<dd className="mt-1">
								{p.destination_address ? (
									<AddressChip value={p.destination_address} className="text-sm" />
								) : (
									<span className="text-white/40">Not set</span>
								)}
							</dd>
						</div>
						<Fact label="Target" value={p.target_amount ? `${formatAmount(p.target_amount)} ${code}` : null} />
						<Fact label="Revisions" value={String(p.revisions.length || 1)} />
					</dl>
					{p.links.length > 0 && (
						<ul className="mt-5 flex flex-wrap gap-2">
							{p.links.map((l) => (
								<li key={l.url}>
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
					<section aria-labelledby="funding-title" className="rounded-2xl border border-white/10 bg-[#11121A] p-5">
						<h2 id="funding-title" className="text-sm text-white/55">
							Raised (confirmed)
						</h2>
						<p className="mt-1 font-display text-3xl font-bold">
							{formatAmount(p.raised_amount)} <span className="text-base font-normal text-white/60">{code}</span>
						</p>
						{p.target_amount && <Progress percent={pct} className="mt-3 h-2" />}
						<p className="mt-2 text-sm text-white/60">
							{p.contributor_count} contributor{p.contributor_count === 1 ? "" : "s"}
							{pct !== null && ` · ${pct}% of target`}
						</p>
						{p.status !== "approved" && (
							<p className="mt-3 text-xs text-white/45">Contributions open once the project is approved.</p>
						)}
					</section>
					{p.reviews.length > 0 && (
						<section aria-labelledby="history-title" className="rounded-2xl border border-white/10 bg-[#11121A] p-5">
							<h2 id="history-title" className="font-display text-lg font-bold">
								Review history
							</h2>
							<ol className="mt-3 flex flex-col gap-3 text-sm">
								{p.reviews.map((r) => (
									<li key={r.id} className="border-l-2 border-white/15 pl-3">
										<p className="capitalize">{r.decision.replace("_", " ")}</p>
										{r.reason && <p className="text-white/60">“{r.reason}”</p>}
										<p className="text-xs text-white/40">{timeAgo(r.created_at)}</p>
									</li>
								))}
							</ol>
						</section>
					)}
				</aside>
			</div>

			{p.status === "approved" && (
				<section aria-labelledby="suggestions-title" className="mt-8">
					<h2 id="suggestions-title" className="font-display text-xl font-bold">
						Suggestions from the community{" "}
						{suggestions.data && <span className="text-base font-normal text-white/45">({suggestions.data.length})</span>}
					</h2>
					{suggestions.isPending ? (
						<span className="skeleton-shimmer mt-4 block h-24 rounded-2xl" aria-hidden />
					) : !suggestions.data?.length ? (
						<p className="mt-3 text-white/55">No published suggestions yet. They appear here after moderation.</p>
					) : (
						<ul className="mt-4 grid gap-4 md:grid-cols-2">
							{suggestions.data.map((s, i) => (
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
									<p className="mt-2 text-xs text-white/45">
										{shortKey(s.wallet_address, 5, 5)} · {timeAgo(s.created_at)}
									</p>
								</li>
							))}
						</ul>
					)}
				</section>
			)}
		</div>
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
