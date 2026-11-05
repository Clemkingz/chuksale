import type { PublicFunding, StellarAsset } from "@repo/domain/types";
import { compare, formatAmount, progressPercent } from "@repo/domain/money";

/**
 * Funding display helpers. Totals are per asset: never add XLM and USDC together. Progress is measured in the
 * target's own asset.
 */

export const raisedIn = (funding: PublicFunding | null | undefined, assetId: string | undefined) =>
	funding?.raised.find((r) => r.asset.id === assetId)?.amount ?? "0";

/** Percent of the target raised in the target asset (null when there's no target). */
export function fundingProgress(funding: PublicFunding | null | undefined) {
	if (!funding?.targetAmount || !funding.targetAsset) return null;
	return progressPercent(raisedIn(funding, funding.targetAsset.id), funding.targetAmount);
}

/** "1,250 XLM · 40 USDC" (non-zero totals only), or "0 XLM" in the target asset. */
export function raisedSummary(funding: PublicFunding | null | undefined) {
	const parts = (funding?.raised ?? []).filter((r) => compare(r.amount, "0") > 0);
	if (!parts.length) return `0 ${funding?.targetAsset?.code ?? funding?.acceptedAssets[0]?.code ?? "XLM"}`;
	return parts.map((r) => `${formatAmount(r.amount)} ${r.asset.code}`).join(" · ");
}

export const assetCodes = (assets: StellarAsset[]) => assets.map((a) => a.code).join(" / ");
