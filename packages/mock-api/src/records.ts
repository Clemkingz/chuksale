import type {
	AnalyticsEvent,
	AppNotification,
	AuditLogEntry,
	ContributionStatus,
	ProjectAction,
	ProjectLink,
	ProjectStage,
	ProjectStatus,
	ProjectType,
	ProjectUpdate,
	Report,
	Role,
	SuggestionStatus,
	SocialLink,
	SuggestionType,
	TeamMember,
	WalletNotification,
	WalletRestriction,
} from "@repo/domain/types";

/**
 * What the mock backend stores. Records are close to the API's DTOs (camelCase), plus what only the server sees
 * (passwords, owner ids, wallet addresses). `dto.ts` turns them into the exact response shapes.
 */

export interface UserRec {
	id: string;
	email: string;
	name: string;
	role: Role;
	/** Mock only: plain text, never sent anywhere. */
	password: string;
	emailVerified: boolean;
	suspension: { reason: string; suspendedBy: string; suspendedAt: string } | null;
	/** Data URL in the mock (the API returns a signed link). */
	avatarUrl: string | null;
	profile: {
		displayName: string;
		organizationName: string | null;
		bio: string | null;
		websiteUrl: string | null;
		contactEmail: string | null;
		socialLinks: SocialLink[];
		walletAddress: string | null;
		walletVerifiedAt: string | null;
		bannerUrl: string | null;
	} | null;
	createdAt: string;
}

export interface CategoryRec {
	id: string;
	name: string;
	slug: string;
	isActive: boolean;
	sortOrder: number;
}

export interface ProjectRec {
	id: string;
	ownerId: string;
	type: ProjectType;
	status: ProjectStatus;
	title: string;
	slug: string | null;
	summary: string | null;
	problem: string | null;
	solution: string | null;
	categoryId: string | null;
	stage: ProjectStage | null;
	beneficiaries: string | null;
	teamMembers: TeamMember[];
	links: ProjectLink[];
	/** Data URL in the mock (the API returns a signed link). */
	coverImageUrl: string | null;
	logoUrl: string | null;
	fundraisingEnabled: boolean;
	targetAmount: string | null;
	targetAssetId: string | null;
	acceptedAssetIds: string[];
	payoutAddress: string | null;
	fundingEndsAt: string | null;
	published: boolean;
	featured: boolean;
	revision: number;
	submittedAt: string | null;
	decidedAt: string | null;
	publishedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ReviewRec {
	id: number;
	projectId: string;
	action: ProjectAction;
	fromStatus: ProjectStatus;
	toStatus: ProjectStatus;
	reason: string | null;
	internalNote: string | null;
	adminId: string;
	revision: number;
	at: string;
}

export interface RevisionRec {
	projectId: string;
	revision: number;
	submittedBy: string;
	submittedAt: string;
	snapshot: Record<string, unknown>;
}

export interface ContributionRec {
	id: string;
	projectId: string;
	status: ContributionStatus;
	contributorAddress: string;
	assetId: string;
	amount: string;
	destination: string;
	memo: string;
	fee: string;
	txHash: string;
	expiresAt: string;
	submittedAt: string | null;
	confirmedAt: string | null;
	ledger: number | null;
	failureReason: string | null;
	resultCodes: string[] | null;
	createdAt: string;
	updatedAt: string;
	/** Mock only: a Demo-wallet payment settles to this outcome at `settleAt`. */
	settle?: { outcome: "confirmed" | "failed"; at: number };
}

export interface SuggestionRec {
	id: string;
	projectId: string;
	walletAddress: string;
	type: SuggestionType;
	title: string;
	body: string;
	link: string | null;
	status: SuggestionStatus;
	moderationNote: string | null;
	moderatedAt: string | null;
	moderatedBy: string | null;
	createdAt: string;
}

export interface NotificationRec extends AppNotification {
	userId: string;
}

/** Project updates (images are data URLs in the mock). */
export type UpdateRec = ProjectUpdate;

export interface WalletNotificationRec extends WalletNotification {
	address: string;
}

export interface MockDb {
	version: number;
	/** When this document was last written (ms). Newest wins when the apps sync (mock-sync). */
	savedAt?: number;
	seededAt: string;
	users: UserRec[];
	/** Refresh tokens (single use): token → user. */
	refreshTokens: { token: string; userId: string }[];
	/** Pending email codes (the mock accepts any 6 digits, but tracks who asked). */
	otps: { email: string; purpose: "verify" | "reset"; at: number }[];
	categories: CategoryRec[];
	projects: ProjectRec[];
	reviews: ReviewRec[];
	revisions: RevisionRec[];
	contributions: ContributionRec[];
	walletSessions: { token: string; address: string; expiresAt: string }[];
	challenges: { nonce: string; address: string; expiresAt: string }[];
	suggestions: SuggestionRec[];
	reports: (Report & { reporterAddress: string })[];
	restrictions: WalletRestriction[];
	notifications: NotificationRec[];
	walletNotifications: WalletNotificationRec[];
	updates: UpdateRec[];
	audit: AuditLogEntry[];
	events: { name: AnalyticsEvent; at: string; projectId?: string; wallet?: string }[];
	/** Rate-limit buckets: key → timestamps. */
	rateLimits: Record<string, number[]>;
}
