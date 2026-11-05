/**
 * Domain records shared by web, admin and the mock backend (PRD §9). Shapes here are the API contract:
 * the mock answers with them now, and the real backend must answer with them later.
 *
 * Money is ALWAYS a decimal string (e.g. "125.5000000"), never a JS number (PRD §9, rule 9). Use `money.ts`.
 */

export type ISODate = string;
/** Exact decimal string, up to 7 places (Stellar's precision). */
export type Amount = string;
/** Stellar public key (G…). Public data, never a secret. */
export type StellarAddress = string;

// ---------------------------------------------------------------- users

export type UserRole = "builder" | "admin";

export interface User {
	id: string;
	email: string;
	role: UserRole;
	email_verified: boolean;
	status: "active" | "suspended";
	created_at: ISODate;
	updated_at: ISODate;
}

export interface BuilderProfile {
	id: string;
	user_id: string;
	display_name: string;
	organization_name: string | null;
	bio: string | null;
	website: string | null;
	contact_email: string;
	/** Profile photo (data URL in the mock). Null → initials. */
	avatar_url: string | null;
	/** Builder's own Stellar address shown on their profile (D17). Projects keep their own `destination_address`. */
	wallet_address: StellarAddress | null;
	twitter_url: string | null;
	discord_url: string | null;
	telegram_url: string | null;
}

/** GET /builder/profile: the dashboard header and the Edit Profile form. `email` is the sign-in email (not editable here). */
export interface BuilderProfileSummary extends Pick<
	BuilderProfile,
	| "display_name"
	| "organization_name"
	| "bio"
	| "avatar_url"
	| "wallet_address"
	| "contact_email"
	| "website"
	| "twitter_url"
	| "discord_url"
	| "telegram_url"
> {
	email: string;
	joined_at: ISODate;
}

/** PATCH /builder/profile (design "Edit Profile"). Empty strings clear optional fields. */
export interface UpdateProfileInput {
	display_name: string;
	bio: string;
	avatar_url: string;
	contact_email: string;
	wallet_address: string;
	twitter_url: string;
	discord_url: string;
	telegram_url: string;
	website: string;
}

// ---------------------------------------------------------------- projects

/** See `project-status.ts` for the allowed transitions. */
export type ProjectStatus = "draft" | "submitted" | "under_review" | "changes_requested" | "approved" | "rejected" | "archived";

/** Approved projects can still be hidden; only approved + published is public (FR-REV-05). */
export type ProjectVisibility = "published" | "unpublished";

export type ProjectType = "new_idea" | "existing_project";

export type ProjectStage = "idea" | "prototype" | "mvp" | "live" | "scaling";

export interface Category {
	id: string;
	name: string;
	slug: string;
	is_active: boolean;
}

/** An allowlisted Stellar asset (PRD §8.4). XLM has `issuer: null`. */
export interface AcceptedAsset {
	id: string;
	code: string;
	issuer: StellarAddress | null;
	label: string;
}

export interface TeamMember {
	name: string;
	role: string;
	link?: string;
}

export interface ProjectLink {
	label: string;
	url: string;
}

export interface Project {
	id: string;
	owner_user_id: string;
	title: string;
	slug: string;
	project_type: ProjectType;
	summary: string;
	problem: string;
	solution: string;
	beneficiaries: string;
	category_id: string | null;
	stage: ProjectStage | null;
	cover_image_url: string | null;
	/** Square project logo (design "Add Project": 350×350 recommended). Data URL in the mock. */
	logo_url: string | null;
	/** Project contact email (design "Add Project"); can differ from the builder's account email. */
	contact_email: string | null;
	team: TeamMember[];
	links: ProjectLink[];
	/** Fundraising enabled for this project. */
	fundraising: boolean;
	/** Informational target, not a hard cap (PRD §17 default). */
	target_amount: Amount | null;
	target_asset_id: string | null;
	/** Direct-payment funds flow: contributions go straight here (docs/DECISIONS.md D1). */
	destination_address: StellarAddress | null;
	status: ProjectStatus;
	visibility: ProjectVisibility;
	featured: boolean;
	submitted_at: ISODate | null;
	approved_at: ISODate | null;
	/** End of the fundraising window, shown as "Time left" (D20, PENDING: the PRD has no deadline). */
	ends_at: ISODate | null;
	created_at: ISODate;
	updated_at: ISODate;
}

/** A row on the builder dashboard (GET /builder/projects). Raised = confirmed contributions only. */
export interface BuilderProjectListItem extends Pick<
	Project,
	| "id"
	| "title"
	| "slug"
	| "logo_url"
	| "status"
	| "visibility"
	| "fundraising"
	| "target_amount"
	| "destination_address"
	| "ends_at"
	| "created_at"
	| "updated_at"
> {
	category: Pick<Category, "id" | "name"> | null;
	target_asset: Pick<AcceptedAsset, "id" | "code"> | null;
	raised_amount: Amount;
	contributor_count: number;
}

/** POST /builder/projects (design "Add Project"): creates the project and submits it for review. */
export interface CreateProjectInput {
	title: string;
	logo_url: string;
	contact_email: string;
	destination_address: StellarAddress;
	links: { twitter?: string; discord?: string; telegram?: string; website?: string };
}

/** GET /admin/projects row (design "admin page 2"). */
export interface AdminProjectListItem extends Pick<
	Project,
	| "id"
	| "title"
	| "slug"
	| "logo_url"
	| "status"
	| "visibility"
	| "featured"
	| "destination_address"
	| "submitted_at"
	| "created_at"
> {
	builder: { name: string; email: string };
	target_asset: Pick<AcceptedAsset, "id" | "code"> | null;
	target_amount: Amount | null;
	raised_amount: Amount;
}

/** GET /admin/overview (design "admin page 1"). Amounts are confirmed contributions, XLM only for now. */
export interface AdminOverview {
	stats: { contributors: number; builders: number; projects: number; total_raised: Amount; asset_code: string };
	range: "week" | "month" | "quarter";
	series: { label: string; start: ISODate; amount: Amount; count: number }[];
	period_total: Amount;
	/** Live projects: raised vs target ("Project Analysis"). */
	progress: { raised: Amount; target: Amount; percent: number | null };
	recent: { id: string; title: string; builder: string; status: ProjectStatus; submitted_at: ISODate | null }[];
	trending: {
		id: string;
		title: string;
		slug: string;
		logo_url: string | null;
		builder: string;
		period_amount: Amount;
		period_contributors: number;
		recent_wallets: StellarAddress[];
	}[];
	pending_reviews: number;
}

/** GET /admin/contributors row (design "admin page 5"): one per wallet (contributors have no accounts). */
export interface AdminContributor {
	wallet_address: StellarAddress;
	total_amount: Amount;
	asset_code: string;
	/** Share of everything contributed on the platform. */
	share_percent: number;
	contribution_count: number;
	project_count: number;
	last_contributed_at: ISODate;
}

/** GET /admin/builders row (design "admin developer D1"). */
export interface AdminBuilder {
	id: string;
	name: string;
	email: string;
	avatar_url: string | null;
	wallet_address: StellarAddress | null;
	status: "active" | "suspended";
	joined_at: ISODate;
	project_count: number;
	latest_project: { id: string; title: string; logo_url: string | null } | null;
	raised_amount: Amount;
}

/** GET /admin/builders/:id/projects row (design "admin developer D2"). */
export interface AdminBuilderProject extends Pick<
	Project,
	| "id"
	| "title"
	| "logo_url"
	| "slug"
	| "status"
	| "visibility"
	| "featured"
	| "destination_address"
	| "target_amount"
	| "ends_at"
> {
	raised_amount: Amount;
	contributor_count: number;
	target_asset: Pick<AcceptedAsset, "id" | "code"> | null;
}

/** The signed-in admin's own account (design "admin page 6", Account settings). */
export interface AdminAccount {
	first_name: string;
	last_name: string;
	email: string;
	phone: string | null;
	/** Shown under the name, e.g. "Lead Admin". */
	bio: string | null;
	country: string | null;
	city: string | null;
	postal_code: string | null;
	avatar_url: string | null;
	mfa_enabled: boolean;
	password_changed_at: ISODate | null;
	notifications: AdminNotificationPrefs;
}

export interface AdminNotificationPrefs {
	new_submissions: boolean;
	resubmissions: boolean;
	reported_suggestions: boolean;
	contribution_issues: boolean;
	weekly_summary: boolean;
}

/** What public endpoints return: no owner email, no internal notes. */
export interface PublicProject extends Omit<Project, "owner_user_id" | "status" | "visibility" | "submitted_at"> {
	owner: Pick<BuilderProfile, "display_name" | "organization_name" | "website">;
	category: Category | null;
	target_asset: AcceptedAsset | null;
	/** Sum of CONFIRMED contributions only (FR-CON-03). */
	raised_amount: Amount;
	contributor_count: number;
	suggestion_count: number;
}

export interface ProjectRevision {
	id: string;
	project_id: string;
	revision_number: number;
	submitted_payload: Partial<Project>;
	created_by: string;
	created_at: ISODate;
}

export type ReviewDecision = "under_review" | "approve" | "reject" | "request_changes";

export interface ProjectReview {
	id: string;
	project_id: string;
	admin_user_id: string;
	decision: ReviewDecision;
	/** Visible to the builder. Required for reject / request_changes (FR-REV-03). */
	reason: string | null;
	/** Admin-only. Never sent to builder or public endpoints. */
	internal_note: string | null;
	created_at: ISODate;
}

export interface ProjectUpdate {
	id: string;
	project_id: string;
	author_user_id: string;
	title: string;
	body: string;
	visibility: "public" | "private";
	created_at: ISODate;
}

// ---------------------------------------------------------------- wallet + contributions

export type StellarNetwork = "testnet" | "mainnet";

export interface WalletSession {
	id: string;
	public_address: StellarAddress;
	network: StellarNetwork;
	connected_at: ISODate;
	last_seen_at: ISODate;
	session_expiry: ISODate;
}

/** See `contribution-status.ts`. Only `confirmed` counts toward totals. */
export type ContributionStatus = "created" | "awaiting_wallet" | "pending" | "confirmed" | "failed" | "expired" | "cancelled";

export interface ContributionIntent {
	id: string;
	project_id: string;
	wallet_address: StellarAddress;
	asset_id: string;
	amount: Amount;
	/** Text memo the payment must carry so the verifier can match it (e.g. "CSP-7K2Q9X"). */
	reference: string;
	destination_address: StellarAddress;
	status: ContributionStatus;
	expires_at: ISODate;
	created_at: ISODate;
}

export interface Contribution {
	id: string;
	project_id: string;
	intent_id: string;
	tx_hash: string;
	network: StellarNetwork;
	sender_address: StellarAddress;
	destination_or_contract: StellarAddress;
	asset_id: string;
	amount: Amount;
	ledger_or_event_ref: string | null;
	status: ContributionStatus;
	failure_reason: string | null;
	created_at: ISODate;
	confirmed_at: ISODate | null;
}

/** GET /contributions/:id and the wallet history: a contribution with what the receipt shows. */
export interface ContributionDetail extends Contribution {
	reference: string;
	project: Pick<Project, "id" | "slug" | "title" | "logo_url">;
	asset: AcceptedAsset;
	/** Demo-wallet payment (mock mode): no real transaction exists on Stellar. */
	simulated: boolean;
}

/** GET /contributions?wallet=: the contributor page (PRD §5: contributors are identified by wallet). */
export interface WalletContributions extends Paginated<ContributionDetail> {
	summary: {
		/** Confirmed totals per asset code. */
		total_sent: Record<string, Amount>;
		confirmed_count: number;
		pending_count: number;
		failed_count: number;
		projects_supported: number;
		first_at: ISODate | null;
		last_at: ISODate | null;
		/** Confirmed XLM per month, oldest first (last 6 months). */
		monthly: { month: string; label: string; amount: Amount }[];
		/** Confirmed totals per project (XLM), largest first. */
		by_project: { project: Pick<Project, "id" | "slug" | "title" | "logo_url">; amount: Amount; count: number }[];
	};
}

// ---------------------------------------------------------------- suggestions + moderation

export type SuggestionType = "product_improvement" | "technical_feedback" | "community_marketing" | "other";

export type SuggestionStatus = "pending_moderation" | "published" | "hidden" | "rejected";

export interface Suggestion {
	id: string;
	project_id: string;
	wallet_address: StellarAddress;
	type: SuggestionType;
	title: string;
	body: string;
	link: string | null;
	status: SuggestionStatus;
	report_count: number;
	created_at: ISODate;
	moderated_by: string | null;
	moderated_at: ISODate | null;
	moderation_reason: string | null;
}

export interface Report {
	id: string;
	reporter_wallet_or_user: string;
	entity_type: "project" | "suggestion";
	entity_id: string;
	reason: string;
	status: "open" | "resolved" | "dismissed";
	created_at: ISODate;
}

// ---------------------------------------------------------------- notifications + audit

export type NotificationType =
	// builders (FR-NOT-01/02)
	| "submission_received"
	| "project_approved"
	| "project_rejected"
	| "changes_requested"
	| "funding_milestone"
	// contributors (by wallet)
	| "contribution_confirmed"
	| "contribution_failed"
	| "suggestion_published"
	| "suggestion_rejected"
	// everyone
	| "project_published";

export type NotificationCategory = "projects" | "contributions" | "suggestions" | "account";

/**
 * In-app notification. Exactly one audience: a builder (`user_id`), a contributor wallet (`wallet_address`, no
 * account needed), or everyone (`broadcast`). Never carries secrets; tx hashes and addresses are public data, but
 * email notifications must not include them (FR-NOT-03).
 */
export interface Notification {
	id: string;
	user_id: string | null;
	wallet_address: StellarAddress | null;
	broadcast: boolean;
	type: NotificationType;
	category: NotificationCategory;
	title: string;
	/** Optional detail under the title, e.g. the reason an admin gave when rejecting a project. */
	body?: string | null;
	/** The call to action shown next to the time ("Contribute", "View receipt"). */
	action: { label: string; href: string } | null;
	payload: Record<string, unknown>;
	/** For the current reader (broadcast read state is per reader). */
	read_at: ISODate | null;
	created_at: ISODate;
}

export interface AuditLog {
	id: string;
	actor_user_id: string;
	action: string;
	entity_type: string;
	entity_id: string;
	before_snapshot: unknown;
	after_snapshot: unknown;
	created_at: ISODate;
}

// ---------------------------------------------------------------- API envelope

/** Same envelope as the reference API: `{ status_code, message, data }`. */
export interface ApiEnvelope<T> {
	status_code: number;
	message: string;
	data: T;
}

export interface Paginated<T> {
	items: T[];
	meta: { page: number; limit: number; total: number; total_pages: number };
}
