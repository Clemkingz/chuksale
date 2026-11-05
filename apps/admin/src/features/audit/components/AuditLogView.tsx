"use client";

import { useState, type CSSProperties } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import type { AuditLog, Paginated } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { api, unwrap } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { fullDate, timeAgo } from "@/lib/format";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton, UnderlineTabs } from "@/components/ui";

/** /audit-log (PRD §18): every admin action, read-only. Expand an entry to see the before/after snapshots. */

type Entry = AuditLog & { actor_name: string; entity_label: string };
type Filter = "all" | "project" | "suggestion" | "contribution" | "category" | "user";

const ACTION_LABEL: Record<string, string> = {
	"project.approve": "approved",
	"project.reject": "rejected",
	"project.request_changes": "requested changes on",
	"project.under_review": "started reviewing",
	"project.publish": "published",
	"project.unpublish": "unpublished",
	"project.feature": "featured",
	"project.unfeature": "un-featured",
	"suggestion.publish": "published a suggestion:",
	"suggestion.hide": "hid a suggestion:",
	"suggestion.reject": "rejected a suggestion:",
	"contribution.reconcile": "re-verified a contribution",
	"category.create": "added the category",
	"category.update": "updated the category",
	"builder.suspend": "suspended",
	"builder.reactivate": "reactivated",
	"admin.password_change": "changed their password",
	"admin.delete_account": "deleted their account",
};

export function AuditLogView() {
	const [filter, setFilter] = useState<Filter>("all");
	const [page, setPage] = useState(1);
	const [open, setOpen] = useState<string | null>(null);
	const q = useQuery({
		queryKey: ["admin", "audit", filter, page],
		queryFn: async () => unwrap<Paginated<Entry>>(await api.get("/admin/audit-log", { params: { entity_type: filter, page } })),
		placeholderData: keepPreviousData,
	});
	const d = q.data;
	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Audit log</PageTitle>
			<p className="mt-2 text-white/60">A permanent record of admin actions. It can’t be edited or deleted.</p>
			<div className="mt-6">
				<UnderlineTabs
					size="md"
					label="Filter by type"
					tabs={[
						{ id: "all", label: "All" },
						{ id: "project", label: "Projects" },
						{ id: "suggestion", label: "Suggestions" },
						{ id: "contribution", label: "Contributions" },
						{ id: "category", label: "Categories" },
						{ id: "user", label: "Accounts" },
					]}
					value={filter}
					onChange={(f) => {
						setFilter(f);
						setPage(1);
					}}
				/>
			</div>
			<div className={cn("admin-card mt-6 overflow-hidden transition-opacity", q.isPlaceholderData && "opacity-60")}>
				{q.isPending ? (
					<RowsSkeleton rows={8} cols={3} />
				) : q.isError && !d ? (
					<div className="p-4">
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
					</div>
				) : d && d.items.length === 0 ? (
					<EmptyState title="No entries yet" />
				) : d ? (
					<ol className="divide-y divide-white/10">
						{d.items.map((a, i) => {
							const expanded = open === a.id;
							return (
								<li key={a.id} data-reveal="up" style={{ "--d": Math.min(i, 6) } as CSSProperties}>
									<button
										type="button"
										aria-expanded={expanded}
										onClick={() => setOpen(expanded ? null : a.id)}
										className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.025] md:px-6"
									>
										<span className="min-w-0 flex-1">
											<span className="block">
												<span className="font-medium">{a.actor_name}</span>{" "}
												<span className="text-white/70">{ACTION_LABEL[a.action] ?? a.action}</span>{" "}
												<span className="text-primary-200">{a.entity_label}</span>
											</span>
											<span className="mt-0.5 block font-mono text-xs text-white/40">{a.action}</span>
										</span>
										<span className="shrink-0 text-sm text-white/50" title={fullDate(a.created_at)}>
											{timeAgo(a.created_at)}
										</span>
										<ChevronDown className={cn("size-4 shrink-0 text-white/45 transition-transform", expanded && "rotate-180")} />
									</button>
									{expanded && (
										<div className="animate-rise grid gap-3 border-t border-white/5 bg-white/[0.02] px-5 py-4 md:grid-cols-2 md:px-6">
											{(["before_snapshot", "after_snapshot"] as const).map((k) => (
												<div key={k} className="min-w-0">
													<p className="text-xs text-white/50">{k === "before_snapshot" ? "Before" : "After"}</p>
													<pre className="mt-1 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs leading-5 text-white/80">
														{a[k] === null ? "—" : JSON.stringify(a[k], null, 2)}
													</pre>
												</div>
											))}
										</div>
									)}
								</li>
							);
						})}
					</ol>
				) : null}
			</div>
			{d && <Pager page={d.meta.page} pages={d.meta.total_pages} onPage={setPage} />}
		</div>
	);
}
