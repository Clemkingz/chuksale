import type { ProjectAction, ProjectStatus } from "./types";

/**
 * Project lifecycle (backend guide, "Admin: review queue and actions"). The backend enforces it and answers 409 to
 * anything else; the UI uses these rules only to decide which buttons to show. For a builder's own project, drive
 * buttons from `project.permissions` instead.
 */

export interface ActionRule {
	from: readonly ProjectStatus[];
	/** Only when the project is (or isn't) published. */
	published?: boolean;
	/** A reason the builder reads is required. */
	requiresReason?: boolean;
}

export const PROJECT_ACTION_RULES: Record<ProjectAction, ActionRule> = {
	start_review: { from: ["submitted"] },
	approve: { from: ["submitted", "under_review"] },
	reject: { from: ["submitted", "under_review"], requiresReason: true },
	request_changes: { from: ["submitted", "under_review"], requiresReason: true },
	publish: { from: ["approved"], published: false },
	unpublish: { from: ["approved"], published: true },
	feature: { from: ["approved"], published: true },
	unfeature: { from: ["approved"], published: true },
	archive: { from: ["submitted", "under_review", "changes_requested", "approved", "rejected"], requiresReason: true },
};

export const actionRequiresReason = (a: ProjectAction) => !!PROJECT_ACTION_RULES[a].requiresReason;

/** Actions an admin can take on a project right now (featured decides feature vs unfeature). */
export function availableActions(p: { status: ProjectStatus; published: boolean; featured: boolean }): ProjectAction[] {
	return (Object.keys(PROJECT_ACTION_RULES) as ProjectAction[]).filter((a) => {
		const rule = PROJECT_ACTION_RULES[a];
		if (!rule.from.includes(p.status)) return false;
		if (rule.published !== undefined && rule.published !== p.published) return false;
		if (a === "feature") return !p.featured;
		if (a === "unfeature") return p.featured;
		return true;
	});
}

/** The ONE public-visibility rule: approved and published. */
export const isPubliclyVisible = (p: { status: ProjectStatus; published: boolean }) => p.status === "approved" && p.published;

/**
 * Builder dashboard tabs (design "Dev add project 1": All / Pending / Completed). D18:
 * Pending = not reviewed yet or waiting on the builder; Completed = approved. Rejected and archived appear under All.
 */
export type BuilderProjectGroup = "all" | "pending" | "completed";

export const BUILDER_PROJECT_GROUPS: Record<Exclude<BuilderProjectGroup, "all">, readonly ProjectStatus[]> = {
	pending: ["draft", "submitted", "under_review", "changes_requested"],
	completed: ["approved"],
};

export const inBuilderGroup = (status: ProjectStatus, group: BuilderProjectGroup) =>
	group === "all" || BUILDER_PROJECT_GROUPS[group].includes(status);

/** Admin Projects tabs (design "admin page 2"). Each maps to one or more `?status=` values. */
export type AdminProjectTab = "all" | "queue" | "approved" | "changes_requested" | "closed";

export const ADMIN_PROJECT_TABS: Record<Exclude<AdminProjectTab, "all">, readonly ProjectStatus[]> = {
	queue: ["submitted", "under_review"],
	approved: ["approved"],
	changes_requested: ["changes_requested"],
	closed: ["rejected", "archived"],
};
