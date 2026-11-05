"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
	Page,
	ProjectStage,
	ProjectType,
	PublicCategory,
	PublicContribution,
	PublicProject,
	PublicProjectCard,
	PublicProjectsQuery,
	PublicSuggestion,
	SuggestionType,
} from "@repo/domain/types";
import { api, cleanParams, unwrap } from "@/lib/api/client";

/** Public discovery (backend guide, "Discovery"): only approved, published projects ever come back. */

export type ExploreFilters = {
	q: string;
	category: string;
	stage: ProjectStage | "";
	type: ProjectType | "";
	/** "1" = only projects that accept contributions. */
	fundraising: string;
	/** Asset id. */
	asset: string;
	sort: NonNullable<PublicProjectsQuery["sort"]>;
	page: number;
};

export const projectKeys = {
	all: ["projects"] as const,
	list: (f: ExploreFilters, limit: number) => ["projects", "list", f, limit] as const,
	detail: (slug: string) => ["projects", "detail", slug] as const,
};

export function useProjects(f: ExploreFilters, limit = 9) {
	return useQuery({
		queryKey: projectKeys.list(f, limit),
		queryFn: async () =>
			unwrap<Page<PublicProjectCard>>(
				await api.get("/projects", {
					params: cleanParams({
						q: f.q.trim(),
						category: f.category,
						stage: f.stage,
						type: f.type,
						fundraising: f.fundraising ? true : undefined,
						asset: f.asset,
						sort: f.sort,
						limit,
						offset: (f.page - 1) * limit,
					}),
				}),
			),
		placeholderData: keepPreviousData,
	});
}

/** The home row: featured first, then newest (the API's default sort). */
export function useFeaturedProjects(limit = 6) {
	return useQuery({
		queryKey: ["projects", "featured", limit],
		queryFn: async () => unwrap<Page<PublicProjectCard>>(await api.get("/projects", { params: { sort: "featured", limit } })),
	});
}

export function useCategories() {
	return useQuery({
		queryKey: ["categories"],
		queryFn: async () => unwrap<PublicCategory[]>(await api.get("/categories")),
		staleTime: 5 * 60_000,
	});
}

/**
 * The public project page. The API counts a view each time it's fetched, so it's cached for the visit (a trip to
 * Contribute and back reuses it) instead of refetching on focus.
 */
export function useProject(slug: string) {
	return useQuery({
		queryKey: projectKeys.detail(slug),
		queryFn: async () => unwrap<PublicProject>(await api.get(`/projects/${slug}`)),
		staleTime: 5 * 60_000,
		retry: (n, e) => n < 2 && (e as { response?: { status?: number } })?.response?.status !== 404,
	});
}

export const PROJECT_CONTRIBUTIONS_PAGE = 8;

/** Confirmed contributions, newest first, with shortened addresses and explorer links. */
export function useProjectContributions(slug: string, page: number) {
	return useQuery({
		queryKey: ["projects", "contributions", slug, page],
		queryFn: async () =>
			unwrap<Page<PublicContribution>>(
				await api.get(`/projects/${slug}/contributions`, {
					params: { limit: PROJECT_CONTRIBUTIONS_PAGE, offset: (page - 1) * PROJECT_CONTRIBUTIONS_PAGE },
				}),
			),
		placeholderData: keepPreviousData,
	});
}

/** Published suggestions, newest first. */
export function useProjectSuggestions(slug: string, type?: SuggestionType) {
	return useQuery({
		queryKey: ["projects", "suggestions", slug, type ?? "all"],
		queryFn: async () =>
			unwrap<Page<PublicSuggestion>>(await api.get(`/projects/${slug}/suggestions`, { params: cleanParams({ limit: 20, type }) })),
	});
}

/** How many public projects match (`paginationMeta.totalCount` of a 1-item page): home stats. */
export function useProjectCount(params: Pick<PublicProjectsQuery, "fundraising" | "featured"> = {}) {
	return useQuery({
		queryKey: ["projects", "count", params],
		queryFn: async () =>
			unwrap<Page<PublicProjectCard>>(await api.get("/projects", { params: cleanParams({ ...params, limit: 1 }) })).paginationMeta
				.totalCount,
	});
}
