"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AcceptedAsset, ContributionDetail, ContributionIntent, WalletContributions } from "@repo/domain/types";
import { isFinal } from "@repo/domain/contribution-status";
import { sum } from "@repo/domain/money";
import { api, unwrap } from "@/lib/api/client";
import { USE_MOCK_API } from "@/lib/api/source";
import { HORIZON_URL } from "@/lib/stellar/config";

/** Contributions (PRD §6.5): intent → sign → submit hash → poll status. Contract: docs/API.md § Contributions. */

export type Intent = ContributionIntent & { asset: AcceptedAsset };

export function useCreateIntent() {
	return useMutation({
		mutationFn: async (v: { project_slug: string; wallet_address: string; asset_id: string; amount: string }) =>
			unwrap<Intent>(await api.post("/contributions/intents", v)),
	});
}

export function useSubmitContribution() {
	const qc = useQueryClient();
	return useMutation({
		// Never retried automatically: a lost response is "check status", not "send again" (PRD §13).
		retry: false,
		mutationFn: async (v: { intentId: string; tx_hash?: string; simulated?: boolean; scenario?: string }) =>
			unwrap<ContributionDetail>(
				await api.post(`/contributions/intents/${v.intentId}/submit`, {
					tx_hash: v.tx_hash,
					simulated: v.simulated,
					scenario: v.scenario,
				}),
			),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: ["wallet-contributions"] });
			void qc.invalidateQueries({ queryKey: ["projects"] });
		},
	});
}

/** Polls every 4 s until the contribution is final (confirmed / failed / expired / cancelled). */
export function useContribution(id: string) {
	const qc = useQueryClient();
	return useQuery({
		queryKey: ["contribution", id],
		queryFn: async () => {
			const c = unwrap<ContributionDetail>(await api.get(`/contributions/${id}`));
			if (isFinal(c.status)) {
				void qc.invalidateQueries({ queryKey: ["projects"] });
				void qc.invalidateQueries({ queryKey: ["wallet-contributions"] });
			}
			return c;
		},
		refetchInterval: (q) => (q.state.data && isFinal(q.state.data.status) ? false : 4000),
		retry: (n, e) => n < 2 && (e as { response?: { status?: number } })?.response?.status !== 404,
	});
}

export type HistoryFilters = { status: string; asset: string; page: number };

export function useWalletContributions(wallet: string | null, demo: boolean, f: HistoryFilters) {
	return useQuery({
		queryKey: ["wallet-contributions", wallet, f],
		enabled: !!wallet,
		queryFn: async () =>
			unwrap<WalletContributions>(
				await api.get("/contributions", {
					params: {
						wallet,
						status: f.status,
						asset: f.asset || undefined,
						page: f.page,
						limit: 8,
						demo: demo && USE_MOCK_API ? 1 : undefined,
					},
				}),
			),
		placeholderData: keepPreviousData,
		// While anything is pending, keep the list fresh.
		refetchInterval: (q) => (q.state.data?.summary.pending_count ? 5000 : false),
	});
}

export type Balance = { code: string; issuer: string | null; balance: string; limit?: string; reserve?: string | null };
export type Balances =
	{ status: "active"; balances: Balance[]; subentries: number; simulated: boolean } | { status: "unfunded"; simulated: false };

/**
 * The wallet's live balances. Real wallets: Horizon Testnet (`/accounts/{id}`), so the numbers are the network's
 * own. The Demo wallet (mock mode) has simulated balances from the mock backend.
 */
export function useWalletBalances(wallet: string | null, demo: boolean) {
	return useQuery({
		queryKey: ["wallet-balances", wallet, demo],
		enabled: !!wallet,
		refetchInterval: 30_000,
		queryFn: async (): Promise<Balances> => {
			if (demo && USE_MOCK_API) {
				const d = unwrap<{ balances: { asset: AcceptedAsset; balance: string; reserve: string | null }[] }>(
					await api.get("/mock/demo-balance", { params: { wallet } }),
				);
				return {
					status: "active",
					simulated: true,
					subentries: 1,
					balances: d.balances.map((b) => ({
						code: b.asset.code,
						issuer: b.asset.issuer,
						balance: b.balance,
						reserve: b.reserve,
					})),
				};
			}
			const res = await fetch(`${HORIZON_URL}/accounts/${wallet}`);
			if (res.status === 404) return { status: "unfunded", simulated: false };
			if (!res.ok) throw new Error("Stellar Testnet couldn’t be reached. Balances will load when it’s back.");
			const account = (await res.json()) as {
				subentry_count: number;
				balances: { asset_type: string; asset_code?: string; asset_issuer?: string; balance: string; limit?: string }[];
			};
			return {
				status: "active",
				simulated: false,
				subentries: account.subentry_count,
				balances: account.balances
					.filter((b) => b.asset_type === "native" || b.asset_type === "credit_alphanum4" || b.asset_type === "credit_alphanum12")
					.map((b) =>
						b.asset_type === "native"
							? // Stellar reserve: 1 XLM base + 0.5 XLM per subentry stays locked.
								{
									code: "XLM",
									issuer: null,
									balance: b.balance,
									reserve: sum(["1", ...Array.from({ length: account.subentry_count }, () => "0.5")]),
								}
							: { code: b.asset_code!, issuer: b.asset_issuer!, balance: b.balance, limit: b.limit },
					),
			};
		},
	});
}
