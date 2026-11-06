import { read, update } from "../db";
import { HttpError, ok, route } from "../router";
import { notifyUser, page } from "../common";

/** The in-app inbox for builders and admins (backend guide, "Notifications"). Wallets have none. */

route("GET", "/notifications", "user", ({ user, query }) => {
	const unread = query.get("unread") === "true";
	const list = read()
		.notifications.filter((n) => n.userId === user!.id && (!unread || !n.readAt))
		.map(({ userId: _u, ...n }) => n);
	return ok(page(list, query), "Notifications retrieved");
});

route("GET", "/notifications/unread-count", "user", ({ user }) =>
	ok({ count: read().notifications.filter((n) => n.userId === user!.id && !n.readAt).length }, "Unread count"),
);

route("POST", "/notifications/:id/read", "user", ({ user, params }) =>
	update((db) => {
		const n = db.notifications.find((x) => x.id === params.id && x.userId === user!.id);
		if (!n) throw new HttpError(404, "Notification not found");
		n.readAt = n.readAt ?? new Date().toISOString();
		const { userId: _u, ...dto } = n;
		return ok(dto, "Marked as read");
	}),
);

route("POST", "/notifications/read-all", "user", ({ user }) =>
	update((db) => {
		let updated = 0;
		for (const n of db.notifications)
			if (n.userId === user!.id && !n.readAt) {
				n.readAt = new Date().toISOString();
				updated++;
			}
		return ok({ updated }, "All marked as read");
	}),
);

/** Mock (Demo panel) only: a sample notification for whoever is signed in. */
route("POST", "/mock/notifications/push", "user", ({ user }) =>
	update((db) => {
		const p = db.projects.find((x) => x.ownerId === user!.id) ?? db.projects[0]!;
		notifyUser(db, user!.id, user!.role === "admin" ? "review_requested" : "first_contribution", user!.role === "admin" ? `${p.title} is waiting for review` : `${p.title} received a contribution`, user!.role === "admin" ? "A builder submitted a project." : "25 XLM was confirmed on Stellar.", p.id);
		return ok(null, "Pushed");
	}),
);
