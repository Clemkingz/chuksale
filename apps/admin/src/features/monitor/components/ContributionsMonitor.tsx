"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ExternalLink, RefreshCw, Search } from "lucide-react";
import { CONTRIBUTION_STATUS_LABEL } from "@repo/domain/labels";
import type { ContributionStatus, Paginated } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { api, unwrap } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { EXPLORER, fullDate, money, shortKey, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { WalletDot } from "@/components/Avatar";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton, UnderlineTabs } from "@/components/ui";

/**
 * /contributions (PRD Phase 5 step 8): every contribution, any status, with what the verifier found. Flagged = the
 * payment didn't match (memo, amount, destination…). "Re-verify" re-runs the check and is audit-logged.
 */

type Tab = "all" | "confirmed" | "pending" | "failed" | "flagged";
type Row = {
	id: string;
	project: { id: string; title: string };
	sender_address: string;
	destination: string;
	amount: string;
	asset_code: string;
	status: ContributionStatus;
	tx_hash: string;
	reference: string | null;
	ledger: string | null;
	failure_reason: string | null;
	reconcile_flag: string | null;
	simulated: boolean;
	created_at: string;
	confirmed_at: string | null;
};

const TONE: Partial<Record<ContributionStatus, string>> = {
	confirmed: "text-success-300",
	pending: "text-warning-200",
	failed: "text-error-300",
};

export function ContributionsMonitor() {
	const [tab, setTab] = useState<Tab>("all");
	const [page, setPage] = useState(1);
	const [q, setQ] = useState("");
	const [search, setSearch] = useState("");
	const [open, setOpen] = useState<string | null>(null);
	useEffect(() => {
		const t = setTimeout(() => {
			setSearch(q.trim());
			setPage(1);
		}, 300);
		return () => clearTimeout(t);
	}, [q]);
	const qc = useQueryClient();
	const list = useQuery({
		queryKey: ["admin", "contributions", tab, search, page],
		queryFn: async () =>
			unwrap<Paginated<Row> & { counts: Record<Tab, number> }>(
				await api.get("/admin/contributions", { params: { status: tab, q: search || undefined, page } }),
			),
		placeholderData: keepPreviousData,
		refetchInterval: 15_000,
	});
	const reconcile = useMutation({
		mutationFn: async (id: string) => unwrap<{ status: string }>(await api.post(`/admin/contributions/${id}/reconcile`)),
		onSuccess: () => {
			notify.success("Verification re-queued", "Pending payments are checked against Stellar again.");
			void qc.invalidateQueries({ queryKey: ["admin", "contributions"] });
		},
		onError: (e) => notify.fromError(e),
	});
	const d = list.data;

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Contributions</PageTitle>
			<p className="mt-2 text-white/60">
				Only confirmed contributions count toward totals. Pending and failed ones are listed for monitoring.
			</p>
			<div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<UnderlineTabs
					size="md"
					label="Filter by status"
					tabs={[
						{ id: "all", label: "All" },
						{ id: "confirmed", label: "Confirmed" },
						{ id: "pending", label: "Pending" },
						{ id: "failed", label: "Failed" },
						{ id: "flagged", label: "Flagged" },
					]}
					value={tab}
					counts={d?.counts}
					onChange={(t) => {
						setTab(t);
						setPage(1);
					}}
				/>
				<label className="group relative block w-full xl:w-[340px]">
					<span className="sr-only">Search by hash, wallet, project or memo</span>
					<Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/55" aria-hidden />
					<input
						type="search"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Hash, wallet, project or memo"
						className="h-11 w-full rounded-lg border border-primary-500/50 bg-transparent pr-3 pl-10 text-sm outline-none placeholder:text-white/45 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30"
					/>
				</label>
			</div>

			<div className={cn("admin-card mt-6 overflow-hidden transition-opacity", list.isPlaceholderData && "opacity-60")}>
				{list.isPending ? (
					<RowsSkeleton rows={6} cols={5} />
				) : list.isError && !d ? (
					<div className="p-4">
						<ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} retrying={list.isFetching} />
					</div>
				) : d && d.items.length === 0 ? (
					<EmptyState title="No contributions here" description={search ? "Try another search." : undefined} />
				) : d ? (
					<ul className="divide-y divide-white/10">
						{d.items.map((c, i) => {
							const expanded = open === c.id;
							return (
								<li key={c.id} data-reveal="up" style={{ "--d": i } as CSSProperties}>
									<button
										type="button"
										aria-expanded={expanded}
										onClick={() => setOpen(expanded ? null : c.id)}
										className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.025] md:grid-cols-[auto_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] md:px-6"
									>
										<WalletDot address={c.sender_address} className="size-8 ring-0" />
										<span className="min-w-0">
											<span className="block truncate">{c.project.title}</span>
											<span className="block truncate font-mono text-xs text-white/50">{shortKey(c.sender_address, 6, 4)}</span>
										</span>
										<span className="hidden font-medium tabular-nums md:block">{money(c.amount, c.asset_code)}</span>
										<span className={cn("hidden items-center gap-1.5 text-sm md:flex", TONE[c.status])}>
											{c.reconcile_flag && <AlertTriangle className="size-4 text-warning-200" aria-label="Flagged" />}
											{CONTRIBUTION_STATUS_LABEL[c.status]}
										</span>
										<span className="flex items-center gap-2 text-right">
											<span className="text-xs text-white/50 md:text-sm">
												<span className={cn("block md:hidden", TONE[c.status])}>{money(c.amount, c.asset_code)}</span>
												{timeAgo(c.created_at)}
											</span>
											<ChevronDown className={cn("size-4 text-white/50 transition-transform", expanded && "rotate-180")} />
										</span>
									</button>
									{expanded && (
										<div className="animate-rise border-t border-white/5 bg-white/[0.02] px-4 py-4 md:px-6">
											<dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
												<Item label="Status" value={CONTRIBUTION_STATUS_LABEL[c.status]} />
												<Item label="Memo (reference)" value={c.reference ?? "—"} mono />
												<Item label="Ledger" value={c.ledger ?? "—"} />
												<Item label="From" value={c.sender_address} mono />
												<Item label="To" value={c.destination} mono />
												<Item
													label="Transaction"
													value={c.simulated ? "Simulated (Demo wallet)" : c.tx_hash}
													mono
													link={c.simulated ? undefined : `${EXPLORER}/tx/${c.tx_hash}`}
												/>
												<Item label="Sent" value={fullDate(c.created_at)} />
												<Item label="Confirmed" value={c.confirmed_at ? fullDate(c.confirmed_at) : "—"} />
											</dl>
											{(c.failure_reason || c.reconcile_flag) && (
												<p className="mt-3 rounded-lg border border-warning-400/25 bg-warning-400/[0.06] px-3.5 py-2.5 text-sm text-warning-100">
													{c.reconcile_flag ?? c.failure_reason}
												</p>
											)}
											{(c.status === "pending" || (c.status === "failed" && !c.simulated)) && (
												<Button
													size="sm"
													variant="outline"
													className="mt-4 h-9 gap-1.5"
													onClick={() => reconcile.mutate(c.id)}
													isLoading={reconcile.isPending && reconcile.variables === c.id}
													loadingLabel="Re-queuing"
												>
													<RefreshCw className="size-4" /> Re-verify on Stellar
												</Button>
											)}
										</div>
									)}
								</li>
							);
						})}
					</ul>
				) : null}
			</div>
			{d && <Pager page={d.meta.page} pages={d.meta.total_pages} onPage={setPage} />}
		</div>
	);
}

function Item({ label, value, mono, link }: { label: string; value: string; mono?: boolean; link?: string }) {
	return (
		<div className="min-w-0">
			<dt className="text-xs text-white/50">{label}</dt>
			<dd className={cn("mt-0.5 truncate", mono && "font-mono text-[13px]")} title={value}>
				{link ? (
					<a
						href={link}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex max-w-full items-center gap-1 hover:text-primary-300"
					>
						<span className="truncate">{value}</span> <ExternalLink className="size-3.5 shrink-0" />
					</a>
				) : (
					value
				)}
			</dd>
		</div>
	);
}
