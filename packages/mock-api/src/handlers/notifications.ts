import type { Notification, NotificationCategory } from "@repo/domain/types";
import { read, update, type MockDb, type MockNotification, type MockUser } from "../db";
import { HttpError, ok, route } from "../router";
import { DAY, hex, iso, paginate, uuid } from "../util";

/**
 * /notifications: one inbox for whoever is reading. A signed-in builder (token) sees their own; a contributor sees
 * the connected wallet's (`?wallet=G…`, no account); everyone sees broadcasts (new projects). Read state is per
 * reader, so a broadcast read by one wallet stays unread for the next.
 */

const WALLET_RE = /^G[A-Z2-7]{55}$/;
const CATEGORIES: NotificationCategory[] = ["projects", "contributions", "suggestions", "account"];

function readerOf(user: MockUser | null, wallet: string | null) {
	if (wallet && !WALLET_RE.test(wallet)) throw new HttpError(422, "That isn’t a valid Stellar address.");
	const keys = [user ? `u:${user.id}` : null, wallet ? `w:${wallet}` : null].filter(Boolean) as string[];
	const sees = (n: MockNotification) =>
		n.broadcast || (!!user && n.user_id === user.id) || (!!wallet && n.wallet_address === wallet);
	return { keys, sees, primaryKey: keys[0] ?? null };
}

const present = (n: MockNotification, keys: string[]): Notification => {
	const { read_by, ...rest } = n;
	return { ...rest, read_at: keys.some((k) => read_by.includes(k)) ? n.created_at : null };
};

/** The first time a wallet shows up, give it some history, as if it had contributed before (demo only). */
function seedWalletHistory(wallet: string) {
	update((db) => {
		if (db.seededWallets.includes(wallet)) return;
		db.seededWallets.push(wallet);
		const now = Date.now();
		const base = { user_id: null, wallet_address: wallet, broadcast: false, payload: {} } as const;
		db.notifications.push(
			{
				...base,
				id: uuid(),
				type: "contribution_confirmed",
				category: "contributions",
				title: "Your 50 XLM contribution to Solar Schools Initiative is confirmed",
				action: { label: "View receipt", href: `/contributions/demo-${hex(8)}` },
				read_by: [],
				created_at: iso(now - 2 * 60 * 60 * 1000),
			},
			{
				...base,
				id: uuid(),
				type: "suggestion_published",
				category: "suggestions",
				title: "Your suggestion on Open Water Map was published",
				action: { label: "View suggestion", href: "/projects/open-water-map#suggestions" },
				read_by: [],
				created_at: iso(now - 26 * 60 * 60 * 1000),
			},
			{
				...base,
				id: uuid(),
				type: "contribution_failed",
				category: "contributions",
				title: "A 20 XLM contribution to Code Club Lagos didn’t go through. Nothing was sent.",
				action: { label: "Try again", href: "/projects/code-club-lagos/contribute" },
				read_by: [`w:${wallet}`],
				created_at: iso(now - 3 * DAY),
			},
		);
	});
}

function inbox(db: MockDb, user: MockUser | null, wallet: string | null) {
	const reader = readerOf(user, wallet);
	const list = db.notifications.filter(reader.sees).sort((a, b) => b.created_at.localeCompare(a.created_at));
	const unread = list.filter((n) => !reader.keys.some((k) => n.read_by.includes(k)));
	return { reader, list, unread };
}

route("GET", "/notifications", "public", ({ user, query }) => {
	const wallet = query.get("wallet");
	if (wallet && WALLET_RE.test(wallet)) seedWalletHistory(wallet);
	const { reader, list, unread } = inbox(read(), user, wallet);
	const category = query.get("category") as NotificationCategory | null;
	let items = query.get("status") === "unread" ? unread : list;
	if (category && CATEGORIES.includes(category)) items = items.filter((n) => n.category === category);
	const page = paginate(items, Number(query.get("page") ?? 1), Number(query.get("limit") ?? 10));
	return ok({
		items: page.items.map((n) => present(n, reader.keys)),
		meta: { page: page.page, limit: page.limit, total: page.total, total_pages: page.total_pages },
		unread_count: unread.length,
		personalised: reader.keys.length > 0,
	});
});

route("GET", "/notifications/unread-count", "public", ({ user, query }) => {
	const wallet = query.get("wallet");
	if (wallet && WALLET_RE.test(wallet)) seedWalletHistory(wallet);
	return ok({ unread_count: inbox(read(), user, wallet).unread.length });
});

route("POST", "/notifications/:id/read", "public", ({ user, params, body }) => {
	const reader = readerOf(user, (body.wallet as string) || null);
	if (!reader.primaryKey) return ok({}, "Nothing to mark");
	update((db) => {
		const n = db.notifications.find((x) => x.id === params.id && reader.sees(x));
		if (!n) throw new HttpError(404, "Notification not found.");
		for (const k of reader.keys) if (!n.read_by.includes(k)) n.read_by.push(k);
	});
	return ok({}, "Marked as read");
});

route("POST", "/notifications/read-all", "public", ({ user, body }) => {
	const reader = readerOf(user, (body.wallet as string) || null);
	if (!reader.primaryKey) return ok({ updated: 0 }, "Nothing to mark");
	const updated = update((db) => {
		let count = 0;
		for (const n of db.notifications.filter(reader.sees)) {
			for (const k of reader.keys)
				if (!n.read_by.includes(k)) {
					n.read_by.push(k);
					count++;
				}
		}
		return count;
	});
	return ok({ updated }, "All caught up");
});

/** Mock only (Demo panel): a realistic new notification for whoever is reading, to see the live badge and toast. */
route("POST", "/mock/notifications/push", "public", ({ user, body }) => {
	const wallet = (body.wallet as string) || null;
	readerOf(user, wallet);
	const projects = read().projects.filter((p) => p.status === "approved");
	const project = projects[Math.floor(Math.random() * projects.length)]!;
	const options: Omit<MockNotification, "id" | "read_by" | "created_at" | "payload">[] = [
		{
			user_id: null,
			wallet_address: null,
			broadcast: true,
			type: "project_published",
			category: "projects",
			title: `${project.title} is now open for contributions`,
			action: { label: "Contribute", href: `/projects/${project.slug}` },
		},
	];
	if (wallet)
		options.push({
			user_id: null,
			wallet_address: wallet,
			broadcast: false,
			type: "contribution_confirmed",
			category: "contributions",
			title: `Your 25 XLM contribution to ${project.title} is confirmed`,
			action: { label: "View receipt", href: `/contributions/demo-${hex(8)}` },
		});
	if (user)
		options.push({
			user_id: user.id,
			wallet_address: null,
			broadcast: false,
			type: "project_approved",
			category: "projects",
			title: `${project.title} was approved and is now public`,
			action: { label: "View project", href: `/projects/${project.slug}` },
		});
	const pick = options[options.length - 1]!;
	const created = update((db) => {
		const n: MockNotification = { ...pick, id: uuid(), payload: {}, read_by: [], created_at: iso(Date.now()) };
		db.notifications.push(n);
		return n;
	});
	return ok(present(created, []), "Pushed", 201);
});
