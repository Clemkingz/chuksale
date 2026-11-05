"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FolderPlus, SearchX, Search, X } from "lucide-react";
import type { BuilderProjectGroup } from "@repo/domain/project-status";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { EmptyState, ErrorState } from "@/components/States";
import { useBuilderProjects } from "@/features/builder-projects/hooks";
import { ProjectsTable, ProjectsTableSkeleton } from "@/features/builder-projects/components/ProjectsTable";

/**
 * Designs "Dev add project 1" (no projects: "Oops you don't have any project" + Add project) and "Dev add
 * project 3" (tabs, search, Add Project, "Projects (n)" table, "Page 1 of 5"). Tab, search and page live in the
 * URL (?tab=pending&q=solar&page=2), so refresh, back and shared links keep the view.
 */

const TABS: { id: BuilderProjectGroup; label: string; empty: string }[] = [
	{ id: "all", label: "All Projects", empty: "No projects yet" },
	{ id: "pending", label: "Pending projects", empty: "Nothing waiting on review" },
	{ id: "completed", label: "Completed projects", empty: "No approved projects yet" },
];

const isGroup = (v: string | null): v is BuilderProjectGroup => TABS.some((t) => t.id === v);

export function ProjectsSection() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const tab = isGroup(params.get("tab")) ? (params.get("tab") as BuilderProjectGroup) : "all";
	const q = params.get("q") ?? "";
	const page = Math.max(1, Number(params.get("page")) || 1);

	const setParams = (next: Record<string, string | number | null>) => {
		const sp = new URLSearchParams(params.toString());
		for (const [k, v] of Object.entries(next)) {
			if (v === null || v === "" || (k === "tab" && v === "all") || (k === "page" && v === 1)) sp.delete(k);
			else sp.set(k, String(v));
		}
		const qs = sp.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	};

	const projects = useBuilderProjects({ group: tab, q, page });
	const data = projects.data;
	const noProjectsAtAll = data && !data.has_any;

	// If the page is past the end (a project moved tab), step back to the last page.
	const lastPage = data?.meta.total_pages;
	useEffect(() => {
		if (lastPage && page > lastPage) setParams({ page: lastPage });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lastPage, page]);

	return (
		<section aria-label="Your projects" className="app-container pt-8 pb-16 md:pt-11 md:pb-24">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div
					role="tablist"
					aria-label="Filter projects"
					className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
				>
					{TABS.map((t) => {
						const active = t.id === tab;
						return (
							<button
								key={t.id}
								type="button"
								role="tab"
								id={`tab-${t.id}`}
								aria-selected={active}
								aria-controls="projects-panel"
								onClick={() => setParams({ tab: t.id, page: 1 })}
								className={cn(
									"relative shrink-0 rounded-lg px-3.5 py-2.5 text-[15px] whitespace-nowrap transition-colors duration-200 md:px-4 md:py-3 md:text-base",
									active ? "bg-[#1A1A22] font-bold text-white md:text-lg" : "text-white/85 hover:bg-white/5 hover:text-white",
								)}
							>
								{t.label}
							</button>
						);
					})}
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<SearchBox value={q} onChange={(v) => setParams({ q: v, page: 1 })} />
					{data?.has_any && (
						<Button asChild className="animate-pop h-12 shrink-0 px-8 text-base sm:w-[156px]">
							<Link href={routes.newProject}>Add Project</Link>
						</Button>
					)}
				</div>
			</div>

			<div id="projects-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-7 md:mt-10">
				{projects.isPending ? (
					<ProjectsTableSkeleton />
				) : projects.isError && !data ? (
					<ErrorState
						title="We couldn’t load your projects"
						message={errorMessage(projects.error)}
						onRetry={() => void projects.refetch()}
						retrying={projects.isFetching}
					/>
				) : noProjectsAtAll ? (
					<NoProjects />
				) : data && data.items.length === 0 ? (
					q ? (
						<EmptyState
							icon={<SearchX className="size-6" aria-hidden />}
							title={`No projects match “${q}”`}
							description="Check the spelling or try another word."
							action={
								<Button variant="outline" onClick={() => setParams({ q: null, page: 1 })}>
									Clear search
								</Button>
							}
						/>
					) : (
						<EmptyState
							title={TABS.find((t) => t.id === tab)!.empty}
							description={
								tab === "completed"
									? "Projects appear here once an admin approves them."
									: "Projects you submit stay here until they’re reviewed."
							}
						/>
					)
				) : data ? (
					<>
						<ProjectsTable items={data.items} total={data.meta.total} dimmed={projects.isPlaceholderData} />
						{data.meta.total_pages > 1 && (
							<Pager page={data.meta.page} pages={data.meta.total_pages} onPage={(p) => setParams({ page: p })} />
						)}
					</>
				) : null}
			</div>
		</section>
	);
}

/** Design 1: centred "Oops you don't have any project" + Add project. */
function NoProjects() {
	return (
		<div className="flex flex-col items-center py-10 text-center md:pt-14 md:pb-20">
			<span data-reveal="zoom" className="flex size-14 items-center justify-center rounded-2xl bg-[#1E2030] text-primary-400">
				<FolderPlus className="size-6" aria-hidden />
			</span>
			<h2 data-reveal="up" style={{ "--d": 1 } as CSSProperties} className="mt-5 font-display text-xl font-bold md:text-2xl">
				Oops you don’t have any project
			</h2>
			<p data-reveal="up" style={{ "--d": 2 } as CSSProperties} className="mt-2 max-w-[360px] text-sm leading-6 text-white/60">
				Add your first project. An admin reviews it, then the community can find and support it.
			</p>
			<Button asChild className="mt-6 h-12 w-[182px] text-base" data-reveal="up" style={{ "--d": 3 } as CSSProperties}>
				<Link href={routes.newProject}>Add project</Link>
			</Button>
		</div>
	);
}

/** Debounced (300 ms) so typing doesn't fire a request per key; Escape clears. */
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	const [text, setText] = useState(value);
	const [synced, setSynced] = useState(value);
	// The URL changed elsewhere (Clear search, back button): follow it. Adjusting state during render, not in an effect.
	if (value !== synced) {
		setSynced(value);
		setText(value);
	}

	useEffect(() => {
		if (text.trim() === value) return;
		const id = setTimeout(() => onChange(text.trim()), 300);
		return () => clearTimeout(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [text]);

	return (
		<label className="group relative block w-full sm:w-[300px] lg:w-[326px]">
			<span className="sr-only">Search your projects</span>
			<Search
				className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-white/70 transition-colors group-focus-within:text-primary-300"
				aria-hidden
			/>
			<input
				type="search"
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={(e) => e.key === "Escape" && setText("")}
				placeholder="Search"
				className="h-12 w-full rounded-lg border border-primary-500/60 bg-transparent pr-10 pl-12 text-base text-white transition-[border-color,box-shadow] outline-none placeholder:text-white/55 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 [&::-webkit-search-cancel-button]:hidden"
			/>
			{text && (
				<button
					type="button"
					onClick={() => setText("")}
					aria-label="Clear search"
					className="animate-pop absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-white/60 hover:bg-white/10 hover:text-white"
				>
					<X className="size-4" />
				</button>
			)}
		</label>
	);
}

/** Design: "Page 1 of 5" with ‹ › arrows. */
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
	return (
		<nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-6 text-base md:mt-10 md:text-lg">
			<p aria-live="polite">
				Page <span className="tabular-nums">{page}</span> of <span className="tabular-nums">{pages}</span>
			</p>
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onPage(page - 1)}
					disabled={page <= 1}
					aria-label="Previous page"
					className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
				>
					<ChevronLeft className="size-5" />
				</button>
				<button
					type="button"
					onClick={() => onPage(page + 1)}
					disabled={page >= pages}
					aria-label="Next page"
					className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
				>
					<ChevronRight className="size-5" />
				</button>
			</div>
		</nav>
	);
}
