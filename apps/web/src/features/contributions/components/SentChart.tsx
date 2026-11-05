"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatAmount } from "@repo/domain/money";
import type { WalletSummary } from "@/features/contributions/summary";

/**
 * "Funds sent per month" (contributor page): one series, confirmed XLM only, thin rounded bars on a recessive
 * dashed grid with a hover tooltip. A screen-reader table carries the same numbers.
 */
type Point = WalletSummary["monthly"][number] & { value: number };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
	const p = payload?.[0]?.payload;
	if (!active || !p) return null;
	return (
		<div className="rounded-lg border border-white/10 bg-[#131318] px-3 py-2 text-sm shadow-xl">
			<p className="text-white/60">{p.label}</p>
			<p className="font-medium">{formatAmount(p.amount)} XLM</p>
		</div>
	);
}

export function SentChart({ monthly }: { monthly: WalletSummary["monthly"] }) {
	const data: Point[] = monthly.map((m) => ({ ...m, value: Number(m.amount) }));
	const empty = data.every((d) => d.value === 0);
	return (
		<section aria-labelledby="sent-title" className="rounded-2xl border border-white/10 bg-[#11121A] p-5 md:p-6">
			<h2 id="sent-title" className="font-display text-xl font-bold">
				Sent per month
			</h2>
			<p className="mt-1 text-sm text-white/50">Confirmed XLM, last 6 months</p>
			<div className="mt-5 h-[200px]">
				{empty ? (
					<p className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/45">
						No confirmed contributions in the last 6 months
					</p>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -12 }} barCategoryGap="38%">
							<CartesianGrid vertical={false} stroke="rgb(255 255 255 / 0.12)" strokeDasharray="6 6" />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								tick={{ fill: "rgb(255 255 255 / 0.7)", fontSize: 12 }}
								dy={6}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								tick={{ fill: "rgb(255 255 255 / 0.6)", fontSize: 12 }}
								width={48}
								tickFormatter={(v: number) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)}
							/>
							<Tooltip content={<Tip />} cursor={{ fill: "rgb(104 140 236 / 0.08)" }} />
							<Bar
								dataKey="value"
								fill="#688CEC"
								radius={[4, 4, 0, 0]}
								maxBarSize={28}
								minPointSize={2}
								animationDuration={700}
							/>
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
			<table className="sr-only">
				<caption>Confirmed XLM sent per month</caption>
				<tbody>
					{data.map((d) => (
						<tr key={d.month}>
							<th scope="row">{d.label}</th>
							<td>{formatAmount(d.amount)} XLM</td>
						</tr>
					))}
				</tbody>
			</table>
		</section>
	);
}
