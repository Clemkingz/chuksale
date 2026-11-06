"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { AuditLogEntry, Page } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { api, cleanParams, unwrap } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { fullDate, shortKey, timeAgo } from "@/lib/format";
import { routes } from "@/lib/routes";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton } from "@/components/ui";

/**
 * /audit-log (`GET /audit-logs`): every admin action, newest first, read-only. Filter by resource type and dates;
 * expand an entry for its request id, IP, metadata and the before/after snapshots of admin decisions.
 */

const PAGE = 20;

/** "project.approve" → "project · approve" for scanning; the raw action stays visible in mono. */
const pretty = (action: string) => action.replace(/[._]/g, " ");

export function AuditLogView() {
	const [resourceType, setResourceType] = useState("");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");
	const [page, setPage] = useState(1);
	const [open, setOpen] = useState<number | null>(null);
	const q = useQuery({
		queryKey: ["admin", "audit", resourceType, from, to, page],
		queryFn: async () =>
			unwrap<Page<AuditLogEntry>>(
				await api.get("/audit-logs", { params: cleanParams({ resourceType, from, to, limit: PAGE, offset: (page - 1) * PAGE }) }),
			),
		placeholderData: keepPreviousData,
	});
	const d = q.data;
	const pages = d ? Math.max(1, Math.ceil(d.paginationMeta.totalCount / PAGE)) : 1;
	// Resource types seen so far, so the filter offers real values.
	const [seen, setSeen] = useState<string[]>([]);
	const types = d?.result.map((a) => a.resourceType).filter((t): t is string => !!t) ?? [];
	if (types.some((t) => !seen.includes(t))) setSeen([...new Set([...seen, ...types])].sort());

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Audit log</PageTitle>
			<p className="mt-2 text-white/60">A permanent record of admin actions. It can’t be edited or deleted.</p>
			<div className="mt-6 flex flex-wrap items-center gap-2">
				<label className="relative">
					<span className="sr-only">Resource type</span>
					<select
						value={resourceType}
						onChange={(e) => {
							setResourceType(e.target.value);
							setPage(1);
						}}
						className="h-10 cursor-pointer rounded-lg border border-white/15 bg-transparent pr-8 pl-3 text-sm outline-none focus:border-primary-500 [&>option]:bg-[#131318]"
					>
						<option value="">All resources</option>
						{seen.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</label>
				<DateInput label="From" value={from} max={to || undefined} onChange={(v) => (setFrom(v), setPage(1))} />
				<span className="text-white/60">to</span>
				<DateInput label="To" value={to} min={from || undefined} onChange={(v) => (setTo(v), setPage(1))} />
				{(resourceType || from || to) && (
					<button
						type="button"
						onClick={() => {
							setResourceType("");
							setFrom("");
							setTo("");
							setPage(1);
						}}
						className="rounded-md px-2 py-1 text-sm text-primary-300 hover:bg-white/5"
					>
						Clear
					</button>
				)}
			</div>
			<div className={cn("admin-card mt-6 overflow-hidden transition-opacity", q.isPlaceholderData && "opacity-60")}>
				{q.isPending ? (
					<RowsSkeleton rows={8} cols={3} />
				) : q.isError && !d ? (
					<div className="p-4">
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
					</div>
				) : d && d.result.length === 0 ? (
					<EmptyState title="No entries" />
				) : d ? (
					<ol className="divide-y divide-white/10">
						{d.result.map((a, i) => {
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
											<span className="block capitalize">{pretty(a.action)}</span>
											<span className="mt-0.5 block truncate font-mono text-xs text-white/40">
												{a.action}
												{a.resourceType && ` · ${a.resourceType}`}
												{a.resourceId && ` ${shortKey(a.resourceId, 8, 4)}`}
											</span>
										</span>
										<span className="shrink-0 text-sm text-white/50" title={fullDate(a.at)}>
											{timeAgo(a.at)}
										</span>
										<ChevronDown className={cn("size-4 shrink-0 text-white/45 transition-transform", expanded && "rotate-180")} />
									</button>
									{expanded && (
										<div className="animate-rise border-t border-white/5 bg-white/[0.02] px-5 py-4 md:px-6">
											<dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
												<Item label="By">
													{a.actorId ? (
														<Link href={routes.builder(a.actorId)} className="font-mono hover:text-primary-300">
															{shortKey(a.actorId, 8, 4)}
														</Link>
													) : (
														"System"
													)}
												</Item>
												<Item label="When">{fullDate(a.at)}</Item>
												<Item label="Request id">
													<span className="font-mono">{a.requestId ?? "—"}</span>
												</Item>
												<Item label="IP">
													<span className="font-mono">{a.ip ?? "—"}</span>
												</Item>
											</dl>
											<div className="mt-3 grid gap-3 md:grid-cols-3">
												{(
													[
														["Details", a.metadata],
														["Before", a.before],
														["After", a.after],
													] as const
												).map(([label, v]) => (
													<div key={label} className="min-w-0">
														<p className="text-xs text-white/50">{label}</p>
														<pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-black/40 p-3 text-xs leading-5 text-white/80">
															{v === null || (typeof v === "object" && Object.keys(v).length === 0)
																? "—"
																: JSON.stringify(v, null, 2)}
														</pre>
													</div>
												))}
											</div>
										</div>
									)}
								</li>
							);
						})}
					</ol>
				) : null}
			</div>
			{pages > 1 && <Pager page={page} pages={pages} onPage={setPage} />}
		</div>
	);
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex gap-2">
			<dt className="w-24 shrink-0 text-white/45">{label}</dt>
			<dd className="min-w-0 break-all">{children}</dd>
		</div>
	);
}

function DateInput({
	label,
	value,
	min,
	max,
	onChange,
}: {
	label: string;
	value: string;
	min?: string;
	max?: string;
	onChange: (v: string) => void;
}) {
	return (
		<label className="relative inline-flex items-center">
			<span className="sr-only">{label}</span>
			<CalendarDays className="pointer-events-none absolute left-2.5 size-4 text-white/70" aria-hidden />
			<input
				type="date"
				value={value}
				min={min}
				max={max}
				onChange={(e) => onChange(e.target.value)}
				className="h-10 rounded-lg border border-white/15 bg-transparent pr-2 pl-8 text-sm text-white outline-none [color-scheme:dark] focus:border-primary-500"
			/>
		</label>
	);
}
