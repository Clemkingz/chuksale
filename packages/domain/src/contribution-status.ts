import type { ContributionStatus } from "./types";

/**
 * Contribution lifecycle (backend guide, "Contributions"). Only `confirmed` counts toward totals, and only the
 * backend sets it. The UI never infers success from a closed wallet popup.
 */

export const isFinal = (s: ContributionStatus) => s === "confirmed" || s === "failed" || s === "expired";

export const countsTowardTotal = (s: ContributionStatus) => s === "confirmed";

/** Still worth polling `GET /contributions/{id}`. */
export const isInFlight = (s: ContributionStatus) => s === "pending";

/** A failed or expired attempt can start again with a new prepare; a pending one may still land. */
export const canRetry = (s: ContributionStatus) => s === "failed" || s === "expired";
