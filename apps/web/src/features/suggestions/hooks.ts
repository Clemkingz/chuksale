"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Page, ReportInput, ReportReceipt, Suggestion, SuggestionInput } from "@repo/domain/types";
import { unwrap, walletApi } from "@/lib/api/client";
import { useConnectedWallet } from "@/features/wallet/hooks";

/**
 * Suggestions and reports (backend guide, "Suggestions and reports"). Writing and reporting need the wallet token;
 * new suggestions are `pending` until a moderator approves them.
 */

export function useMySuggestions() {
	const { address } = useConnectedWallet();
	return useQuery({
		queryKey: ["suggestions", "mine", address],
		enabled: !!address,
		queryFn: async () => unwrap<Page<Suggestion>>(await walletApi.get("/suggestions/mine", { params: { limit: 50 } })),
	});
}

export function useCreateSuggestion(slug: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (v: SuggestionInput) => unwrap<Suggestion>(await walletApi.post(`/projects/${slug}/suggestions`, v)),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["suggestions", "mine"] }),
	});
}

export function useReport() {
	return useMutation({
		mutationFn: async (v: {
			target: { kind: "suggestion"; id: string } | { kind: "project"; slug: string };
			input: ReportInput;
		}) =>
			unwrap<ReportReceipt>(
				await walletApi.post(
					v.target.kind === "suggestion" ? `/suggestions/${v.target.id}/reports` : `/projects/${v.target.slug}/reports`,
					v.input,
				),
			),
	});
}
