/**
 * The ChuckSales API contract (backend `/docs-json`, OpenAPI 3, checked 2026-11-06). These are the exact shapes the
 * live backend answers with; the mock backend (`@repo/mock-api`, opt-in) answers with the same ones.
 *
 * - Amounts are decimal strings with up to 7 places ("12.5"), for XLM and USDC alike. Never JS numbers: use `money.ts`.
 * - Assets are identified by `id` ("XLM" or "CODE:ISSUER"), never by code alone.
 * - Timestamps are ISO 8601 UTC; ids are UUID strings (audit log ids are numbers).
 */

export type ISODate = string;
/** Exact decimal string, up to 7 places (Stellar's precision). */
export type Amount = string;
/** Stellar public key (G…). Public data, never a secret. */
export type StellarAddress = string;

// ---------------------------------------------------------------- envelope

export interface ApiSuccess<T> {
	statusCode: number;
	message: string;
	data: T;
}

export interface ApiErrorBody {
	statusCode: number;
	message: string;
	data: null;
	error: {
		code: string;
		/** Validation errors: one sentence per problem, in form order. */
		details?: string[] | Record<string, unknown>;
		requestId?: string;
		traceId?: string;
		timestamp: string;
		path: string;
		retryAfterSeconds?: number;
	};
}

export interface PaginationMeta {
	nextPage: boolean;
	previousPage: boolean;
	currentPage: number;
	totalPage: number;
	totalCount: number;
	pageCount: number;
}

/** `?limit=1..100&offset=n` lists. */
export interface Page<T> {
	result: T[];
	paginationMeta: PaginationMeta;
}

export interface PageQuery {
	limit?: number;
	offset?: number;
}

// ---------------------------------------------------------------- auth + accounts

export type Role = "builder" | "admin";

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
	tokenType: "Bearer";
	/** Seconds (900). */
	expiresIn: number;
	role: Role;
}

export interface OtpIssued {
	otpExpiresInSeconds: number;
	resendAfterSeconds: number;
}

export interface RegisterResult extends OtpIssued {
	email: string;
}

export interface RegisterInput {
	name: string;
	email: string;
	password: string;
	organizationName?: string;
}

export type SocialPlatform =
	"x" | "github" | "linkedin" | "discord" | "telegram" | "youtube" | "instagram" | "facebook" | "other";

export interface SocialLink {
	platform: SocialPlatform;
	/** https, up to 300 characters. */
	url: string;
}

export interface BuilderProfile {
	displayName: string;
	organizationName: string | null;
	bio: string | null;
	websiteUrl: string | null;
	contactEmail: string | null;
	socialLinks: SocialLink[];
	/** The wallet the builder signed for (`PUT /auth/me/wallet`). Shown on public project pages. */
	walletAddress: StellarAddress | null;
	walletVerifiedAt: ISODate | null;
	/** Signed link, expires: refetch, never store. About 3:1. */
	bannerUrl: string | null;
}

export interface Me {
	id: string;
	email: string;
	role: Role;
	name: string;
	/** Signed link, expires: refetch, never store. Builders and admins. */
	avatarUrl: string | null;
	/** Null for admins. */
	profile: BuilderProfile | null;
	createdAt: ISODate;
}

/** PATCH /auth/me: any subset; "" or null clears an optional field. Admins may send `name` only. */
export interface UpdateMeInput {
	name?: string;
	displayName?: string;
	organizationName?: string | null;
	bio?: string | null;
	websiteUrl?: string | null;
	contactEmail?: string | null;
	/** Replaces the whole list (max 10); [] clears. */
	socialLinks?: SocialLink[];
}

export interface UserSummary {
	id: string;
	email: string;
	name: string;
	role: Role;
	emailVerified: boolean;
	suspended: boolean;
	createdAt: ISODate;
}

export interface UserDetail extends UserSummary {
	suspension: { reason: string; suspendedBy: string; suspendedAt: ISODate } | null;
}

export interface CreatedAdmin {
	id: string;
	email: string;
	name: string;
	role: "admin";
	createdAt: ISODate;
	otpExpiresInSeconds: number;
}

export interface AuditLogEntry {
	id: number;
	at: ISODate;
	actorId: string | null;
	action: string;
	resourceType: string | null;
	resourceId: string | null;
	requestId: string | null;
	traceId: string | null;
	ip: string | null;
	metadata: Record<string, unknown>;
	before: Record<string, unknown> | null;
	after: Record<string, unknown> | null;
}

// ---------------------------------------------------------------- stellar

export type StellarNetwork = "testnet" | "mainnet";

export interface StellarAsset {
	/** "XLM" or "CODE:ISSUER". */
	id: string;
	code: string;
	issuer: string | null;
	native: boolean;
}

export interface StellarNetworkInfo {
	network: StellarNetwork;
	networkPassphrase: string;
	horizonUrl: string;
	explorerUrl: string;
	assets: StellarAsset[];
	platformAccount: string | null;
}

export interface AccountAsset extends StellarAsset {
	trusted: boolean;
	balance: Amount | null;
}

export interface StellarAccountSummary {
	address: StellarAddress;
	shortAddress: string;
	exists: boolean;
	explorerUrl: string;
	assets: AccountAsset[];
}

// ---------------------------------------------------------------- wallet sign-in (SEP-10)

export interface WalletChallenge {
	transaction: string;
	networkPassphrase: string;
	homeDomain: string;
	expiresAt: ISODate;
}

export interface WalletSessionInfo {
	address: StellarAddress;
	shortAddress: string;
	networkPassphrase: string;
	expiresAt: ISODate;
}

export interface WalletToken extends WalletSessionInfo {
	walletToken: string;
	tokenType: "Bearer";
	expiresIn: number;
}

// ---------------------------------------------------------------- categories

export interface Category {
	id: string;
	name: string;
	slug: string;
}

export interface PublicCategory extends Category {
	publishedProjectCount: number;
}

export interface AdminCategory extends Category {
	isActive: boolean;
	sortOrder: number;
	projectCount: number;
}

// ---------------------------------------------------------------- projects

export type ProjectType = "new_idea" | "existing_project";
export type ProjectStatus = "draft" | "submitted" | "under_review" | "changes_requested" | "approved" | "rejected" | "archived";
export type ProjectStage = "idea" | "prototype" | "mvp" | "launched" | "scaling";
export type ProjectAction =
	"start_review" | "approve" | "reject" | "request_changes" | "publish" | "unpublish" | "archive" | "feature" | "unfeature";

export interface TeamMember {
	name: string;
	role: string;
}

export interface ProjectLink {
	label: string;
	url: string;
}

/** POST /builder/projects (type + title required) and PATCH (send only what changed). */
export interface ProjectInput {
	type?: ProjectType;
	title?: string;
	summary?: string | null;
	problem?: string | null;
	solution?: string | null;
	categoryId?: string | null;
	stage?: ProjectStage | null;
	beneficiaries?: string | null;
	teamMembers?: TeamMember[];
	links?: ProjectLink[];
	fundraisingEnabled?: boolean;
	targetAmount?: Amount | null;
	targetAssetId?: string | null;
	acceptedAssetIds?: string[];
	payoutAddress?: StellarAddress | null;
	/** Optional funding deadline (ISO). Must be in the future when submitted; null removes it. */
	fundingEndsAt?: ISODate | null;
}

export interface Feedback {
	action: ProjectAction;
	fromStatus: ProjectStatus;
	toStatus: ProjectStatus;
	/** Shown to the builder. */
	reason: string | null;
	revision: number;
	at: ISODate;
}

export interface ProjectPermissions {
	canEdit: boolean;
	canSubmit: boolean;
	canDelete: boolean;
}

/** A builder's own project (GET /builder/projects/{id}). */
export interface Project {
	id: string;
	type: ProjectType;
	status: ProjectStatus;
	title: string;
	slug: string | null;
	summary: string | null;
	problem: string | null;
	solution: string | null;
	category: Category | null;
	stage: ProjectStage | null;
	beneficiaries: string | null;
	teamMembers: TeamMember[];
	links: ProjectLink[];
	/** Signed link, expires in about an hour: refetch, never store. */
	coverImageUrl: string | null;
	/** Signed link, expires: refetch, never store. Square. */
	logoUrl: string | null;
	fundraisingEnabled: boolean;
	targetAmount: Amount | null;
	targetAsset: StellarAsset | null;
	acceptedAssets: StellarAsset[];
	payoutAddress: StellarAddress | null;
	fundingEndsAt: ISODate | null;
	published: boolean;
	featured: boolean;
	revision: number;
	submittedAt: ISODate | null;
	decidedAt: ISODate | null;
	publishedAt: ISODate | null;
	createdAt: ISODate;
	updatedAt: ISODate;
	latestFeedback: Feedback | null;
	permissions: ProjectPermissions;
}

export interface ProjectOwner {
	id: string;
	name: string;
	email: string;
	displayName: string | null;
	organizationName: string | null;
}

export interface AdminReview extends Feedback {
	id: number;
	adminId: string;
	adminName: string | null;
	/** Admins only. */
	internalNote: string | null;
}

export interface AdminProject extends Project {
	owner: ProjectOwner;
	reviews: AdminReview[];
}

export interface AdminProjectSummary {
	id: string;
	title: string;
	type: ProjectType;
	status: ProjectStatus;
	category: Category | null;
	published: boolean;
	featured: boolean;
	revision: number;
	owner: ProjectOwner;
	submittedAt: ISODate | null;
	updatedAt: ISODate;
}

export interface RevisionSummary {
	revision: number;
	submittedBy: string;
	submittedAt: ISODate;
}

export interface Revision extends RevisionSummary {
	snapshot: Record<string, unknown>;
}

export interface PublicProjectsQuery extends PageQuery {
	q?: string;
	/** Category slug. */
	category?: string;
	stage?: ProjectStage;
	type?: ProjectType;
	featured?: boolean;
	fundraising?: boolean;
	/** Asset id. */
	asset?: string;
	sort?: "featured" | "newest" | "title";
}

export interface RaisedAmount {
	asset: StellarAsset;
	amount: Amount;
}

export interface PublicFunding {
	/** Confirmed totals per asset. Never add different assets together. */
	raised: RaisedAmount[];
	contributionCount: number;
	targetAmount: Amount | null;
	targetAsset: StellarAsset | null;
	acceptedAssets: StellarAsset[];
	/** Funding deadline; null = none. Count the time left on the client. */
	endsAt: ISODate | null;
	/** The deadline has passed: contributions are refused. */
	ended: boolean;
}

export interface PublicBuilder {
	displayName: string | null;
	organizationName: string | null;
	/** Signed link, expires. */
	avatarUrl: string | null;
}

export interface PublicBuilderDetail extends PublicBuilder {
	bio: string | null;
	websiteUrl: string | null;
	/** The public contact the builder chose; never the sign-in email. */
	contactEmail: string | null;
	socialLinks: SocialLink[];
	/** Verified by signing. May differ from the project's payoutAddress. */
	walletAddress: StellarAddress | null;
	bannerUrl: string | null;
}

export interface PublicProjectCard {
	id: string;
	slug: string;
	title: string;
	summary: string;
	type: ProjectType;
	stage: ProjectStage;
	category: Category;
	coverImageUrl: string | null;
	logoUrl: string | null;
	featured: boolean;
	builder: PublicBuilder;
	fundraisingEnabled: boolean;
	/** Null when not fundraising. */
	funding: PublicFunding | null;
	publishedAt: ISODate;
}

export interface PublicProject extends Omit<PublicProjectCard, "builder"> {
	problem: string;
	solution: string;
	beneficiaries: string;
	teamMembers: TeamMember[];
	links: ProjectLink[];
	builder: PublicBuilderDetail;
	/** Where contributions are paid; null when not fundraising. */
	payoutAddress: StellarAddress | null;
	updatedAt: ISODate;
}

// ---------------------------------------------------------------- project updates

export type ProjectUpdateStatus = "published" | "removed";

/** Public (`GET /projects/{slug}/updates`). Plain text: render as text, keep line breaks. */
export interface PublicProjectUpdate {
	id: string;
	/** 5 to 120 characters, one line. */
	title: string;
	/** 20 to 5000 characters. */
	body: string;
	/** Signed link, expires in about an hour. */
	imageUrl: string | null;
	createdAt: ISODate;
	updatedAt: ISODate;
}

/** Builder and admin view, including removed ones. */
export interface ProjectUpdate extends PublicProjectUpdate {
	projectId: string;
	status: ProjectUpdateStatus;
	/** Why an admin removed it; shown to the builder. */
	removalReason: string | null;
	removedAt: ISODate | null;
}

export interface ProjectUpdateInput {
	title: string;
	body: string;
}

// ---------------------------------------------------------------- contributions

export type ContributionStatus = "awaiting_signature" | "pending" | "confirmed" | "failed" | "expired";

export interface ContributionProject {
	id: string;
	slug: string | null;
	title: string;
}

export interface Contribution {
	id: string;
	project: ContributionProject;
	status: ContributionStatus;
	contributorAddress: StellarAddress;
	asset: StellarAsset;
	amount: Amount;
	destination: StellarAddress;
	memo: string;
	/** Network fee in XLM. */
	fee: Amount;
	txHash: string;
	explorerUrl: string;
	/** Signing deadline (10 minutes after prepare). */
	expiresAt: ISODate;
	submittedAt: ISODate | null;
	confirmedAt: ISODate | null;
	ledger: number | null;
	failureReason: string | null;
	createdAt: ISODate;
}

export interface PreparedContribution extends Contribution {
	/** Unsigned transaction XDR for the wallet to sign. */
	transaction: string;
	networkPassphrase: string;
	network: StellarNetwork;
}

export interface PublicContribution {
	id: string;
	/** Shortened address. */
	contributor: string;
	asset: StellarAsset;
	amount: Amount;
	txHash: string;
	explorerUrl: string;
	confirmedAt: ISODate;
}

export interface AdminContribution extends Contribution {
	resultCodes: string[] | null;
	updatedAt: ISODate;
}

// ---------------------------------------------------------------- suggestions + reports

export type SuggestionType = "product_improvement" | "technical_feedback" | "community_marketing" | "other";
export type SuggestionStatus = "pending" | "published" | "rejected" | "hidden";

export interface SuggestionInput {
	type: SuggestionType;
	title: string;
	body: string;
	link?: string;
}

export interface Suggestion {
	id: string;
	project: ContributionProject;
	type: SuggestionType;
	title: string;
	body: string;
	link: string | null;
	status: SuggestionStatus;
	/** The moderator's note, shown to the author when rejected or hidden. */
	moderationNote: string | null;
	moderatedAt: ISODate | null;
	createdAt: ISODate;
}

export interface PublicSuggestion {
	id: string;
	type: SuggestionType;
	title: string;
	body: string;
	link: string | null;
	/** Shortened wallet address. */
	author: string;
	createdAt: ISODate;
}

export interface AdminSuggestion extends Suggestion {
	walletAddress: StellarAddress;
	moderatedBy: string | null;
	openReportCount: number;
}

export type ReportReason = "spam" | "abuse" | "misleading" | "scam" | "other";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface ReportInput {
	reason: ReportReason;
	details?: string;
}

export interface ReportReceipt {
	id: string;
	status: ReportStatus;
}

export interface Report {
	id: string;
	entityType: "suggestion" | "project";
	entityId: string;
	entityTitle: string | null;
	reporterAddress: StellarAddress;
	reason: ReportReason;
	details: string | null;
	status: ReportStatus;
	resolutionNote: string | null;
	resolvedBy: string | null;
	resolvedAt: ISODate | null;
	createdAt: ISODate;
}

export interface AdminSuggestionDetail extends AdminSuggestion {
	reports: Report[];
}

export type SuggestionAction = "approve" | "reject" | "hide";

export interface WalletRestriction {
	address: StellarAddress;
	reason: string;
	restrictedBy: string;
	until: ISODate | null;
	createdAt: ISODate;
}

// ---------------------------------------------------------------- notifications

export type NotificationType =
	| "project_submitted"
	| "review_requested"
	| "project_approved"
	| "project_rejected"
	| "project_changes_requested"
	| "project_archived"
	| "first_contribution"
	| "funding_target_reached"
	| "project_update_removed";

export interface AppNotification {
	id: string;
	type: NotificationType;
	title: string;
	/** Plain text; render as text and keep line breaks. */
	body: string;
	projectId: string | null;
	readAt: ISODate | null;
	createdAt: ISODate;
}

export type WalletNotificationType =
	| "contribution_confirmed"
	| "contribution_failed"
	| "suggestion_published"
	| "suggestion_rejected"
	| "suggestion_hidden"
	| "project_update";

/** For the connected wallet (`/wallet/notifications`, wallet token). */
export interface WalletNotification {
	id: string;
	type: WalletNotificationType;
	title: string;
	/** Plain text; render as text and keep line breaks. */
	body: string;
	projectId: string | null;
	readAt: ISODate | null;
	createdAt: ISODate;
}

// ---------------------------------------------------------------- admin overview + analytics

export interface Backlog {
	projectsAwaitingReview: number;
	suggestionsPending: number;
	reportsOpen: number;
}

export interface AdminOverview {
	queue: Backlog;
	contributions: {
		stuckPending: number;
		stuckAfterMinutes: number;
		confirmed24h: number;
		failed24h: number;
		expired24h: number;
	};
	recentDecisions: {
		projectId: string;
		projectTitle: string;
		action: ProjectAction;
		adminName: string | null;
		createdAt: ISODate;
	}[];
}

export type AnalyticsEvent =
	| "builder_registered"
	| "project_draft_created"
	| "project_submitted"
	| "project_review_decided"
	| "project_published"
	| "project_viewed"
	| "wallet_connected"
	| "contribution_started"
	| "contribution_submitted"
	| "contribution_confirmed"
	| "contribution_failed"
	| "suggestion_submitted"
	| "suggestion_moderated";

/** Rates run 0..1 or are null (show "–"). */
export interface AnalyticsSummary {
	from: ISODate;
	to: ISODate;
	events: Record<AnalyticsEvent, number>;
	metrics: {
		submissionCompletion: { rate: number | null; draftsCreated: number; submitted: number };
		reviewTurnaround: { decisions: number; medianHours: number | null };
		approvalToFunding: { rate: number | null; approved: number; funded: number };
		contributions: {
			started: number;
			submitted: number;
			confirmed: number;
			failed: number;
			expired: number;
			successRate: number | null;
			failedTransactionRate: number | null;
		};
		suggestions: { submitted: number; wallets: number };
		projectViews: number;
		backlog: Backlog;
	};
}

export interface ProjectInsights {
	projectId: string;
	from: ISODate;
	to: ISODate;
	views: number;
	viewsByDay: { date: string; views: number }[];
	contributionsStarted: number;
	contributionsConfirmed: number;
	suggestionsReceived: number;
	suggestionsPublished: number;
}
