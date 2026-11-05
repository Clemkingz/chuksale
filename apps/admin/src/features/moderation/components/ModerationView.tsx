"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Flag } from "lucide-react";
import { SUGGESTION_STATUS_LABEL, SUGGESTION_TYPE_LABEL } from "@repo/domain/labels";
import type { SuggestionStatus } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { shortKey, timeAgo } from "@/lib/format";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton, UnderlineTabs } from "@/components/ui";
import { useModerationQueue, type ModTab } from "@/features/moderation/hooks";
import { ModerationActions } from "@/features/moderation/components/ModerationActions";

/** /suggestions (PRD /admin/suggestions): queue with Pending / Reported / Published / All; act inline or open one. */

export const SUGGESTION_TONE: Record<SuggestionStatus, string> = {
	pending_moderation: "bg-warning-400/15 text-warning-100",
	published: "bg-success-400/15 text-success-100",
	hidden: "bg-white/10 text-white/60",
	rejected: "bg-error-400/15 text-error-100",
};

export function ModerationView() {
	const [tab, setTab] = useState<ModTab>("pending");
	const [page, setPage] = useState(1);
	const q = useModerationQueue(tab, page);
	const d = q.data;
	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Suggestions</PageTitle>
			<p className="mt-2 text-white/60">New suggestions stay private until you publish them (D8).</p>
			<div className="mt-6">
				<UnderlineTabs
					label="Moderation queue"
					tabs={[
						{ id: "pending", label: "Pending" },
						{ id: "reported", label: "Reported" },
						{ id: "published", label: "Published" },
						{ id: "all", label: "All" },
					]}
					value={tab}
					counts={d?.counts}
					onChange={(t) => {
						setTab(t);
						setPage(1);
					}}
				/>
			</div>
			<div className={cn("mt-7 transition-opacity", q.isPlaceholderData && "opacity-60")}>
				{q.isPending ? (
					<div className="admin-card">
						<RowsSkeleton rows={4} cols={3} />
					</div>
				) : q.isError && !d ? (
					<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
				) : d && d.items.length === 0 ? (
					<div className="admin-card">
						<EmptyState
							title={tab === "pending" ? "Queue is clear" : "Nothing here"}
							description={tab === "pending" ? "New suggestions will show up here." : undefined}
						/>
					</div>
				) : d ? (
					<ul className="flex flex-col gap-4">
						{d.items.map((s, i) => (
							<li key={s.id} data-reveal="up" style={{ "--d": i } as CSSProperties} className="admin-card px-5 py-5 md:px-6">
								<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2 text-xs">
											<span className={cn("rounded-full px-2.5 py-0.5", SUGGESTION_TONE[s.status])}>
												{SUGGESTION_STATUS_LABEL[s.status]}
											</span>
											<span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-white/70">
												{SUGGESTION_TYPE_LABEL[s.type]}
											</span>
											{s.report_count > 0 && (
												<span className="inline-flex items-center gap-1 rounded-full bg-error-400/15 px-2.5 py-0.5 text-error-100">
													<Flag className="size-3" /> {s.report_count} report{s.report_count === 1 ? "" : "s"}
												</span>
											)}
										</div>
										<Link
											href={`/suggestions/${s.id}`}
											className="mt-2 block font-display text-lg font-bold break-words hover:text-primary-300"
										>
											{s.title}
										</Link>
										<p className="mt-1 line-clamp-2 text-[15px] leading-6 break-words text-white/75">{s.body}</p>
										<p className="mt-2 text-xs text-white/45">
											On <span className="text-white/70">{s.project.title}</span> · {shortKey(s.wallet_address, 5, 5)} ·{" "}
											{timeAgo(s.created_at)}
										</p>
									</div>
									<ModerationActions id={s.id} title={s.title} status={s.status} compact />
								</div>
							</li>
						))}
					</ul>
				) : null}
			</div>
			{d && <Pager page={d.meta.page} pages={d.meta.total_pages} onPage={setPage} />}
		</div>
	);
}
