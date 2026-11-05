"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
	CheckCircle2,
	ChevronDown,
	Copy,
	Eye,
	EyeOff,
	MessageSquareWarning,
	MoreHorizontal,
	SearchCheck,
	Star,
	StarOff,
	XCircle,
} from "lucide-react";
import { adminDecisions, isPubliclyVisible } from "@repo/domain/project-status";
import type { AdminProjectListItem, ReviewDecision } from "@repo/domain/types";
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
import { errorData, errorMessage } from "@/lib/api/errors";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { useDecision, useFeature, useVisibility } from "@/features/projects/hooks";

/**
 * The review actions for one project: the table's "•••" (admin pages 2–3) and the detail page's "Action" button
 * (page 4). Only decisions the state machine allows are offered. Reject and Request changes need a reason the
 * builder will see (FR-REV-03); every action is audit-logged by the API.
 */

type Project = Pick<AdminProjectListItem, "id" | "title" | "slug" | "status" | "visibility" | "featured" | "destination_address">;

const DECISION: Record<ReviewDecision, { label: string; icon: typeof CheckCircle2; tone?: string; done: string }> = {
	under_review: { label: "Start review", icon: SearchCheck, done: "Marked as under review" },
	approve: { label: "Approve and publish", icon: CheckCircle2, tone: "text-success-200", done: "Approved and published" },
	request_changes: { label: "Request changes", icon: MessageSquareWarning, tone: "text-warning-200", done: "Changes requested" },
	reject: { label: "Reject", icon: XCircle, tone: "text-error-200", done: "Project rejected" },
};

const PUBLIC_WEB = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export function ProjectActions({
	project,
	variant = "menu",
	showView = true,
}: {
	project: Project;
	variant?: "menu" | "button";
	showView?: boolean;
}) {
	const [dialog, setDialog] = useState<ReviewDecision | null>(null);
	const decision = useDecision();
	const visibility = useVisibility();
	const feature = useFeature();
	const decisions = adminDecisions(project.status);
	const live = isPubliclyVisible(project);

	const decide = (d: ReviewDecision) => {
		// Start review needs no confirmation; the others open the dialog.
		if (d !== "under_review") return setDialog(d);
		decision.mutate(
			{ id: project.id, decision: d },
			{ onSuccess: () => notify.success(DECISION[d].done, project.title), onError: (e) => notify.fromError(e) },
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
							isLoading={decision.isPending}
							loadingLabel="Saving decision"
						>
							Action
							<ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
						</Button>
					</DropdownMenuTrigger>
				)}
				<DropdownMenuContent
					align="end"
					sideOffset={6}
					className="w-60 rounded-xl border-white/10 bg-[#131318] p-1.5 text-white shadow-xl shadow-black/40"
				>
					{decisions.length > 0 && (
						<>
							<DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 text-xs font-normal tracking-wide text-white/45 uppercase">
								Review
							</DropdownMenuLabel>
							{decisions.map((d) => {
								const Icon = DECISION[d].icon;
								return item(d, <Icon className="size-4" />, DECISION[d].label, () => decide(d), DECISION[d].tone);
							})}
						</>
					)}
					{project.status === "approved" && (
						<>
							{decisions.length > 0 && <DropdownMenuSeparator className="bg-white/10" />}
							<DropdownMenuLabel className="px-2.5 pt-1.5 pb-1 text-xs font-normal tracking-wide text-white/45 uppercase">
								Listing
							</DropdownMenuLabel>
							{item(
								"visibility",
								live ? <EyeOff className="size-4" /> : <Eye className="size-4" />,
								live ? "Unpublish" : "Publish",
								() =>
									visibility.mutate(
										{ id: project.id, visibility: live ? "unpublished" : "published" },
										{
											onSuccess: () => notify.success(live ? "Hidden from the public" : "Published", project.title),
											onError: (e) => notify.fromError(e),
										},
									),
							)}
							{live &&
								item(
									"feature",
									project.featured ? <StarOff className="size-4" /> : <Star className="size-4" />,
									project.featured ? "Remove from featured" : "Feature on the homepage",
									() =>
										feature.mutate(
											{ id: project.id, featured: !project.featured },
											{
												onSuccess: () => notify.success(project.featured ? "No longer featured" : "Featured", project.title),
												onError: (e) => notify.fromError(e),
											},
										),
								)}
						</>
					)}
					<DropdownMenuSeparator className="bg-white/10" />
					{showView && (
						<DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white">
							<Link href={routes.project(project.id)}>
								<Eye className="size-4 text-white/60" /> View details
							</Link>
						</DropdownMenuItem>
					)}
					{live && (
						<DropdownMenuItem asChild className="cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white">
							<a href={`${PUBLIC_WEB}/projects/${project.slug}`} target="_blank" rel="noopener noreferrer">
								<Eye className="size-4 text-white/60" /> Open public page
							</a>
						</DropdownMenuItem>
					)}
					{project.destination_address &&
						item("copy", <Copy className="size-4 text-white/60" />, "Copy wallet address", async () => {
							try {
								await navigator.clipboard.writeText(project.destination_address!);
								notify.success("Address copied");
							} catch {
								notify.error("Couldn’t copy", "Select the address and copy it manually.");
							}
						})}
				</DropdownMenuContent>
			</DropdownMenu>

			{dialog && <DecisionDialog key={dialog} project={project} decision={dialog} onClose={() => setDialog(null)} />}
		</>
	);
}

function DecisionDialog({ project, decision: d, onClose }: { project: Project; decision: ReviewDecision; onClose: () => void }) {
	const save = useDecision();
	const needsReason = d === "reject" || d === "request_changes";
	const [reason, setReason] = useState("");
	const [note, setNote] = useState("");
	const [touched, setTouched] = useState(false);
	const reasonError =
		needsReason && touched && reason.trim().length < 10 ? "Write at least 10 characters so the builder knows what to do." : null;

	const copy: Record<ReviewDecision, { title: string; body: string; cta: string }> = {
		under_review: { title: "", body: "", cta: "" },
		approve: {
			title: `Approve ${project.title}?`,
			body: "It goes public straight away and can receive contributions. The builder is notified.",
			cta: "Approve and publish",
		},
		request_changes: {
			title: "Request changes",
			body: "The builder can edit and resubmit. They’ll see your reason on their dashboard.",
			cta: "Send request",
		},
		reject: {
			title: `Reject ${project.title}?`,
			body: "The project won’t be listed. The builder sees your reason. This can’t be undone from the console.",
			cta: "Reject project",
		},
	};
	const c = copy[d];

	const submit = () => {
		setTouched(true);
		if (needsReason && reason.trim().length < 10) return;
		save.mutate(
			{ id: project.id, decision: d, reason: reason.trim() || undefined, internal_note: note.trim() || undefined },
			{
				onSuccess: () => {
					notify.success(DECISION[d].done, project.title);
					onClose();
				},
			},
		);
	};

	const serverReason = errorData(save.error)?.field === "reason" ? errorMessage(save.error) : null;

	return (
		<Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">{c.title}</DialogTitle>
					<DialogDescription className="text-white/65">{c.body}</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					{needsReason && (
						<div>
							<label htmlFor="decision-reason" className="mb-2 block text-sm">
								Reason for the builder <span className="text-error-200">*</span>
							</label>
							<textarea
								id="decision-reason"
								autoFocus
								rows={4}
								maxLength={1000}
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								onBlur={() => setTouched(true)}
								aria-invalid={!!(reasonError || serverReason)}
								placeholder={d === "reject" ? "Why this project can’t be listed." : "What needs to change before approval."}
								className={cn(
									"w-full resize-y rounded-lg border bg-transparent px-3.5 py-3 text-[15px] leading-6 outline-none placeholder:text-white/35 focus:ring-2 focus:ring-primary-500/30",
									reasonError || serverReason ? "border-error-300" : "border-white/30 focus:border-primary-500",
								)}
							/>
							{(reasonError || serverReason) && (
								<p className="animate-rise mt-1.5 text-sm text-error-200">{reasonError ?? serverReason}</p>
							)}
						</div>
					)}
					<div>
						<label htmlFor="decision-note" className="mb-2 block text-sm">
							Internal note <span className="text-white/45">(optional, admins only)</span>
						</label>
						<textarea
							id="decision-note"
							rows={2}
							maxLength={1000}
							value={note}
							onChange={(e) => setNote(e.target.value)}
							className="w-full resize-y rounded-lg border border-white/20 bg-transparent px-3.5 py-3 text-[15px] leading-6 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
						/>
					</div>
					{save.isError && !serverReason && (
						<p className="rounded-lg border border-error-400/30 bg-error-400/10 px-3.5 py-2.5 text-sm text-error-100">
							{errorMessage(save.error)}
						</p>
					)}
				</div>
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" onClick={onClose} disabled={save.isPending}>
						Cancel
					</Button>
					<Button
						variant={d === "reject" ? "destructive" : "default"}
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
