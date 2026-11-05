import axios, { AxiosError, type AxiosAdapter, type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { ApiSuccess, AuthTokens } from "@repo/domain/types";
import { walletTokenStore, type AccountTokenStore } from "./tokens";

/**
 * HTTP clients for the ChuckSales API (backend guide, "Rules to read first" + appendix client), on axios so the
 * opt-in mock backend can answer through an adapter with the same envelopes and errors.
 *
 * - Called from the browser only: the API rate-limits per client IP.
 * - 70 s timeout: the staging service sleeps after ~15 idle minutes and can take a minute to wake.
 * - Account client: Bearer access token; on 401 it refreshes ONCE (single flight: refresh tokens are single use)
 *   and retries ONCE, except on the routes where 401 means wrong credentials or a dead token.
 * - Wallet client: Bearer wallet token (no refresh); a 401 ends the wallet session.
 */

export const API_TIMEOUT_MS = 70_000;

/** A 401 from these means wrong credentials or a dead refresh token, never "refresh and retry". */
const NO_REFRESH = ["/auth/login", "/auth/register", "/auth/verify-email", "/auth/refresh", "/auth/logout"];

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

const pathOf = (url = "") => url.replace(/^https?:\/\/[^/]+/, "").replace(/^.*\/api\/v1/, "").split("?")[0] ?? "";

export interface AccountClientOptions {
	baseURL: string;
	tokens: AccountTokenStore;
	adapter?: AxiosAdapter;
	/** The session ended (refresh failed or was refused): the app shows its signed-out state. */
	onSessionEnd?: () => void;
}

export function createAccountClient({ baseURL, tokens, adapter, onSessionEnd }: AccountClientOptions): AxiosInstance {
	const http = axios.create({ baseURL, timeout: API_TIMEOUT_MS, ...(adapter ? { adapter } : {}) });
	let refreshInFlight: Promise<boolean> | null = null;

	const refreshOnce = () => {
		refreshInFlight ??= (async () => {
			const refreshToken = tokens.getRefreshToken();
			if (!refreshToken) return false;
			try {
				const res = await http.post<ApiSuccess<AuthTokens>>("/auth/refresh", { refreshToken }, { _retried: true } as RetriableConfig);
				tokens.save(res.data.data);
				return true;
			} catch (e) {
				// A network failure keeps the refresh token for the next try; a refusal ends the session.
				if (e instanceof AxiosError && e.response) {
					tokens.clear();
					onSessionEnd?.();
				}
				return false;
			}
		})().finally(() => {
			refreshInFlight = null;
		});
		return refreshInFlight;
	};

	http.interceptors.request.use(async (config) => {
		// A reload: no access token in memory yet, but a refresh token. Refresh first rather than eat a 401.
		const path = pathOf(config.url);
		if (!tokens.getAccessToken() && tokens.getRefreshToken() && !NO_REFRESH.includes(path) && !path.startsWith("/auth/forgot") && !path.startsWith("/auth/reset") && !path.startsWith("/auth/resend")) {
			await refreshOnce();
		}
		const token = tokens.getAccessToken();
		if (token && !NO_REFRESH.includes(path)) config.headers.set("Authorization", `Bearer ${token}`);
		return config;
	});

	http.interceptors.response.use(undefined, async (error: unknown) => {
		if (!(error instanceof AxiosError) || error.response?.status !== 401 || !error.config) throw error;
		const config = error.config as RetriableConfig;
		if (config._retried || NO_REFRESH.includes(pathOf(config.url))) throw error;
		if (!(await refreshOnce())) throw error;
		config._retried = true;
		return http.request(config);
	});

	return http;
}

export interface WalletClientOptions {
	baseURL: string;
	adapter?: AxiosAdapter;
	/** The wallet session expired or was revoked (401 on a wallet route). */
	onWalletSessionEnd?: () => void;
}

export function createWalletClient({ baseURL, adapter, onWalletSessionEnd }: WalletClientOptions): AxiosInstance {
	const http = axios.create({ baseURL, timeout: API_TIMEOUT_MS, ...(adapter ? { adapter } : {}) });
	http.interceptors.request.use((config) => {
		const s = walletTokenStore.get();
		if (s) config.headers.set("Authorization", `Bearer ${s.walletToken}`);
		return config;
	});
	http.interceptors.response.use(undefined, (error: unknown) => {
		const path = error instanceof AxiosError ? pathOf(error.config?.url) : "";
		if (error instanceof AxiosError && error.response?.status === 401 && !path.startsWith("/wallet-auth/")) {
			walletTokenStore.clear();
			onWalletSessionEnd?.();
		}
		throw error;
	});
	return http;
}

/** Public routes: no token at all. */
export function createPublicClient({ baseURL, adapter }: { baseURL: string; adapter?: AxiosAdapter }): AxiosInstance {
	return axios.create({ baseURL, timeout: API_TIMEOUT_MS, ...(adapter ? { adapter } : {}) });
}

/** Unwraps `{ statusCode, message, data }`. 204s (empty body) resolve to undefined. */
export const unwrap = <T>(res: { data: ApiSuccess<T> | "" | undefined }): T => (res.data ? res.data.data : (undefined as T));

/** `?a=1&b=2` params without undefined, null or empty values. */
export function cleanParams<T extends object>(params: T): Record<string, string | number | boolean> {
	const out: Record<string, string | number | boolean> = {};
	for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") out[k] = v as string | number | boolean;
	return out;
}
