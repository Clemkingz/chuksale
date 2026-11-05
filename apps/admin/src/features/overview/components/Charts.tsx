"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

/**
 * One-series bar chart of event counts in funnel order (admin analytics). Thin rounded bars on a dashed,
 * recessive grid; hover tooltip per bar; a screen-reader table carries the same numbers. primary-500 on the dark
 * surface (validated earlier for the console).
 */

const BAR = "#688CEC";
const GRID = "rgb(255 255 255 / 0.18)";

export type FunnelPoint = { label: string; value: number };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: FunnelPoint }[] }) {
	const p = payload?.[0]?.payload;
	if (!active || !p) return null;
	return (
		<div className="rounded-lg border border-white/10 bg-[#131318] px-3 py-2 text-sm shadow-xl">
			<p className="text-white/60">{p.label}</p>
			<p className="mt-0.5 font-medium text-white tabular-nums">{p.value.toLocaleString()}</p>
		</div>
	);
}

export function FunnelChart({ title, caption, data }: { title: string; caption: string; data?: FunnelPoint[] }) {
	const empty = !data || data.every((d) => d.value === 0);
	return (
		<section data-reveal="up" aria-label={title} className="admin-card px-5 pt-6 pb-5 md:px-7">
			<h3 className="font-display text-xl font-bold">{title}</h3>
			<p className="mt-1 text-sm text-white/55">{caption}</p>
			<div className="mt-5 h-[220px]">
				{!data ? (
					<span className="skeleton-shimmer block h-full rounded-xl" aria-hidden />
				) : empty ? (
					<p className="flex h-full items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/45">
						Nothing in this period yet
					</p>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -18 }} barCategoryGap="34%">
							<CartesianGrid vertical={false} stroke={GRID} strokeDasharray="6 6" />
							<XAxis
								dataKey="label"
								tickLine={false}
								axisLine={false}
								interval={0}
								tick={{ fill: "rgb(255 255 255 / 0.7)", fontSize: 12 }}
								dy={6}
							/>
							<YAxis
								tickLine={false}
								axisLine={false}
								allowDecimals={false}
								tick={{ fill: "rgb(255 255 255 / 0.6)", fontSize: 12 }}
								width={44}
							/>
							<Tooltip content={<Tip />} cursor={{ fill: "rgb(104 140 236 / 0.08)" }} />
							<Bar dataKey="value" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={36} minPointSize={2} animationDuration={700} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>
			{data && (
				<table className="sr-only">
					<caption>{title}</caption>
					<tbody>
						{data.map((d) => (
							<tr key={d.label}>
								<th scope="row">{d.label}</th>
								<td>{d.value}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</section>
	);
}
