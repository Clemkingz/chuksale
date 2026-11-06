import type { UserRec } from "./records";
import { read } from "./db";

/**
 * A tiny router for the mock backend: "/projects/:slug" patterns, an auth level, and the request context. Auth
 * follows the API: `user` = builder or admin token, `builder` / `admin` = that role only, `wallet` = wallet token.
 */

export interface Ctx {
	method: string;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	body: Record<string, unknown>;
	/** The signed-in account (null on public and wallet routes). */
	user: UserRec | null;
	/** The connected wallet (wallet routes). */
	wallet: string | null;
}

/** An API error: `{ statusCode, message, data: null, error: { code, details?, retryAfterSeconds? } }`. */
export class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
		public details?: string[],
		public retryAfterSeconds?: number,
	) {
		super(message);
	}
}

export const CODES: Record<number, string> = {
	400: "BAD_REQUEST",
	401: "UNAUTHORIZED",
	403: "FORBIDDEN",
	404: "NOT_FOUND",
	409: "CONFLICT",
	413: "PAYLOAD_TOO_LARGE",
	415: "UNSUPPORTED_MEDIA_TYPE",
	429: "TOO_MANY_REQUESTS",
	503: "SERVICE_UNAVAILABLE",
};

/** 400 "Validation failed" with one line per problem, like the API. */
export const invalid = (details: string[]) => new HttpError(400, "Validation failed", details);

/** A 204 with no body. */
export class NoContent {}

export type Handler = (ctx: Ctx) => unknown;
type Auth = "public" | "user" | "builder" | "admin" | "wallet";

interface Route {
	method: string;
	parts: string[];
	auth: Auth;
	handler: Handler;
}

const routes: Route[] = [];

export function route(method: string, pattern: string, auth: Auth, handler: Handler) {
	routes.push({ method: method.toUpperCase(), parts: pattern.split("/").filter(Boolean), auth, handler });
}

function match(r: Route, segments: string[]) {
	if (r.parts.length !== segments.length) return null;
	const params: Record<string, string> = {};
	for (let i = 0; i < r.parts.length; i++) {
		const part = r.parts[i]!;
		const segment = decodeURIComponent(segments[i]!);
		if (part.startsWith(":")) params[part.slice(1)] = segment;
		else if (part !== segment) return null;
	}
	return params;
}

/** The success envelope. */
export const ok = (data: unknown, message = "OK", statusCode = 200) => ({ statusCode, message, data });

/** Access tokens: `mock.at.<userId>.<issuedMs>`, valid 15 minutes (so the apps' refresh path really runs). */
export const ACCESS_TTL_S = 900;
export const accessToken = (userId: string) => `mock.at.${userId}.${Date.now()}`;

function userFromAccess(authorization: string | undefined) {
	const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
	const m = /^mock\.at\.([^.]+)\.(\d+)$/.exec(token);
	if (!m) return null;
	if (Date.now() - Number(m[2]) > ACCESS_TTL_S * 1000) return null;
	const user = read().users.find((u) => u.id === m[1]);
	if (!user || user.suspension) return null;
	return user;
}

function walletFromToken(authorization: string | undefined) {
	const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
	const s = read().walletSessions.find((w) => w.token === token);
	return s && Date.parse(s.expiresAt) > Date.now() ? s.address : null;
}

export async function dispatch(method: string, path: string, query: URLSearchParams, body: Record<string, unknown>, authorization?: string) {
	const segments = path.split("/").filter(Boolean);
	const candidates = routes.filter((r) => match(r, segments));
	if (candidates.length === 0) throw new HttpError(404, `Cannot ${method.toUpperCase()} ${path}`);
	const found = candidates.find((r) => r.method === method.toUpperCase());
	if (!found) throw new HttpError(404, `Cannot ${method.toUpperCase()} ${path}`);

	let user: UserRec | null = null;
	let wallet: string | null = null;
	if (found.auth === "wallet") {
		wallet = walletFromToken(authorization);
		if (!wallet) throw new HttpError(401, authorization ? "Wallet session expired or invalid" : "Connect a wallet first");
	} else if (found.auth !== "public") {
		user = userFromAccess(authorization);
		if (!user) throw new HttpError(401, "Unauthorized");
		if (found.auth === "admin" && user.role !== "admin") throw new HttpError(403, "Admins only");
		if (found.auth === "builder" && user.role !== "builder") throw new HttpError(403, "Builders only");
	}
	return found.handler({ method, path, params: match(found, segments)!, query, body, user, wallet });
}
