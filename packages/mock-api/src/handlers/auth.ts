import { read, update, type MockDb, type MockUser } from "../db";
import { DEMO_BUILDER_EMAIL } from "../seed";
import { HttpError, TOKEN_PREFIX, ok, route } from "../router";
import { DAY, hex, iso, uuid } from "../util";

/**
 * /auth/*: builder sign-up → email OTP → session; sign-in; Google (mock); forgot → OTP → reset; me.
 * The mock can't send email, so every "sent" code is returned as `debug_code` and the web app shows it in a
 * "Demo inbox" toast. A real API must never return it.
 */

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 2 * 60 * 1000;

const normalise = (email: unknown) =>
	String(email ?? "")
		.trim()
		.toLowerCase();

const findByEmail = (email: unknown) => read().users.find((u) => u.email === normalise(email));

function session(user: MockUser) {
	const profile = read().profiles.find((p) => p.user_id === user.id);
	return {
		access_token: `${TOKEN_PREFIX}${user.id}.${hex(24)}`,
		expires_at: Date.now() + 7 * DAY,
		user: { id: user.id, email: user.email, role: user.role, display_name: profile?.display_name ?? user.email },
	};
}

/** Creates (or replaces) a code; enforces the 2-minute resend window shown in the UI. */
function issueOtp(email: string, purpose: "verify_email" | "reset_password", force = false) {
	const code = String(Math.floor(100000 + Math.random() * 900000));
	return update((db) => {
		const existing = db.otps.find((o) => o.email === email && o.purpose === purpose);
		if (existing && !force && existing.expires_at - OTP_TTL_MS + RESEND_AFTER_MS > Date.now()) {
			throw new HttpError(429, "Please wait before requesting another code.");
		}
		db.otps = db.otps.filter((o) => !(o.email === email && o.purpose === purpose));
		db.otps.push({ email, purpose, code, expires_at: Date.now() + OTP_TTL_MS, attempts: 0 });
		return { debug_code: code, resend_in: RESEND_AFTER_MS / 1000 };
	});
}

/**
 * Mock: any 6-digit code is accepted, so flows can be clicked through without reading the Demo inbox. The real API
 * checks the code, its 10-minute expiry and the 5-attempt limit (docs/API.md). Only the format is checked here.
 */
function checkOtp(email: string, purpose: "verify_email" | "reset_password", code: unknown) {
	if (!/^\d{6}$/.test(String(code ?? ""))) throw new HttpError(400, "Enter the 6-digit code.");
	update((db) => {
		db.otps = db.otps.filter((o) => !(o.email === email && o.purpose === purpose));
	});
}

/** Adds an unverified builder + profile. Pass `db` when already inside `update()`. */
function createBuilder(email: string, displayName: string, password: string, db?: MockDb): MockUser {
	const add = (d: MockDb) => {
		const now = iso(Date.now());
		const user: MockUser = {
			id: uuid(),
			email,
			password,
			role: "builder",
			email_verified: false,
			status: "active",
			is_active: true,
			mfa_code: null,
			created_at: now,
			updated_at: now,
		};
		d.users.push(user);
		d.profiles.push({
			id: uuid(),
			user_id: user.id,
			display_name: displayName,
			organization_name: null,
			bio: null,
			website: null,
			contact_email: email,
			avatar_url: null,
			wallet_address: null,
			twitter_url: null,
			discord_url: null,
			telegram_url: null,
		});
		return user;
	};
	return db ? add(db) : update(add);
}

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

route("POST", "/auth/signup", "public", ({ body }) => {
	const email = normalise(body.email);
	const fullName = String(body.full_name ?? "").trim();
	if (fullName.length < 2) throw new HttpError(422, "Enter your full name.");
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(422, "Enter a valid email address.");
	if (!PASSWORD_RULE.test(String(body.password ?? "")))
		throw new HttpError(422, "Use at least 8 characters with a letter and a number.");
	const existing = findByEmail(email);
	if (existing?.email_verified) throw new HttpError(409, "An account with this email already exists. Sign in instead.");

	update((db) => {
		const now = iso(Date.now());
		if (existing) {
			const u = db.users.find((x) => x.id === existing.id)!;
			u.password = String(body.password);
			const p = db.profiles.find((x) => x.user_id === u.id);
			if (p) p.display_name = fullName;
			return;
		}
		createBuilder(email, fullName, String(body.password), db);
	});
	return ok({ email, ...issueOtp(email, "verify_email", true) }, "Verification code sent", 201);
});

route("POST", "/auth/resend-otp", "public", ({ body }) => {
	const email = normalise(body.email);
	const purpose = body.purpose === "reset_password" ? "reset_password" : "verify_email";
	// Same answer whether or not the account exists (no account enumeration).
	if (!findByEmail(email)) return ok({ resend_in: RESEND_AFTER_MS / 1000 }, "If the account exists, a new code is on its way");
	return ok(issueOtp(email, purpose), "A new code is on its way");
});

route("POST", "/auth/verify-email", "public", ({ body }) => {
	const email = normalise(body.email);
	if (!email.includes("@")) throw new HttpError(400, "This link is missing your email. Sign up again.");
	checkOtp(email, "verify_email", body.code);
	// Mock: if the account is gone (demo data reset, page opened directly), create it so any code still works.
	const user = findByEmail(email) ?? createBuilder(email, email.split("@")[0] ?? email, "Password1");
	update((db) => {
		const u = db.users.find((x) => x.id === user.id)!;
		u.email_verified = true;
		u.updated_at = iso(Date.now());
	});
	return ok(session({ ...user, email_verified: true }), "Email verified");
});

route("POST", "/auth/login", "public", ({ body }) => {
	const user = findByEmail(body.email);
	if (!user || user.password !== body.password) throw new HttpError(401, "Incorrect email or password.");
	if (!user.is_active) throw new HttpError(403, "This account has been suspended. Contact support.");
	if (!user.email_verified) {
		const otp = issueOtp(user.email, "verify_email", true);
		// The UI sends the builder to the code screen with this status.
		throw new HttpError(403, "Verify your email to continue. We’ve sent you a new code.", {
			reason: "email_unverified",
			email: user.email,
			...otp,
		});
	}
	if (user.role !== "builder") throw new HttpError(403, "Admins sign in on the admin console.");
	return ok(session(user), "Signed in");
});

/** The mock has no Google: any token signs into the demo builder account. */
route("POST", "/auth/social", "public", ({ body }) => {
	if (!String(body.id_token ?? "")) throw new HttpError(400, "Google sign-in didn’t complete.");
	return ok(session(findByEmail(DEMO_BUILDER_EMAIL)!), "Signed in with Google");
});

route("POST", "/auth/forgot-password", "public", ({ body }) => {
	const email = normalise(body.email);
	const user = findByEmail(email);
	const data = user ? issueOtp(email, "reset_password", true) : { resend_in: RESEND_AFTER_MS / 1000 };
	return ok({ email, ...data }, "If an account exists for this email, we’ve sent a code");
});

route("POST", "/auth/reset-password", "public", ({ body }) => {
	const email = normalise(body.email);
	const user = findByEmail(email);
	if (!PASSWORD_RULE.test(String(body.password ?? "")))
		throw new HttpError(422, "Use at least 8 characters with a letter and a number.");
	checkOtp(email, "reset_password", body.code);
	// Mock: no account for this email → nothing to update, but answer the same (no account enumeration).
	if (!user) return ok({}, "Password updated. Sign in with your new password.");
	update((db) => {
		const u = db.users.find((x) => x.id === user.id)!;
		u.password = String(body.password);
		u.email_verified = true;
		u.updated_at = iso(Date.now());
	});
	return ok({}, "Password updated. Sign in with your new password.");
});

route("GET", "/auth/me", "user", ({ user }) => ok(session(user!).user));
