"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreatedAdmin, Page, Role, UserDetail, UserSummary } from "@repo/domain/types";
import { api, cleanParams, unwrap } from "@/lib/api/client";

/** Accounts (backend guide, "Admin area"): builders and admins, suspension, creating admins. */

export const USERS_PAGE = 10;

export type UserFilters = { role: Role | ""; q: string; suspended: "" | "true" | "false"; emailVerified: "" | "true" | "false"; page: number };

export function useUsers(f: UserFilters) {
	return useQuery({
		queryKey: ["admin", "users", "list", f],
		queryFn: async () =>
			unwrap<Page<UserSummary>>(
				await api.get("/admin/users", {
					params: cleanParams({
						role: f.role,
						q: f.q.trim(),
						suspended: f.suspended,
						emailVerified: f.emailVerified,
						limit: USERS_PAGE,
						offset: (f.page - 1) * USERS_PAGE,
					}),
				}),
			),
		placeholderData: keepPreviousData,
	});
}

/** `totalCount` for a filter: the stat tiles. */
export function useUserCount(params: { role?: Role; suspended?: boolean }) {
	return useQuery({
		queryKey: ["admin", "users", "count", params],
		queryFn: async () =>
			unwrap<Page<UserSummary>>(await api.get("/admin/users", { params: cleanParams({ ...params, limit: 1 }) })).paginationMeta.totalCount,
	});
}

export function useUser(id: string) {
	return useQuery({
		queryKey: ["admin", "users", "detail", id],
		queryFn: async () => unwrap<UserDetail>(await api.get(`/admin/users/${id}`)),
		retry: (n, e) => n < 2 && (e as { response?: { status?: number } })?.response?.status !== 404,
	});
}

function useRefresh() {
	const qc = useQueryClient();
	return (u: UserDetail) => {
		qc.setQueryData(["admin", "users", "detail", u.id], u);
		return qc.invalidateQueries({ queryKey: ["admin", "users"] });
	};
}

/** Suspending signs them out everywhere; a reason (3–500 characters) is required. Suspending yourself is 400. */
export function useSuspendUser() {
	const refresh = useRefresh();
	return useMutation({
		mutationFn: async (v: { id: string; reason: string }) =>
			unwrap<UserDetail>(await api.post(`/admin/users/${v.id}/suspension`, { reason: v.reason })),
		onSuccess: refresh,
	});
}

export function useRestoreUser() {
	const refresh = useRefresh();
	return useMutation({
		mutationFn: async (id: string) => unwrap<UserDetail>(await api.delete(`/admin/users/${id}/suspension`)),
		onSuccess: refresh,
	});
}

/** The new admin gets a password setup code by email. */
export function useCreateAdmin() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (v: { email: string; name: string }) => unwrap<CreatedAdmin>(await api.post("/admin/users", v)),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
	});
}
