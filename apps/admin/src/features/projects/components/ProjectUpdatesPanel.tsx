"use client";

import { useState } from "react";
import { EyeOff, Megaphone } from "lucide-react";
import type { ProjectUpdate } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { detailsByField, errorMessage, errorStatus } from "@/lib/api/errors";
import { fullDate, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { EmptyState, ErrorState } from "@/components/ui";
import { useAdminProjectUpdates, useRemoveUpdate } from "@/features/projects/hooks";

/**
 * The builder's updates on an approved project (`GET /admin/projects/{id}/updates`), removed ones included. Remove
 * hides one from the public; the reason goes to the builder (notification and their updates list). Plain text only.
 */
export function ProjectUpdatesPanel({ projectId }: { projectId: string }) {
	const q = useAdminProjectUpdates(projectId);
	const [removing, setRemoving] = useState<ProjectUpdate | null>(null);
	const items = q.data?.result ?? [];

	return (
		<section data-reveal="up" aria-labelledby="updates-title" className="mt-10">
			<h2 id="updates-title" className="flex items-center gap-2 font-display text-xl font-bold">
				<Megaphone className="size-5 text-primary-300" aria-hidden /> Updates
				{q.data && <span className="text-sm font-normal text-white/45 tabular-nums">{q.data.paginationMeta.totalCount}</span>}
			</h2>
			<div className="mt-4">
				{q.isPending ? (
					<span aria-hidden className="skeleton-shimmer block h-28 rounded-2xl" />
				) : q.isError ? (
					<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
				) : items.length === 0 ? (
					<EmptyState title="No updates yet" description="Updates the builder posts appear here and on the public page." />
				) : (
					<ul className="flex flex-col gap-3">
						{items.map((u) => {
							const removed = u.status === "removed";
							return (
								<li key={u.id} className={cn("admin-card px-5 py-4", removed && "border-error-400/25 bg-error-400/[0.04]")}>
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0">
											<p className="flex flex-wrap items-center gap-x-2 text-xs text-white/50">
												<span title={fullDate(u.createdAt)}>{timeAgo(u.createdAt)}</span>
												{u.updatedAt !== u.createdAt && !removed && <span>· edited</span>}
												{removed && (
													<span className="inline-flex items-center gap-1 rounded-full bg-error-400/15 px-2 py-0.5 text-error-100">
														<EyeOff className="size-3" aria-hidden /> Removed {u.removedAt ? timeAgo(u.removedAt) : ""}
													</span>
												)}
											</p>
											<h3 className={cn("mt-1 font-display text-lg font-bold break-words", removed && "text-white/60")}>
												{u.title}
											</h3>
										</div>
										{!removed && (
											<Button
												variant="outline"
												size="sm"
												className="h-9 w-auto shrink-0 px-3.5 text-error-200"
												onClick={() => setRemoving(u)}
											>
												Remove
											</Button>
										)}
									</div>
									{removed && u.removalReason && (
										<p className="mt-2 rounded-lg border-l-2 border-error-300 bg-error-400/[0.08] px-3 py-2 text-sm whitespace-pre-line text-white/85">
											<span className="font-medium">Reason sent to the builder: </span>
											{u.removalReason}
										</p>
									)}
									<p
										className={cn("mt-2 leading-7 break-words whitespace-pre-line", removed ? "text-white/50" : "text-white/80")}
									>
										{u.body}
									</p>
									{u.imageUrl && (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={u.imageUrl} alt="" className="mt-3 max-h-[260px] rounded-xl object-cover" />
									)}
								</li>
							);
						})}
					</ul>
				)}
			</div>
			{removing && <RemoveDialog projectId={projectId} update={removing} onClose={() => setRemoving(null)} />}
		</section>
	);
}

const COMMON = [
	"Updates should report progress on the project.",
	"Giveaways and off-platform promotions aren’t allowed.",
	"It contains misleading claims about funds or results.",
	"It shares someone’s personal information.",
];

function RemoveDialog({ projectId, update: u, onClose }: { projectId: string; update: ProjectUpdate; onClose: () => void }) {
	const remove = useRemoveUpdate(projectId);
	const [reason, setReason] = useState("");
	const trimmed = reason.trim();
	const fieldError = remove.isError ? detailsByField(remove.error).reason : undefined;
	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="border-white/10 bg-[#131318] text-white sm:max-w-[520px]">
				<DialogHeader>
					<DialogTitle>Remove this update?</DialogTitle>
					<DialogDescription className="text-white/60">
						“{u.title}” is hidden from the public page. The builder sees your reason and is notified.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-wrap gap-2">
					{COMMON.map((c) => (
						<button
							key={c}
							type="button"
							onClick={() => setReason((r) => (r.trim() ? `${r.trim()} ${c}` : c))}
							className="rounded-full border border-white/15 px-3 py-1.5 text-left text-xs text-white/80 hover:border-primary-400"
						>
							{c}
						</button>
					))}
				</div>
				<label className="block">
					<span className="mb-2 block text-sm">Reason for the builder (5–1000 characters)</span>
					<textarea
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						maxLength={1000}
						rows={4}
						className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-sm leading-6 focus:border-primary-400 focus:outline-none"
					/>
				</label>
				{(fieldError || remove.isError) && (
					<p role="alert" className="text-sm text-error-200">
						{fieldError ?? (errorStatus(remove.error) === 409 ? "Another admin already removed it." : errorMessage(remove.error))}
					</p>
				)}
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" className="sm:w-auto" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						className="sm:w-auto"
						disabled={trimmed.length < 5}
						isLoading={remove.isPending}
						loadingLabel="Removing"
						onClick={() =>
							remove.mutate(
								{ id: u.id, reason: trimmed },
								{
									onSuccess: () => {
										notify.success("Update removed", "The builder was notified with your reason.");
										onClose();
									},
								},
							)
						}
					>
						Remove update
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
