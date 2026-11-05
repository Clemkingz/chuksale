"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronDown } from "lucide-react";
import type { AdminOverview } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { compact, money } from "@/lib/format";
import type { OverviewRange } from "@/features/overview/hooks";

/**
 * Design "admin page 1" charts. Funding Report: one series (confirmed XLM per day/week), thin rounded bars on a
 * dashed, recessive grid, hover tooltip per bar, total underneath. Project Analysis: a progress ring of
 * raised vs targets across live projects; the light remainder is the empty part of the ring, not a 2nd series.
 * Both have a screen-reader table. Colours: primary-500 (validated vs the dark surface).
 */

const BAR = "#688CEC";
const REMAINDER = "#E3F6FA";
const GRID = "rgb(255 255 255 / 0.35)";

const RANGES: { id: OverviewRange; label: string }[] = [
	{ id: "week", label: "1 week" },
	{ id: "month", label: "1 month" },
	{ id: "quarter", label: "3 months" },
];

type Point = AdminOverview["series"][number] & { value: number };

function BarTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
	const p = payload?.[0]?.payload;
	if (!active || !p) return null;
	return (
		<div className="rounded-lg border border-white/10 bg-[#131318] px-3 py-2 text-sm shadow-xl">
			<p className="text-white/60">{p.label}</p>
			<p className="mt-0.5 font-medium text-white">{money(p.amount)}</p>
			<p className="text-xs text-white/50">
				{p.count} contribution{p.count === 1 ? "" : "s"}
			</p>
		</div>
	);
}

export function FundingChart({
	data,
	range,
	onRange,
	loading,
	fetching,
}: {
	data?: AdminOverview;
	range: OverviewRange;
	onRange: (r: OverviewRange) => void;
	loading: boolean;
	fetching: boolean;
}) {
	const points: Point[] = (data?.series ?? []).map((s) => ({ ...s, value: Number(s.amount) }));
	const many = points.length > 14;

	return (
		<section data-reveal="up" aria-labelledby="funding-title" className="admin-card px-5 pt-6 pb-6 md:px-8 md:pt-8">
			<div className="flex items-center justify-between gap-4">
				<h3 id="funding-title" className="font-display text-xl font-bold md:text-[28px]">
					Funding Report
				</h3>
				<label className="relative">
					<span className="sr-only">Period</span>
					<select
						value={range}
						onChange={(e) => onRange(e.target.value as OverviewRange)}
						className="h-11 cursor-pointer appearance-none rounded-lg border border-primary-500/60 bg-transparent pr-9 pl-3.5 text-base text-white outline-none hover:border-primary-400 focus:ring-2 focus:ring-primary-500/30"
					>
						{RANGES.map((r) => (
							<option key={r.id} value={r.id} className="bg-[#131318]">
								{r.label}
							</option>
						))}
					</select>
					<ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2" aria-hidden />
				</label>
			</div>

			<div className={cn("mt-6 h-[260px] transition-opacity duration-200 md:h-[320px]", fetching && "opacity-50")}>
				{loading ? (
					<div className="skeleton-shimmer size-full rounded-lg" />
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap={many ? "25%" : "40%"}>
							<CartesianGrid vertical={false} stroke={GRID} strokeDasharray="10 10" />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tick={{ fill: "rgb(255 255 255 / 0.85)", fontSize: 12 }}
								interval={many ? "preserveStartEnd" : 0}
								minTickGap={8}
								dy={8}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tick={{ fill: "rgb(255 255 255 / 0.85)", fontSize: 13 }}
								tickFormatter={(v: number) => compact(v)}
								width={52}
							/>
							<Tooltip content={<BarTooltip />} cursor={{ fill: "rgb(104 140 236 / 0.08)" }} />
							<Bar
								dataKey="value"
								fill={BAR}
								radius={[4, 4, 0, 0]}
								maxBarSize={12}
								minPointSize={2}
								animationDuration={700}
								animationEasing="ease-out"
							/>
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>

			<table className="sr-only">
				<caption>Confirmed contributions per {range === "quarter" ? "week" : "day"}</caption>
				<tbody>
					{points.map((p) => (
						<tr key={p.start}>
							<th scope="row">{p.label}</th>
							<td>{money(p.amount)}</td>
						</tr>
					))}
				</tbody>
			</table>

			<p className="mt-8 text-lg text-white/95 md:text-xl">Total contributions</p>
			<p className="mt-1 flex items-baseline gap-2">
				{data ? (
					<>
						<span className="font-display text-4xl font-bold tabular-nums md:text-[44px]">
							{Number(data.period_total).toLocaleString("en-US", { maximumFractionDigits: 2 })}
						</span>
						<span className="text-lg">XLM</span>
					</>
				) : (
					<span className="skeleton-shimmer inline-block h-10 w-48 rounded" />
				)}
			</p>
		</section>
	);
}

export function ProgressDonut({ progress, loading }: { progress?: AdminOverview["progress"]; loading: boolean }) {
	const raised = Number(progress?.raised ?? 0);
	const target = Number(progress?.target ?? 0);
	const pct = progress?.percent ?? 0;
	const slices = [
		{ name: "Raised", value: Math.min(raised, target || raised), color: BAR },
		{ name: "Still to raise", value: Math.max(target - raised, 0), color: REMAINDER },
	];

	return (
		<section
			data-reveal="up"
			style={{ "--d": 1 } as React.CSSProperties}
			aria-labelledby="analysis-title"
			className="admin-card px-5 py-7 md:px-8"
		>
			<h3 id="analysis-title" className="text-center font-display text-xl font-bold md:text-2xl">
				Project Analysis
			</h3>
			<p className="mt-1 text-center text-sm text-white/55">Live projects: raised vs. their targets</p>
			<div className="relative mx-auto mt-4 aspect-square w-full max-w-[280px]">
				{loading ? (
					<div className="skeleton-shimmer size-full rounded-full" />
				) : target === 0 ? (
					<div className="flex size-full items-center justify-center rounded-full border-[28px] border-white/10 text-center text-sm text-white/55">
						No targets set
					</div>
				) : (
					<>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={slices}
									dataKey="value"
									innerRadius="50%"
									outerRadius="100%"
									startAngle={90}
									endAngle={-270}
									stroke="none"
									animationDuration={900}
									animationEasing="ease-out"
								>
									{slices.map((s) => (
										<Cell key={s.name} fill={s.color} />
									))}
								</Pie>
							</PieChart>
						</ResponsiveContainer>
						<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
							<span className="font-display text-3xl font-bold">{pct}%</span>
							<span className="text-sm md:text-base">raised</span>
						</div>
					</>
				)}
			</div>
			<ul className="mt-7 flex flex-wrap justify-between gap-x-6 gap-y-2 text-base md:text-lg">
				<li className="flex items-center gap-2.5">
					<span aria-hidden className="size-5 rounded-full" style={{ backgroundColor: BAR }} />
					Raised <span className="text-sm text-white/55">{progress ? money(progress.raised) : ""}</span>
				</li>
				<li className="flex items-center gap-2.5">
					<span aria-hidden className="size-5 rounded-full" style={{ backgroundColor: REMAINDER }} />
					Still to raise
				</li>
			</ul>
		</section>
	);
}
