"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	AdminSuggestion,
	AdminSuggestionDetail,
	Page,
	Report,
	ReportStatus,
	SuggestionAction,
	SuggestionStatus,
	WalletRestriction,
} from "@repo/domain/types";
import { api, cleanParams, unwrap } from "@/lib/api/client";

/** Moderation (backend guide, "Suggestions and reports": admin moderation and repeat abusers). */

export const MOD_PAGE = 10;

export type SuggestionFilters = { status: SuggestionStatus | ""; reported: boolean; address?: string; projectId?: string; page: number };

export function useAdminSuggestions(f: SuggestionFilters) {
	return useQuery({
		queryKey: ["admin", "suggestions", "list", f],
		queryFn: async () =>
			unwrap<Page<AdminSuggestion>>(
				await api.get("/admin/suggestions", {
					params: cleanParams({
						status: f.status,
						reported: f.reported ? true : undefined,
						address: f.address,
						projectId: f.projectId,
						limit: MOD_PAGE,
						offset: (f.page - 1) * MOD_PAGE,
					}),
				}),
			),
		placeholderData: keepPreviousData,
	});
}

export function useSuggestionCount(params: { status?: SuggestionStatus; reported?: boolean }) {
	return useQuery({
		queryKey: ["admin", "suggestions", "count", params],
		queryFn: async () =>
			unwrap<Page<AdminSuggestion>>(await api.get("/admin/suggestions", { params: cleanParams({ ...params, limit: 1 }) })).paginationMeta
				.totalCount,
	});
}

export function useSuggestion(id: string) {
	return useQuery({
		queryKey: ["admin", "suggestions", "detail", id],
		queryFn: async () => unwrap<AdminSuggestionDetail>(await api.get(`/admin/suggestions/${id}`)),
		retry: (n, e) => n < 2 && (e as { response?: { status?: number } })?.response?.status !== 404,
	});
}

/** approve (pending/hidden → published), reject (pending), hide (published). A note is required for reject/hide. */
export function useModerate() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (v: { id: string; action: SuggestionAction; note?: string }) =>
			unwrap<AdminSuggestionDetail>(
				await api.post(`/admin/suggestions/${v.id}/actions`, { action: v.action, ...(v.note ? { note: v.note } : {}) }),
			),
		onSuccess: (s) => {
			qc.setQueryData(["admin", "suggestions", "detail", s.id], s);
			void qc.invalidateQueries({ queryKey: ["admin", "suggestions"] });
			void qc.invalidateQueries({ queryKey: ["admin", "reports"] });
			void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
		},
	});
}

export function useReports(f: { status: ReportStatus | ""; entityType: "suggestion" | "project" | ""; page: number }) {
	return useQuery({
		queryKey: ["admin", "reports", f],
		queryFn: async () =>
			unwrap<Page<Report>>(
				await api.get("/admin/reports", {
					params: cleanParams({ status: f.status, entityType: f.entityType, limit: MOD_PAGE, offset: (f.page - 1) * MOD_PAGE }),
				}),
			),
		placeholderData: keepPreviousData,
	});
}

export function useCloseReport() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (v: { id: string; outcome: "resolved" | "dismissed"; note?: string }) =>
			unwrap<Report>(await api.post(`/admin/reports/${v.id}/close`, { outcome: v.outcome, ...(v.note ? { note: v.note } : {}) })),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: ["admin", "reports"] });
			void qc.invalidateQueries({ queryKey: ["admin", "overview"] });
		},
	});
}

export function useRestrictions() {
	return useQuery({
		queryKey: ["admin", "restrictions"],
		queryFn: async () => unwrap<WalletRestriction[]>(await api.get("/admin/wallet-restrictions")),
	});
}

/** Blocks suggestions and reports from a wallet (never contributions). Omit `days` for "until lifted". */
export function useRestrictWallet() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (v: { address: string; reason: string; days?: number }) =>
			unwrap<WalletRestriction>(
				await api.put(`/admin/wallet-restrictions/${v.address}`, { reason: v.reason, ...(v.days ? { days: v.days } : {}) }),
			),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "restrictions"] }),
	});
}

export function useLiftRestriction() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (address: string) => {
			await api.delete(`/admin/wallet-restrictions/${address}`);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "restrictions"] }),
	});
}
