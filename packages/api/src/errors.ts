import { AxiosError } from "axios";
import type { ApiErrorBody } from "@repo/domain/types";

/**
 * Reading failed API calls (backend guide, "Authentication" status table). Every error body is
 * `{ statusCode, message, data: null, error: { code, details?, requestId, retryAfterSeconds? } }`.
 */

const body = (e: unknown): ApiErrorBody | undefined =>
	e instanceof AxiosError && e.response?.data && typeof e.response.data === "object"
		? (e.response.data as ApiErrorBody)
		: undefined;

export const errorStatus = (e: unknown) => (e instanceof AxiosError ? e.response?.status : undefined);

export const errorCode = (e: unknown) => body(e)?.error?.code;

/** Quote this in error reports: it finds the request in the server logs. */
export const errorRequestId = (e: unknown) => body(e)?.error?.requestId;

/** Validation problems, one sentence each, in form order (400s). */
export function errorDetails(e: unknown): string[] {
	const d = body(e)?.error?.details;
	if (Array.isArray(d)) return d.filter((x): x is string => typeof x === "string");
	return [];
}

/** Seconds to wait after a 429 (Retry-After header, or the code cooldown). */
export function retryAfterSeconds(e: unknown): number | undefined {
	const fromBody = body(e)?.error?.retryAfterSeconds;
	if (typeof fromBody === "number") return fromBody;
	if (!(e instanceof AxiosError)) return undefined;
	const h = e.response?.headers?.["retry-after"];
	const n = Number(h);
	return Number.isFinite(n) && n > 0 ? n : undefined;
}

const isTimeout = (e: unknown) => e instanceof AxiosError && (e.code === AxiosError.ECONNABORTED || e.code === "ETIMEDOUT");

/** The sentence to show for a failed request. */
export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
	if (e instanceof AxiosError) {
		if (isTimeout(e)) return "The server is taking too long to answer. It may be waking up: try again in a moment.";
		if (!e.response) return "We couldn’t reach the server. Check your connection and try again.";
		const status = e.response.status;
		if (status === 503)
			return body(e)?.message && body(e)?.message !== "Service Unavailable"
				? body(e)!.message
				: "The service is busy. Try again shortly.";
		if (status === 429) {
			const s = retryAfterSeconds(e);
			const base = body(e)?.message ?? "Too many attempts.";
			return s ? `${base.replace(/\.$/, "")}. Try again in ${s < 60 ? `${s}s` : `${Math.ceil(s / 60)} min`}.` : base;
		}
		const b = body(e);
		if (b?.message === "Validation failed") {
			const d = errorDetails(e);
			if (d.length) return capitalize(d[0]!);
		}
		return b?.message ?? fallback;
	}
	if (e instanceof Error && e.message) return e.message;
	return fallback;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** API detail lines mention fields by name ("problem must be at least 50 characters"): pick those for one field. */
export function detailsFor(e: unknown, field: string): string[] {
	return errorDetails(e)
		.filter((d) => d.split(/[\s.]/)[0] === field)
		.map(capitalize);
}

/** Detail lines grouped by their leading field name (`teamMembers.0.name …` → `teamMembers`). */
export function detailsByField(e: unknown): Record<string, string> {
	const out: Record<string, string> = {};
	for (const d of errorDetails(e)) {
		const field = d.split(/[\s.]/)[0] ?? "";
		if (field && !out[field]) out[field] = capitalize(d);
	}
	return out;
}
