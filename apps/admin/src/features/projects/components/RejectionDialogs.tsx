"use client";

import { useState } from "react";
import { Bell, CircleX, Lock, MessageSquareWarning } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { errorData, errorMessage } from "@/lib/api/errors";
import { fullDate, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { useAdminProject, useDecision } from "@/features/projects/hooks";

/**
 * Rejecting a project (FR-REV-03): pick why (one or more common reasons) and/or write it, add an optional internal
 * note, and see exactly what lands in the builder's notification bar before sending. The reason is required.
 * `RejectionReasonDialog` shows it again later (for rejected or changes-requested projects).
 */

const COMMON_REASONS = [
	"The description is too vague to review.",
	"We couldn’t verify the team or partners.",
	"Token sales, presales or profit promises aren’t allowed.",
	"It’s a duplicate of another listed project.",
	"The Stellar address doesn’t look like the project’s own.",
	"It’s outside what Chucksales supports.",
];

export function RejectProjectDialog({ project, onClose }: { project: { id: string; title: string }; onClose: () => void }) {
	const save = useDecision();
	const [picked, setPicked] = useState<string[]>([]);
	const [details, setDetails] = useState("");
	const [note, setNote] = useState("");
	const [touched, setTouched] = useState(false);
	const reason = [...picked, details.trim()].filter(Boolean).join(" ");
	const tooShort = reason.length < 10;
	const serverError = errorData(save.error)?.field === "reason" ? errorMessage(save.error) : null;

	const toggle = (r: string) => setPicked((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
	const send = () => {
		setTouched(true);
		if (tooShort) return;
		save.mutate(
			{ id: project.id, decision: "reject", reason, internal_note: note.trim() || undefined },
			{
				onSuccess: () => {
					notify.success("Project rejected", `${project.title}: the builder has been notified with your reason.`);
					onClose();
				},
			},
		);
	};

	return (
		<Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
			<DialogContent className="max-h-[92dvh] overflow-y-auto border-white/10 bg-[#11131C] text-white sm:max-w-[600px]">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-error-400/15 text-error-200">
							<CircleX className="size-5" aria-hidden />
						</span>
						<div className="min-w-0 text-left">
							<DialogTitle className="truncate font-display text-xl">Reject {project.title}?</DialogTitle>
							<DialogDescription className="text-white/60">
								It won’t be listed. The builder sees your reason in their notifications.
							</DialogDescription>
						</div>
					</div>
				</DialogHeader>

				<fieldset>
					<legend className="mb-2.5 text-sm">
						Why is it being rejected? <span className="text-error-200">*</span>
					</legend>
					<div className="flex flex-col gap-2">
						{COMMON_REASONS.map((r) => (
							<label
								key={r}
								className={cn(
									"flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors",
									picked.includes(r) ? "border-error-300/60 bg-error-400/[0.08]" : "border-white/10 hover:border-white/25",
								)}
							>
								<input
									type="checkbox"
									checked={picked.includes(r)}
									onChange={() => toggle(r)}
									className="mt-0.5 size-4 accent-primary-500"
								/>
								{r}
							</label>
						))}
					</div>
				</fieldset>

				<div>
					<label htmlFor="reject-details" className="mb-2 block text-sm">
						Details for the builder{" "}
						{picked.length ? <span className="text-white/45">(optional)</span> : <span className="text-error-200">*</span>}
					</label>
					<textarea
						id="reject-details"
						rows={3}
						maxLength={800}
						value={details}
						onChange={(e) => setDetails(e.target.value)}
						onBlur={() => setTouched(true)}
						placeholder="What would need to be different for a future submission?"
						aria-invalid={touched && tooShort}
						className={cn(
							"w-full resize-y rounded-lg border bg-transparent px-3.5 py-3 text-[15px] leading-6 outline-none placeholder:text-white/35 focus:ring-2 focus:ring-primary-500/30",
							touched && tooShort ? "border-error-300" : "border-white/30 focus:border-primary-500",
						)}
					/>
					{((touched && tooShort) || serverError) && (
						<p className="animate-rise mt-1.5 text-sm text-error-200">
							{serverError ?? "Pick a reason or write at least 10 characters."}
						</p>
					)}
				</div>

				<div>
					<label htmlFor="reject-note" className="mb-2 flex items-center gap-1.5 text-sm">
						<Lock className="size-3.5 text-white/50" aria-hidden /> Internal note{" "}
						<span className="text-white/45">(admins only, optional)</span>
					</label>
					<textarea
						id="reject-note"
						rows={2}
						maxLength={800}
						value={note}
						onChange={(e) => setNote(e.target.value)}
						className="w-full resize-y rounded-lg border border-white/20 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
					/>
				</div>

				{/* Exactly what the builder's notification bar will show. */}
				<section
					aria-label="Preview of the builder's notification"
					className="rounded-xl border border-dashed border-white/15 p-3"
				>
					<p className="mb-2 flex items-center gap-1.5 text-xs text-white/50">
						<Bell className="size-3.5" aria-hidden /> The builder will see
					</p>
					<div className="flex gap-3 rounded-lg bg-[#1A1B24] px-3.5 py-3">
						<span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-500" aria-hidden />
						<div className="min-w-0">
							<p className="text-sm font-medium">{project.title} was rejected</p>
							<p
								className={cn(
									"mt-1.5 rounded-md border-l-2 border-error-300 bg-error-400/[0.08] px-2.5 py-1.5 text-[13px] leading-5 break-words",
									reason ? "text-white/85" : "text-white/35 italic",
								)}
							>
								{reason ? `“${reason}”` : "Your reason appears here."}
							</p>
							<p className="mt-1.5 text-xs text-white/45">See why · just now</p>
						</div>
					</div>
				</section>

				{save.isError && !serverError && (
					<p className="rounded-lg border border-error-400/30 bg-error-400/10 px-3.5 py-2.5 text-sm text-error-100">
						{errorMessage(save.error)}
					</p>
				)}
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" className="w-auto px-5" onClick={onClose} disabled={save.isPending}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						className="w-auto px-5"
						onClick={send}
						isLoading={save.isPending}
						loadingLabel="Rejecting"
					>
						Reject and notify builder
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** Why a project was rejected (or what changes were asked for): the reason the builder saw, who decided, when. */
export function RejectionReasonDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
	const q = useAdminProject(projectId);
	const p = q.data;
	const review = p?.reviews.find((r) => r.decision === (p.status === "changes_requested" ? "request_changes" : "reject"));
	const rejected = p?.status !== "changes_requested";
	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[520px]">
				<DialogHeader>
					<div className="flex items-center gap-3">
						<span
							className={cn(
								"flex size-11 shrink-0 items-center justify-center rounded-xl",
								rejected ? "bg-error-400/15 text-error-200" : "bg-warning-400/15 text-warning-200",
							)}
						>
							{rejected ? <CircleX className="size-5" aria-hidden /> : <MessageSquareWarning className="size-5" aria-hidden />}
						</span>
						<div className="min-w-0 text-left">
							<DialogTitle className="font-display text-xl">{rejected ? "Why it was rejected" : "Changes requested"}</DialogTitle>
							<DialogDescription className="truncate text-white/60">{p?.title ?? " "}</DialogDescription>
						</div>
					</div>
				</DialogHeader>
				{q.isPending ? (
					<span className="skeleton-shimmer block h-28 rounded-xl" aria-hidden />
				) : q.isError ? (
					<p className="text-sm text-error-200">{errorMessage(q.error)}</p>
				) : !review ? (
					<p className="text-sm text-white/60">No reason was recorded for this decision.</p>
				) : (
					<div className="flex flex-col gap-4">
						<div>
							<p className="text-xs text-white/50">Reason shared with the builder</p>
							<p
								className={cn(
									"mt-1.5 rounded-lg border-l-2 px-3.5 py-3 leading-7 break-words",
									rejected ? "border-error-300 bg-error-400/[0.08]" : "border-warning-300 bg-warning-400/[0.07]",
								)}
							>
								“{review.reason}”
							</p>
						</div>
						{review.internal_note && (
							<div>
								<p className="flex items-center gap-1.5 text-xs text-white/50">
									<Lock className="size-3" aria-hidden /> Internal note (admins only)
								</p>
								<p className="mt-1.5 text-sm leading-6 text-white/75">{review.internal_note}</p>
							</div>
						)}
						<dl className="grid grid-cols-2 gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-sm">
							<div>
								<dt className="text-xs text-white/50">Decided by</dt>
								<dd className="mt-0.5">{review.admin_name}</dd>
							</div>
							<div>
								<dt className="text-xs text-white/50">When</dt>
								<dd className="mt-0.5" title={fullDate(review.created_at)}>
									{timeAgo(review.created_at)}
								</dd>
							</div>
						</dl>
						<p className="flex items-center gap-2 text-xs text-white/55">
							<Bell className="size-3.5 text-primary-300" aria-hidden /> Sent to {p?.builder.name}’s notification bar.
						</p>
					</div>
				)}
				<DialogFooter>
					<Button variant="outline" className="w-auto px-6" onClick={onClose}>
						Close
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
