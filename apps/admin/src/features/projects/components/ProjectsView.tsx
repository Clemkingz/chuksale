"use client";

import { useEffect, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, SearchX, X } from "lucide-react";
import type { AdminProjectTab } from "@repo/domain/project-status";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { money, shortKey, timeAgo, fullDate } from "@/lib/format";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/Avatar";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton, StatusPill, UnderlineTabs } from "@/components/ui";
import { useAdminProjects, type ProjectFilters } from "@/features/projects/hooks";
import { ProjectActions } from "@/features/projects/components/ProjectActions";

/**
 * Designs "admin page 2–3": tabs (All / Completed / Pending / Cancelled), a "from – to" date range, and a table.
 * The design's columns describe contributions (wallet, token, amount); the PRD needs this page to be the review
 * queue, so each row is a project: name + its Stellar address (Wallet id), Token, Time added (submitted),
 * Amount contributed (confirmed, of target), Status and Action. Filters live in the URL.
 */

const TABS: { id: AdminProjectTab; label: string }[] = [
	{ id: "all", label: "All projects" },
	{ id: "completed", label: "Completed" },
	{ id: "pending", label: "Pending" },
	{ id: "cancelled", label: "Cancelled" },
];
const isTab = (v: string | null): v is AdminProjectTab => TABS.some((t) => t.id === v);

export function ProjectsView() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const filters: ProjectFilters = {
		tab: isTab(params.get("tab")) ? (params.get("tab") as AdminProjectTab) : "all",
		q: params.get("q") ?? "",
		from: params.get("from") ?? "",
		to: params.get("to") ?? "",
		page: Math.max(1, Number(params.get("page")) || 1),
	};
	const set = (next: Partial<Record<keyof ProjectFilters, string | number | null>>) => {
		const sp = new URLSearchParams(params.toString());
		for (const [k, v] of Object.entries(next)) {
			if (v === null || v === "" || (k === "tab" && v === "all") || (k === "page" && v === 1)) sp.delete(k);
			else sp.set(k, String(v));
		}
		router.replace(sp.size ? `${pathname}?${sp}` : pathname, { scroll: false });
	};

	const list = useAdminProjects(filters);
	const data = list.data;
	const lastPage = data?.meta.total_pages;
	useEffect(() => {
		if (lastPage && filters.page > lastPage) set({ page: lastPage });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lastPage, filters.page]);

	const filtered = !!(filters.q || filters.from || filters.to);

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Projects</PageTitle>

			<div className="mt-6 flex flex-col gap-5 md:mt-9 xl:flex-row xl:items-end xl:justify-between">
				<UnderlineTabs
					label="Filter projects"
					tabs={TABS}
					value={filters.tab}
					counts={data?.counts}
					onChange={(tab) => set({ tab, page: 1 })}
				/>
				<DateRange from={filters.from} to={filters.to} onChange={(from, to) => set({ from, to, page: 1 })} />
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
				aria-labelledby={`tab-${filters.tab}`}
				aria-busy={list.isFetching}
				className={cn(
					"admin-card mt-7 overflow-hidden transition-opacity duration-200 md:mt-10",
					list.isPlaceholderData && "opacity-60",
				)}
			>
				{list.isPending ? (
					<RowsSkeleton rows={7} cols={6} />
				) : list.isError && !data ? (
					<div className="p-4">
						<ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} retrying={list.isFetching} />
					</div>
				) : data && data.items.length === 0 ? (
					<EmptyState
						icon={filtered ? <SearchX className="size-6" aria-hidden /> : undefined}
						title={
							filtered
								? "No projects match these filters"
								: filters.tab === "pending"
									? "Nothing waiting for review"
									: "No projects here yet"
						}
						description={filtered ? "Try another search or widen the dates." : "Projects show up here once builders submit them."}
						action={
							filtered ? (
								<button
									type="button"
									onClick={() => set({ q: null, from: null, to: null, page: 1 })}
									className="text-sm text-primary-300 hover:text-primary-200"
								>
									Clear filters
								</button>
							) : undefined
						}
					/>
				) : data ? (
					<>
						<table className="hidden w-full table-fixed text-left lg:table">
							<thead className="text-base md:text-lg">
								<tr>
									<th scope="col" className="w-[27%] px-6 py-6 font-normal">
										Project / Wallet id
									</th>
									<th scope="col" className="w-[12%] px-3 py-6 font-normal">
										Token
									</th>
									<th scope="col" className="w-[14%] px-3 py-6 font-normal">
										Time added
									</th>
									<th scope="col" className="w-[19%] px-3 py-6 font-normal">
										Amount contributed
									</th>
									<th scope="col" className="w-[18%] px-3 py-6 font-normal">
										Status
									</th>
									<th scope="col" className="w-[10%] px-3 py-6 text-center font-normal">
										Action
									</th>
								</tr>
							</thead>
							<tbody>
								{data.items.map((p, i) => (
									<tr
										key={p.id}
										data-reveal="up"
										style={{ "--d": i } as CSSProperties}
										className="border-t border-white/10 transition-colors hover:bg-white/[0.025]"
									>
										<td className="px-6 py-[18px]">
											<div className="flex min-w-0 items-center gap-3">
												<Avatar name={p.title} src={p.logo_url} className="size-10 text-xs" />
												<div className="min-w-0">
													<Link href={routes.project(p.id)} className="block truncate text-base hover:text-primary-300">
														{p.title}
													</Link>
													<p className="truncate font-mono text-[13px] text-white/55" title={p.destination_address ?? undefined}>
														{p.destination_address ? shortKey(p.destination_address, 8, 6) : `by ${p.builder.name}`}
													</p>
												</div>
											</div>
										</td>
										<td className="px-3">
											<Token code={p.target_asset?.code} />
										</td>
										<td className="px-3 text-base" title={p.submitted_at ? fullDate(p.submitted_at) : undefined}>
											{p.submitted_at ? timeAgo(p.submitted_at) : "—"}
										</td>
										<td className="px-3 text-base">
											{money(p.raised_amount, p.target_asset?.code)}
											{p.target_amount && (
												<span className="block text-xs text-white/50">of {money(p.target_amount, p.target_asset?.code)}</span>
											)}
										</td>
										<td className="px-3">
											<StatusPill status={p.status} />
											{p.status === "approved" && p.visibility === "unpublished" && (
												<span className="mt-0.5 block text-xs text-white/50">Hidden from public</span>
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
							{data.items.map((p, i) => (
								<li
									key={p.id}
									data-reveal="up"
									style={{ "--d": i } as CSSProperties}
									className="flex flex-col gap-3 px-4 py-4 sm:px-5"
								>
									<div className="flex items-start gap-3">
										<Avatar name={p.title} src={p.logo_url} className="size-11 text-xs" />
										<div className="min-w-0 flex-1">
											<Link href={routes.project(p.id)} className="block truncate font-medium">
												{p.title}
											</Link>
											<p className="truncate text-sm text-white/55">by {p.builder.name}</p>
										</div>
										<ProjectActions project={p} />
									</div>
									<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
										<StatusPill status={p.status} className="text-sm" />
										<span>{money(p.raised_amount, p.target_asset?.code)}</span>
										<span className="text-white/60">{p.submitted_at ? timeAgo(p.submitted_at) : "—"}</span>
									</div>
									{p.destination_address && (
										<p className="truncate font-mono text-xs text-white/45">{shortKey(p.destination_address, 10, 8)}</p>
									)}
								</li>
							))}
						</ul>
					</>
				) : null}
			</div>

			{data && <Pager page={data.meta.page} pages={data.meta.total_pages} onPage={(page) => set({ page })} />}
		</div>
	);
}

/** Design: white circle + token code. Stellar assets get their own mark colour. */
function Token({ code }: { code?: string }) {
	if (!code) return <span className="text-white/40">—</span>;
	return (
		<span className="inline-flex items-center gap-2.5 text-base">
			<span
				aria-hidden
				className={cn(
					"flex size-9 items-center justify-center rounded-full text-[10px] font-bold",
					code === "USDC" ? "bg-[#2775CA] text-white" : "bg-white text-black",
				)}
			>
				{code === "USDC" ? "$" : "✦"}
			</span>
			{code}
		</span>
	);
}

/** Design: "📅 16-05-2024 to 📅 16-05-2024". Native date pickers (keyboard + mobile friendly). */
function DateRange({
	from,
	to,
	onChange,
}: {
	from: string;
	to: string;
	onChange: (from: string | null, to: string | null) => void;
}) {
	const today = new Date().toISOString().slice(0, 10);
	const input = (value: string, label: string, set: (v: string) => void, min?: string, max?: string) => (
		<label className="relative inline-flex items-center">
			<span className="sr-only">{label}</span>
			<CalendarDays className="pointer-events-none absolute left-2.5 size-5 text-white/80" aria-hidden />
			<input
				type="date"
				value={value}
				min={min}
				max={max ?? today}
				onChange={(e) => set(e.target.value)}
				className="h-10 rounded-lg border border-white/15 bg-transparent pr-2 pl-9 text-[15px] text-white outline-none [color-scheme:dark] hover:border-white/30 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
			/>
		</label>
	);
	return (
		<div className="flex flex-wrap items-center gap-2 text-base text-white/85">
			{input(from, "From date", (v) => onChange(v || null, to || null), undefined, to || undefined)}
			<span>to</span>
			{input(to, "To date", (v) => onChange(from || null, v || null), from || undefined)}
			{(from || to) && (
				<button
					type="button"
					onClick={() => onChange(null, null)}
					className="animate-pop ml-1 rounded-md px-2 py-1 text-sm text-primary-300 hover:bg-white/5"
				>
					Clear
				</button>
			)}
		</div>
	);
}
