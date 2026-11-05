import type {
	NotificationCategory,
	ContributionStatus,
	ProjectStage,
	ProjectStatus,
	SuggestionStatus,
	SuggestionType,
} from "./types";

/**
 * Every user-facing label for a status lives here, so web and admin say the same thing. Colours are mapped
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

export const CONTRIBUTION_STATUS_LABEL: Record<ContributionStatus, string> = {
	created: "Started",
	awaiting_wallet: "Waiting for wallet",
	pending: "Pending confirmation",
	confirmed: "Confirmed",
	failed: "Failed",
	expired: "Expired",
	cancelled: "Cancelled",
};

export const SUGGESTION_STATUS_LABEL: Record<SuggestionStatus, string> = {
	pending_moderation: "Pending moderation",
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

export const PROJECT_STAGE_LABEL: Record<ProjectStage, string> = {
	idea: "Idea",
	prototype: "Prototype",
	mvp: "MVP",
	live: "Live",
	scaling: "Scaling",
};

export const NOTIFICATION_CATEGORY_LABEL: Record<NotificationCategory, string> = {
	projects: "Projects",
	contributions: "Contributions",
	suggestions: "Suggestions",
	account: "Account",
};
