"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { CONTRIBUTION_STATUS_LABEL } from "@repo/domain/labels";
import { formatAmount } from "@repo/domain/money";
import type { ContributionStatus, Paginated } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { api, unwrap } from "@/lib/api/client";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { EXPLORER, fullDate, money, shortKey, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { Avatar, WalletDot } from "@/components/Avatar";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton } from "@/components/ui";

/**
 * /contributors/[address]: one contributor wallet (admin page 5 → detail). Its live Stellar Testnet balance (read
 * straight from Horizon), confirmed totals per asset, and every contribution it sent with memo, hash and status.
 */

const HORIZON = process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org";
type Detail = Paginated<{
	id: string;
	project: { id: string; title: string; logo_url: string | null };
	amount: string;
	asset_code: string;
	status: ContributionStatus;
	tx_hash: string;
	reference: string | null;
	destination: string;
	failure_reason: string | null;
	created_at: string;
	confirmed_at: string | null;
}> & {
	wallet_address: string;
	totals: Record<string, string>;
	confirmed_count: number;
	pending_count: number;
	failed_count: number;
	project_count: number;
	first_at: string;
	last_at: string;
	suggestion_count: number;
	simulated: boolean;
};

const TONE: Partial<Record<ContributionStatus, string>> = {
	confirmed: "text-success-300",
	pending: "text-warning-200",
	failed: "text-error-300",
};

export function ContributorDetailView({ address }: { address: string }) {
	const [page, setPage] = useState(1);
	const q = useQuery({
		queryKey: ["admin", "contributors", "detail", address, page],
		queryFn: async () => unwrap<Detail>(await api.get(`/admin/contributors/${address}`, { params: { page } })),
		placeholderData: keepPreviousData,
	});
	const balance = useQuery({
		queryKey: ["admin", "balance", address],
		queryFn: async () => {
			const res = await fetch(`${HORIZON}/accounts/${address}`);
			if (res.status === 404) return null;
			if (!res.ok) throw new Error("Stellar Testnet couldn’t be reached.");
			return ((await res.json()) as { balances: { asset_type: string; asset_code?: string; balance: string }[] }).balances;
		},
	});
	const d = q.data;

	return (
		<div className="admin-container pt-2 md:pt-6">
			<Link
				href="/contributors"
				className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-white/70 hover:bg-white/5 hover:text-white"
			>
				<ArrowLeft className="size-4" /> Contributors
			</Link>
			<div className="mt-4 flex items-center gap-4">
				<WalletDot address={address} className="size-14 ring-0" />
				<div className="min-w-0">
					<PageTitle>Contributor</PageTitle>
					<p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-sm break-all text-white/80">
						{address}
						<button
							type="button"
							aria-label="Copy address"
							onClick={() => navigator.clipboard.writeText(address).then(() => notify.success("Address copied"))}
							className="flex size-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
						>
							<Copy className="size-3.5" />
						</button>
						<a
							href={`${EXPLORER}/account/${address}`}
							target="_blank"
							rel="noopener noreferrer"
							aria-label="View on Stellar Expert"
							className="flex size-7 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
						>
							<ExternalLink className="size-3.5" />
						</a>
					</p>
				</div>
			</div>

			{q.isError ? (
				<div className="mt-8">
					{errorStatus(q.error) === 404 ? (
						<EmptyState title="No contributions from this wallet" />
					) : (
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
					)}
				</div>
			) : (
				<>
					<div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
						<section
							aria-label="Totals"
							className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10"
						>
							{[
								{ label: "XLM contributed (confirmed)", value: d ? formatAmount(d.totals.XLM ?? "0") : undefined },
								{ label: "USDC contributed (confirmed)", value: d ? formatAmount(d.totals.USDC ?? "0") : undefined },
								{
									label: "Contributions",
									value: d ? `${d.confirmed_count} confirmed · ${d.pending_count} pending · ${d.failed_count} failed` : undefined,
									small: true,
								},
								{ label: "Projects supported", value: d?.project_count },
								{ label: "First contribution", value: d ? fullDate(d.first_at) : undefined, small: true },
								{ label: "Suggestions sent", value: d?.suggestion_count },
							].map((s, i) => (
								<div
									key={s.label}
									data-reveal="up"
									style={{ "--d": i % 2 } as CSSProperties}
									className="bg-surface-900 px-5 py-4"
								>
									<p className="text-xs text-white/50">{s.label}</p>
									<p className={cn("mt-1 font-display font-bold", s.small ? "text-base" : "text-2xl")}>
										{s.value === undefined ? <span className="skeleton-shimmer inline-block h-6 w-20 rounded" /> : s.value}
									</p>
								</div>
							))}
						</section>
						<section aria-labelledby="bal-title" className="admin-card px-5 py-5">
							<div className="flex items-center justify-between">
								<h2 id="bal-title" className="font-display text-lg font-bold">
									Wallet balance
								</h2>
								<button
									type="button"
									onClick={() => void balance.refetch()}
									aria-label="Refresh balance"
									className="flex size-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/10"
								>
									<RefreshCw className={cn("size-4", balance.isFetching && "animate-spin")} />
								</button>
							</div>
							<p className="text-xs text-white/45">Live from Stellar Testnet</p>
							{balance.isPending ? (
								<span className="skeleton-shimmer mt-4 block h-16 rounded-xl" aria-hidden />
							) : balance.isError ? (
								<p className="mt-4 text-sm text-error-200">{balance.error.message}</p>
							) : balance.data === null ? (
								<p className="mt-4 rounded-xl border border-dashed border-white/15 px-4 py-4 text-sm leading-6 text-white/60">
									This account doesn’t exist on Testnet
									{d?.simulated
										? ": its contributions here are demo data (simulated)."
										: " (it may have been merged, or Testnet was reset)."}
								</p>
							) : (
								<ul className="mt-4 flex flex-col gap-2">
									{balance.data.map((b) => (
										<li
											key={`${b.asset_type}-${b.asset_code ?? "xlm"}`}
											className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3"
										>
											<span>{b.asset_type === "native" ? "XLM" : b.asset_code}</span>
											<span className="font-display text-xl font-bold tabular-nums">{formatAmount(b.balance)}</span>
										</li>
									))}
								</ul>
							)}
						</section>
					</div>

					<section aria-labelledby="sent-title" className="admin-card mt-6 overflow-hidden">
						<h2 id="sent-title" className="px-5 py-5 font-display text-xl font-bold md:px-6">
							Funds sent
						</h2>
						{q.isPending ? (
							<RowsSkeleton rows={5} cols={4} />
						) : d ? (
							<div className="overflow-x-auto">
								<table className="w-full min-w-[760px] text-left">
									<thead className="border-y border-white/10 text-sm text-white/55">
										<tr>
											<th scope="col" className="px-6 py-3 font-normal">
												Project
											</th>
											<th scope="col" className="px-3 py-3 font-normal">
												Amount
											</th>
											<th scope="col" className="px-3 py-3 font-normal">
												Status
											</th>
											<th scope="col" className="px-3 py-3 font-normal">
												Memo
											</th>
											<th scope="col" className="px-3 py-3 font-normal">
												Transaction
											</th>
											<th scope="col" className="px-6 py-3 text-right font-normal">
												Sent
											</th>
										</tr>
									</thead>
									<tbody>
										{d.items.map((c, i) => (
											<tr
												key={c.id}
												data-reveal="up"
												style={{ "--d": i } as CSSProperties}
												className="border-b border-white/5 last:border-0"
											>
												<td className="px-6 py-3.5">
													<Link href={`/projects/${c.project.id}`} className="flex items-center gap-3 hover:text-primary-300">
														<Avatar name={c.project.title} src={c.project.logo_url} className="size-9 text-[11px]" />
														<span className="truncate">{c.project.title}</span>
													</Link>
												</td>
												<td
													className={cn(
														"px-3 font-medium whitespace-nowrap",
														c.status === "failed" && "text-white/45 line-through",
													)}
												>
													{money(c.amount, c.asset_code)}
												</td>
												<td className={cn("px-3 text-sm", TONE[c.status])} title={c.failure_reason ?? undefined}>
													{CONTRIBUTION_STATUS_LABEL[c.status]}
												</td>
												<td className="px-3 font-mono text-xs text-white/70">{c.reference ?? "—"}</td>
												<td className="px-3 text-sm">
													<a
														href={`${EXPLORER}/tx/${c.tx_hash}`}
														target="_blank"
														rel="noopener noreferrer"
														className="inline-flex items-center gap-1 font-mono text-white/70 hover:text-primary-300"
													>
														{shortKey(c.tx_hash, 6, 4)} <ExternalLink className="size-3.5" />
													</a>
												</td>
												<td className="px-6 text-right text-sm whitespace-nowrap text-white/60" title={fullDate(c.created_at)}>
													{timeAgo(c.created_at)}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : null}
					</section>
					{d && <Pager page={d.meta.page} pages={d.meta.total_pages} onPage={setPage} />}
				</>
			)}
		</div>
	);
}
