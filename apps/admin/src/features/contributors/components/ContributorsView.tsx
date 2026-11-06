"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, UserCheck, UsersRound, Wallet } from "lucide-react";
import { formatAmount } from "@repo/domain/money";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { fullDate, shortKey, timeAgo } from "@/lib/format";
import { routes } from "@/lib/routes";
import { WalletDot } from "@/components/Avatar";
import { EmptyState, ErrorState, IconStat, PageTitle, Pager, RowsSkeleton } from "@/components/ui";
import { useAdminContributions } from "@/features/monitor/hooks";
import { groupByWallet } from "@/features/contributors/summary";

/**
 * Design "admin page 5" ("User"). Contributors have no accounts: each row is a Stellar wallet, grouped from the
 * latest confirmed contributions (the API has no contributor list). Look any wallet up by address.
 */

const SAMPLE = 100;
const PAGE = 8;
const ACTIVE_DAYS = 30;

export function ContributorsView() {
	const router = useRouter();
	const [page, setPage] = useState(1);
	const [lookup, setLookup] = useState("");
	const q = useAdminContributions({ status: "confirmed", limit: SAMPLE, offset: 0 });
	const rows = q.data ? groupByWallet(q.data.result) : undefined;
	const [since] = useState(() => new Date(Date.now() - ACTIVE_DAYS * 86_400_000).toISOString());
	const active = rows?.filter((r) => r.lastAt >= since).length;
	const pages = rows ? Math.max(1, Math.ceil(rows.length / PAGE)) : 1;
	const sampled = q.data && q.data.paginationMeta.totalCount > SAMPLE;

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Contributors</PageTitle>

			<ul className="mt-6 grid gap-4 sm:grid-cols-3 md:gap-7">
				<IconStat
					i={0}
					icon={<UsersRound className="size-7" />}
					value={rows?.length}
					label="Wallets"
					hint={sampled ? `From the latest ${SAMPLE} confirmed` : "With a confirmed contribution"}
				/>
				<IconStat
					i={1}
					icon={<UserCheck className="size-7" />}
					value={active}
					label="Active"
					hint={`Contributed in the last ${ACTIVE_DAYS} days`}
				/>
				<IconStat
					i={2}
					icon={<Wallet className="size-7" />}
					value={q.data?.paginationMeta.totalCount}
					label="Confirmed contributions"
				/>
			</ul>

			<form
				role="search"
				onSubmit={(e) => {
					e.preventDefault();
					const a = lookup.trim().toUpperCase();
					if (/^G[A-Z2-7]{55}$/.test(a)) router.push(routes.contributor(a));
				}}
				className="relative mt-8 max-w-[520px]"
			>
				<label htmlFor="wallet-lookup" className="sr-only">
					Look up a wallet address
				</label>
				<Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-white/50" aria-hidden />
				<input
					id="wallet-lookup"
					value={lookup}
					onChange={(e) => setLookup(e.target.value)}
					placeholder="Look up any wallet address (G…) and press Enter"
					spellCheck={false}
					className="h-11 w-full rounded-lg border border-white/15 bg-transparent pr-3 pl-10 font-mono text-sm outline-none focus:border-primary-500"
				/>
			</form>

			<section data-reveal="up" aria-labelledby="contributors-title" className="admin-card mt-6 overflow-hidden">
				<h2 id="contributors-title" className="px-5 py-6 font-display text-2xl font-bold text-primary-500 md:px-8">
					Recent contributors
				</h2>
				{q.isPending ? (
					<RowsSkeleton rows={6} cols={4} />
				) : q.isError && !rows ? (
					<div className="p-4">
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
					</div>
				) : rows && rows.length === 0 ? (
					<EmptyState title="No contributors yet" description="Wallets appear here after their first confirmed contribution." />
				) : rows ? (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[680px] text-left">
							<thead className="border-t border-white/10 text-base">
								<tr>
									<th scope="col" className="w-[36%] px-5 py-5 font-normal md:px-8">
										Wallet
									</th>
									<th scope="col" className="px-3 py-5 font-normal">
										Contributed
									</th>
									<th scope="col" className="px-3 py-5 text-center font-normal">
										Contributions
									</th>
									<th scope="col" className="px-3 py-5 text-center font-normal">
										Projects
									</th>
									<th scope="col" className="px-3 py-5 text-right font-normal md:pr-8">
										Last
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.slice((page - 1) * PAGE, page * PAGE).map((r, i) => (
									<tr
										key={r.address}
										data-reveal="up"
										style={{ "--d": i } as CSSProperties}
										className="border-t border-white/10 hover:bg-white/[0.025]"
									>
										<td className="px-5 py-4 md:px-8">
											<Link href={routes.contributor(r.address)} className="flex items-center gap-3 hover:text-primary-300">
												<WalletDot address={r.address} className="size-9 ring-0" />
												<span className="font-mono text-[15px]" title={r.address}>
													{shortKey(r.address, 8, 6)}
												</span>
											</Link>
										</td>
										<td className="px-3 tabular-nums">
											{r.totals.map((t) => `${formatAmount(t.amount)} ${t.asset.code}`).join(" · ")}
										</td>
										<td className="px-3 text-center tabular-nums">{r.count}</td>
										<td className="px-3 text-center tabular-nums">{r.projects}</td>
										<td className="px-3 text-right md:pr-8" title={fullDate(r.lastAt)}>
											{timeAgo(r.lastAt)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</section>
			{pages > 1 && <Pager page={page} pages={pages} onPage={setPage} />}
			<p className={cn("mt-4 text-right text-xs text-white/40", !sampled && "hidden")}>
				Grouped from the latest {SAMPLE} confirmed contributions. Look up older wallets by address.
			</p>
		</div>
	);
}
