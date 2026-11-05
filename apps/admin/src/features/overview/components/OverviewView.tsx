"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardList, HandCoins, UserRound, UsersRound } from "lucide-react";
import { CountUp } from "@repo/ui/count-up";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { compact, money } from "@/lib/format";
import { routes } from "@/lib/routes";
import { Avatar, WalletDot } from "@/components/Avatar";
import { EmptyState, ErrorState, PageTitle, RowsSkeleton, StatusPill } from "@/components/ui";
import { useOverview, type OverviewRange } from "@/features/overview/hooks";
import { FundingChart, ProgressDonut } from "@/features/overview/components/Charts";

/**
 * Design "admin page 1": four stat cards, "Contributions this week" (Funding Report bars + total), "Project
 * Analysis" donut, Recent projects and Trending projects. Tailored to the PRD: amounts are confirmed Stellar
 * contributions in XLM; bars are days (or weeks), not tokens; "Developers" are builders.
 */

const RANGE_TITLE: Record<OverviewRange, string> = { week: "this week", month: "this month", quarter: "in the last 3 months" };
const d = (i: number) => ({ "--d": i }) as CSSProperties;

export function OverviewView() {
	const [range, setRange] = useState<OverviewRange>("week");
	const overview = useOverview(range);
	const o = overview.data;

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Dashboard</PageTitle>

			{overview.isError && !o ? (
				<div className="mt-8">
					<ErrorState
						message={errorMessage(overview.error)}
						onRetry={() => void overview.refetch()}
						retrying={overview.isFetching}
					/>
				</div>
			) : (
				<>
					<ul className="mt-4 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4 xl:gap-7">
						<Stat i={0} icon={<UsersRound className="size-11" />} label="Contributors" value={o?.stats.contributors} />
						<Stat i={1} icon={<UserRound className="size-11" />} label="Builders" value={o?.stats.builders} />
						<Stat i={2} icon={<ClipboardList className="size-11" />} label="Projects" value={o?.stats.projects} />
						<Stat
							i={3}
							icon={<HandCoins className="size-11" />}
							label={`${o?.stats.asset_code ?? "XLM"} contributed`}
							value={o ? compact(o.stats.total_raised) : undefined}
							title={o ? money(o.stats.total_raised) : undefined}
						/>
					</ul>

					<h2 className="mt-10 font-display text-2xl font-bold md:mt-14 md:text-[28px]">Contributions {RANGE_TITLE[range]}</h2>
					<div className="mt-5 grid gap-6 xl:mt-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] xl:items-center xl:gap-[100px]">
						<FundingChart data={o} range={range} onRange={setRange} loading={!o} fetching={overview.isPlaceholderData} />
						<ProgressDonut progress={o?.progress} loading={!o} />
					</div>

					<div className="mt-10 grid gap-6 md:mt-16 xl:grid-cols-2 xl:gap-8">
						<Panel title="Recent projects" subtitle="The most recently submitted projects" href={routes.projects} reveal={0}>
							{!o ? (
								<RowsSkeleton rows={5} cols={3} />
							) : o.recent.length === 0 ? (
								<EmptyState title="No projects yet" description="Submitted projects show up here." />
							) : (
								<table className="w-full table-fixed text-left">
									<thead className="border-t border-white/10 text-base md:text-lg">
										<tr>
											<th scope="col" className="w-[38%] px-5 py-5 font-normal md:px-6">
												Project
											</th>
											<th scope="col" className="hidden px-3 py-5 font-normal sm:table-cell">
												Builder
											</th>
											<th scope="col" className="w-[34%] px-3 py-5 font-normal">
												Status
											</th>
										</tr>
									</thead>
									<tbody>
										{o.recent.map((p) => (
											<tr key={p.id} className="border-t border-white/10 transition-colors hover:bg-white/[0.025]">
												<td className="px-5 py-5 md:px-6">
													<Link href={routes.project(p.id)} className="block truncate hover:text-primary-300">
														{p.title}
													</Link>
													<span className="text-xs text-white/45 sm:hidden">{p.builder}</span>
												</td>
												<td className="hidden truncate px-3 py-5 sm:table-cell">{p.builder}</td>
												<td className="px-3 py-5">
													<StatusPill status={p.status} className="text-sm whitespace-normal md:text-[15px] [&>span]:size-3" />
												</td>
											</tr>
										))}
									</tbody>
								</table>
							)}
						</Panel>

						<Panel
							title="Trending projects"
							subtitle={`Most contributors ${RANGE_TITLE[range]}`}
							href={`${routes.projects}?tab=completed`}
							reveal={1}
						>
							{!o ? (
								<RowsSkeleton rows={5} cols={2} />
							) : o.trending.length === 0 ? (
								<EmptyState title="Quiet period" description={`No confirmed contributions ${RANGE_TITLE[range]}.`} />
							) : (
								<ul>
									{o.trending.map((t) => (
										<li
											key={t.id}
											className="flex items-center gap-4 border-t border-white/10 px-5 py-4 transition-colors hover:bg-white/[0.025] md:px-6"
										>
											<Avatar name={t.title} src={t.logo_url} className="size-12 text-sm md:size-[52px]" />
											<div className="min-w-0 flex-1">
												<Link
													href={routes.project(t.id)}
													className="block truncate text-lg text-primary-400 hover:text-primary-300"
												>
													{t.title}
												</Link>
												<p className="truncate text-sm text-white/60 md:text-base">
													by {t.builder} · {money(t.period_amount)}
												</p>
											</div>
											<div className="flex shrink-0 items-center" title={`${t.period_contributors} contributors`}>
												{t.recent_wallets.map((w, i) => (
													<WalletDot key={w} address={w} className={cn("size-9", i > 0 && "-ml-2.5")} />
												))}
												{t.period_contributors > t.recent_wallets.length && (
													<span className="-ml-2.5 flex size-9 items-center justify-center rounded-full bg-[#1E2030] text-xs ring-2 ring-surface-900">
														+{t.period_contributors - t.recent_wallets.length}
													</span>
												)}
											</div>
										</li>
									))}
								</ul>
							)}
						</Panel>
					</div>
					<p className="mt-6 text-right text-xs text-white/35">All amounts are confirmed Stellar Testnet contributions.</p>
				</>
			)}
		</div>
	);
}

function Stat({
	i,
	icon,
	label,
	value,
	title,
}: {
	i: number;
	icon: ReactNode;
	label: string;
	value?: number | string;
	title?: string;
}) {
	return (
		<li
			style={d(i)}
			data-reveal="up"
			title={title}
			className="group flex items-center justify-between gap-4 rounded-xl border-2 border-primary-500/80 px-6 py-6 transition-colors duration-200 hover:bg-primary-500/[0.06] md:px-8 md:py-7"
		>
			<div className="min-w-0">
				<p className="truncate font-display text-[28px] leading-none font-bold text-primary-500 md:text-[34px]">
					{value === undefined ? (
						<span className="skeleton-shimmer inline-block h-8 w-20 rounded" />
					) : typeof value === "number" ? (
						<CountUp value={value} />
					) : (
						value
					)}
				</p>
				<p className="mt-2 text-base text-white/90 md:text-lg">{label}</p>
			</div>
			<span
				className="shrink-0 text-primary-500 transition-transform duration-300 ease-(--ease-settle) group-hover:scale-110"
				aria-hidden
			>
				{icon}
			</span>
		</li>
	);
}

function Panel({
	title,
	subtitle,
	href,
	children,
	reveal,
}: {
	title: string;
	subtitle: string;
	href: string;
	children: ReactNode;
	reveal: number;
}) {
	return (
		<section data-reveal="up" style={d(reveal)} className="admin-card overflow-hidden">
			<div className="flex items-start justify-between gap-4 px-5 pt-5 pb-6 md:px-6">
				<div>
					<h2 className="font-display text-2xl font-bold md:text-[28px]">{title}</h2>
					<p className="mt-1 text-base text-white/90 md:text-lg">{subtitle}</p>
				</div>
				<Link
					href={href}
					className="group inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-primary-500 px-4 text-base text-white transition-colors hover:bg-primary-600 md:text-lg"
				>
					View all <ChevronRight className="size-5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
				</Link>
			</div>
			{children}
		</section>
	);
}
