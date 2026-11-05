import type { BuilderProfileSummary, BuilderProjectListItem, Project, ProjectLink } from "@repo/domain/types";
import { countsTowardTotal } from "@repo/domain/contribution-status";
import { sum } from "@repo/domain/money";
import { inBuilderGroup, isBuilderEditable, transition, type BuilderProjectGroup } from "@repo/domain/project-status";
import { read, update, type MockDb, type MockUser } from "../db";
import { HttpError, ok, route } from "../router";
import { iso, paginate, uuid } from "../util";

/**
 * /builder/*: the signed-in builder's profile and own projects (FR-PROJ-06: never anyone else's).
 * Designs "Dev add project 1–3": dashboard (profile, tabs, search, table) and the Add Project form.
 * Contract: docs/API.md § Builder.
 */

const ASSET_CODE: Record<string, string> = { xlm: "XLM", usdc: "USDC" };
const GROUPS: BuilderProjectGroup[] = ["all", "pending", "completed"];

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** The form downsizes images in the browser, so a real logo is far below this. */
const LOGO = /^data:image\/(png|jpeg|gif|svg\+xml|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_LOGO_CHARS = 1_500_000;

function profileOf(db: MockDb, user: MockUser): BuilderProfileSummary {
	const p = db.profiles.find((x) => x.user_id === user.id);
	return {
		display_name: p?.display_name ?? user.email,
		organization_name: p?.organization_name ?? null,
		bio: p?.bio ?? null,
		avatar_url: p?.avatar_url ?? null,
		wallet_address: p?.wallet_address ?? null,
		contact_email: p?.contact_email ?? user.email,
		website: p?.website ?? null,
		twitter_url: p?.twitter_url ?? null,
		discord_url: p?.discord_url ?? null,
		telegram_url: p?.telegram_url ?? null,
		email: user.email,
		joined_at: user.created_at,
	};
}

function listItem(db: MockDb, p: Project): BuilderProjectListItem {
	const confirmed = db.contributions.filter((c) => c.project_id === p.id && countsTowardTotal(c.status));
	const category = db.categories.find((c) => c.id === p.category_id);
	return {
		id: p.id,
		title: p.title,
		slug: p.slug,
		logo_url: p.logo_url,
		status: p.status,
		visibility: p.visibility,
		fundraising: p.fundraising,
		target_amount: p.target_amount,
		destination_address: p.destination_address,
		ends_at: p.ends_at,
		created_at: p.created_at,
		updated_at: p.updated_at,
		category: category ? { id: category.id, name: category.name } : null,
		target_asset: p.target_asset_id ? { id: p.target_asset_id, code: ASSET_CODE[p.target_asset_id] ?? p.target_asset_id } : null,
		raised_amount: sum(confirmed.map((c) => c.amount)),
		contributor_count: new Set(confirmed.map((c) => c.sender_address)).size,
	};
}

route("GET", "/builder/profile", "user", ({ user }) => ok(profileOf(read(), user!)));

const BIO_MAX = 280;

/** Design "Edit Profile". Same field rules as Add Project; empty optional fields are cleared. */
route("PATCH", "/builder/profile", "user", ({ user, body }) => {
	const name = String(body.display_name ?? "").trim();
	const bio = String(body.bio ?? "").trim();
	const avatar = String(body.avatar_url ?? "");
	const email = String(body.contact_email ?? "")
		.trim()
		.toLowerCase();
	const wallet = String(body.wallet_address ?? "")
		.trim()
		.toUpperCase();
	if (name.length < 2 || name.length > 60)
		throw new HttpError(422, "Use 2–60 characters for your name.", { field: "display_name" });
	if (bio.length > BIO_MAX) throw new HttpError(422, `Keep it under ${BIO_MAX} characters.`, { field: "bio" });
	if (avatar && (!LOGO.test(avatar) || avatar.length > MAX_LOGO_CHARS))
		throw new HttpError(422, "Use a JPG, PNG, SVG or GIF image under 1 MB.", { field: "avatar_url" });
	if (!EMAIL.test(email)) throw new HttpError(422, "Enter a valid email address.", { field: "contact_email" });
	if (wallet && !STELLAR_ADDRESS.test(wallet))
		throw new HttpError(422, "Enter a Stellar address: 56 characters starting with G.", { field: "wallet_address" });
	const link = (key: string, label: string) => cleanUrl(body[key], label, key)?.url ?? null;
	const links = {
		twitter_url: link("twitter_url", "Twitter"),
		discord_url: link("discord_url", "Discord"),
		telegram_url: link("telegram_url", "Telegram"),
		website: link("website", "Website"),
	};

	update((db) => {
		const p = db.profiles.find((x) => x.user_id === user!.id);
		if (!p) throw new HttpError(404, "Profile not found.");
		Object.assign(p, {
			display_name: name,
			bio: bio || null,
			avatar_url: avatar || null,
			contact_email: email,
			wallet_address: wallet || null,
			...links,
		});
		const u = db.users.find((x) => x.id === user!.id);
		if (u) u.updated_at = iso(Date.now());
	});
	return ok(profileOf(read(), user!), "Profile updated");
});

route("GET", "/builder/projects", "user", ({ user, query }) => {
	const db = read();
	const group = (GROUPS as string[]).includes(query.get("group") ?? "") ? (query.get("group") as BuilderProjectGroup) : "all";
	const q = (query.get("q") ?? "").trim().toLowerCase();
	const mine = db.projects.filter((p) => p.owner_user_id === user!.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
	const searched = q ? mine.filter((p) => p.title.toLowerCase().includes(q) || p.slug.includes(q)) : mine;
	const page = paginate(
		searched.filter((p) => inBuilderGroup(p.status, group)),
		Number(query.get("page") ?? 1),
		Number(query.get("limit") ?? 6),
	);
	return ok({
		items: page.items.map((p) => listItem(db, p)),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		// Tab badges follow the search, so "Pending (2)" means two matches.
		counts: Object.fromEntries(GROUPS.map((g) => [g, searched.filter((p) => inBuilderGroup(p.status, g)).length])),
		// Whether the builder has any project at all (design 1's empty state vs "no matches").
		has_any: mine.length > 0,
	});
});

const slugify = (title: string) =>
	title
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/[\s_-]+/g, "-")
		.slice(0, 60) || "project";

function cleanUrl(value: unknown, label: string, field: string): ProjectLink | null {
	const raw = String(value ?? "").trim();
	if (!raw) return null;
	try {
		const url = new URL(raw);
		if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
		return { label, url: url.toString() };
	} catch {
		throw new HttpError(422, `Enter a full link for ${label} (starting with https://).`, { field });
	}
}

/** Design "Add Project": one step. Creates the project as a draft and submits it through the state machine. */
route("POST", "/builder/projects", "user", ({ user, body }) => {
	const title = String(body.title ?? "").trim();
	const email = String(body.contact_email ?? "")
		.trim()
		.toLowerCase();
	const wallet = String(body.destination_address ?? "").trim();
	const logo = String(body.logo_url ?? "");
	const links = (body.links ?? {}) as Record<string, unknown>;

	if (title.length < 3 || title.length > 80)
		throw new HttpError(422, "Use 3–80 characters for the project name.", { field: "title" });
	if (!logo) throw new HttpError(422, "Add a project logo.", { field: "logo_url" });
	if (!LOGO.test(logo) || logo.length > MAX_LOGO_CHARS)
		throw new HttpError(422, "Use a JPG, PNG, SVG or GIF logo under 1 MB.", { field: "logo_url" });
	if (!EMAIL.test(email)) throw new HttpError(422, "Enter a valid email address.", { field: "contact_email" });
	if (!STELLAR_ADDRESS.test(wallet))
		throw new HttpError(422, "Enter a Stellar address: 56 characters starting with G.", { field: "destination_address" });

	const projectLinks = [
		cleanUrl(links.twitter, "Twitter", "links.twitter"),
		cleanUrl(links.discord, "Discord", "links.discord"),
		cleanUrl(links.telegram, "Telegram", "links.telegram"),
		cleanUrl(links.website, "Website", "links.website"),
	].filter((l): l is ProjectLink => !!l);

	const created = update((db) => {
		const base = slugify(title);
		let slug = base;
		for (let n = 2; db.projects.some((p) => p.slug === slug); n++) slug = `${base}-${n}`;
		const now = iso(Date.now());
		const project: Project = {
			id: uuid(),
			owner_user_id: user!.id,
			title,
			slug,
			project_type: "new_idea",
			summary: "",
			problem: "",
			solution: "",
			beneficiaries: "",
			category_id: null,
			stage: null,
			cover_image_url: null,
			logo_url: logo,
			contact_email: email,
			team: [],
			links: projectLinks,
			fundraising: true,
			target_amount: null,
			target_asset_id: "xlm",
			destination_address: wallet,
			status: transition("draft", "submitted", "builder"),
			visibility: "unpublished",
			featured: false,
			submitted_at: now,
			approved_at: null,
			ends_at: null,
			created_at: now,
			updated_at: now,
		};
		db.projects.push(project);
		db.revisions.push({
			id: uuid(),
			project_id: project.id,
			revision_number: 1,
			submitted_payload: { title, contact_email: email, destination_address: wallet, links: projectLinks },
			created_by: user!.id,
			created_at: now,
		});
		db.notifications.push({
			id: uuid(),
			user_id: user!.id,
			wallet_address: null,
			broadcast: false,
			type: "submission_received",
			category: "projects",
			title: `We received ${title} for review`,
			action: { label: "View dashboard", href: "/builder/dashboard?tab=pending" },
			payload: { project_id: project.id },
			read_by: [],
			created_at: now,
		});
		return listItem(db, project);
	});
	return ok(created, "Project submitted for review", 201);
});

// ------------------------------------------------------------------ one project (status page, edit, preview)

/** Owner only (FR-PROJ-06): someone else's project is a 403, not a 404 that leaks nothing either way. */
function ownProject(db: MockDb, userId: string, id: string) {
	const p = db.projects.find((x) => x.id === id);
	if (!p) throw new HttpError(404, "Project not found.");
	if (p.owner_user_id !== userId) throw new HttpError(403, "This isn’t your project.");
	return p;
}

route("GET", "/builder/projects/:id", "user", ({ user, params }) => {
	const db = read();
	const p = ownProject(db, user!.id, params.id!);
	const confirmed = db.contributions.filter((c) => c.project_id === p.id && countsTowardTotal(c.status));
	return ok({
		...p,
		category: db.categories.find((c) => c.id === p.category_id) ?? null,
		target_asset: p.target_asset_id ? { id: p.target_asset_id, code: ASSET_CODE[p.target_asset_id] ?? p.target_asset_id } : null,
		raised_amount: sum(confirmed.map((c) => c.amount)),
		contributor_count: new Set(confirmed.map((c) => c.sender_address)).size,
		// The builder sees the reason, never the admin's internal note (FR-REV-03).
		reviews: db.reviews
			.filter((r) => r.project_id === p.id)
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map((r) => ({ id: r.id, decision: r.decision, reason: r.reason, created_at: r.created_at })),
		revisions: db.revisions
			.filter((r) => r.project_id === p.id)
			.map((r) => ({ id: r.id, revision_number: r.revision_number, created_at: r.created_at })),
		suggestion_count: db.suggestions.filter((s) => s.project_id === p.id && s.status === "published").length,
		editable: p.status === "draft" || p.status === "changes_requested",
	});
});

const STAGES = ["idea", "prototype", "mvp", "live", "scaling"];

/** Full edit (only while draft / changes requested). Same field rules as creation, plus the PRD §6.2 details. */
route("PATCH", "/builder/projects/:id", "user", ({ user, params, body }) => {
	const fieldErr = (field: string, message: string) => new HttpError(422, message, { field });
	const text = (key: string, min: number, max: number, label: string) => {
		const v = String(body[key] ?? "").trim();
		if (v.length && (v.length < min || v.length > max)) throw fieldErr(key, `Use ${min}–${max} characters for ${label}.`);
		return v;
	};
	const title = String(body.title ?? "").trim();
	if (title.length < 3 || title.length > 80) throw fieldErr("title", "Use 3–80 characters for the project name.");
	const summary = text("summary", 20, 280, "the summary");
	const problem = text("problem", 20, 2000, "the problem");
	const solution = text("solution", 20, 2000, "the solution");
	const beneficiaries = text("beneficiaries", 5, 500, "who benefits");
	const email = String(body.contact_email ?? "")
		.trim()
		.toLowerCase();
	if (!EMAIL.test(email)) throw fieldErr("contact_email", "Enter a valid email address.");
	const wallet = String(body.destination_address ?? "")
		.trim()
		.toUpperCase();
	if (!STELLAR_ADDRESS.test(wallet))
		throw fieldErr("destination_address", "Enter a Stellar address: 56 characters starting with G.");
	const logo = String(body.logo_url ?? "");
	if (logo && (!LOGO.test(logo) || logo.length > MAX_LOGO_CHARS))
		throw fieldErr("logo_url", "Use a JPG, PNG, SVG or GIF logo under 1 MB.");
	const stage = body.stage ? String(body.stage) : null;
	if (stage && !STAGES.includes(stage)) throw fieldErr("stage", "Choose a stage.");
	const target = String(body.target_amount ?? "").trim();
	if (target && !/^\d+(\.\d{1,7})?$/.test(target)) throw fieldErr("target_amount", "Enter a number with up to 7 decimals.");
	const assetId = body.target_asset_id === "usdc" ? "usdc" : "xlm";
	const links = (body.links ?? {}) as Record<string, unknown>;
	const projectLinks = [
		cleanUrl(links.twitter, "Twitter", "links.twitter"),
		cleanUrl(links.discord, "Discord", "links.discord"),
		cleanUrl(links.telegram, "Telegram", "links.telegram"),
		cleanUrl(links.website, "Website", "links.website"),
	].filter((l): l is ProjectLink => !!l);

	return ok(
		update((db) => {
			const p = ownProject(db, user!.id, params.id!);
			if (!isBuilderEditable(p.status))
				throw new HttpError(409, "You can edit a project only while it’s a draft or changes were requested.");
			const category = body.category_id ? String(body.category_id) : null;
			if (category && !db.categories.some((c) => c.id === category && c.is_active))
				throw fieldErr("category_id", "Choose a category.");
			Object.assign(p, {
				title,
				summary,
				problem,
				solution,
				beneficiaries,
				category_id: category,
				stage,
				project_type: body.project_type === "existing_project" ? "existing_project" : "new_idea",
				logo_url: logo || p.logo_url,
				contact_email: email,
				destination_address: wallet,
				target_amount: target ? `${target}${target.includes(".") ? "" : ".0000000"}` : null,
				target_asset_id: assetId,
				links: projectLinks,
				updated_at: iso(Date.now()),
			});
			return { id: p.id };
		}),
		"Changes saved",
	);
});

/** Resubmit after changes (or submit a draft): needs the details an admin reviews (PRD §6.2). */
route("POST", "/builder/projects/:id/submit", "user", ({ user, params }) =>
	ok(
		update((db) => {
			const p = ownProject(db, user!.id, params.id!);
			const missing = [
				!p.summary && "summary",
				!p.category_id && "category",
				!p.stage && "stage",
				!p.destination_address && "Stellar address",
			].filter(Boolean);
			if (missing.length)
				throw new HttpError(422, `Add your project’s ${missing.join(", ")} before submitting.`, { field: "missing" });
			const now = iso(Date.now());
			p.status = transition(p.status, "submitted", "builder");
			p.submitted_at = now;
			p.updated_at = now;
			const n = db.revisions.filter((r) => r.project_id === p.id).length + 1;
			db.revisions.push({
				id: uuid(),
				project_id: p.id,
				revision_number: n,
				submitted_payload: { title: p.title, summary: p.summary },
				created_by: user!.id,
				created_at: now,
			});
			db.notifications.push({
				id: uuid(),
				user_id: user!.id,
				wallet_address: null,
				broadcast: false,
				type: "submission_received",
				category: "projects",
				title: `We received ${p.title} for review`,
				action: { label: "View status", href: `/builder/projects/${p.id}` },
				payload: { project_id: p.id },
				read_by: [],
				created_at: now,
			});
			return { id: p.id, status: p.status };
		}),
		"Submitted for review",
	),
);

route("GET", "/builder/projects/:id/suggestions", "user", ({ user, params }) => {
	const db = read();
	const p = ownProject(db, user!.id, params.id!);
	return ok(
		db.suggestions
			.filter((s) => s.project_id === p.id && s.status === "published")
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map((s) => ({
				id: s.id,
				type: s.type,
				title: s.title,
				body: s.body,
				link: s.link,
				wallet_address: s.wallet_address,
				created_at: s.created_at,
			})),
	);
});
