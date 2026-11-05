"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Contribution, Page, PreparedContribution } from "@repo/domain/types";
import { isFinal } from "@repo/domain/contribution-status";
import { unwrap, walletApi } from "@/lib/api/client";
import { useConnectedWallet } from "@/features/wallet/hooks";

/**
 * Contributions (backend guide, "Contributions"): prepare → wallet signs → submit → poll while pending.
 * Every step needs the wallet token. Only `confirmed` is success; a closed wallet popup never is.
 */

const invalidateTotals = (qc: ReturnType<typeof useQueryClient>) => {
	void qc.invalidateQueries({ queryKey: ["projects"] });
	void qc.invalidateQueries({ queryKey: ["my-contributions"] });
	void qc.invalidateQueries({ queryKey: ["stellar", "account"] });
};

/** Step 1: the API checks asset, trustlines and balances, and returns the unsigned payment (10 min to sign). */
export function usePrepareContribution(slug: string) {
	return useMutation({
		mutationFn: async (v: { assetId: string; amount: string }) =>
			unwrap<PreparedContribution>(await walletApi.post(`/projects/${slug}/contributions`, v)),
	});
}

/** Step 4: submit exactly the prepared payment, signed. Never retried automatically: repeating is "check status". */
export function useSubmitContribution() {
	const qc = useQueryClient();
	return useMutation({
		retry: false,
		mutationFn: async (v: { id: string; transaction: string }) =>
			unwrap<Contribution>(await walletApi.post(`/contributions/${v.id}/submit`, { transaction: v.transaction })),
		onSuccess: () => invalidateTotals(qc),
	});
}

/** One contribution (wallet token). Polls every 4 s while it's pending on Stellar. */
export function useContribution(id: string) {
	const qc = useQueryClient();
	const { ready, address } = useConnectedWallet();
	return useQuery({
		queryKey: ["contribution", id, address],
		enabled: ready && !!address,
		queryFn: async () => {
			const c = unwrap<Contribution>(await walletApi.get(`/contributions/${id}`));
			if (isFinal(c.status)) invalidateTotals(qc);
			return c;
		},
		refetchInterval: (q) => (q.state.data?.status === "pending" ? 4000 : false),
		retry: (n, e) => n < 2 && ![401, 403, 404].includes((e as { response?: { status?: number } })?.response?.status ?? 0),
	});
}

const MINE_PAGE = 100;

/**
 * Everything the connected wallet has started, any status, newest first, 100 per page (the API's maximum), so the
 * wallet page can total and filter what it has loaded. "Load older" fetches the next 100.
 */
export function useMyContributions() {
	const { address } = useConnectedWallet();
	return useInfiniteQuery({
		queryKey: ["my-contributions", address],
		enabled: !!address,
		initialPageParam: 0,
		queryFn: async ({ pageParam }) =>
			unwrap<Page<Contribution>>(await walletApi.get("/contributions/mine", { params: { limit: MINE_PAGE, offset: pageParam } })),
		getNextPageParam: (last, _all, offset) => (last.paginationMeta.nextPage ? offset + MINE_PAGE : undefined),
		// While anything is still confirming, keep the list fresh.
		refetchInterval: (q) => (q.state.data?.pages.some((p) => p.result.some((c) => c.status === "pending")) ? 5000 : false),
	});
}
