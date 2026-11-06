"use client";

import { useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, SearchX, X } from "lucide-react";
import { PROJECT_STATUS_LABEL, PROJECT_TYPE_LABEL } from "@repo/domain/labels";
import type { ProjectStatus } from "@repo/domain/types";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { fullDate, timeAgo } from "@/lib/format";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton, StatusPill, UnderlineTabs } from "@/components/ui";
import { useAdminCategories } from "@/features/categories/hooks";
import { PAGE_SIZE, useAdminProjects, useStatusCount, type ProjectFilters } from "@/features/projects/hooks";
import { ProjectActions } from "@/features/projects/components/ProjectActions";

/**
 * Designs "admin page 2–3", tailored to `GET /admin/projects`: one tab per status (Submitted is the review queue,
 * oldest first), search by title or owner, category / listing / featured filters and sort. Drafts never reach
 * admins. Filters live in the URL.
 */

type Tab = ProjectStatus | "all";
const STATUSES: ProjectStatus[] = ["submitted", "under_review", "changes_requested", "approved", "rejected", "archived"];
const TABS: { id: Tab; label: string }[] = [
	{ id: "all", label: "All" },
	...STATUSES.map((s) => ({ id: s as Tab, label: PROJECT_STATUS_LABEL[s] })),
];
const isTab = (v: string | null): v is Tab => TABS.some((t) => t.id === v);
const QUEUE: Tab[] = ["submitted", "under_review"];

export function ProjectsView() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const tab: Tab = isTab(params.get("tab")) ? (params.get("tab") as Tab) : "all";
	const sortParam = params.get("sort");
	const filters: ProjectFilters = {
		status: tab === "all" ? "" : tab,
		q: params.get("q") ?? "",
		categoryId: params.get("category") ?? "",
		published: params.get("published") === "true" ? "true" : params.get("published") === "false" ? "false" : "",
		featured: params.get("featured") === "true" ? "true" : "",
		// The queue reads oldest submission first; everything else most recently updated.
		sort:
			sortParam === "oldest_submitted" || sortParam === "recently_updated"
				? sortParam
				: QUEUE.includes(tab)
					? "oldest_submitted"
					: "recently_updated",
		page: Math.max(1, Number(params.get("page")) || 1),
	};
	const set = (next: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		for (const [k, v] of Object.entries(next)) {
			if (v === null || v === "" || (k === "tab" && v === "all") || (k === "page" && v === 1)) sp.delete(k);
			else sp.set(k, String(v));
		}
		router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false });
	};

	const list = useAdminProjects(filters);
	const categories = useAdminCategories();
	const submitted = useStatusCount("submitted");
	const underReview = useStatusCount("under_review");
	const data = list.data;
	const total = data?.paginationMeta.totalCount ?? 0;
	const lastPage = data ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : undefined;
	useEffect(() => {
		if (lastPage && filters.page > lastPage) set({ page: lastPage });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lastPage, filters.page]);

	const filtered = !!(filters.q || filters.categoryId || filters.published || filters.featured);
	const clear = { q: null, category: null, published: null, featured: null, page: 1 };

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Projects</PageTitle>

			<div className="mt-6 md:mt-9">
				<UnderlineTabs
					label="Filter by status"
					size="md"
					tabs={TABS}
					value={tab}
					counts={{ submitted: submitted.data, under_review: underReview.data }}
					onChange={(t) => set({ tab: t, page: 1, sort: null })}
				/>
			</div>

			<div className="mt-5 flex flex-wrap items-center gap-2">
				<Select
					label="Category"
					value={filters.categoryId}
					onChange={(v) => set({ category: v, page: 1 })}
					options={[
						["", "All categories"],
						...(categories.data?.map((c) => [c.id, c.isActive ? c.name : `${c.name} (inactive)`] as [string, string]) ?? []),
					]}
				/>
				<Select
					label="Listing"
					value={filters.published}
					onChange={(v) => set({ published: v, page: 1 })}
					options={[
						["", "Listed or not"],
						["true", "Listed publicly"],
						["false", "Not listed"],
					]}
				/>
				<Select
					label="Featured"
					value={filters.featured}
					onChange={(v) => set({ featured: v, page: 1 })}
					options={[
						["", "Featured or not"],
						["true", "Featured only"],
					]}
				/>
				<Select
					label="Sort"
					value={filters.sort}
					onChange={(v) => set({ sort: v, page: 1 })}
					options={[
						["oldest_submitted", "Oldest submission first"],
						["recently_updated", "Recently updated"],
					]}
				/>
				{filtered && (
					<button
						type="button"
						onClick={() => set(clear)}
						className="ml-1 rounded-md px-2 py-1 text-sm text-primary-300 hover:bg-white/5"
					>
						Clear filters
					</button>
				)}
			</div>

			{filters.q && (
				<p className="animate-rise mt-4 inline-flex items-center gap-2 rounded-full bg-primary-500/10 py-1 pr-1 pl-3 text-sm text-primary-200">
					Search: “{filters.q}”
					<button
						type="button"
						onClick={() => set({ q: null, page: 1 })}
						aria-label="Clear search"
						className="flex size-6 items-center justify-center rounded-full hover:bg-white/10"
					>
						<X className="size-3.5" />
					</button>
				</p>
			)}

			<div
				role="tabpanel"
				aria-labelledby={`tab-${tab}`}
				aria-busy={list.isFetching}
				className={cn(
					"admin-card mt-6 overflow-hidden transition-opacity duration-200 md:mt-8",
					list.isPlaceholderData && "opacity-60",
				)}
			>
				{list.isPending ? (
					<RowsSkeleton rows={7} cols={6} />
				) : list.isError && !data ? (
					<div className="p-4">
						<ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} retrying={list.isFetching} />
					</div>
				) : data && data.result.length === 0 ? (
					<EmptyState
						icon={filtered ? <SearchX className="size-6" aria-hidden /> : undefined}
						title={
							filtered
								? "No projects match these filters"
								: tab === "submitted"
									? "Nothing waiting for review"
									: "No projects here"
						}
						description={filtered ? "Try another search or fewer filters." : "Projects show up here once builders submit them."}
						action={
							filtered ? (
								<button type="button" onClick={() => set(clear)} className="text-sm text-primary-300 hover:text-primary-200">
									Clear filters
								</button>
							) : undefined
						}
					/>
				) : data ? (
					<>
						<table className="hidden w-full table-fixed text-left lg:table">
							<thead className="text-base">
								<tr>
									<th scope="col" className="w-[30%] px-6 py-5 font-normal">
										Project
									</th>
									<th scope="col" className="w-[20%] px-3 py-5 font-normal">
										Owner
									</th>
									<th scope="col" className="w-[15%] px-3 py-5 font-normal">
										Category
									</th>
									<th scope="col" className="w-[13%] px-3 py-5 font-normal">
										Submitted
									</th>
									<th scope="col" className="w-[15%] px-3 py-5 font-normal">
										Status
									</th>
									<th scope="col" className="w-[7%] px-3 py-5 text-center font-normal">
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{data.result.map((p, i) => (
									<tr
										key={p.id}
										data-reveal="up"
										style={{ "--d": i } as CSSProperties}
										className="border-t border-white/10 transition-colors hover:bg-white/[0.025]"
									>
										<td className="px-6 py-4">
											<div className="flex min-w-0 items-center gap-3">
												<Avatar name={p.title} className="size-10 text-xs" />
												<div className="min-w-0">
													<Link href={routes.project(p.id)} className="block truncate text-base hover:text-primary-300">
														{p.title}
													</Link>
													<p className="truncate text-[13px] text-white/50">
														{PROJECT_TYPE_LABEL[p.type]} · revision {p.revision}
													</p>
												</div>
											</div>
										</td>
										<td className="px-3">
											<p className="truncate">{p.owner.displayName ?? p.owner.name}</p>
											<p className="truncate text-[13px] text-white/50">{p.owner.email}</p>
										</td>
										<td className="truncate px-3 text-white/85">{p.category?.name ?? "—"}</td>
										<td className="px-3" title={p.submittedAt ? fullDate(p.submittedAt) : undefined}>
											{p.submittedAt ? timeAgo(p.submittedAt) : "—"}
										</td>
										<td className="px-3">
											<StatusPill status={p.status} />
											{p.status === "approved" && !p.published && (
												<span className="mt-0.5 block text-xs text-white/50">Not listed</span>
											)}
											{p.featured && <span className="mt-0.5 block text-xs text-primary-300">Featured</span>}
										</td>
										<td className="px-3 text-center">
											<ProjectActions project={p} />
										</td>
									</tr>
								))}
							</tbody>
						</table>

						<ul className="divide-y divide-white/10 lg:hidden">
							{data.result.map((p, i) => (
								<li
									key={p.id}
									data-reveal="up"
									style={{ "--d": i } as CSSProperties}
									className="flex flex-col gap-3 px-4 py-4 sm:px-5"
								>
									<div className="flex items-start gap-3">
										<Avatar name={p.title} className="size-11 text-xs" />
										<div className="min-w-0 flex-1">
											<Link href={routes.project(p.id)} className="block truncate font-medium">
												{p.title}
											</Link>
											<p className="truncate text-sm text-white/55">by {p.owner.displayName ?? p.owner.name}</p>
										</div>
										<ProjectActions project={p} />
									</div>
									<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
										<StatusPill status={p.status} className="text-sm" />
										<span className="text-white/70">{p.category?.name ?? "No category"}</span>
										<span className="text-white/60">{p.submittedAt ? timeAgo(p.submittedAt) : "—"}</span>
									</div>
								</li>
							))}
						</ul>
					</>
				) : null}
			</div>

			{data && lastPage && lastPage > 1 && <Pager page={filters.page} pages={lastPage} onPage={(page) => set({ page })} />}
		</div>
	);
}

function Select({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	options: [string, string][];
}) {
	return (
		<label className="relative block min-w-0">
			<span className="sr-only">{label}</span>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="h-10 max-w-[220px] cursor-pointer appearance-none truncate rounded-lg border border-white/15 bg-transparent pr-8 pl-3 text-sm text-white outline-none hover:border-white/30 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
			>
				{options.map(([v, l]) => (
					<option key={v} value={v} className="bg-[#131318]">
						{l}
					</option>
				))}
			</select>
			<ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-white/60" aria-hidden />
		</label>
	);
}
