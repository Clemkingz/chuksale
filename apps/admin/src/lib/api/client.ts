import type { AxiosAdapter } from "axios";
import { createAccountClient } from "@repo/api/client";
import { createAccountTokenStore } from "@repo/api/tokens";
import { API_URL, USE_MOCK_API } from "@/lib/api/source";

export { unwrap, cleanParams } from "@repo/api/client";

/** In mock mode every request is answered in the browser; the mock is loaded only then. */
const mockAdapter: AxiosAdapter = async (config) => (await import("@repo/mock-api/adapter")).mockAdapter(config);

/** The admin's tokens: their own keys, separate from a builder session in apps/web (same origin on Vercel). */
export const accountTokens = createAccountTokenStore("admin");

/** The API client: Bearer access token, single-flight refresh on 401, retried once. */
export const api = createAccountClient({
	baseURL: API_URL,
	tokens: accountTokens,
	adapter: USE_MOCK_API ? mockAdapter : undefined,
});
