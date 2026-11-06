"use client";

import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type {
	Page,
	ProjectStage,
	ProjectType,
	PublicCategory,
	PublicContribution,
	PublicProject,
	PublicProjectCard,
	PublicProjectsQuery,
	PublicProjectUpdate,
	PublicSuggestion,
	SuggestionType,
} from "@repo/domain/types";
import { api, cleanParams, unwrap } from "@/lib/api/client";
import { useSaved } from "@/lib/query-cache";

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

export const EXPLORE_PAGE = 9;

/** Explore with no filters (what the "Projects" link opens). */
export const DEFAULT_EXPLORE: ExploreFilters = { q: "", category: "", stage: "", type: "", fundraising: "", asset: "", sort: "featured", page: 1 };

const listQuery = (f: ExploreFilters, limit: number) => ({
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
});

export function useProjects(f: ExploreFilters, limit = EXPLORE_PAGE) {
	const q = listQuery(f, limit);
	const saved = useSaved<Page<PublicProjectCard>>(q.queryKey);
	// While filters change, keep the previous page on screen; on a return visit, the saved one.
	return useQuery({ ...q, placeholderData: (prev) => keepPreviousData(prev) ?? saved });
}

/** Loads the first Explore page in the background (from Home), so "Projects" opens with its list ready. */
export function prefetchExplore(qc: QueryClient) {
	void qc.prefetchQuery(listQuery(DEFAULT_EXPLORE, EXPLORE_PAGE));
}

/** The home row: featured first, then newest (the API's default sort). */
export function useFeaturedProjects(limit = 6) {
	const queryKey = ["projects", "featured", limit];
	const saved = useSaved<Page<PublicProjectCard>>(queryKey);
	return useQuery({
		queryKey,
		queryFn: async () => unwrap<Page<PublicProjectCard>>(await api.get("/projects", { params: { sort: "featured", limit } })),
		placeholderData: saved,
	});
}

export function useCategories() {
	const saved = useSaved<PublicCategory[]>(["categories"]);
	return useQuery({
		queryKey: ["categories"],
		queryFn: async () => unwrap<PublicCategory[]>(await api.get("/categories")),
		staleTime: 5 * 60_000,
		placeholderData: saved,
	});
}

/**
 * The public project page. The API counts a view each time it's fetched, so it's cached for the visit (a trip to
 * Contribute and back reuses it) instead of refetching on focus.
 */
const projectQuery = (slug: string) => ({
	queryKey: projectKeys.detail(slug),
	queryFn: async () => unwrap<PublicProject>(await api.get(`/projects/${slug}`)),
	staleTime: 5 * 60_000,
});

export function useProject(slug: string) {
	const qc = useQueryClient();
	const saved = useSaved<PublicProject>(projectKeys.detail(slug));
	return useQuery({
		...projectQuery(slug),
		// A return visit shows the saved page; opened from a card, what the card knows. The response replaces both.
		placeholderData: () => saved ?? fromCard(qc, slug),
		retry: (n, e) => n < 2 && (e as { response?: { status?: number } })?.response?.status !== 404,
	});
}

/** Starts loading a project before the click (card hover, focus or touch). No-op when it's already fresh. */
export function prefetchProject(qc: QueryClient, slug: string) {
	void qc.prefetchQuery(projectQuery(slug));
}

/** A partial project page from any cached card with this slug (lists, featured row). */
function fromCard(qc: QueryClient, slug: string): PublicProject | undefined {
	for (const [, data] of qc.getQueriesData<Page<PublicProjectCard>>({ queryKey: projectKeys.all })) {
		const card = data?.result?.find?.((c) => c.slug === slug);
		if (!card) continue;
		return {
			...card,
			builder: { ...card.builder, bio: null, websiteUrl: null, contactEmail: null, socialLinks: [], walletAddress: null, bannerUrl: null },
			problem: "",
			solution: "",
			beneficiaries: "",
			teamMembers: [],
			links: [],
			payoutAddress: null,
			updatedAt: card.publishedAt,
		};
	}
	return undefined;
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
			unwrap<Page<PublicSuggestion>>(
				await api.get(`/projects/${slug}/suggestions`, { params: cleanParams({ limit: 20, type }) }),
			),
	});
}

export const PROJECT_UPDATES_PAGE = 10;

/** Published updates, newest first ("Load older"). Image links expire after about an hour, so they refetch. */
export function useProjectUpdates(slug: string) {
	return useInfiniteQuery({
		queryKey: ["projects", "updates", slug],
		queryFn: async ({ pageParam }) =>
			unwrap<Page<PublicProjectUpdate>>(
				await api.get(`/projects/${slug}/updates`, { params: { limit: PROJECT_UPDATES_PAGE, offset: pageParam } }),
			),
		initialPageParam: 0,
		getNextPageParam: (last, all) => (last.paginationMeta.nextPage ? all.length * PROJECT_UPDATES_PAGE : undefined),
		staleTime: 10 * 60_000,
	});
}

/** How many public projects match (`paginationMeta.totalCount` of a 1-item page): home stats. */
export function useProjectCount(params: Pick<PublicProjectsQuery, "fundraising" | "featured"> = {}) {
	const queryKey = ["projects", "count", params];
	const saved = useSaved<number>(queryKey);
	return useQuery({
		queryKey,
		placeholderData: saved,
		queryFn: async () =>
			unwrap<Page<PublicProjectCard>>(await api.get("/projects", { params: cleanParams({ ...params, limit: 1 }) })).paginationMeta
				.totalCount,
	});
}
