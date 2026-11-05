"use client";

import { useState } from "react";
import { CheckCircle2, EyeOff, XCircle } from "lucide-react";
import type { SuggestionStatus } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { notify } from "@/lib/notify";
import { useModerate } from "@/features/moderation/hooks";

/** Publish / Hide / Reject. Hiding or rejecting needs a short reason (audit log); publishing notifies the wallet. */
export function ModerationActions({
	id,
	title,
	status,
	compact,
}: {
	id: string;
	title: string;
	status: SuggestionStatus;
	compact?: boolean;
}) {
	const moderate = useModerate();
	const [dialog, setDialog] = useState<"hide" | "reject" | null>(null);
	const publish = () =>
		moderate.mutate(
			{ id, action: "publish" },
			{ onSuccess: () => notify.success("Published", title), onError: (e) => notify.fromError(e) },
		);
	return (
		<div className={cn("flex flex-wrap gap-2", compact && "justify-end")}>
			{status !== "published" && (
				<Button
					size="sm"
					className="h-9 gap-1.5"
					onClick={publish}
					isLoading={moderate.isPending && !dialog}
					loadingLabel="Publishing"
				>
					<CheckCircle2 className="size-4" /> Publish
				</Button>
			)}
			{status === "published" && (
				<Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => setDialog("hide")}>
					<EyeOff className="size-4" /> Hide
				</Button>
			)}
			{status !== "rejected" && status !== "published" && (
				<Button
					size="sm"
					variant="outline"
					className="h-9 gap-1.5 border-error-400/40 text-error-200 hover:bg-error-400/10"
					onClick={() => setDialog("reject")}
				>
					<XCircle className="size-4" /> Reject
				</Button>
			)}
			{dialog && <ReasonDialog id={id} action={dialog} title={title} onClose={() => setDialog(null)} />}
		</div>
	);
}

function ReasonDialog({
	id,
	action,
	title,
	onClose,
}: {
	id: string;
	action: "hide" | "reject";
	title: string;
	onClose: () => void;
}) {
	const moderate = useModerate();
	const [reason, setReason] = useState("");
	const short = reason.trim().length < 5;
	return (
		<Dialog open onOpenChange={(o) => !o && !moderate.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[460px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">
						{action === "hide" ? "Hide this suggestion?" : "Reject this suggestion?"}
					</DialogTitle>
					<DialogDescription className="text-white/65">
						“{title}” {action === "hide" ? "will be removed from the project page." : "won’t be published."} The reason is kept in
						the audit log and shown to the sender.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-wrap gap-2">
					{["Spam or scam", "Off-topic", "Abusive", "Duplicate"].map((r) => (
						<button
							key={r}
							type="button"
							onClick={() => setReason(r)}
							className={cn(
								"h-8 rounded-full border px-3 text-xs",
								reason === r ? "border-primary-500 bg-primary-500/15" : "border-white/15 text-white/70 hover:border-white/30",
							)}
						>
							{r}
						</button>
					))}
				</div>
				<textarea
					autoFocus
					rows={3}
					maxLength={300}
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					placeholder="Reason"
					aria-label="Reason"
					className="w-full resize-y rounded-lg border border-white/25 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
				/>
				{moderate.isError && <p className="text-sm text-error-200">{errorMessage(moderate.error)}</p>}
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" onClick={onClose} disabled={moderate.isPending}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						disabled={short}
						isLoading={moderate.isPending}
						loadingLabel="Saving"
						onClick={() =>
							moderate.mutate(
								{ id, action, reason: reason.trim() },
								{
									onSuccess: () => {
										notify.success(action === "hide" ? "Hidden" : "Rejected", title);
										onClose();
									},
								},
							)
						}
					>
						{action === "hide" ? "Hide" : "Reject"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
