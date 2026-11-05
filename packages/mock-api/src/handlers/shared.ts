import type { AcceptedAsset, Project, PublicProject } from "@repo/domain/types";
import { countsTowardTotal } from "@repo/domain/contribution-status";
import { sum } from "@repo/domain/money";
import type { MockDb } from "../db";
import { USDC_ISSUER } from "../util";

/** Helpers shared by handlers. The asset allowlist mirrors apps/web lib/stellar/config.ts (D2). */

export const ASSETS: Record<string, AcceptedAsset> = {
	xlm: { id: "xlm", code: "XLM", issuer: null, label: "XLM (Testnet)" },
	usdc: { id: "usdc", code: "USDC", issuer: USDC_ISSUER, label: "USDC (Testnet)" },
};

export const confirmedFor = (db: MockDb, projectId: string) =>
	db.contributions.filter((c) => c.project_id === projectId && countsTowardTotal(c.status));

/** The public shape (FR-REV-05): no owner email/id, no status/visibility, no internal notes. */
export function publicProject(db: MockDb, p: Project): PublicProject {
	const confirmed = confirmedFor(db, p.id);
	const owner = db.profiles.find((x) => x.user_id === p.owner_user_id);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { owner_user_id, status, visibility, submitted_at, contact_email, ...rest } = p;
	return {
		...rest,
		contact_email: null,
		owner: {
			display_name: owner?.display_name ?? "Builder",
			organization_name: owner?.organization_name ?? null,
			website: owner?.website ?? null,
		},
		category: db.categories.find((c) => c.id === p.category_id) ?? null,
		target_asset: p.target_asset_id ? (ASSETS[p.target_asset_id] ?? null) : null,
		// Totals are per asset (D2); a project raises in its target asset.
		raised_amount: sum(confirmed.filter((c) => !p.target_asset_id || c.asset_id === p.target_asset_id).map((c) => c.amount)),
		contributor_count: new Set(confirmed.map((c) => c.sender_address)).size,
		suggestion_count: db.suggestions.filter((s) => s.project_id === p.id && s.status === "published").length,
	};
}

/** "GABC…XYZ" for public lists: full addresses are on-chain anyway, but lists stay compact. */
export const short = (a: string) => `${a.slice(0, 5)}…${a.slice(-5)}`;
