"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BuilderProjectGroup } from "@repo/domain/project-status";
import type { AdminBuilder, AdminBuilderProject, Paginated } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";

/** Builders (designs "admin developer D1–D2"). Contract: docs/API.md § Admin. */

export type BuildersPage = Paginated<AdminBuilder> & { stats: { builders: number; active: number; disabled: number } };
export type BuilderDetail = AdminBuilder & { bio: string | null; organization_name: string | null };

export function useBuilders(page: number, q: string) {
	return useQuery({
		queryKey: ["admin", "builders", "list", page, q],
		queryFn: async () =>
			unwrap<BuildersPage>(await api.get("/admin/builders", { params: { page, q: q || undefined, limit: 7 } })),
		placeholderData: keepPreviousData,
	});
}

export function useBuilder(id: string) {
	return useQuery({
		queryKey: ["admin", "builders", "detail", id],
		queryFn: async () => unwrap<BuilderDetail>(await api.get(`/admin/builders/${id}`)),
	});
}

export function useBuilderProjects(id: string, group: BuilderProjectGroup, page: number) {
	return useQuery({
		queryKey: ["admin", "builders", "projects", id, group, page],
		queryFn: async () =>
			unwrap<Paginated<AdminBuilderProject> & { counts: Record<BuilderProjectGroup, number> }>(
				await api.get(`/admin/builders/${id}/projects`, { params: { group, page, limit: 6 } }),
			),
		placeholderData: keepPreviousData,
	});
}

export function useBuilderStatus() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (v: { id: string; status: "active" | "suspended"; reason?: string }) =>
			unwrap<AdminBuilder>(await api.post(`/admin/builders/${v.id}/status`, v)),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "builders"] }),
	});
}
