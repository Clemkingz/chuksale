"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Category, Paginated, PublicProject, ProjectUpdate, SuggestionType } from "@repo/domain/types";
import { api, unwrap } from "@/lib/api/client";

/** Public discovery (PRD §6.3). Contract: docs/API.md § Public projects. */

export type ExploreFilters = { q: string; category: string; stage: string; funding: string; sort: string; page: number };

export const projectKeys = {
	all: ["projects"] as const,
	list: (f: ExploreFilters) => ["projects", "list", f] as const,
	detail: (slug: string) => ["projects", "detail", slug] as const,
};

export function useProjects(f: ExploreFilters, limit = 9) {
	return useQuery({
		queryKey: projectKeys.list(f),
		queryFn: async () =>
			unwrap<Paginated<PublicProject>>(
				await api.get("/projects", {
					params: {
						q: f.q || undefined,
						category: f.category || undefined,
						stage: f.stage || undefined,
						funding: f.funding || undefined,
						sort: f.sort || undefined,
						page: f.page,
						limit,
					},
				}),
			),
		placeholderData: keepPreviousData,
	});
}

export function useFeaturedProjects() {
	return useQuery({
		queryKey: ["projects", "featured"],
		queryFn: async () => unwrap<PublicProject[]>(await api.get("/projects/featured")),
	});
}

export function useCategories() {
	return useQuery({
		queryKey: ["categories"],
		queryFn: async () => unwrap<Category[]>(await api.get("/categories")),
		staleTime: 5 * 60_000,
	});
}

export function usePublicStats() {
	return useQuery({
		queryKey: ["stats"],
		queryFn: async () =>
			unwrap<{ projects: number; contributors: number; contributions: number; builders: number }>(await api.get("/stats")),
	});
}

export function useProject(slug: string) {
	return useQuery({
		queryKey: projectKeys.detail(slug),
		queryFn: async () => unwrap<PublicProject>(await api.get(`/projects/${slug}`)),
		retry: (n, e) => n < 2 && (e as { response?: { status?: number } })?.response?.status !== 404,
	});
}

export type PublicContribution = {
	id: string;
	sender_address: string;
	amount: string;
	asset_id: string;
	tx_hash: string;
	confirmed_at: string;
};

export function useProjectContributions(slug: string, page: number) {
	return useQuery({
		queryKey: ["projects", "contributions", slug, page],
		queryFn: async () =>
			unwrap<Paginated<PublicContribution>>(await api.get(`/projects/${slug}/contributions`, { params: { page, limit: 8 } })),
		placeholderData: keepPreviousData,
	});
}

export type PublicSuggestion = {
	id: string;
	type: SuggestionType;
	title: string;
	body: string;
	link: string | null;
	wallet_address: string;
	created_at: string;
};

export function useProjectSuggestions(slug: string) {
	return useQuery({
		queryKey: ["projects", "suggestions", slug],
		queryFn: async () =>
			unwrap<Paginated<PublicSuggestion>>(await api.get(`/projects/${slug}/suggestions`, { params: { limit: 20 } })),
	});
}

export function useProjectUpdates(slug: string) {
	return useQuery({
		queryKey: ["projects", "updates", slug],
		queryFn: async () => unwrap<ProjectUpdate[]>(await api.get(`/projects/${slug}/updates`)),
	});
}
