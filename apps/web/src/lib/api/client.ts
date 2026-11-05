import type { AxiosAdapter } from "axios";
import { createAccountClient, createPublicClient, createWalletClient } from "@repo/api/client";
import { createAccountTokenStore } from "@repo/api/tokens";
import { API_URL, USE_MOCK_API } from "@/lib/api/source";

export { unwrap, cleanParams } from "@repo/api/client";

/** In mock mode every request is answered in the browser; the mock is loaded only then. */
const mockAdapter: AxiosAdapter = async (config) => (await import("@repo/mock-api/adapter")).mockAdapter(config);
const adapter = USE_MOCK_API ? mockAdapter : undefined;

/** The builder's tokens (access in memory, refresh in localStorage). */
export const accountTokens = createAccountTokenStore("web");

/** Builder (account) routes: Bearer access token, single-flight refresh on 401. */
export const builderApi = createAccountClient({ baseURL: API_URL, tokens: accountTokens, adapter });

/** Public routes: discovery, categories, network info, account lookups. */
export const api = createPublicClient({ baseURL: API_URL, adapter });

/** Contributor routes: Bearer wallet token from the SEP-10 sign-in. */
export const walletApi = createWalletClient({
	baseURL: API_URL,
	adapter,
	onWalletSessionEnd: () => {
		void import("@/features/wallet/store").then((m) => m.useWallet.getState().endSession());
	},
});
