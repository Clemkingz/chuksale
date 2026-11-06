"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Flag } from "lucide-react";
import { SUGGESTION_STATUS_LABEL, SUGGESTION_TYPE_LABEL } from "@repo/domain/labels";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL } from "@repo/domain/labels";
import { EXPLORER, fullDate, shortKey, timeAgo } from "@/lib/format";
import { routes } from "@/lib/routes";
import { ErrorState } from "@/components/ui";
import { useSuggestion } from "@/features/moderation/hooks";
import { ModerationActions } from "@/features/moderation/components/ModerationActions";
import { SUGGESTION_TONE } from "@/features/moderation/components/ModerationView";

/** /suggestions/[id]: the full text (rendered as text, never HTML), project, sender wallet, its reports, actions. */
export function SuggestionDetailView({ id }: { id: string }) {
	const q = useSuggestion(id);
	const s = q.data;
	return (
		<div className="admin-container max-w-[900px] pt-2 md:pt-6">
			<Link
				href={routes.suggestions}
				className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/5 hover:text-white"
			>
				<ArrowLeft className="size-4" /> Moderation queue
			</Link>
			{q.isError ? (
				<div className="mt-6">
					<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
				</div>
			) : !s ? (
				<div className="skeleton-shimmer mt-6 h-80 rounded-2xl" aria-hidden />
			) : (
				<>
					<div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
						<div className="min-w-0">
							<div className="flex flex-wrap gap-2 text-xs">
								<span className={cn("rounded-full px-2.5 py-0.5", SUGGESTION_TONE[s.status])}>
									{SUGGESTION_STATUS_LABEL[s.status]}
								</span>
								<span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-white/70">{SUGGESTION_TYPE_LABEL[s.type]}</span>
							</div>
							<h1 className="animate-rise mt-3 font-display text-[28px] leading-tight font-bold break-words">{s.title}</h1>
						</div>
						<ModerationActions id={s.id} title={s.title} status={s.status} />
					</div>
					<article className="admin-card animate-rise mt-6 px-5 py-5 md:px-7">
						<p className="leading-8 break-words whitespace-pre-line text-white/90">{s.body}</p>
						{s.link && (
							<p className="mt-4 rounded-lg border border-warning-400/25 bg-warning-400/[0.06] px-3.5 py-2.5 text-sm break-all">
								Link (check before approving): <span className="text-warning-100">{s.link}</span>
							</p>
						)}
					</article>
					<dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
						<div className="bg-surface-900 px-5 py-4">
							<dt className="text-sm text-white/50">Project</dt>
							<dd className="mt-1 truncate">
								<Link href={routes.project(s.project.id)} className="hover:text-primary-300">
									{s.project.title}
								</Link>
							</dd>
						</div>
						<div className="bg-surface-900 px-5 py-4">
							<dt className="text-sm text-white/50">Sent by</dt>
							<dd className="mt-1">
								<a
									href={`${EXPLORER}/account/${s.walletAddress}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 font-mono text-sm hover:text-primary-300"
								>
									{shortKey(s.walletAddress, 6, 6)} <ExternalLink className="size-3.5" />
								</a>
								<Link href={routes.contributor(s.walletAddress)} className="block text-xs text-primary-300 hover:underline">
									This wallet’s activity
								</Link>
							</dd>
						</div>
						<div className="bg-surface-900 px-5 py-4">
							<dt className="text-sm text-white/50">Received</dt>
							<dd className="mt-1" title={fullDate(s.createdAt)}>
								{timeAgo(s.createdAt)}
							</dd>
						</div>
					</dl>
					{s.moderationNote && (
						<p className="mt-4 text-sm whitespace-pre-line text-white/60">
							Moderation note{s.moderatedBy ? ` (by ${s.moderatedBy}${s.moderatedAt ? `, ${timeAgo(s.moderatedAt)}` : ""})` : ""}:{" "}
							{s.moderationNote}
						</p>
					)}
					<section aria-labelledby="reports-title" className="mt-8">
						<h2 id="reports-title" className="flex items-center gap-2 font-display text-xl font-bold">
							<Flag className="size-5 text-error-200" /> Reports ({s.reports.length})
						</h2>
						{s.reports.length === 0 ? (
							<p className="mt-2 text-white/55">No one has reported this suggestion.</p>
						) : (
							<ul className="mt-3 flex flex-col gap-2">
								{s.reports.map((r) => (
									<li key={r.id} className="rounded-xl border border-white/10 px-4 py-3 text-sm">
										<p>
											{REPORT_REASON_LABEL[r.reason]}
											{r.details && <span className="whitespace-pre-line text-white/70"> · {r.details}</span>}
										</p>
										<p className="mt-1 text-xs text-white/45">
											{shortKey(r.reporterAddress, 5, 5)} · {timeAgo(r.createdAt)} · {REPORT_STATUS_LABEL[r.status]}
										</p>
									</li>
								))}
							</ul>
						)}
					</section>
				</>
			)}
		</div>
	);
}
