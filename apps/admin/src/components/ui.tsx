"use client";

import type { CSSProperties, ReactNode } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import type { ProjectStatus } from "@repo/domain/types";
import { PROJECT_STATUS_LABEL } from "@repo/domain/labels";
import { Button } from "@repo/ui/button";
import { CountUp } from "@repo/ui/count-up";
import { cn } from "@repo/ui/lib/utils";

/** Small building blocks shared by console pages (designs "admin page 1–8"). */

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-4">
			<h1 className="animate-rise font-display text-[32px] leading-tight font-bold text-primary-500 md:text-[40px]">
				{children}
			</h1>
			{actions}
		</div>
	);
}

/** Design: coloured dot + coloured label. Copy from @repo/domain/labels; colour by meaning. */
const TONE: Record<ProjectStatus, string> = {
	draft: "text-white/60",
	submitted: "text-warning-200",
	under_review: "text-info-200",
	changes_requested: "text-warning-300",
	approved: "text-success-300",
	rejected: "text-error-300",
	archived: "text-white/50",
};

export function StatusPill({ status, className }: { status: ProjectStatus; className?: string }) {
	return (
		<span className={cn("inline-flex items-center gap-2 text-[15px] whitespace-nowrap md:text-base", TONE[status], className)}>
			<span aria-hidden className="size-3.5 shrink-0 rounded-full bg-current md:size-4" />
			{PROJECT_STATUS_LABEL[status]}
		</span>
	);
}

/** Design tabs: underlined active label in primary (Projects, Account settings). */
export function UnderlineTabs<T extends string>({
	tabs,
	value,
	onChange,
	label,
	counts,
	size = "lg",
}: {
	tabs: { id: T; label: string }[];
	value: T;
	onChange: (id: T) => void;
	label: string;
	counts?: Partial<Record<T, number>>;
	size?: "lg" | "md";
}) {
	return (
		<div
			role="tablist"
			aria-label={label}
			className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:gap-3 sm:px-0 [&::-webkit-scrollbar]:hidden"
		>
			{tabs.map((t) => {
				const active = t.id === value;
				return (
					<button
						key={t.id}
						type="button"
						role="tab"
						aria-selected={active}
						id={`tab-${t.id}`}
						onClick={() => onChange(t.id)}
						className={cn(
							"relative shrink-0 px-2 pb-3 whitespace-nowrap transition-colors duration-200",
							size === "lg" ? "text-lg md:text-2xl" : "text-base md:text-lg",
							active ? "font-bold text-primary-500" : "text-white/60 hover:text-white",
						)}
					>
						{t.label}
						{counts?.[t.id] !== undefined && (
							<span
								className={cn(
									"ml-1.5 align-middle text-xs font-normal tabular-nums md:text-sm",
									active ? "text-primary-300" : "text-white/40",
								)}
							>
								{counts[t.id]}
							</span>
						)}
						<span
							aria-hidden
							className={cn(
								"absolute inset-x-0 -bottom-px h-0.5 origin-center rounded-full bg-primary-500 transition-transform duration-300 ease-(--ease-settle)",
								active ? "scale-x-100" : "scale-x-0",
							)}
						/>
					</button>
				);
			})}
		</div>
	);
}

/** Design: "Page 1 of 5  ‹ ›". */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
	if (pages <= 1) return null;
	return (
		<nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-6 text-lg md:mt-12">
			<p aria-live="polite">
				Page <span className="tabular-nums">{page}</span> of <span className="tabular-nums">{pages}</span>
			</p>
			<div className="flex items-center gap-2">
				{[
					{ d: -1, label: "Previous page", Icon: ChevronLeft, off: page <= 1 },
					{ d: 1, label: "Next page", Icon: ChevronRight, off: page >= pages },
				].map(({ d, label, Icon, off }) => (
					<button
						key={label}
						type="button"
						disabled={off}
						aria-label={label}
						onClick={() => onPage(page + d)}
						className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
					>
						<Icon className="size-6" />
					</button>
				))}
			</div>
		</nav>
	);
}

export function EmptyState({
	title,
	description,
	action,
	icon,
}: {
	title: string;
	description?: string;
	action?: ReactNode;
	icon?: ReactNode;
}) {
	return (
		<div className="animate-rise flex flex-col items-center px-6 py-14 text-center">
			<span className="flex size-14 items-center justify-center rounded-full bg-primary-500/10 text-primary-400">
				{icon ?? <Inbox className="size-6" aria-hidden />}
			</span>
			<p className="mt-4 font-display text-lg font-bold">{title}</p>
			{description && <p className="mt-1.5 max-w-[380px] text-sm leading-6 text-white/60">{description}</p>}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}

export function ErrorState({ message, onRetry, retrying }: { message: string; onRetry?: () => void; retrying?: boolean }) {
	return (
		<div
			role="alert"
			className="animate-rise flex flex-col items-center rounded-2xl border border-error-400/25 bg-error-400/5 px-6 py-12 text-center"
		>
			<span className="flex size-14 items-center justify-center rounded-full bg-error-400/10 text-error-300">
				<AlertTriangle className="size-6" aria-hidden />
			</span>
			<p className="mt-4 font-display text-lg font-bold">Something went wrong</p>
			<p className="mt-1.5 max-w-[420px] text-sm leading-6 text-white/65">{message}</p>
			{onRetry && (
				<Button variant="outline" className="mt-5 w-auto px-6" onClick={onRetry} isLoading={retrying} loadingLabel="Retrying">
					Try again
				</Button>
			)}
		</div>
	);
}

/** Placeholder rows while a table loads. */
export function RowsSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
	return (
		<div aria-hidden>
			{Array.from({ length: rows }, (_, r) => (
				<div key={r} className="flex items-center gap-6 border-t border-white/10 px-6 py-6 first:border-t-0">
					{Array.from({ length: cols }, (_, c) => (
						<span key={c} className="skeleton-shimmer block h-4 flex-1 rounded" style={{ maxWidth: c === 0 ? 220 : 140 }} />
					))}
				</div>
			))}
		</div>
	);
}

/** Designs "admin page 5" and "developer D1": round primary icon, big number, label. */
export function IconStat({
	i,
	icon,
	value,
	label,
	hint,
}: {
	i: number;
	icon: ReactNode;
	value?: number;
	label: string;
	hint?: string;
}) {
	return (
		<li
			data-reveal="up"
			style={{ "--d": i } as CSSProperties}
			title={hint}
			className="flex items-center gap-5 rounded-xl border border-white/15 px-5 py-6 md:px-6 md:py-8"
		>
			<span
				className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white md:size-[72px]"
				aria-hidden
			>
				{icon}
			</span>
			<div>
				<p className="font-display text-3xl leading-none font-bold md:text-[34px]">
					{value === undefined ? <span className="skeleton-shimmer inline-block h-8 w-14 rounded" /> : <CountUp value={value} />}
				</p>
				<p className="mt-1 text-lg md:text-xl">{label}</p>
				{hint && <p className="mt-0.5 text-xs text-white/45">{hint}</p>}
			</div>
		</li>
	);
}
