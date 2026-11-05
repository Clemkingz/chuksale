"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Paginated, Report, Suggestion } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";

/** Suggestion moderation (PRD §6.6, FR-MOD-*). Contract: docs/API.md § Admin. */

export type ModTab = "pending" | "reported" | "published" | "all";
export type ModSuggestion = Suggestion & { project: { id: string; title: string; slug: string }; reports: Report[] };

export function useModerationQueue(tab: ModTab, page: number) {
	return useQuery({
		queryKey: ["admin", "suggestions", tab, page],
		queryFn: async () =>
			unwrap<Paginated<ModSuggestion> & { counts: Record<ModTab, number> }>(
				await api.get("/admin/suggestions", { params: { status: tab, page } }),
			),
		placeholderData: keepPreviousData,
	});
}

export function useSuggestion(id: string) {
	return useQuery({
		queryKey: ["admin", "suggestions", "detail", id],
		queryFn: async () => unwrap<ModSuggestion & { wallet_suggestion_count: number }>(await api.get(`/admin/suggestions/${id}`)),
	});
}

export function useModerate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (v: { id: string; action: "publish" | "hide" | "reject"; reason?: string }) =>
			unwrap<ModSuggestion>(await api.post(`/admin/suggestions/${v.id}/moderate`, v)),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "suggestions"] }),
	});
}
