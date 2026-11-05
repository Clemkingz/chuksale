"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Ban, Flag } from "lucide-react";
import { REPORT_REASON_LABEL, REPORT_STATUS_LABEL, SUGGESTION_STATUS_LABEL, SUGGESTION_TYPE_LABEL } from "@repo/domain/labels";
import type { Report, ReportStatus, SuggestionStatus } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { fullDate, shortKey, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton, UnderlineTabs } from "@/components/ui";
import {
	MOD_PAGE,
	useAdminSuggestions,
	useCloseReport,
	useLiftRestriction,
	useReports,
	useRestrictions,
	useSuggestionCount,
} from "@/features/moderation/hooks";
import { ModerationActions } from "@/features/moderation/components/ModerationActions";
import { RestrictDialog } from "@/features/moderation/components/RestrictDialog";

/**
 * /suggestions (backend guide, "Admin moderation"): three queues. Suggestions (pending first; "Reported only"
 * shows those with open reports), Reports (suggestions and projects; act on a project first, then close its
 * report), and Wallet restrictions (block a wallet from suggesting and reporting, never from contributing).
 */

export const SUGGESTION_TONE: Record<SuggestionStatus, string> = {
	pending: "bg-warning-400/15 text-warning-100",
	published: "bg-success-400/15 text-success-100",
	hidden: "bg-white/10 text-white/60",
	rejected: "bg-error-400/15 text-error-100",
};

type Section = "suggestions" | "reports" | "restrictions";
const SECTIONS: { id: Section; label: string }[] = [
	{ id: "suggestions", label: "Suggestions" },
	{ id: "reports", label: "Reports" },
	{ id: "restrictions", label: "Wallet restrictions" },
];

export function ModerationView() {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const t = params.get("tab");
	const section: Section = t === "reports" || t === "restrictions" ? t : "suggestions";
	const pending = useSuggestionCount({ status: "pending" });
	const open = useReports({ status: "open", entityType: "", page: 1 });

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Moderation</PageTitle>
			<p className="mt-2 text-white/60">New suggestions stay private until approved. Titles and bodies are shown as plain text.</p>
			<div className="mt-6">
				<UnderlineTabs
					label="Moderation"
					tabs={SECTIONS}
					value={section}
					counts={{ suggestions: pending.data, reports: open.data?.paginationMeta.totalCount }}
					onChange={(s) => router.replace(s === "suggestions" ? pathname : `${pathname}?tab=${s}`, { scroll: false })}
				/>
			</div>
			{section === "suggestions" && <SuggestionsQueue />}
			{section === "reports" && <ReportsQueue />}
			{section === "restrictions" && <Restrictions />}
		</div>
	);
}

const STATUS_TABS: { id: SuggestionStatus; label: string }[] = [
	{ id: "pending", label: "Pending" },
	{ id: "published", label: "Published" },
	{ id: "hidden", label: "Hidden" },
	{ id: "rejected", label: "Rejected" },
];

function SuggestionsQueue() {
	const [status, setStatus] = useState<SuggestionStatus>("pending");
	const [reported, setReported] = useState(false);
	const [page, setPage] = useState(1);
	const q = useAdminSuggestions({ status, reported, page });
	const d = q.data;
	const pages = d ? Math.max(1, Math.ceil(d.paginationMeta.totalCount / MOD_PAGE)) : 1;
	return (
		<>
			<div className="mt-6 flex flex-wrap items-center gap-2">
				{STATUS_TABS.map((s) => (
					<Chip
						key={s.id}
						on={status === s.id}
						onClick={() => {
							setStatus(s.id);
							setPage(1);
						}}
					>
						{s.label}
					</Chip>
				))}
				<span className="mx-1 h-6 w-px bg-white/15" aria-hidden />
				<Chip
					on={reported}
					onClick={() => {
						setReported((v) => !v);
						setPage(1);
					}}
				>
					<Flag className="size-3.5" /> Reported only
				</Chip>
			</div>
			<div className={cn("mt-6 transition-opacity", q.isPlaceholderData && "opacity-60")}>
				{q.isPending ? (
					<div className="admin-card">
						<RowsSkeleton rows={4} cols={3} />
					</div>
				) : q.isError && !d ? (
					<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
				) : d && d.result.length === 0 ? (
					<div className="admin-card">
						<EmptyState
							title={status === "pending" && !reported ? "Queue is clear" : "Nothing here"}
							description={status === "pending" && !reported ? "New suggestions will show up here." : undefined}
						/>
					</div>
				) : d ? (
					<ul className="flex flex-col gap-4">
						{d.result.map((s, i) => (
							<li key={s.id} data-reveal="up" style={{ "--d": i } as CSSProperties} className="admin-card px-5 py-5 md:px-6">
								<div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
									<div className="min-w-0">
										<div className="flex flex-wrap items-center gap-2 text-xs">
											<span className={cn("rounded-full px-2.5 py-0.5", SUGGESTION_TONE[s.status])}>{SUGGESTION_STATUS_LABEL[s.status]}</span>
											<span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-white/70">{SUGGESTION_TYPE_LABEL[s.type]}</span>
											{s.openReportCount > 0 && (
												<span className="inline-flex items-center gap-1 rounded-full bg-error-400/15 px-2.5 py-0.5 text-error-100">
													<Flag className="size-3" /> {s.openReportCount} open report{s.openReportCount === 1 ? "" : "s"}
												</span>
											)}
										</div>
										<Link href={routes.suggestion(s.id)} className="mt-2 block font-display text-lg font-bold break-words hover:text-primary-300">
											{s.title}
										</Link>
										<p className="mt-1 line-clamp-2 text-[15px] leading-6 break-words whitespace-pre-line text-white/75">{s.body}</p>
										<p className="mt-2 text-xs text-white/45">
											On <span className="text-white/70">{s.project.title}</span> ·{" "}
											<Link href={routes.contributor(s.walletAddress)} className="hover:text-primary-300">
												{shortKey(s.walletAddress, 5, 5)}
											</Link>{" "}
											· {timeAgo(s.createdAt)}
										</p>
									</div>
									<ModerationActions id={s.id} title={s.title} status={s.status} compact />
								</div>
							</li>
						))}
					</ul>
				) : null}
			</div>
			{pages > 1 && <Pager page={page} pages={pages} onPage={setPage} />}
		</>
	);
}

function ReportsQueue() {
	const [status, setStatus] = useState<ReportStatus>("open");
	const [entityType, setEntityType] = useState<"" | "suggestion" | "project">("");
	const [page, setPage] = useState(1);
	const [closing, setClosing] = useState<Report | null>(null);
	const q = useReports({ status, entityType, page });
	const d = q.data;
	const pages = d ? Math.max(1, Math.ceil(d.paginationMeta.totalCount / MOD_PAGE)) : 1;
	return (
		<>
			<div className="mt-6 flex flex-wrap items-center gap-2">
				{(["open", "resolved", "dismissed"] as ReportStatus[]).map((s) => (
					<Chip
						key={s}
						on={status === s}
						onClick={() => {
							setStatus(s);
							setPage(1);
						}}
					>
						{REPORT_STATUS_LABEL[s]}
					</Chip>
				))}
				<span className="mx-1 h-6 w-px bg-white/15" aria-hidden />
				{(
					[
						["", "All"],
						["suggestion", "Suggestions"],
						["project", "Projects"],
					] as const
				).map(([v, l]) => (
					<Chip
						key={v || "all"}
						on={entityType === v}
						onClick={() => {
							setEntityType(v);
							setPage(1);
						}}
					>
						{l}
					</Chip>
				))}
			</div>
			<section className={cn("admin-card mt-6 overflow-hidden transition-opacity", q.isPlaceholderData && "opacity-60")}>
				{q.isPending ? (
					<RowsSkeleton rows={5} cols={4} />
				) : q.isError && !d ? (
					<div className="p-4">
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
					</div>
				) : d && d.result.length === 0 ? (
					<EmptyState title={status === "open" ? "No open reports" : "Nothing here"} />
				) : d ? (
					<ul>
						{d.result.map((r) => (
							<li key={r.id} className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 first:border-0 md:flex-row md:items-start md:justify-between md:px-6">
								<div className="min-w-0">
									<p className="text-xs text-white/50">
										{r.entityType === "project" ? "Project" : "Suggestion"} · {REPORT_REASON_LABEL[r.reason]} ·{" "}
										<span title={fullDate(r.createdAt)}>{timeAgo(r.createdAt)}</span>
									</p>
									<Link
										href={r.entityType === "project" ? routes.project(r.entityId) : routes.suggestion(r.entityId)}
										className="mt-1 block truncate font-medium hover:text-primary-300"
									>
										{r.entityTitle ?? "(untitled)"}
									</Link>
									{r.details && <p className="mt-1 text-sm whitespace-pre-line text-white/75">{r.details}</p>}
									<p className="mt-1 text-xs text-white/45">
										Reported by{" "}
										<Link href={routes.contributor(r.reporterAddress)} className="font-mono hover:text-primary-300">
											{shortKey(r.reporterAddress, 5, 5)}
										</Link>
										{r.status !== "open" && (
											<>
												{" "}
												· {REPORT_STATUS_LABEL[r.status]}
												{r.resolvedAt ? ` ${timeAgo(r.resolvedAt)}` : ""}
												{r.resolutionNote ? `: ${r.resolutionNote}` : ""}
											</>
										)}
									</p>
								</div>
								{r.status === "open" && (
									<Button variant="outline" size="sm" className="h-9 w-auto shrink-0 px-4" onClick={() => setClosing(r)}>
										Close report
									</Button>
								)}
							</li>
						))}
					</ul>
				) : null}
			</section>
			{pages > 1 && <Pager page={page} pages={pages} onPage={setPage} />}
			{closing && <CloseReportDialog report={closing} onClose={() => setClosing(null)} />}
		</>
	);
}

function CloseReportDialog({ report, onClose }: { report: Report; onClose: () => void }) {
	const close = useCloseReport();
	const [outcome, setOutcome] = useState<"resolved" | "dismissed">("resolved");
	const [note, setNote] = useState("");
	return (
		<Dialog open onOpenChange={(o) => !o && !close.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">Close this report</DialogTitle>
					<DialogDescription className="text-white/65">
						{report.entityType === "project"
							? "Act on the project first (its Action menu), then close the report here."
							: "Approving, rejecting or hiding the suggestion closes its open reports automatically."}
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-2">
					{(
						[
							["resolved", "Resolved", "Something was done about it"],
							["dismissed", "Dismissed", "Nothing needed doing"],
						] as const
					).map(([v, l, hint]) => (
						<label
							key={v}
							className={cn(
								"cursor-pointer rounded-lg border px-3.5 py-2.5 text-sm",
								outcome === v ? "border-primary-500 bg-primary-500/10" : "border-white/15 hover:border-white/30",
							)}
						>
							<input type="radio" name="outcome" className="sr-only" checked={outcome === v} onChange={() => setOutcome(v)} />
							<span className="block font-medium">{l}</span>
							<span className="text-xs text-white/55">{hint}</span>
						</label>
					))}
				</div>
				<textarea
					rows={2}
					maxLength={500}
					value={note}
					onChange={(e) => setNote(e.target.value)}
					placeholder="Note (optional)"
					aria-label="Note (optional)"
					className="w-full resize-y rounded-lg border border-white/25 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-primary-500"
				/>
				{close.isError && <p className="text-sm text-error-200">{errorMessage(close.error)}</p>}
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" className="w-auto px-5" onClick={onClose} disabled={close.isPending}>
						Cancel
					</Button>
					<Button
						className="w-auto px-5"
						isLoading={close.isPending}
						loadingLabel="Closing"
						onClick={() =>
							close.mutate(
								{ id: report.id, outcome, note: note.trim() || undefined },
								{
									onSuccess: () => {
										notify.success(`Report ${outcome}`);
										onClose();
									},
								},
							)
						}
					>
						Close report
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Restrictions() {
	const q = useRestrictions();
	const lift = useLiftRestriction();
	const [adding, setAdding] = useState(false);
	return (
		<>
			<div className="mt-6 flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-white/60">Restricted wallets can’t suggest or report. They can still contribute.</p>
				<Button className="h-10 w-auto gap-2 px-4" onClick={() => setAdding(true)}>
					<Ban className="size-4" /> Restrict a wallet
				</Button>
			</div>
			<section className="admin-card mt-5 overflow-hidden">
				{q.isPending ? (
					<RowsSkeleton rows={3} cols={3} />
				) : q.isError ? (
					<div className="p-4">
						<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} retrying={q.isFetching} />
					</div>
				) : q.data.length === 0 ? (
					<EmptyState title="No restricted wallets" />
				) : (
					<ul>
						{q.data.map((r) => (
							<li key={r.address} className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 first:border-0 sm:flex-row sm:items-center sm:justify-between md:px-6">
								<div className="min-w-0">
									<Link href={routes.contributor(r.address)} className="block truncate font-mono text-sm hover:text-primary-300" title={r.address}>
										{shortKey(r.address, 10, 8)}
									</Link>
									<p className="mt-0.5 text-sm whitespace-pre-line text-white/75">{r.reason}</p>
									<p className="mt-0.5 text-xs text-white/45">
										{r.until ? `Until ${fullDate(r.until)}` : "Until lifted"} · added {timeAgo(r.createdAt)}
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="h-9 w-auto shrink-0 px-4"
									isLoading={lift.isPending && lift.variables === r.address}
									loadingLabel="Lifting"
									onClick={() =>
										lift.mutate(r.address, {
											onSuccess: () => notify.success("Restriction lifted", shortKey(r.address)),
											onError: (e) => notify.fromError(e),
										})
									}
								>
									Lift
								</Button>
							</li>
						))}
					</ul>
				)}
			</section>
			{adding && <RestrictDialog onClose={() => setAdding(false)} />}
		</>
	);
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			aria-pressed={on}
			onClick={onClick}
			className={cn(
				"inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
				on ? "border-primary-500 bg-primary-500 text-white" : "border-white/15 text-white/70 hover:text-white",
			)}
		>
			{children}
		</button>
	);
}
