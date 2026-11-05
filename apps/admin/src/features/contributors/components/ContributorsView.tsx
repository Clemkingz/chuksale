"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Copy, UserCheck, UserMinus, UsersRound } from "lucide-react";
import type { AdminContributor, Paginated } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { api, unwrap } from "@/lib/api/client";
import { errorMessage } from "@/lib/api/errors";
import { fullDate, money, shortKey, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { WalletDot } from "@/components/Avatar";
import { EmptyState, ErrorState, IconStat, PageTitle, Pager, RowsSkeleton } from "@/components/ui";

/**
 * Design "admin page 5" ("User"). Contributors have no accounts (PRD §3.2): each row is a Stellar wallet with its
 * confirmed contributions. Stat cards: all contributors, active (contributed in the last 30 days) and inactive.
 * The design's "Disabled" card assumed blockable accounts, which the PRD doesn't have (D23).
 * Columns: wallet · total contributed · share of everything contributed · number of contributions.
 */

type Page = Paginated<AdminContributor> & {
	stats: { contributors: number; active: number; inactive: number; active_days: number };
};

export function ContributorsView() {
	const [page, setPage] = useState(1);
	const q = useQuery({
		queryKey: ["admin", "contributors", page],
		queryFn: async () => unwrap<Page>(await api.get("/admin/contributors", { params: { page, limit: 6 } })),
		placeholderData: keepPreviousData,
	});
	const d = q.data;

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Contributors</PageTitle>

			<ul className="mt-6 grid gap-4 sm:grid-cols-3 md:gap-7">
				<IconStat i={0} icon={<UsersRound className="size-7" />} value={d?.stats.contributors} label="Contributors" />
				<IconStat
					i={1}
					icon={<UserCheck className="size-7" />}
					value={d?.stats.active}
					label="Active"
					hint={d ? `Contributed in the last ${d.stats.active_days} days` : undefined}
				/>
				<IconStat
					i={2}
					icon={<UserMinus className="size-7" />}
					value={d?.stats.inactive}
					label="Inactive"
					hint={d ? `No contributions in ${d.stats.active_days} days` : undefined}
				/>
			</ul>

			<section data-reveal="up" aria-labelledby="contributors-title" className="admin-card mt-8 overflow-hidden md:mt-12">
				<h2 id="contributors-title" className="px-5 py-6 font-display text-2xl font-bold text-primary-500 md:px-8 md:text-[32px]">
					Contributors
				</h2>
				{q.isPending ? (
					<RowsSkeleton rows={6} cols={4} />
				) : q.isError && !d ? (
					<div className="p-4">
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
					</div>
				) : d && d.items.length === 0 ? (
					<EmptyState title="No contributors yet" description="Wallets appear here after their first confirmed contribution." />
				) : d ? (
					<div className={cn("overflow-x-auto transition-opacity", q.isPlaceholderData && "opacity-60")}>
						<table className="w-full min-w-[680px] text-left">
							<thead className="border-t border-white/10 text-base md:text-lg">
								<tr>
									<th scope="col" className="w-[34%] px-5 py-6 font-normal md:px-8">
										Contributor
									</th>
									<th scope="col" className="px-3 py-6 text-center font-normal">
										Total amount
										<br className="hidden md:block" /> contributed
									</th>
									<th
										scope="col"
										className="px-3 py-6 text-center font-normal"
										title="Share of everything contributed on Chucksales"
									>
										Percentage of all
										<br className="hidden md:block" /> contributions
									</th>
									<th scope="col" className="px-3 py-6 text-center font-normal">
										Contributions
										<br className="hidden md:block" /> made
									</th>
								</tr>
							</thead>
							<tbody>
								{d.items.map((c, i) => (
									<tr
										key={c.wallet_address}
										data-reveal="up"
										style={{ "--d": i } as CSSProperties}
										className="border-t border-white/10 transition-colors hover:bg-white/[0.025]"
									>
										<td className="px-5 py-5 md:px-8">
											<div className="flex items-center gap-3">
												<WalletDot address={c.wallet_address} className="size-8 ring-0" />
												<div className="min-w-0">
													<Link
														href={`/contributors/${c.wallet_address}`}
														className="block font-mono text-[15px] hover:text-primary-300"
														title={`${c.wallet_address}: view balance and funds sent`}
													>
														{shortKey(c.wallet_address, 10, 8)}
													</Link>
													<p className="text-xs text-white/45" title={fullDate(c.last_contributed_at)}>
														Last: {timeAgo(c.last_contributed_at)} · {c.project_count} project{c.project_count === 1 ? "" : "s"}
													</p>
												</div>
												<button
													type="button"
													aria-label={`Copy ${c.wallet_address}`}
													onClick={async () => {
														try {
															await navigator.clipboard.writeText(c.wallet_address);
															notify.success("Address copied");
														} catch {
															notify.error("Couldn’t copy");
														}
													}}
													className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-md text-white/45 hover:bg-white/10 hover:text-white"
												>
													<Copy className="size-3.5" />
												</button>
											</div>
										</td>
										<td className="px-3 text-center text-base">{money(c.total_amount, c.asset_code)}</td>
										<td className="px-3 text-center text-base tabular-nums">{c.share_percent}%</td>
										<td className="px-3 text-center text-base tabular-nums">{c.contribution_count}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : null}
			</section>
			{d && <Pager page={d.meta.page} pages={d.meta.total_pages} onPage={setPage} />}
		</div>
	);
}
