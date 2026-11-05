"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BuilderProjectGroup } from "@repo/domain/project-status";
import type {
	BuilderProfileSummary,
	BuilderProjectListItem,
	CreateProjectInput,
	Paginated,
	UpdateProfileInput,
} from "@repo/domain/types";
import { builderApi, unwrap } from "@/lib/api/client";
import { useBuilderSession } from "@/features/builder-auth/session";

/** The builder's own profile and projects (designs "Dev add project 1–3"). Contract: docs/API.md § Builder. */

export const PROJECTS_PAGE_SIZE = 6;

export type BuilderProjectsPage = Paginated<BuilderProjectListItem> & {
	counts: Record<BuilderProjectGroup, number>;
	has_any: boolean;
};

const keys = {
	profile: (userId: string | null) => ["builder", userId, "profile"] as const,
	projects: (userId: string | null) => ["builder", userId, "projects"] as const,
	list: (userId: string | null, group: BuilderProjectGroup, q: string, page: number) =>
		["builder", userId, "projects", group, q, page] as const,
};

export function useBuilderProfile() {
	const userId = useBuilderSession((s) => s.userId);
	return useQuery({
		queryKey: keys.profile(userId),
		enabled: !!userId,
		queryFn: async () => unwrap<BuilderProfileSummary>(await builderApi.get("/builder/profile")),
		staleTime: 60_000,
	});
}

export function useBuilderProjects({ group, q, page }: { group: BuilderProjectGroup; q: string; page: number }) {
	const userId = useBuilderSession((s) => s.userId);
	return useQuery({
		queryKey: keys.list(userId, group, q, page),
		queryFn: async () =>
			unwrap<BuilderProjectsPage>(
				await builderApi.get("/builder/projects", { params: { group, q: q || undefined, page, limit: PROJECTS_PAGE_SIZE } }),
			),
		// Switching tab, page or search keeps the old rows on screen (dimmed) instead of flashing a skeleton.
		placeholderData: keepPreviousData,
	});
}

export function useCreateProject() {
	const qc = useQueryClient();
	const userId = useBuilderSession((s) => s.userId);
	return useMutation({
		mutationFn: async (input: CreateProjectInput) =>
			unwrap<BuilderProjectListItem>(await builderApi.post("/builder/projects", input)),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: keys.projects(userId) });
			void qc.invalidateQueries({ queryKey: ["notifications"] });
		},
	});
}

export function useUpdateProfile() {
	const qc = useQueryClient();
	const userId = useBuilderSession((s) => s.userId);
	return useMutation({
		mutationFn: async (input: UpdateProfileInput) =>
			unwrap<BuilderProfileSummary>(await builderApi.patch("/builder/profile", input)),
		onSuccess: (profile) => {
			qc.setQueryData(keys.profile(userId), profile);
			// The header shows the builder's name.
			useBuilderSession.setState({ displayName: profile.display_name });
		},
	});
}

export type BuilderProjectDetail = import("@repo/domain/types").Project & {
	category: import("@repo/domain/types").Category | null;
	target_asset: { id: string; code: string } | null;
	raised_amount: string;
	contributor_count: number;
	reviews: { id: string; decision: import("@repo/domain/types").ReviewDecision; reason: string | null; created_at: string }[];
	revisions: { id: string; revision_number: number; created_at: string }[];
	suggestion_count: number;
	editable: boolean;
};

export function useBuilderProject(id: string) {
	const userId = useBuilderSession((s) => s.userId);
	return useQuery({
		queryKey: ["builder", userId, "projects", "detail", id],
		queryFn: async () => unwrap<BuilderProjectDetail>(await builderApi.get(`/builder/projects/${id}`)),
		retry: (n, e) => n < 2 && ![403, 404].includes((e as { response?: { status?: number } })?.response?.status ?? 0),
	});
}

export type ProjectEdit = {
	title: string;
	summary: string;
	problem: string;
	solution: string;
	beneficiaries: string;
	category_id: string;
	stage: string;
	project_type: string;
	logo_url: string;
	contact_email: string;
	destination_address: string;
	target_amount: string;
	target_asset_id: string;
	links: { twitter?: string; discord?: string; telegram?: string; website?: string };
};

export function useUpdateProject(id: string) {
	const qc = useQueryClient();
	const userId = useBuilderSession((s) => s.userId);
	return useMutation({
		mutationFn: async (v: ProjectEdit) => unwrap<{ id: string }>(await builderApi.patch(`/builder/projects/${id}`, v)),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["builder", userId, "projects"] }),
	});
}

export function useSubmitProject(id: string) {
	const qc = useQueryClient();
	const userId = useBuilderSession((s) => s.userId);
	return useMutation({
		mutationFn: async () => unwrap<{ id: string; status: string }>(await builderApi.post(`/builder/projects/${id}/submit`)),
		onSuccess: () => {
			void qc.invalidateQueries({ queryKey: ["builder", userId, "projects"] });
			void qc.invalidateQueries({ queryKey: ["notifications"] });
		},
	});
}

export function useBuilderProjectSuggestions(id: string, enabled: boolean) {
	const userId = useBuilderSession((s) => s.userId);
	return useQuery({
		queryKey: ["builder", userId, "projects", "suggestions", id],
		enabled,
		queryFn: async () =>
			unwrap<
				{
					id: string;
					type: import("@repo/domain/types").SuggestionType;
					title: string;
					body: string;
					link: string | null;
					wallet_address: string;
					created_at: string;
				}[]
			>(await builderApi.get(`/builder/projects/${id}/suggestions`)),
	});
}
