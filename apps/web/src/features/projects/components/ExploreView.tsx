"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search, SearchX, SlidersHorizontal, X } from "lucide-react";
import { PROJECT_STAGE_LABEL, PROJECT_TYPE_LABEL } from "@repo/domain/labels";
import type { ProjectStage, ProjectType } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { EmptyState, ErrorState } from "@/components/States";
import { Pager } from "@/components/Pager";
import { useCategories, useProjects, type ExploreFilters } from "@/features/projects/hooks";
import { useNetwork } from "@/lib/stellar/network";
import { ProjectCard, ProjectCardSkeleton } from "@/features/projects/components/ProjectCard";

/**
 * /projects (backend guide, "Discovery"): search (debounced), category chips with counts, stage / type / asset /
 * fundraising filters, sort (featured, newest, title), pages.
 * Everything lives in the URL so results are shareable and survive back/refresh. Only approved, published
 * projects are ever returned by the API.
 */

const STAGES = Object.entries(PROJECT_STAGE_LABEL) as [ProjectStage, string][];
const TYPES = Object.entries(PROJECT_TYPE_LABEL) as [ProjectType, string][];
const SORTS = ["featured", "newest", "title"] as const;
const PER_PAGE = 9;

export function ExploreView() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const stage = params.get("stage") ?? "";
	const type = params.get("type") ?? "";
	const sort = params.get("sort") ?? "";
	const f: ExploreFilters = {
		q: params.get("q") ?? "",
		category: params.get("category") ?? "",
		stage: STAGES.some(([s]) => s === stage) ? (stage as ProjectStage) : "",
		type: TYPES.some(([t]) => t === type) ? (type as ProjectType) : "",
		fundraising: params.get("fundraising") ? "1" : "",
		asset: params.get("asset") ?? "",
		sort: (SORTS as readonly string[]).includes(sort) ? (sort as ExploreFilters["sort"]) : "featured",
		page: Math.max(1, Number(params.get("page")) || 1),
	};
	const set = (next: Partial<Record<keyof ExploreFilters, string | number | null>>) => {
		const sp = new URLSearchParams(params.toString());
		for (const [k, v] of Object.entries(next)) {
			if (v === null || v === "" || (k === "sort" && v === "featured") || (k === "page" && v === 1)) sp.delete(k);
			else sp.set(k, String(v));
		}
		router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false });
	};

	const categories = useCategories();
	const list = useProjects(f, PER_PAGE);
	const network = useNetwork();
	const d = list.data;
	const filtered = !!(f.q || f.category || f.stage || f.type || f.fundraising || f.asset);
	const clear = { q: null, category: null, stage: null, type: null, fundraising: null, asset: null, page: 1 };
	const [showFilters, setShowFilters] = useState(false);

	return (
		<div className="app-container py-10 md:py-16">
			<header className="max-w-[720px]">
				<h1 className="animate-rise font-display text-[34px] leading-tight font-bold md:text-5xl">Explore projects</h1>
				<p className="animate-rise mt-3 text-base leading-7 text-white/70 [--i:1] md:text-lg">
					Every project here was reviewed by our team. Contributions go straight to each project’s Stellar wallet.
				</p>
			</header>

			<div className="animate-rise mt-8 flex flex-col gap-4 [--i:2]">
				<div className="flex gap-3">
					<SearchInput value={f.q} onChange={(q) => set({ q, page: 1 })} />
					<Button
						variant="outline"
						className="h-12 w-auto shrink-0 gap-2 px-4 md:hidden"
						onClick={() => setShowFilters((v) => !v)}
						aria-expanded={showFilters}
					>
						<SlidersHorizontal className="size-4" /> Filters
					</Button>
				</div>

				<div
					className={cn("flex-col gap-4 md:flex md:flex-row md:items-center md:justify-between", showFilters ? "flex" : "hidden")}
				>
					<div
						role="group"
						aria-label="Category"
						className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0"
					>
						<Chip active={!f.category} onClick={() => set({ category: null, page: 1 })}>
							All
						</Chip>
						{categories.data?.map((c) => (
							<Chip key={c.id} active={f.category === c.slug} onClick={() => set({ category: c.slug, page: 1 })}>
								{c.name} <span className="ml-1 text-xs opacity-60 tabular-nums">{c.publishedProjectCount}</span>
							</Chip>
						))}
					</div>
					<div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:flex md:flex-wrap md:justify-end">
						<Select
							label="Stage"
							value={f.stage}
							onChange={(v) => set({ stage: v, page: 1 })}
							options={[["", "Any stage"], ...STAGES]}
						/>
						<Select
							label="Type"
							value={f.type}
							onChange={(v) => set({ type: v, page: 1 })}
							options={[["", "Any type"], ...TYPES]}
						/>
						<Select
							label="Fundraising"
							value={f.fundraising}
							onChange={(v) => set({ fundraising: v, page: 1 })}
							options={[
								["", "All projects"],
								["1", "Accepting contributions"],
							]}
						/>
						<Select
							label="Asset"
							value={f.asset}
							onChange={(v) => set({ asset: v, page: 1 })}
							options={[
								["", "Any asset"],
								...(network.data?.assets.map((a) => [a.id, `Accepts ${a.code}`] as [string, string]) ?? []),
							]}
						/>
						<Select
							label="Sort"
							value={f.sort}
							onChange={(v) => set({ sort: v, page: 1 })}
							options={[
								["featured", "Featured first"],
								["newest", "Newest"],
								["title", "A–Z"],
							]}
						/>
					</div>
				</div>
			</div>

			<div className="mt-8 flex items-center justify-between text-sm text-white/55" aria-live="polite">
				<span>{d ? `${d.paginationMeta.totalCount} project${d.paginationMeta.totalCount === 1 ? "" : "s"}` : " "}</span>
				{filtered && (
					<button
						type="button"
						onClick={() => set(clear)}
						className="inline-flex items-center gap-1 text-primary-300 hover:text-primary-200"
					>
						<X className="size-3.5" /> Clear filters
					</button>
				)}
			</div>

			{list.isPending ? (
				<ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }, (_, i) => (
						<ProjectCardSkeleton key={i} />
					))}
				</ul>
			) : list.isError && !d ? (
				<div className="mt-4">
					<ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} retrying={list.isFetching} />
				</div>
			) : d && d.result.length === 0 ? (
				<EmptyState
					className="mt-4"
					icon={filtered ? <SearchX className="size-6" aria-hidden /> : undefined}
					title={filtered ? "No projects match" : "No projects yet"}
					description={filtered ? "Try another word or fewer filters." : "Approved projects show up here. Have one in mind?"}
					action={
						filtered ? (
							<Button variant="outline" className="w-auto px-5" onClick={() => set(clear)}>
								Clear filters
							</Button>
						) : (
							<Button asChild className="w-auto px-6">
								<Link href={routes.newProject}>Submit a project</Link>
							</Button>
						)
					}
				/>
			) : d ? (
				<>
					<ul
						className={cn(
							"mt-4 grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
							list.isPlaceholderData && "opacity-60",
						)}
					>
						{d.result.map((p, i) => (
							<ProjectCard key={p.id} project={p} index={i} />
						))}
					</ul>
					<Pager
						page={f.page}
						pages={Math.max(1, Math.ceil(d.paginationMeta.totalCount / PER_PAGE))}
						onPage={(page) => set({ page })}
					/>
				</>
			) : null}
		</div>
	);
}

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
	const [text, setText] = useState(value);
	const [synced, setSynced] = useState(value);
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
		<label className="group relative block flex-1">
			<span className="sr-only">Search projects</span>
			<Search
				className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-white/60 group-focus-within:text-primary-300"
				aria-hidden
			/>
			<input
				type="search"
				value={text}
				onChange={(e) => setText(e.target.value)}
				onKeyDown={(e) => e.key === "Escape" && setText("")}
				placeholder="Search by name, cause or builder"
				className="h-12 w-full rounded-lg border border-primary-500/50 bg-transparent pr-4 pl-12 text-base text-white outline-none placeholder:text-white/45 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 [&::-webkit-search-cancel-button]:hidden"
			/>
		</label>
	);
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={cn(
				"h-9 shrink-0 rounded-full border px-4 text-sm whitespace-nowrap transition-colors duration-200",
				active
					? "border-primary-500 bg-primary-500 text-white"
					: "border-white/15 text-white/75 hover:border-white/30 hover:text-white",
			)}
		>
			{children}
		</button>
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
				className="h-10 w-full cursor-pointer appearance-none truncate rounded-lg border border-white/15 bg-transparent pr-8 pl-3 text-sm text-white outline-none hover:border-white/30 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 md:w-auto"
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
