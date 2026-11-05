import type { AdminContribution, StellarAsset } from "@repo/domain/types";
import { sum } from "@repo/domain/money";

/**
 * Contributors have no accounts and the API has no contributor list: wallets are grouped from confirmed
 * contributions (`/admin/contributions?status=confirmed`). Each asset is totalled on its own, with decimal math.
 */
export interface WalletRow {
	address: string;
	count: number;
	totals: { asset: StellarAsset; amount: string }[];
	projects: number;
	lastAt: string;
}

export function groupByWallet(list: AdminContribution[]): WalletRow[] {
	const by = new Map<string, AdminContribution[]>();
	for (const c of list) by.set(c.contributorAddress, [...(by.get(c.contributorAddress) ?? []), c]);
	return [...by.entries()]
		.map(([address, cs]) => {
			const assets = new Map<string, { asset: StellarAsset; amounts: string[] }>();
			for (const c of cs) {
				const e = assets.get(c.asset.id) ?? { asset: c.asset, amounts: [] };
				e.amounts.push(c.amount);
				assets.set(c.asset.id, e);
			}
			return {
				address,
				count: cs.length,
				totals: [...assets.values()].map((e) => ({ asset: e.asset, amount: sum(e.amounts) })),
				projects: new Set(cs.map((c) => c.project.id)).size,
				lastAt: cs.reduce((a, c) => ((c.confirmedAt ?? c.createdAt) > a ? (c.confirmedAt ?? c.createdAt) : a), ""),
			};
		})
		.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}
