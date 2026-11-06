import type {
	AdminContribution,
	AdminProject,
	AdminProjectSummary,
	AnalyticsEvent,
	Contribution,
	Feedback,
	NotificationType,
	Page,
	Project,
	ProjectOwner,
	PublicFunding,
	PublicProject,
	PublicProjectCard,
	StellarAsset,
	StellarNetworkInfo,
} from "@repo/domain/types";
import { compare, sum } from "@repo/domain/money";
import type { ContributionRec, MockDb, ProjectRec, UserRec } from "./records";
import { HttpError } from "./router";
import { USDC_ISSUER, uuid } from "./util";

/** Shared by the mock handlers: the network, DTO mappers, paging, audit, notifications and analytics events. */

export const now = () => new Date().toISOString();

export const XLM: StellarAsset = { id: "XLM", code: "XLM", issuer: null, native: true };
export const USDC: StellarAsset = { id: `USDC:${USDC_ISSUER}`, code: "USDC", issuer: USDC_ISSUER, native: false };
export const ASSETS = [XLM, USDC];
export const assetById = (id: string | null | undefined) => ASSETS.find((a) => a.id === id) ?? null;

export const NETWORK: StellarNetworkInfo = {
	network: "testnet",
	networkPassphrase: "Test SDF Network ; September 2015",
	horizonUrl: "https://horizon-testnet.stellar.org",
	explorerUrl: "https://stellar.expert/explorer/testnet",
	assets: ASSETS,
	platformAccount: null,
};

export const shortAddress = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
export const isAddress = (v: unknown): v is string => typeof v === "string" && /^G[A-Z2-7]{55}$/.test(v);

// ---------------------------------------------------------------- paging

export function page<T>(list: T[], query: URLSearchParams, defaultLimit = 20): Page<T> {
	const limitRaw = query.get("limit");
	const limit = limitRaw === null ? defaultLimit : Number(limitRaw);
	const offset = Number(query.get("offset") ?? 0);
	const problems: string[] = [];
	if (!Number.isInteger(limit) || limit < 1) problems.push("limit must not be less than 1");
	if (limit > 100) problems.push("limit must not be greater than 100");
	if (!Number.isInteger(offset) || offset < 0) problems.push("offset must not be less than 0");
	if (problems.length) throw new HttpError(400, "Validation failed", problems);
	const totalCount = list.length;
	const totalPage = Math.ceil(totalCount / limit);
	const currentPage = Math.floor(offset / limit) + 1;
	const result = list.slice(offset, offset + limit);
	return {
		result,
		paginationMeta: {
			nextPage: offset + limit < totalCount,
			previousPage: offset > 0,
			currentPage,
			totalPage,
			totalCount,
			pageCount: result.length,
		},
	};
}

export const boolParam = (q: URLSearchParams, k: string) => (q.get(k) === null ? undefined : q.get(k) === "true");

// ---------------------------------------------------------------- records → DTOs

const category = (db: MockDb, id: string | null) => {
	const c = db.categories.find((x) => x.id === id);
	return c ? { id: c.id, name: c.name, slug: c.slug } : null;
};

export const confirmedFor = (db: MockDb, projectId: string) =>
	db.contributions.filter((c) => c.projectId === projectId && c.status === "confirmed");

export function funding(db: MockDb, p: ProjectRec): PublicFunding | null {
	if (!p.fundraisingEnabled) return null;
	const confirmed = confirmedFor(db, p.id);
	const accepted = p.acceptedAssetIds.map(assetById).filter((a): a is StellarAsset => !!a);
	const raisedIds = [...new Set([...p.acceptedAssetIds, ...confirmed.map((c) => c.assetId)])];
	return {
		raised: raisedIds
			.map((id) => ({ asset: assetById(id)!, amount: sum(confirmed.filter((c) => c.assetId === id).map((c) => c.amount)) }))
			.filter((r) => r.asset),
		contributionCount: confirmed.length,
		targetAmount: p.targetAmount,
		targetAsset: assetById(p.targetAssetId),
		acceptedAssets: accepted,
	};
}

export function latestFeedback(db: MockDb, projectId: string): Feedback | null {
	const r = db.reviews.filter((x) => x.projectId === projectId && x.reason).sort((a, b) => b.at.localeCompare(a.at))[0];
	return r ? { action: r.action, fromStatus: r.fromStatus, toStatus: r.toStatus, reason: r.reason, revision: r.revision, at: r.at } : null;
}

export function projectDto(db: MockDb, p: ProjectRec): Project {
	const editable = p.status === "draft" || p.status === "changes_requested";
	return {
		id: p.id,
		type: p.type,
		status: p.status,
		title: p.title,
		slug: p.slug,
		summary: p.summary,
		problem: p.problem,
		solution: p.solution,
		category: category(db, p.categoryId),
		stage: p.stage,
		beneficiaries: p.beneficiaries,
		teamMembers: p.teamMembers,
		links: p.links,
		coverImageUrl: p.coverImageUrl,
		fundraisingEnabled: p.fundraisingEnabled,
		targetAmount: p.targetAmount,
		targetAsset: assetById(p.targetAssetId),
		acceptedAssets: p.acceptedAssetIds.map(assetById).filter((a): a is StellarAsset => !!a),
		payoutAddress: p.payoutAddress,
		published: p.published,
		featured: p.featured,
		revision: p.revision,
		submittedAt: p.submittedAt,
		decidedAt: p.decidedAt,
		publishedAt: p.publishedAt,
		createdAt: p.createdAt,
		updatedAt: p.updatedAt,
		latestFeedback: latestFeedback(db, p.id),
		permissions: { canEdit: editable, canSubmit: editable, canDelete: p.status === "draft" && p.revision === 0 },
	};
}

export function ownerDto(db: MockDb, ownerId: string): ProjectOwner {
	const u = db.users.find((x) => x.id === ownerId);
	return {
		id: ownerId,
		name: u?.name ?? "Unknown",
		email: u?.email ?? "",
		displayName: u?.profile?.displayName ?? null,
		organizationName: u?.profile?.organizationName ?? null,
	};
}

export function adminProjectDto(db: MockDb, p: ProjectRec): AdminProject {
	return {
		...projectDto(db, p),
		owner: ownerDto(db, p.ownerId),
		reviews: db.reviews
			.filter((r) => r.projectId === p.id)
			.sort((a, b) => a.at.localeCompare(b.at))
			.map((r) => ({
				id: r.id,
				action: r.action,
				fromStatus: r.fromStatus,
				toStatus: r.toStatus,
				reason: r.reason,
				revision: r.revision,
				at: r.at,
				adminId: r.adminId,
				adminName: db.users.find((u) => u.id === r.adminId)?.name ?? null,
				internalNote: r.internalNote,
			})),
	};
}

export function adminSummaryDto(db: MockDb, p: ProjectRec): AdminProjectSummary {
	return {
		id: p.id,
		title: p.title,
		type: p.type,
		status: p.status,
		category: category(db, p.categoryId),
		published: p.published,
		featured: p.featured,
		revision: p.revision,
		owner: ownerDto(db, p.ownerId),
		submittedAt: p.submittedAt,
		updatedAt: p.updatedAt,
	};
}

/** Public projects: approved, published, and the owner isn't suspended. Everything else 404s. */
export function isPublic(db: MockDb, p: ProjectRec) {
	const owner = db.users.find((u) => u.id === p.ownerId);
	return p.status === "approved" && p.published && !!p.slug && !owner?.suspension;
}

export function cardDto(db: MockDb, p: ProjectRec): PublicProjectCard {
	const owner = db.users.find((u) => u.id === p.ownerId);
	return {
		id: p.id,
		slug: p.slug!,
		title: p.title,
		summary: p.summary ?? "",
		type: p.type,
		stage: p.stage ?? "idea",
		category: category(db, p.categoryId) ?? { id: "", name: "Other", slug: "other" },
		coverImageUrl: p.coverImageUrl,
		featured: p.featured,
		builder: { displayName: owner?.profile?.displayName ?? null, organizationName: owner?.profile?.organizationName ?? null },
		fundraisingEnabled: p.fundraisingEnabled,
		funding: funding(db, p),
		publishedAt: p.publishedAt ?? p.updatedAt,
	};
}

export function publicProjectDto(db: MockDb, p: ProjectRec): PublicProject {
	const owner = db.users.find((u) => u.id === p.ownerId);
	const card = cardDto(db, p);
	return {
		...card,
		builder: {
			displayName: owner?.profile?.displayName ?? null,
			organizationName: owner?.profile?.organizationName ?? null,
			bio: owner?.profile?.bio ?? null,
			websiteUrl: owner?.profile?.websiteUrl ?? null,
			contactEmail: owner?.profile?.contactEmail ?? null,
		},
		problem: p.problem ?? "",
		solution: p.solution ?? "",
		beneficiaries: p.beneficiaries ?? "",
		teamMembers: p.teamMembers,
		links: p.links,
		payoutAddress: p.fundraisingEnabled ? p.payoutAddress : null,
		updatedAt: p.updatedAt,
	};
}

export function contributionDto(db: MockDb, c: ContributionRec): Contribution {
	const p = db.projects.find((x) => x.id === c.projectId);
	return {
		id: c.id,
		project: { id: c.projectId, slug: p?.slug ?? null, title: p?.title ?? "Removed project" },
		status: c.status,
		contributorAddress: c.contributorAddress,
		asset: assetById(c.assetId) ?? XLM,
		amount: c.amount,
		destination: c.destination,
		memo: c.memo,
		fee: c.fee,
		txHash: c.txHash,
		explorerUrl: `${NETWORK.explorerUrl}/tx/${c.txHash}`,
		expiresAt: c.expiresAt,
		submittedAt: c.submittedAt,
		confirmedAt: c.confirmedAt,
		ledger: c.ledger,
		failureReason: c.failureReason,
		createdAt: c.createdAt,
	};
}

export const adminContributionDto = (db: MockDb, c: ContributionRec): AdminContribution => ({
	...contributionDto(db, c),
	resultCodes: c.resultCodes,
	updatedAt: c.updatedAt,
});

export const meDto = (u: UserRec) => ({
	id: u.id,
	email: u.email,
	role: u.role,
	name: u.name,
	profile: u.role === "builder" ? u.profile : null,
	createdAt: u.createdAt,
});

// ---------------------------------------------------------------- side effects (inside `update`)

export function audit(
	db: MockDb,
	actorId: string | null,
	action: string,
	resource: { type: string; id: string } | null,
	extra: { metadata?: Record<string, unknown>; before?: Record<string, unknown> | null; after?: Record<string, unknown> | null } = {},
) {
	db.audit.unshift({
		id: (db.audit[0]?.id ?? 0) + 1,
		at: now(),
		actorId,
		action,
		resourceType: resource?.type ?? null,
		resourceId: resource?.id ?? null,
		requestId: uuid(),
		traceId: null,
		ip: "127.0.0.1",
		metadata: extra.metadata ?? {},
		before: extra.before ?? null,
		after: extra.after ?? null,
	});
}

export function notifyUser(db: MockDb, userId: string, type: NotificationType, title: string, body: string, projectId: string | null) {
	db.notifications.unshift({ id: uuid(), userId, type, title, body, projectId, readAt: null, createdAt: now() });
}

export const event = (db: MockDb, name: AnalyticsEvent, extra: { projectId?: string; wallet?: string } = {}) =>
	db.events.push({ name, at: now(), ...extra });

/** Rate limit: at most `max` hits per `windowMs` for `key`; otherwise 429 with Retry-After. */
export function rateLimit(db: MockDb, key: string, max: number, windowMs: number, message = "Too many requests") {
	const t = Date.now();
	const hits = (db.rateLimits[key] ?? []).filter((x) => t - x < windowMs);
	if (hits.length >= max) throw new HttpError(429, message, undefined, Math.ceil((windowMs - (t - hits[0]!)) / 1000));
	db.rateLimits[key] = [...hits, t];
}

/** "Enough of the target asset raised?" for the funding_target_reached notification. */
export function targetReached(db: MockDb, p: ProjectRec) {
	if (!p.targetAmount || !p.targetAssetId) return false;
	const raised = sum(confirmedFor(db, p.id).filter((c) => c.assetId === p.targetAssetId).map((c) => c.amount));
	return compare(raised, p.targetAmount) >= 0;
}

/** Text length rule in the API's wording. */
export function lengthRule(field: string, value: string | null | undefined, min: number, max: number, out: string[]) {
	const v = (value ?? "").trim();
	if (v.length < min) out.push(`${field} must be longer than or equal to ${min} characters`);
	else if (v.length > max) out.push(`${field} must be shorter than or equal to ${max} characters`);
}
