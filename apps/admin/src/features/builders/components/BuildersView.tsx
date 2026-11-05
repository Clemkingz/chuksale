"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { UserCheck, UserX, UsersRound } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { fullDate, money, shortKey, timeAgo } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, IconStat, PageTitle, Pager, RowsSkeleton } from "@/components/ui";
import { useBuilders } from "@/features/builders/hooks";
import { BuilderActions } from "@/features/builders/components/BuilderActions";

/**
 * Design "admin developer D1" ("Developers" → builders, the PRD's word). Stat cards: builders, active, disabled
 * (suspended, D24). Columns: Wallet id (with name), Project (latest + count), Time added (joined), Amount
 * raised across their projects (confirmed), Action.
 */
export function BuildersView() {
	const [page, setPage] = useState(1);
	const q = useBuilders(page, "");
	const d = q.data;

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Builders</PageTitle>
			<ul className="mt-6 grid gap-4 sm:grid-cols-3 md:gap-7">
				<IconStat i={0} icon={<UsersRound className="size-7" />} value={d?.stats.builders} label="Builders" />
				<IconStat i={1} icon={<UserCheck className="size-7" />} value={d?.stats.active} label="Active" />
				<IconStat
					i={2}
					icon={<UserX className="size-7" />}
					value={d?.stats.disabled}
					label="Disabled"
					hint="Suspended by an admin"
				/>
			</ul>

			<section
				data-reveal="up"
				aria-label="Builders"
				className={cn("admin-card mt-8 overflow-hidden transition-opacity md:mt-12", q.isPlaceholderData && "opacity-60")}
			>
				{q.isPending ? (
					<RowsSkeleton rows={7} cols={5} />
				) : q.isError && !d ? (
					<div className="p-4">
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
					</div>
				) : d && d.items.length === 0 ? (
					<EmptyState title="No builders yet" description="Builders appear here when they create an account." />
				) : d ? (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[820px] table-fixed text-left">
							<thead className="text-base md:text-lg">
								<tr>
									<th scope="col" className="w-[28%] px-6 py-6 font-normal">
										Builder / Wallet id
									</th>
									<th scope="col" className="w-[24%] px-3 py-6 font-normal">
										Project
									</th>
									<th scope="col" className="w-[15%] px-3 py-6 font-normal">
										Time added
									</th>
									<th scope="col" className="w-[19%] px-3 py-6 font-normal">
										Amount raised
									</th>
									<th scope="col" className="w-[14%] px-3 py-6 text-center font-normal">
										Action
									</th>
								</tr>
							</thead>
							<tbody>
								{d.items.map((b, i) => (
									<tr
										key={b.id}
										data-reveal="up"
										style={{ "--d": i } as CSSProperties}
										className="border-t border-white/10 transition-colors hover:bg-white/[0.025]"
									>
										<td className="px-6 py-[18px]">
											<div className="flex min-w-0 items-center gap-3">
												<Avatar name={b.name} src={b.avatar_url} className="size-10 text-xs" />
												<div className="min-w-0">
													<Link
														href={`/builders/${b.id}`}
														className="flex items-center gap-2 truncate text-base hover:text-primary-300"
													>
														<span className="truncate">{b.name}</span>
														{b.status === "suspended" && (
															<span className="shrink-0 rounded-full bg-error-400/15 px-2 py-0.5 text-[11px] text-error-200">
																Disabled
															</span>
														)}
													</Link>
													<p className="truncate font-mono text-[13px] text-white/55" title={b.wallet_address ?? b.email}>
														{b.wallet_address ? shortKey(b.wallet_address, 8, 6) : b.email}
													</p>
												</div>
											</div>
										</td>
										<td className="px-3">
											{b.latest_project ? (
												<span className="flex min-w-0 items-center gap-2.5">
													<Avatar name={b.latest_project.title} src={b.latest_project.logo_url} className="size-9 text-[10px]" />
													<span className="min-w-0">
														<Link href={`/projects/${b.latest_project.id}`} className="block truncate hover:text-primary-300">
															{b.latest_project.title}
														</Link>
														{b.project_count > 1 && <span className="text-xs text-white/50">+{b.project_count - 1} more</span>}
													</span>
												</span>
											) : (
												<span className="text-white/45">No projects yet</span>
											)}
										</td>
										<td className="px-3 text-base" title={fullDate(b.joined_at)}>
											{timeAgo(b.joined_at)}
										</td>
										<td className="px-3 text-base">{money(b.raised_amount)}</td>
										<td className="px-3 text-center">
											<BuilderActions builder={b} />
										</td>
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
