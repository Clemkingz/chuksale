"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	AdminContribution,
	AdminProject,
	AdminProjectSummary,
	Page,
	ProjectAction,
	ProjectInsights,
	ProjectStatus,
	Revision,
	RevisionSummary,
} from "@repo/domain/types";
import { api, cleanParams, unwrap } from "@/lib/api/client";

/** Admin projects (backend guide, "Admin: review queue and actions"). Drafts never reach admins. */

export const PAGE_SIZE = 10;

export type ProjectFilters = {
	status: ProjectStatus | "";
	q: string;
	categoryId: string;
	published: "" | "true" | "false";
	featured: "" | "true";
	sort: "oldest_submitted" | "recently_updated" | "";
	page: number;
};

export function useAdminProjects(f: ProjectFilters) {
	return useQuery({
		queryKey: ["admin", "projects", "list", f],
		queryFn: async () =>
			unwrap<Page<AdminProjectSummary>>(
				await api.get("/admin/projects", {
					params: cleanParams({
						status: f.status,
						q: f.q.trim(),
						categoryId: f.categoryId,
						published: f.published,
						featured: f.featured,
						sort: f.sort,
						limit: PAGE_SIZE,
						offset: (f.page - 1) * PAGE_SIZE,
					}),
				}),
			),
		placeholderData: keepPreviousData,
	});
}

/** How many projects have this status (`totalCount` of a 1-row page): tab counts. */
export function useStatusCount(status: ProjectStatus) {
	return useQuery({
		queryKey: ["admin", "projects", "count", status],
		queryFn: async () =>
			unwrap<Page<AdminProjectSummary>>(await api.get("/admin/projects", { params: { status, limit: 1 } })).paginationMeta.totalCount,
	});
}

export function useAdminProject(id: string) {
	return useQuery({
		queryKey: ["admin", "projects", "detail", id],
		queryFn: async () => unwrap<AdminProject>(await api.get(`/admin/projects/${id}`)),
		retry: (n, e) => n < 2 && (e as { response?: { status?: number } })?.response?.status !== 404,
	});
}

export function useRevisions(id: string) {
	return useQuery({
		queryKey: ["admin", "projects", "revisions", id],
		queryFn: async () => unwrap<RevisionSummary[]>(await api.get(`/admin/projects/${id}/revisions`)),
	});
}

export function useRevision(id: string, revision: number | null) {
	return useQuery({
		queryKey: ["admin", "projects", "revisions", id, revision],
		enabled: revision !== null,
		queryFn: async () => unwrap<Revision>(await api.get(`/admin/projects/${id}/revisions/${revision}`)),
	});
}

export function useAdminProjectInsights(id: string, enabled = true) {
	return useQuery({
		queryKey: ["admin", "projects", "insights", id],
		enabled,
		queryFn: async () => unwrap<ProjectInsights>(await api.get(`/admin/analytics/projects/${id}`)),
	});
}

export const CONTRIBUTIONS_PAGE = 8;

export function useProjectContributions(id: string, page: number, enabled = true) {
	return useQuery({
		queryKey: ["admin", "contributions", "project", id, page],
		enabled,
		queryFn: async () =>
			unwrap<Page<AdminContribution>>(
				await api.get("/admin/contributions", {
					params: { projectId: id, status: "confirmed", limit: CONTRIBUTIONS_PAGE, offset: (page - 1) * CONTRIBUTIONS_PAGE },
				}),
			),
		placeholderData: keepPreviousData,
	});
}

/** Every write refreshes all project views (list, detail, counts, overview, bell). */
function useInvalidate() {
	const qc = useQueryClient();
	return (p: AdminProject) => {
		qc.setQueryData(["admin", "projects", "detail", p.id], p);
		return Promise.all([
			qc.invalidateQueries({ queryKey: ["admin", "projects"] }),
			qc.invalidateQueries({ queryKey: ["admin", "overview"] }),
		]);
	};
}

/** Every decision goes through one route; a disallowed action is 409 (e.g. another admin acted first). */
export function useProjectAction() {
	const invalidate = useInvalidate();
	return useMutation({
		mutationFn: async (v: { id: string; action: ProjectAction; reason?: string; internalNote?: string }) =>
			unwrap<AdminProject>(
				await api.post(`/admin/projects/${v.id}/actions`, {
					action: v.action,
					...(v.reason ? { reason: v.reason } : {}),
					...(v.internalNote ? { internalNote: v.internalNote } : {}),
				}),
			),
		onSuccess: invalidate,
	});
}

export function useSetCategory() {
	const invalidate = useInvalidate();
	return useMutation({
		mutationFn: async (v: { id: string; categoryId: string }) =>
			unwrap<AdminProject>(await api.patch(`/admin/projects/${v.id}`, { categoryId: v.categoryId })),
		onSuccess: invalidate,
	});
}
