"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ExternalLink, RefreshCw, Search } from "lucide-react";
import { CONTRIBUTION_STATUS_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import type { AdminContribution, ContributionStatus } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { fullDate, shortKey, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { WalletDot } from "@/components/Avatar";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton, UnderlineTabs } from "@/components/ui";
import { useAdminContributions, useReconcile } from "@/features/monitor/hooks";

/**
 * /contributions: every payment, any status, with the raw Stellar result codes. "Re-check" asks the API to look at
 * one again on the network (audit-logged). Filter by status, wallet address and project. Filters live in the URL.
 */

const PAGE = 15;
type Tab = ContributionStatus | "all";
const TABS: { id: Tab; label: string }[] = [
	{ id: "all", label: "All" },
	{ id: "pending", label: "Pending" },
	{ id: "confirmed", label: "Confirmed" },
	{ id: "failed", label: "Failed" },
	{ id: "expired", label: "Expired" },
	{ id: "awaiting_signature", label: "Awaiting signature" },
];

const TONE: Record<ContributionStatus, string> = {
	confirmed: "text-success-300",
	pending: "text-warning-200",
	failed: "text-error-300",
	expired: "text-white/55",
	awaiting_signature: "text-white/65",
};

export function ContributionsMonitor() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const s = params.get("status");
	const tab: Tab = TABS.some((t) => t.id === s) ? (s as Tab) : "all";
	const address = params.get("address") ?? "";
	const projectId = params.get("project") ?? "";
	const page = Math.max(1, Number(params.get("page")) || 1);
	const set = (next: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		for (const [k, v] of Object.entries(next)) {
			if (v === null || v === "" || (k === "status" && v === "all") || (k === "page" && v === 1)) sp.delete(k);
			else sp.set(k, String(v));
		}
		router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false });
	};
	const [search, setSearch] = useState(address);
	const [open, setOpen] = useState<string | null>(null);
	const list = useAdminContributions(
		{ status: tab === "all" ? "" : tab, address: address || undefined, projectId: projectId || undefined, limit: PAGE, offset: (page - 1) * PAGE },
		true,
	);
	const reconcile = useReconcile();
	const d = list.data;
	const pages = d ? Math.max(1, Math.ceil(d.paginationMeta.totalCount / PAGE)) : 1;

	const recheck = (c: AdminContribution) =>
		reconcile.mutate(c.id, {
			onSuccess: (r) => notify.success("Checked on Stellar", `Now ${CONTRIBUTION_STATUS_LABEL[r.status].toLowerCase()}.`),
			onError: (e) => notify.fromError(e),
		});

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Contributions</PageTitle>
			<p className="mt-2 text-white/60">Every payment through Chucksales. Only confirmed ones count toward totals.</p>

			<div className="mt-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
				<UnderlineTabs label="Filter by status" size="md" tabs={TABS} value={tab} onChange={(t) => set({ status: t, page: 1 })} />
				<form
					role="search"
					onSubmit={(e) => {
						e.preventDefault();
						set({ address: search.trim().toUpperCase(), page: 1 });
					}}
					className="relative w-full max-w-[360px]"
				>
					<label htmlFor="address-search" className="sr-only">
						Filter by contributor address
					</label>
					<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/50" aria-hidden />
					<input
						id="address-search"
						type="search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Contributor address (G…)"
						spellCheck={false}
						className="h-10 w-full rounded-lg border border-white/15 bg-transparent pr-3 pl-9 font-mono text-sm outline-none focus:border-primary-500"
					/>
				</form>
			</div>
			{(address || projectId) && (
				<p className="mt-3 text-sm text-white/60">
					Filtered by {address ? `wallet ${shortKey(address)}` : ""}
					{address && projectId ? " and " : ""}
					{projectId ? "one project" : ""} ·{" "}
					<button
						type="button"
						className="text-primary-300 hover:underline"
						onClick={() => {
							setSearch("");
							set({ address: null, project: null, page: 1 });
						}}
					>
						clear
					</button>
				</p>
			)}

			<section className={cn("admin-card mt-6 overflow-hidden transition-opacity", list.isPlaceholderData && "opacity-60")}>
				{list.isPending ? (
					<RowsSkeleton rows={8} cols={5} />
				) : list.isError && !d ? (
					<div className="p-4">
						<ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} retrying={list.isFetching} />
					</div>
				) : d && d.result.length === 0 ? (
					<EmptyState title="No contributions here" description="Payments show up as soon as a contributor prepares one." />
				) : d ? (
					<ul>
						{d.result.map((c, i) => {
							const expanded = open === c.id;
							return (
								<li key={c.id} data-reveal="up" style={{ "--d": Math.min(i, 8) } as CSSProperties} className="border-t border-white/10 first:border-0">
									<button
										type="button"
										aria-expanded={expanded}
										onClick={() => setOpen(expanded ? null : c.id)}
										className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-left hover:bg-white/[0.025] md:px-6"
									>
										<WalletDot address={c.contributorAddress} className="size-8 ring-0" />
										<span className="min-w-0 flex-1">
											<span className="block truncate">{c.project.title}</span>
											<span className="block truncate font-mono text-xs text-white/50">{shortKey(c.contributorAddress, 8, 6)}</span>
										</span>
										<span className="font-medium whitespace-nowrap tabular-nums">
											{formatAmount(c.amount)} {c.asset.code}
										</span>
										<span className={cn("w-36 text-sm", TONE[c.status])}>{CONTRIBUTION_STATUS_LABEL[c.status]}</span>
										<span className="w-24 text-right text-sm text-white/55" title={fullDate(c.createdAt)}>
											{timeAgo(c.createdAt)}
										</span>
										<ChevronDown className={cn("size-4 text-white/50 transition-transform", expanded && "rotate-180")} />
									</button>
									{expanded && (
										<div className="animate-rise grid gap-x-8 gap-y-3 border-t border-white/5 bg-white/[0.015] px-5 py-4 text-sm sm:grid-cols-2 md:px-6">
											<Detail label="From">
												<Link href={routes.contributor(c.contributorAddress)} className="font-mono break-all hover:text-primary-300">
													{c.contributorAddress}
												</Link>
											</Detail>
											<Detail label="To (builder)">
												<span className="font-mono break-all">{c.destination}</span>
											</Detail>
											<Detail label="Asset">
												{c.asset.code}
												{c.asset.issuer && <span className="text-white/50"> · {shortKey(c.asset.issuer)}</span>}
											</Detail>
											<Detail label="Memo">
												<span className="font-mono">{c.memo}</span>
											</Detail>
											<Detail label="Transaction">
												<a href={c.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono hover:text-primary-300">
													{shortKey(c.txHash, 10, 8)} <ExternalLink className="size-3.5" />
												</a>
											</Detail>
											<Detail label="Ledger">{c.ledger ?? "—"}</Detail>
											<Detail label="Times">
												Prepared {fullDate(c.createdAt)}
												{c.submittedAt && ` · submitted ${fullDate(c.submittedAt)}`}
												{c.confirmedAt && ` · confirmed ${fullDate(c.confirmedAt)}`}
											</Detail>
											<Detail label="Result codes">
												{c.resultCodes?.length ? <span className="font-mono">{c.resultCodes.join(", ")}</span> : "—"}
											</Detail>
											{c.failureReason && (
												<div className="sm:col-span-2">
													<Detail label="Failure reason">
														<span className="text-error-200">{c.failureReason}</span>
													</Detail>
												</div>
											)}
											<div className="flex flex-wrap gap-2 sm:col-span-2">
												<Button
													variant="outline"
													size="sm"
													className="w-auto gap-2 px-4"
													isLoading={reconcile.isPending && reconcile.variables === c.id}
													loadingLabel="Checking"
													onClick={() => recheck(c)}
												>
													<RefreshCw className="size-4" /> Re-check on Stellar
												</Button>
												<Button asChild variant="ghost" size="sm" className="w-auto px-4">
													<Link href={routes.project(c.project.id)}>Open project</Link>
												</Button>
											</div>
										</div>
									)}
								</li>
							);
						})}
					</ul>
				) : null}
			</section>
			{pages > 1 && <Pager page={page} pages={pages} onPage={(p) => set({ page: p })} />}
		</div>
	);
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="min-w-0">
			<p className="text-xs text-white/45">{label}</p>
			<div className="mt-0.5 break-words">{children}</div>
		</div>
	);
}
