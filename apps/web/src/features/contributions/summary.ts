import type { Contribution, StellarAsset } from "@repo/domain/types";
import { sum } from "@repo/domain/money";
import { countsTowardTotal } from "@repo/domain/contribution-status";

/**
 * Totals for the wallet page, from the contributions it has loaded. Only confirmed contributions count, and each
 * asset is totalled on its own (XLM and USDC are never added together). Decimal math only.
 */
export interface WalletSummary {
	/** Confirmed total per asset, in first-seen order. */
	totals: { asset: StellarAsset; amount: string }[];
	confirmedCount: number;
	pendingCount: number;
	projectsSupported: number;
	firstAt: string | null;
	byProject: { project: Contribution["project"]; count: number; totals: { asset: StellarAsset; amount: string }[] }[];
	/** Confirmed XLM per month, last 6 months (oldest first). */
	monthly: { month: string; label: string; amount: string }[];
}

function totalsOf(list: Contribution[]) {
	const by = new Map<string, { asset: StellarAsset; amounts: string[] }>();
	for (const c of list) {
		const e = by.get(c.asset.id) ?? { asset: c.asset, amounts: [] };
		e.amounts.push(c.amount);
		by.set(c.asset.id, e);
	}
	return [...by.values()].map((e) => ({ asset: e.asset, amount: sum(e.amounts) }));
}

export function summarize(all: Contribution[], now = new Date()): WalletSummary {
	const confirmed = all.filter((c) => countsTowardTotal(c.status));
	const projects = new Map<string, Contribution[]>();
	for (const c of confirmed) projects.set(c.project.id, [...(projects.get(c.project.id) ?? []), c]);

	const months = Array.from({ length: 6 }, (_, i) => {
		const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
		return {
			month: d.toISOString().slice(0, 7),
			label: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
		};
	});

	return {
		totals: totalsOf(confirmed),
		confirmedCount: confirmed.length,
		pendingCount: all.filter((c) => c.status === "pending").length,
		projectsSupported: projects.size,
		firstAt: confirmed.length
			? confirmed.reduce((a, c) => ((c.confirmedAt ?? c.createdAt) < a ? (c.confirmedAt ?? c.createdAt) : a), "9999")
			: null,
		byProject: [...projects.values()]
			.map((list) => ({ project: list[0]!.project, count: list.length, totals: totalsOf(list) }))
			.sort((a, b) => b.count - a.count),
		monthly: months.map((m) => ({
			...m,
			amount: sum(
				confirmed.filter((c) => c.asset.native && (c.confirmedAt ?? c.createdAt).slice(0, 7) === m.month).map((c) => c.amount),
			),
		})),
	};
}
