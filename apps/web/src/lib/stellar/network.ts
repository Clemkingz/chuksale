"use client";

import { useQuery } from "@tanstack/react-query";
import type { StellarAccountSummary, StellarAsset, StellarNetworkInfo } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";

/**
 * The platform's Stellar network, accepted assets and explorer (`GET /stellar/network`). Never hardcode assets:
 * on mainnet USDC has a different issuer. Fetched once per session.
 */
let networkPromise: Promise<StellarNetworkInfo> | null = null;

export function getNetwork() {
	networkPromise ??= api
		.get("/stellar/network")
		.then((r) => unwrap<StellarNetworkInfo>(r))
		.catch((e: unknown) => {
			networkPromise = null;
			throw e;
		});
	return networkPromise;
}

export function useNetwork() {
	return useQuery({ queryKey: ["stellar", "network"], queryFn: getNetwork, staleTime: 30 * 60_000 });
}

/** "USDC · GBBD…LA5" style label: the issuer is shown so lookalike tokens stand out. */
export const assetLabel = (a: Pick<StellarAsset, "code" | "issuer">) =>
	a.issuer ? `${a.code} · ${a.issuer.slice(0, 4)}…${a.issuer.slice(-4)}` : a.code;

/** Balances and trustlines of an account, for each accepted asset (`GET /stellar/accounts/{address}`). */
export function useAccountSummary(address: string | null) {
	return useQuery({
		queryKey: ["stellar", "account", address],
		enabled: !!address,
		staleTime: 15_000,
		queryFn: async () => unwrap<StellarAccountSummary>(await api.get(`/stellar/accounts/${address}`)),
	});
}
