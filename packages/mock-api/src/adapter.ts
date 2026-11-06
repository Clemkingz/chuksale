import { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { CODES, HttpError, NoContent, dispatch } from "./router";
import { settleContributions } from "./handlers/contributions";
import { getControls } from "./controls";
import "./handlers/index";

/**
 * An axios adapter that answers from the in-browser mock backend instead of the network (NEXT_PUBLIC_API_SOURCE=mock).
 * Same routes, envelopes (`{ statusCode, message, data }`) and error bodies
 * (`{ statusCode, message, data: null, error: { code, details, requestId, … } }`) as the live API.
 */

const LATENCY = { normal: [180, 520], slow: [2500, 3500] } as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseBody(data: unknown): Record<string, unknown> {
	if (!data) return {};
	if (typeof FormData !== "undefined" && data instanceof FormData) {
		const out: Record<string, unknown> = {};
		data.forEach((value, key) => {
			out[key] = value;
		});
		return out;
	}
	if (typeof data === "string") {
		try {
			return JSON.parse(data) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
	return data as Record<string, unknown>;
}

function headerValue(config: InternalAxiosRequestConfig, name: string) {
	const headers = config.headers as AxiosHeaders | Record<string, unknown> | undefined;
	const value = headers instanceof AxiosHeaders ? headers.get(name) : headers?.[name];
	return typeof value === "string" ? value : undefined;
}

export async function mockAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
	const url = new URL(config.url ?? "/", "http://mock.local/");
	const query = url.searchParams;
	for (const [key, value] of Object.entries(config.params ?? {})) if (value != null) query.set(key, String(value));
	// The API's routes sit under /api/v1; strip whatever base the app uses.
	const path = url.pathname.replace(/^.*\/api\/v1/, "") || "/";
	const method = (config.method ?? "get").toUpperCase();

	const controls = getControls();
	const [min, max] = LATENCY[controls.latency];
	await wait(min + Math.random() * (max - min));
	settleContributions();

	const respond = (status: number, data: unknown): AxiosResponse => ({
		data,
		status,
		statusText: String(status),
		headers: new AxiosHeaders({ "content-type": "application/json" }),
		config,
		request: { mock: true },
	});

	try {
		if (controls.outage) throw new HttpError(503, "Service temporarily unavailable. Try again shortly.");
		const result = await dispatch(method, path, query, parseBody(config.data), headerValue(config, "Authorization"));
		if (result instanceof NoContent) return respond(204, "");
		const status = (result as { statusCode?: number })?.statusCode ?? 200;
		return respond(status, result);
	} catch (caught) {
		const status = caught instanceof HttpError ? caught.status : 500;
		const message = caught instanceof Error ? caught.message : "Mock backend error";
		if (!(caught instanceof HttpError)) console.error("[mock-api]", method, path, caught);
		const err = caught instanceof HttpError ? caught : null;
		const body = {
			statusCode: status,
			message,
			data: null,
			error: {
				code: CODES[status] ?? "INTERNAL_SERVER_ERROR",
				...(err?.details ? { details: err.details } : {}),
				requestId: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				path: `/api/v1${path}`,
				...(err?.retryAfterSeconds ? { retryAfterSeconds: err.retryAfterSeconds } : {}),
			},
		};
		const response = respond(status, body);
		if (err?.retryAfterSeconds) (response.headers as AxiosHeaders).set("retry-after", String(err.retryAfterSeconds));
		throw new AxiosError(message, status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST, config, response.request, response);
	}
}
