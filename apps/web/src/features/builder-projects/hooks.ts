"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Contribution, Feedback, Page, Project, ProjectInput, ProjectInsights, ProjectType } from "@repo/domain/types";
import { builderApi, unwrap } from "@/lib/api/client";

/**
 * The builder's own projects (backend guide, "Projects"): create a draft (type + title), fill it in with PATCH,
 * upload a cover, submit. Buttons follow each project's `permissions`; the backend enforces them.
 */

const keys = {
	all: ["builder", "projects"] as const,
	list: ["builder", "projects", "list"] as const,
	detail: (id: string) => ["builder", "projects", "detail", id] as const,
};

/** Every project of this builder, newest change first (100: the API's page maximum; the dashboard filters it). */
export function useBuilderProjects() {
	return useQuery({
		queryKey: keys.list,
		queryFn: async () => unwrap<Page<Project>>(await builderApi.get("/builder/projects", { params: { limit: 100 } })),
	});
}

export function useBuilderProject(id: string) {
	return useQuery({
		queryKey: keys.detail(id),
		queryFn: async () => unwrap<Project>(await builderApi.get(`/builder/projects/${id}`)),
		// The cover link is signed for about an hour: refetch rather than keep it forever.
		staleTime: 5 * 60_000,
		retry: (n, e) => n < 2 && ![403, 404].includes((e as { response?: { status?: number } })?.response?.status ?? 0),
	});
}

function useProjectWrite<TVars>(fn: (v: TVars) => Promise<Project>) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: fn,
		onSuccess: (p) => {
			qc.setQueryData(keys.detail(p.id), p);
			void qc.invalidateQueries({ queryKey: keys.list });
		},
	});
}

export function useCreateProject() {
	return useProjectWrite(async (v: { type: ProjectType; title: string }) =>
		unwrap<Project>(await builderApi.post("/builder/projects", v)),
	);
}

export function useUpdateProject(id: string) {
	return useProjectWrite(async (v: ProjectInput) => unwrap<Project>(await builderApi.patch(`/builder/projects/${id}`, v)));
}

export function useSubmitProject(id: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => unwrap<Project>(await builderApi.post(`/builder/projects/${id}/submit`)),
		onSuccess: (p) => {
			qc.setQueryData(keys.detail(p.id), p);
			void qc.invalidateQueries({ queryKey: keys.list });
			void qc.invalidateQueries({ queryKey: ["notifications"] });
		},
	});
}

export function useDeleteProject(id: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			await builderApi.delete(`/builder/projects/${id}`);
		},
		onSuccess: () => {
			qc.removeQueries({ queryKey: keys.detail(id) });
			void qc.invalidateQueries({ queryKey: keys.list });
		},
	});
}

/** JPEG, PNG or WebP up to 5 MB, as multipart part `cover`. */
export function useUploadCover(id: string) {
	return useProjectWrite(async (file: File) => {
		const form = new FormData();
		form.append("cover", file);
		return unwrap<Project>(await builderApi.put(`/builder/projects/${id}/cover`, form));
	});
}

export function useRemoveCover(id: string) {
	return useProjectWrite(async () => unwrap<Project>(await builderApi.delete(`/builder/projects/${id}/cover`)));
}

/** Every admin decision with its reason, oldest first (internal notes are never included). */
export function useProjectFeedback(id: string, enabled = true) {
	return useQuery({
		queryKey: ["builder", "projects", "feedback", id],
		enabled,
		queryFn: async () => unwrap<Feedback[]>(await builderApi.get(`/builder/projects/${id}/feedback`)),
	});
}

/** Views (daily), contributions started/confirmed, suggestions received/published. Default range: last 30 days. */
export function useProjectInsights(id: string, enabled = true) {
	return useQuery({
		queryKey: ["builder", "projects", "insights", id],
		enabled,
		queryFn: async () => unwrap<ProjectInsights>(await builderApi.get(`/builder/projects/${id}/insights`)),
	});
}

export const BUILDER_CONTRIBUTIONS_PAGE = 10;

/** Confirmed contributions to one of my projects, with full addresses. */
export function useBuilderContributions(id: string, page: number, enabled = true) {
	return useQuery({
		queryKey: ["builder", "projects", "contributions", id, page],
		enabled,
		queryFn: async () =>
			unwrap<Page<Contribution>>(
				await builderApi.get(`/builder/projects/${id}/contributions`, {
					params: { limit: BUILDER_CONTRIBUTIONS_PAGE, offset: (page - 1) * BUILDER_CONTRIBUTIONS_PAGE },
				}),
			),
		placeholderData: keepPreviousData,
	});
}

/** Up to the latest 100 confirmed contributions, for per-asset totals on the status page. */
export function useBuilderContributionTotals(id: string, enabled = true) {
	return useQuery({
		queryKey: ["builder", "projects", "contributions", id, "totals"],
		enabled,
		queryFn: async () =>
			unwrap<Page<Contribution>>(await builderApi.get(`/builder/projects/${id}/contributions`, { params: { limit: 100 } })),
	});
}
