"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SuggestionStatus, SuggestionType } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";

/** Suggestions + reports (PRD §6.6, D8). Contract: docs/API.md § Suggestions. */

export type MySuggestion = {
	id: string;
	type: SuggestionType;
	title: string;
	body: string;
	status: SuggestionStatus;
	moderation_reason: string | null;
	created_at: string;
	project: { slug: string; title: string };
};

export function useMySuggestions(wallet: string | null) {
	return useQuery({
		queryKey: ["suggestions", "mine", wallet],
		enabled: !!wallet,
		queryFn: async () => unwrap<MySuggestion[]>(await api.get("/suggestions/mine", { params: { wallet } })),
	});
}

export function useCreateSuggestion(slug: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (v: { wallet_address: string; type: SuggestionType; title: string; body: string; link?: string }) =>
			unwrap<{ id: string }>(await api.post(`/projects/${slug}/suggestions`, v)),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["suggestions", "mine"] }),
	});
}

export function useReport() {
	return useMutation({
		mutationFn: async (v: { reporter: string; entity_type: "suggestion" | "project"; entity_id: string; reason: string }) =>
			unwrap<object>(await api.post("/reports", v)),
	});
}
