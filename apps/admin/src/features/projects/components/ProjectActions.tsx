"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
	Archive,
	CheckCircle2,
	ChevronDown,
	Eye,
	EyeOff,
	FileText,
	MessageSquareWarning,
	MoreHorizontal,
	SearchCheck,
	Star,
	StarOff,
	XCircle,
} from "lucide-react";
import { actionRequiresReason, availableActions, isPubliclyVisible } from "@repo/domain/project-status";
import type { ProjectAction, ProjectStatus } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { detailsByField, errorMessage, errorStatus } from "@/lib/api/errors";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { WEB_URL } from "@/lib/site";
import { useProjectAction } from "@/features/projects/hooks";
import { RejectProjectDialog, RejectionReasonDialog } from "@/features/projects/components/RejectionDialogs";

/**
 * The actions for one project: the table's "•••" and the detail page's "Action" button. Only actions that fit the
 * project's status are offered (the API answers 409 otherwise, e.g. when another admin acted first). Reject,
 * request changes and archive need a reason the builder sees; every action is audit-logged by the API.
 */

type ActionTarget = { id: string; title: string; status: ProjectStatus; published: boolean; featured: boolean; slug?: string | null };

const META: Record<ProjectAction, { label: string; icon: typeof CheckCircle2; tone?: string; done: string; group: "review" | "listing" | "other" }> = {
	start_review: { label: "Start review", icon: SearchCheck, done: "Marked as under review", group: "review" },
	approve: { label: "Approve and publish", icon: CheckCircle2, tone: "text-success-200", done: "Approved and published", group: "review" },
	request_changes: { label: "Request changes", icon: MessageSquareWarning, tone: "text-warning-200", done: "Changes requested", group: "review" },
	reject: { label: "Reject", icon: XCircle, tone: "text-error-200", done: "Project rejected", group: "review" },
	publish: { label: "Publish", icon: Eye, done: "Published", group: "listing" },
	unpublish: { label: "Unpublish (also unfeatures)", icon: EyeOff, done: "Hidden from the public", group: "listing" },
	feature: { label: "Feature on the homepage", icon: Star, done: "Featured", group: "listing" },
	unfeature: { label: "Remove from featured", icon: StarOff, done: "No longer featured", group: "listing" },
	archive: { label: "Archive (final)", icon: Archive, tone: "text-error-200", done: "Archived", group: "other" },
};

/** Actions that change a lot get a confirmation dialog; the small ones run straight away. */
const CONFIRM: ProjectAction[] = ["approve", "request_changes", "archive", "unpublish"];

export function ProjectActions({
	project,
	variant = "menu",
	showView = true,
}: {
	project: ActionTarget;
	variant?: "menu" | "button";
	showView?: boolean;
}) {
	const [dialog, setDialog] = useState<ProjectAction | null>(null);
	const [showReason, setShowReason] = useState(false);
	const act = useProjectAction();
	const actions = availableActions(project);
	const live = isPubliclyVisible(project);

	const run = (a: ProjectAction) => {
		if (a === "reject" || CONFIRM.includes(a)) return setDialog(a);
		act.mutate(
			{ id: project.id, action: a },
			{ onSuccess: () => notify.success(META[a].done, project.title), onError: (e) => notify.fromError(e) },
		);
	};

	const item = (key: string, icon: ReactNode, label: string, onSelect: () => void, tone?: string) => (
		<DropdownMenuItem
			key={key}
			onSelect={onSelect}
			className={cn("cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white", tone)}
		>
			{icon}
			{label}
		</DropdownMenuItem>
	);
	const group = (g: "review" | "listing" | "other", title: string, first: boolean) => {
		const list = actions.filter((a) => META[a].group === g);
		if (!list.length) return null;
		return (
			<>
				{!first && <DropdownMenuSeparator className="bg-white/10" />}
				<DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 text-xs font-normal tracking-wide text-white/45 uppercase">{title}</DropdownMenuLabel>
				{list.map((a) => {
					const Icon = META[a].icon;
					return item(a, <Icon className="size-4" />, META[a].label, () => run(a), META[a].tone);
				})}
			</>
		);
	};
	const hasReview = actions.some((a) => META[a].group === "review");
	const hasListing = actions.some((a) => META[a].group === "listing");

	return (
		<>
			<DropdownMenu modal={false}>
				{variant === "menu" ? (
					<DropdownMenuTrigger
						aria-label={`Actions for ${project.title}`}
						className="inline-flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 data-[state=open]:bg-white/10"
					>
						<MoreHorizontal className="size-7" />
					</DropdownMenuTrigger>
				) : (
					<DropdownMenuTrigger asChild>
						<Button
							className="group h-12 w-full gap-2 text-base sm:w-[280px] lg:w-[320px]"
							isLoading={act.isPending}
							loadingLabel="Saving"
						>
							Action
							<ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
						</Button>
					</DropdownMenuTrigger>
				)}
				<DropdownMenuContent
					align="end"
					sideOffset={6}
					className="w-64 rounded-xl border-white/10 bg-[#131318] p-1.5 text-white shadow-xl shadow-black/40"
				>
					{group("review", "Review", true)}
					{group("listing", "Listing", !hasReview)}
					{group("other", "Other", !hasReview && !hasListing)}
					{actions.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
					{(project.status === "rejected" || project.status === "changes_requested" || project.status === "archived") &&
						item(
							"reason",
							<FileText className="size-4 text-white/60" />,
							project.status === "changes_requested" ? "View requested changes" : "View the reason",
							() => setShowReason(true),
						)}
					{showView && (
						<DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white">
							<Link href={routes.project(project.id)}>
								<Eye className="size-4 text-white/60" /> View details
							</Link>
						</DropdownMenuItem>
					)}
					{live && project.slug && (
						<DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white">
							<a href={`${WEB_URL}/projects/${project.slug}`} target="_blank" rel="noopener noreferrer">
								<Eye className="size-4 text-white/60" /> Open public page
							</a>
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>

			{dialog === "reject" ? (
				<RejectProjectDialog project={project} onClose={() => setDialog(null)} />
			) : (
				dialog && <ActionDialog key={dialog} project={project} action={dialog} onClose={() => setDialog(null)} />
			)}
			{showReason && <RejectionReasonDialog projectId={project.id} onClose={() => setShowReason(false)} />}
		</>
	);
}

const COPY: Partial<Record<ProjectAction, { title: (t: string) => string; body: string; cta: string; placeholder?: string }>> = {
	approve: {
		title: (t) => `Approve ${t}?`,
		body: "It’s published straight away (a public link is set on first approval) and can receive contributions. The builder is notified.",
		cta: "Approve and publish",
	},
	request_changes: {
		title: () => "Request changes",
		body: "The builder can edit and resubmit. They see your reason in their notifications and on the project.",
		cta: "Send request",
		placeholder: "What needs to change before approval.",
	},
	archive: {
		title: (t) => `Archive ${t}?`,
		body: "Archiving is final: the project leaves the platform. The builder sees your reason.",
		cta: "Archive project",
		placeholder: "Why the project is being archived.",
	},
	unpublish: {
		title: (t) => `Unpublish ${t}?`,
		body: "It disappears from public lists and its page (and is unfeatured). You can publish it again later.",
		cta: "Unpublish",
	},
};

function ActionDialog({ project, action: a, onClose }: { project: ActionTarget; action: ProjectAction; onClose: () => void }) {
	const save = useProjectAction();
	const needsReason = actionRequiresReason(a);
	const [reason, setReason] = useState("");
	const [note, setNote] = useState("");
	const [touched, setTouched] = useState(false);
	const reasonError = needsReason && touched && !reason.trim() ? "Write a reason the builder will see." : null;
	const serverReason = save.isError ? detailsByField(save.error).reason : undefined;
	const c = COPY[a] ?? { title: () => META[a].label, body: "", cta: META[a].label };

	const submit = () => {
		setTouched(true);
		if (needsReason && !reason.trim()) return;
		save.mutate(
			{ id: project.id, action: a, reason: reason.trim() || undefined, internalNote: note.trim() || undefined },
			{
				onSuccess: () => {
					notify.success(META[a].done, project.title);
					onClose();
				},
			},
		);
	};

	return (
		<Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">{c.title(project.title)}</DialogTitle>
					{c.body && <DialogDescription className="text-white/65">{c.body}</DialogDescription>}
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<div>
						<label htmlFor="action-reason" className="mb-2 block text-sm">
							{needsReason ? (
								<>
									Reason for the builder <span className="text-error-200">*</span>
								</>
							) : (
								<>
									Note for the builder <span className="text-white/45">(optional)</span>
								</>
							)}
						</label>
						<textarea
							id="action-reason"
							autoFocus={needsReason}
							rows={needsReason ? 4 : 2}
							maxLength={2000}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							onBlur={() => setTouched(true)}
							aria-invalid={!!(reasonError || serverReason)}
							placeholder={c.placeholder}
							className={cn(
								"w-full resize-y rounded-lg border bg-transparent px-3.5 py-3 text-[15px] leading-6 outline-none placeholder:text-white/35 focus:ring-2 focus:ring-primary-500/30",
								reasonError || serverReason ? "border-error-300" : "border-white/30 focus:border-primary-500",
							)}
						/>
						{(reasonError || serverReason) && <p className="animate-rise mt-1.5 text-sm text-error-200">{reasonError ?? serverReason}</p>}
					</div>
					<div>
						<label htmlFor="action-note" className="mb-2 block text-sm">
							Internal note <span className="text-white/45">(optional, admins only)</span>
						</label>
						<textarea
							id="action-note"
							rows={2}
							maxLength={2000}
							value={note}
							onChange={(e) => setNote(e.target.value)}
							className="w-full resize-y rounded-lg border border-white/20 bg-transparent px-3.5 py-3 text-[15px] leading-6 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
						/>
					</div>
					{save.isError && !serverReason && (
						<p className="rounded-lg border border-error-400/30 bg-error-400/10 px-3.5 py-2.5 text-sm text-error-100">
							{errorStatus(save.error) === 409 ? `${errorMessage(save.error)} Reload to see its current status.` : errorMessage(save.error)}
						</p>
					)}
				</div>
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" className="w-auto px-5" onClick={onClose} disabled={save.isPending}>
						Cancel
					</Button>
					<Button
						variant={a === "archive" ? "destructive" : "default"}
						className="w-auto px-5"
						onClick={submit}
						isLoading={save.isPending}
						loadingLabel="Saving"
					>
						{c.cta}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
