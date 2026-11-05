"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminProjectTab } from "@repo/domain/project-status";
import type { AdminProjectListItem, Paginated, ProjectReview, ProjectStage, ReviewDecision } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";

/** Admin projects: list (pages 2–3), detail + contributions (page 4), decisions. Contract: docs/API.md § Admin. */

export const PAGE_SIZE = 7;

export type AdminProjectsPage = Paginated<AdminProjectListItem> & { counts: Record<AdminProjectTab, number> };

export type AdminProjectDetail = AdminProjectListItem & {
	summary: string;
	links: { label: string; url: string }[];
	contact_email: string | null;
	category: string | null;
	stage: ProjectStage | null;
	approved_at: string | null;
	ends_at: string | null;
	contributor_count: number;
	contribution_count: number;
	builder_profile: { name: string; email: string; wallet_address: string | null; twitter_url: string | null };
	reviews: (ProjectReview & { admin_name: string })[];
	allowed_decisions: ReviewDecision[];
};

export type AdminContributionRow = {
	id: string;
	sender_address: string;
	amount: string;
	asset_code: string;
	tx_hash: string;
	confirmed_at: string;
	share_percent: number | null;
	share_of: "target" | "raised";
};

export type ProjectFilters = { tab: AdminProjectTab; q: string; from: string; to: string; page: number };

export function useAdminProjects(f: ProjectFilters) {
	return useQuery({
		queryKey: ["admin", "projects", "list", f],
		queryFn: async () =>
			unwrap<AdminProjectsPage>(
				await api.get("/admin/projects", {
					params: {
						tab: f.tab,
						q: f.q || undefined,
						from: f.from || undefined,
						to: f.to || undefined,
						page: f.page,
						limit: PAGE_SIZE,
					},
				}),
			),
		placeholderData: keepPreviousData,
	});
}

export function useAdminProject(id: string) {
	return useQuery({
		queryKey: ["admin", "projects", "detail", id],
		queryFn: async () => unwrap<AdminProjectDetail>(await api.get(`/admin/projects/${id}`)),
	});
}

export function useProjectContributions(id: string, page: number) {
	return useQuery({
		queryKey: ["admin", "projects", "contributions", id, page],
		queryFn: async () =>
			unwrap<Paginated<AdminContributionRow> & { raised_amount: string }>(
				await api.get(`/admin/projects/${id}/contributions`, { params: { page, limit: PAGE_SIZE } }),
			),
		placeholderData: keepPreviousData,
	});
}

/** Every write refreshes all project views (list, detail, overview, bell). */
function useInvalidate() {
	const qc = useQueryClient();
	return () =>
		Promise.all([
			qc.invalidateQueries({ queryKey: ["admin", "projects"] }),
			qc.invalidateQueries({ queryKey: ["admin", "overview"] }),
			qc.invalidateQueries({ queryKey: ["admin", "notifications"] }),
		]);
}

export function useDecision() {
	const invalidate = useInvalidate();
	return useMutation({
		mutationFn: async (v: { id: string; decision: ReviewDecision; reason?: string; internal_note?: string }) =>
			unwrap<AdminProjectListItem>(await api.post(`/admin/projects/${v.id}/decision`, v)),
		onSuccess: invalidate,
	});
}

export function useVisibility() {
	const invalidate = useInvalidate();
	return useMutation({
		mutationFn: async (v: { id: string; visibility: "published" | "unpublished" }) =>
			unwrap<AdminProjectListItem>(await api.post(`/admin/projects/${v.id}/visibility`, v)),
		onSuccess: invalidate,
	});
}

export function useFeature() {
	const invalidate = useInvalidate();
	return useMutation({
		mutationFn: async (v: { id: string; featured: boolean }) =>
			unwrap<AdminProjectListItem>(await api.post(`/admin/projects/${v.id}/feature`, v)),
		onSuccess: invalidate,
	});
}
