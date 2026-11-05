import type {
	ContributionStatus,
	ProjectAction,
	ProjectStage,
	ProjectStatus,
	ProjectType,
	ReportReason,
	ReportStatus,
	SuggestionStatus,
	SuggestionType,
} from "./types";

/**
 * Every user-facing label for a backend enum lives here, so web and admin say the same thing. Colours are mapped
 * to design tokens in each app's StatusBadge (approval status and funding status must look distinct, PRD §13).
 */

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
	draft: "Draft",
	submitted: "Submitted",
	under_review: "Under review",
	changes_requested: "Changes requested",
	approved: "Approved",
	rejected: "Rejected",
	archived: "Archived",
};

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
	new_idea: "New idea",
	existing_project: "Existing project",
};

export const PROJECT_STAGE_LABEL: Record<ProjectStage, string> = {
	idea: "Idea",
	prototype: "Prototype",
	mvp: "MVP",
	launched: "Launched",
	scaling: "Scaling",
};

export const PROJECT_ACTION_LABEL: Record<ProjectAction, string> = {
	start_review: "Started review",
	approve: "Approved",
	reject: "Rejected",
	request_changes: "Requested changes",
	publish: "Published",
	unpublish: "Unpublished",
	archive: "Archived",
	feature: "Featured",
	unfeature: "Unfeatured",
};

export const CONTRIBUTION_STATUS_LABEL: Record<ContributionStatus, string> = {
	awaiting_signature: "Waiting for wallet",
	pending: "Confirming on Stellar",
	confirmed: "Confirmed",
	failed: "Failed",
	expired: "Expired",
};

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
	pending: "Pending moderation",
	published: "Published",
	hidden: "Hidden",
	rejected: "Rejected",
};

export const SUGGESTION_TYPE_LABEL: Record<SuggestionType, string> = {
	product_improvement: "Product improvement",
	technical_feedback: "Technical feedback",
	community_marketing: "Community / marketing",
	other: "Other",
};

export const REPORT_REASON_LABEL: Record<ReportReason, string> = {
	spam: "Spam",
	abuse: "Abuse or harassment",
	misleading: "Misleading",
	scam: "Scam or fraud",
	other: "Something else",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
	open: "Open",
	resolved: "Resolved",
	dismissed: "Dismissed",
};
