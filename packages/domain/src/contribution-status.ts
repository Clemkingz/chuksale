import type { ContributionStatus } from "./types";

/**
 * Contribution lifecycle (PRD §8.3). Only `confirmed` is ever counted toward a project's raised total, and only
 * the backend (today: the mock verifier) may set it. The UI never infers success from a closed wallet popup.
 */

export const CONTRIBUTION_TRANSITIONS: Record<ContributionStatus, readonly ContributionStatus[]> = {
	created: ["awaiting_wallet", "cancelled", "expired"],
	awaiting_wallet: ["pending", "cancelled", "expired", "failed"],
	pending: ["confirmed", "failed"],
	confirmed: [],
	failed: [],
	expired: [],
	cancelled: [],
};

export const isFinal = (s: ContributionStatus) => CONTRIBUTION_TRANSITIONS[s].length === 0;

export const countsTowardTotal = (s: ContributionStatus) => s === "confirmed";

export function canMove(from: ContributionStatus, to: ContributionStatus) {
	return CONTRIBUTION_TRANSITIONS[from].includes(to);
}

/** A failed / expired / cancelled attempt may start a NEW intent; a pending one may not (it might still land). */
export const canRetry = (s: ContributionStatus) => s === "failed" || s === "expired" || s === "cancelled";
