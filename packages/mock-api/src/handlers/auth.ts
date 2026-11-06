import type { AuthTokens } from "@repo/domain/types";
import { read, update } from "../db";
import type { MockDb, UserRec } from "../records";
import { ACCESS_TTL_S, HttpError, NoContent, accessToken, invalid, ok, route } from "../router";
import { uuid } from "../util";
import { audit, event, meDto, now, rateLimit } from "../common";

/**
 * Accounts (backend guide, "Authentication"). Mock rules: any 6-digit code verifies; refresh tokens are single use
 * (reusing one revokes the session, like the API); access tokens last 15 minutes.
 */

const EMAIL = /^\S+@\S+\.\S+$/;
const isCode = (v: unknown) => typeof v === "string" && /^\d{6}$/.test(v);
const s = (v: unknown) => (typeof v === "string" ? v : "");

function issue(db: MockDb, u: UserRec): AuthTokens {
	const refreshToken = `mock.rt.${uuid()}`;
	db.refreshTokens.push({ token: refreshToken, userId: u.id });
	return { accessToken: accessToken(u.id), refreshToken, tokenType: "Bearer", expiresIn: ACCESS_TTL_S, role: u.role };
}

function passwordRules(field: string, v: unknown, out: string[]) {
	if (typeof v !== "string") out.push(`${field} must be a string`);
	else if (v.length < 8) out.push(`${field} must be longer than or equal to 8 characters`);
	else if (v.length > 128) out.push(`${field} must be shorter than or equal to 128 characters`);
}

function unknownFields(body: Record<string, unknown>, allowed: string[]) {
	const extra = Object.keys(body).filter((k) => !allowed.includes(k));
	if (extra.length) throw invalid(extra.map((k) => `property ${k} should not exist`));
}

route("POST", "/auth/register", "public", ({ body }) => {
	unknownFields(body, ["name", "email", "password", "organizationName"]);
	const problems: string[] = [];
	const name = s(body.name).trim();
	if (name.length < 1 || name.length > 100) problems.push("name must be longer than or equal to 1 characters");
	if (!EMAIL.test(s(body.email))) problems.push("email must be an email");
	passwordRules("password", body.password, problems);
	if (body.organizationName !== undefined && s(body.organizationName).length > 150)
		problems.push("organizationName must be shorter than or equal to 150 characters");
	if (problems.length) throw invalid(problems);
	const email = s(body.email).trim().toLowerCase();
	return update((db) => {
		rateLimit(db, "auth:ip", 30, 60_000, "Too many attempts");
		const existing = db.users.find((u) => u.email === email);
		if (existing?.emailVerified) throw new HttpError(409, "An account with this email already exists");
		// Signing up again with an unverified email replaces that pending account.
		db.users = db.users.filter((u) => u !== existing);
		const user: UserRec = {
			id: uuid(),
			email,
			name,
			role: "builder",
			password: s(body.password),
			emailVerified: false,
			suspension: null,
			profile: {
				displayName: name,
				organizationName: s(body.organizationName).trim() || null,
				bio: null,
				websiteUrl: null,
				contactEmail: null,
			},
			createdAt: now(),
		};
		db.users.push(user);
		db.otps.push({ email, purpose: "verify", at: Date.now() });
		event(db, "builder_registered");
		return ok({ email, otpExpiresInSeconds: 600, resendAfterSeconds: 60 }, "Verification code sent", 201);
	});
});

route("POST", "/auth/verify-email", "public", ({ body }) => {
	if (!EMAIL.test(s(body.email)) || !isCode(body.otp)) throw invalid(["otp must be a 6-digit code"]);
	return update((db) => {
		const u = db.users.find((x) => x.email === s(body.email).trim().toLowerCase());
		if (!u) throw new HttpError(400, "Invalid or expired code");
		u.emailVerified = true;
		audit(db, u.id, "auth.verify_email", { type: "user", id: u.id });
		return ok(issue(db, u), "Email verified");
	});
});

route("POST", "/auth/resend-otp", "public", ({ body }) =>
	update((db) => {
		const email = s(body.email).trim().toLowerCase();
		const last = db.otps.filter((o) => o.email === email).at(-1);
		if (last && Date.now() - last.at < 60_000) throw new HttpError(429, "Please wait before requesting another code", undefined, 60 - Math.floor((Date.now() - last.at) / 1000));
		db.otps.push({ email, purpose: "verify", at: Date.now() });
		return ok({ otpExpiresInSeconds: 600, resendAfterSeconds: 60 }, "If the account exists, a code was sent");
	}),
);

route("POST", "/auth/forgot-password", "public", ({ body }) =>
	update((db) => {
		db.otps.push({ email: s(body.email).trim().toLowerCase(), purpose: "reset", at: Date.now() });
		return ok({ otpExpiresInSeconds: 600, resendAfterSeconds: 60 }, "If the account exists, a code was sent");
	}),
);

route("POST", "/auth/reset-password", "public", ({ body }) => {
	const problems: string[] = [];
	if (!isCode(body.otp)) problems.push("otp must be a 6-digit code");
	passwordRules("newPassword", body.newPassword, problems);
	if (problems.length) throw invalid(problems);
	return update((db) => {
		const u = db.users.find((x) => x.email === s(body.email).trim().toLowerCase());
		if (!u) throw new HttpError(400, "Invalid or expired code");
		u.password = s(body.newPassword);
		u.emailVerified = true;
		// All sessions end.
		db.refreshTokens = db.refreshTokens.filter((t) => t.userId !== u.id);
		audit(db, u.id, "auth.reset_password", { type: "user", id: u.id });
		return ok(null, "Password reset");
	});
});

route("POST", "/auth/login", "public", ({ body }) =>
	update((db) => {
		rateLimit(db, "login:ip", 30, 60_000, "Too many sign-in attempts");
		const u = db.users.find((x) => x.email === s(body.email).trim().toLowerCase());
		if (!u || u.password !== s(body.password)) throw new HttpError(401, "Invalid credentials");
		if (!u.emailVerified) throw new HttpError(403, "Email not verified");
		if (u.suspension) throw new HttpError(403, "Account suspended");
		return ok(issue(db, u), "Login successful");
	}),
);

route("POST", "/auth/refresh", "public", ({ body }) =>
	update((db) => {
		const t = db.refreshTokens.find((x) => x.token === s(body.refreshToken));
		if (!t) throw new HttpError(401, "Invalid refresh token");
		const u = db.users.find((x) => x.id === t.userId);
		db.refreshTokens = db.refreshTokens.filter((x) => x !== t); // single use
		if (!u || u.suspension) throw new HttpError(401, "Invalid refresh token");
		return ok(issue(db, u), "Token refreshed");
	}),
);

route("POST", "/auth/logout", "public", ({ body }) => {
	update((db) => {
		db.refreshTokens = db.refreshTokens.filter((x) => x.token !== s(body.refreshToken));
	});
	return new NoContent();
});

route("POST", "/auth/logout-all", "user", ({ user }) =>
	update((db) => {
		db.refreshTokens = db.refreshTokens.filter((x) => x.userId !== user!.id);
		return ok(null, "Signed out everywhere");
	}),
);

route("POST", "/auth/change-password", "user", ({ user, body }) => {
	const problems: string[] = [];
	passwordRules("newPassword", body.newPassword, problems);
	if (problems.length) throw invalid(problems);
	return update((db) => {
		const u = db.users.find((x) => x.id === user!.id)!;
		if (u.password !== s(body.currentPassword)) throw new HttpError(400, "Current password is incorrect");
		u.password = s(body.newPassword);
		audit(db, u.id, "auth.change_password", { type: "user", id: u.id });
		return ok(null, "Password changed");
	});
});

route("GET", "/auth/me", "user", ({ user }) => ok(meDto(read().users.find((u) => u.id === user!.id)!), "Profile"));

route("PATCH", "/auth/me", "user", ({ user, body }) => {
	const builderFields = ["displayName", "organizationName", "bio", "websiteUrl", "contactEmail"];
	const keys = Object.keys(body);
	if (!keys.length) throw invalid(["Send at least one field"]);
	unknownFields(body, ["name", ...builderFields]);
	if (user!.role === "admin" && keys.some((k) => builderFields.includes(k))) throw invalid(["Admins can only change name"]);
	const problems: string[] = [];
	const str = (k: string) => (body[k] === null ? "" : s(body[k]).trim());
	if ("name" in body && (str("name").length < 1 || str("name").length > 100)) problems.push("name must be 1 to 100 characters");
	if ("displayName" in body && (str("displayName").length < 1 || str("displayName").length > 100)) problems.push("displayName must be 1 to 100 characters");
	if ("organizationName" in body && str("organizationName").length > 150) problems.push("organizationName must be shorter than or equal to 150 characters");
	if ("bio" in body && str("bio").length > 1000) problems.push("bio must be shorter than or equal to 1000 characters");
	if ("websiteUrl" in body && str("websiteUrl") && !/^https:\/\/\S+\.\S+/.test(str("websiteUrl"))) problems.push("websiteUrl must be an https URL");
	if ("contactEmail" in body && str("contactEmail") && !EMAIL.test(str("contactEmail"))) problems.push("contactEmail must be an email");
	if (problems.length) throw invalid(problems);
	return update((db) => {
		const u = db.users.find((x) => x.id === user!.id)!;
		if ("name" in body) u.name = str("name");
		if (u.profile) {
			if ("displayName" in body) u.profile.displayName = str("displayName");
			for (const k of ["organizationName", "bio", "websiteUrl", "contactEmail"] as const) if (k in body) u.profile[k] = str(k) || null;
		}
		return ok(meDto(u), "Profile updated");
	});
});

/** Mock (test mode) only: straight in as the demo admin (restored if it was suspended). */
route("POST", "/mock/admin/session", "public", () =>
	update((db) => {
		const admin = db.users.find((u) => u.email === "admin@demo.local")!;
		admin.suspension = null;
		return ok(issue(db, admin), "Demo admin session");
	}),
);
