import type { Project, ProjectStatus, ReviewDecision, UserRole } from "./types";

/**
 * Project lifecycle as an explicit state machine (PRD §18 rule 3). Every status change in the mock backend,
 * and later the real one, goes through `transition()`; anything not listed here is rejected.
 */

type Actor = UserRole;

interface Transition {
	from: ProjectStatus;
	to: ProjectStatus;
	by: Actor;
	/** Reject / request changes need a builder-visible reason (FR-REV-03). */
	requiresReason?: boolean;
}

export const PROJECT_TRANSITIONS: readonly Transition[] = [
	{ from: "draft", to: "submitted", by: "builder" },
	{ from: "changes_requested", to: "submitted", by: "builder" },
	{ from: "submitted", to: "under_review", by: "admin" },
	{ from: "submitted", to: "approved", by: "admin" },
	{ from: "under_review", to: "approved", by: "admin" },
	{ from: "submitted", to: "rejected", by: "admin", requiresReason: true },
	{ from: "under_review", to: "rejected", by: "admin", requiresReason: true },
	{ from: "submitted", to: "changes_requested", by: "admin", requiresReason: true },
	{ from: "under_review", to: "changes_requested", by: "admin", requiresReason: true },
	{ from: "approved", to: "archived", by: "admin" },
	{ from: "rejected", to: "archived", by: "admin" },
];

export class InvalidTransitionError extends Error {
	constructor(
		readonly from: ProjectStatus,
		readonly to: ProjectStatus,
		readonly by: Actor,
	) {
		super(`A ${by} can't move a project from "${from}" to "${to}".`);
	}
}

export class ReasonRequiredError extends Error {
	constructor() {
		super("A reason the builder can read is required for this decision.");
	}
}

export function canTransition(from: ProjectStatus, to: ProjectStatus, by: Actor) {
	return PROJECT_TRANSITIONS.some((t) => t.from === from && t.to === to && t.by === by);
}

/** Validates a status change; throws instead of allowing an arbitrary update. Returns the new status. */
export function transition(from: ProjectStatus, to: ProjectStatus, by: Actor, reason?: string | null): ProjectStatus {
	const rule = PROJECT_TRANSITIONS.find((t) => t.from === from && t.to === to && t.by === by);
	if (!rule) throw new InvalidTransitionError(from, to, by);
	if (rule.requiresReason && !reason?.trim()) throw new ReasonRequiredError();
	return to;
}

/** Statuses a builder may edit content in (FR-PROJ-06). */
export const BUILDER_EDITABLE: readonly ProjectStatus[] = ["draft", "changes_requested"];

export const isBuilderEditable = (status: ProjectStatus) => BUILDER_EDITABLE.includes(status);

/** The ONE public-visibility rule (FR-REV-05). Every public list/detail handler must use it. */
export const isPubliclyVisible = (p: Pick<Project, "status" | "visibility">) =>
	p.status === "approved" && p.visibility === "published";

/** Open for contributions: public, fundraising on, has a destination. */
export const acceptsContributions = (p: Pick<Project, "status" | "visibility" | "fundraising" | "destination_address">) =>
	isPubliclyVisible(p) && p.fundraising && !!p.destination_address;

/**
 * Builder dashboard tabs (design "Dev add project 1": All / Pending / Completed). D18, PENDING sign-off:
 * Pending = not reviewed yet or waiting on the builder; Completed = review done and approved (live).
 * Rejected and archived appear under All only.
 */
export type BuilderProjectGroup = "all" | "pending" | "completed";

export const BUILDER_PROJECT_GROUPS: Record<Exclude<BuilderProjectGroup, "all">, readonly ProjectStatus[]> = {
	pending: ["draft", "submitted", "under_review", "changes_requested"],
	completed: ["approved"],
};

export const inBuilderGroup = (status: ProjectStatus, group: BuilderProjectGroup) =>
	group === "all" || BUILDER_PROJECT_GROUPS[group].includes(status);

/**
 * Admin Projects tabs (design "admin page 2": All / Completed / Pending / Cancelled). D22, PENDING sign-off:
 * Completed = approved; Pending = waiting on an admin or the builder; Cancelled = rejected or archived.
 * Drafts are the builder's private work and never reach the admin list.
 */
export type AdminProjectTab = "all" | "completed" | "pending" | "cancelled";

export const ADMIN_PROJECT_TABS: Record<Exclude<AdminProjectTab, "all">, readonly ProjectStatus[]> = {
	completed: ["approved"],
	pending: ["submitted", "under_review", "changes_requested"],
	cancelled: ["rejected", "archived"],
};

export const inAdminTab = (status: ProjectStatus, tab: AdminProjectTab) =>
	status !== "draft" && (tab === "all" || ADMIN_PROJECT_TABS[tab].includes(status));

/** Decisions an admin can take from a status (the state machine allows exactly these). */
export function adminDecisions(status: ProjectStatus): ReviewDecision[] {
	const to: Record<ReviewDecision, ProjectStatus> = {
		under_review: "under_review",
		approve: "approved",
		request_changes: "changes_requested",
		reject: "rejected",
	};
	return (Object.keys(to) as ReviewDecision[]).filter((d) => canTransition(status, to[d], "admin"));
}
