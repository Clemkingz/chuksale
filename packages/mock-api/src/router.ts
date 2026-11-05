import { read, type MockDb, type MockUser } from "./db";

/** A tiny router for the mock backend: "/invoice/:id" patterns, an auth level, and the request context. */

export interface Ctx {
	method: string;
	path: string;
	params: Record<string, string>;
	query: URLSearchParams;
	body: Record<string, unknown>;
	/** The signed-in user (null on public routes). */
	user: MockUser | null;
}

export class HttpError extends Error {
	constructor(
		public status: number,
		message: string,
		/** Extra machine-readable detail, sent as `data` in the error body (e.g. `{ reason: "email_unverified" }`). */
		public data?: unknown,
	) {
		super(message);
	}
}

/** A file response (wallet key export). */
export class RawBody {
	constructor(public body: Blob) {}
}

export type Handler = (ctx: Ctx) => unknown;
type Auth = "public" | "user" | "admin";

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

function match(route: Route, segments: string[]) {
	if (route.parts.length !== segments.length) return null;
	const params: Record<string, string> = {};
	for (let i = 0; i < route.parts.length; i++) {
		const part = route.parts[i]!;
		const segment = decodeURIComponent(segments[i]!);
		if (part.startsWith(":")) params[part.slice(1)] = segment;
		else if (part !== segment) return null;
	}
	return params;
}

/** The success envelope the live API uses. */
export const ok = (data: unknown, message = "successful", status_code = 200) => ({ status_code, message, data });

export const TOKEN_PREFIX = "mock.";

export function userFromToken(db: MockDb, authorization: string | undefined) {
	const token = authorization?.replace(/^Bearer\s+/i, "");
	if (!token?.startsWith(TOKEN_PREFIX)) return null;
	const id = token.slice(TOKEN_PREFIX.length).split(".")[0];
	return db.users.find((u) => u.id === id && u.is_active) ?? null;
}

export async function dispatch(
	method: string,
	path: string,
	query: URLSearchParams,
	body: Record<string, unknown>,
	authorization?: string,
) {
	const segments = path.split("/").filter(Boolean);
	const candidates = routes.filter((r) => match(r, segments));
	if (candidates.length === 0) throw new HttpError(404, "404 page not found");
	const found = candidates.find((r) => r.method === method.toUpperCase());
	if (!found) throw new HttpError(405, "Method Not Allowed");

	const user = userFromToken(read(), authorization);
	if (found.auth !== "public" && !user) throw new HttpError(401, "please kindly login to complete this request");
	if (found.auth === "admin" && user?.role !== "admin") throw new HttpError(403, "admin access required");

	return found.handler({ method, path, params: match(found, segments)!, query, body, user });
}
