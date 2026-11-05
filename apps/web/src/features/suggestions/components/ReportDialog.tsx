"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { notify } from "@/lib/use-toast";
import { useRequireWallet } from "@/features/wallet/hooks";
import { useReport } from "@/features/suggestions/hooks";

/** Report a public suggestion (PRD §6.6). Reports go to the moderation queue; nothing is hidden automatically. */
const REASONS = ["Spam or scam", "Abusive or hateful", "Off-topic", "Misleading"];

export function ReportDialog({ suggestionId, onClose }: { suggestionId: string; onClose: () => void }) {
	const report = useReport();
	const requireWallet = useRequireWallet();
	const [reason, setReason] = useState(REASONS[0]!);
	const [detail, setDetail] = useState("");

	const send = () =>
		requireWallet(
			(wallet) =>
				report.mutate(
					{
						reporter: wallet,
						entity_type: "suggestion",
						entity_id: suggestionId,
						reason: detail.trim() ? `${reason}: ${detail.trim()}` : reason,
					},
					{
						onSuccess: () => {
							notify.success("Report sent", "A moderator will take a look.");
							onClose();
						},
					},
				),
			"Connect a wallet so moderators can tell reports apart. Your wallet isn’t shown publicly.",
		);

	return (
		<Dialog open onOpenChange={(o) => !o && !report.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[460px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">Report this suggestion</DialogTitle>
					<DialogDescription className="text-white/65">
						Tell the moderators what’s wrong. It stays up until they review it.
					</DialogDescription>
				</DialogHeader>
				<fieldset className="flex flex-col gap-2">
					<legend className="sr-only">Reason</legend>
					{REASONS.map((r) => (
						<label
							key={r}
							className={cn(
								"flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors",
								reason === r ? "border-primary-500 bg-primary-500/10" : "border-white/10 hover:border-white/25",
							)}
						>
							<input
								type="radio"
								name="report-reason"
								value={r}
								checked={reason === r}
								onChange={() => setReason(r)}
								className="accent-primary-500"
							/>
							{r}
						</label>
					))}
				</fieldset>
				<label className="block">
					<span className="mb-1.5 block text-sm text-white/70">Anything to add? (optional)</span>
					<textarea
						rows={3}
						maxLength={400}
						value={detail}
						onChange={(e) => setDetail(e.target.value)}
						className="w-full resize-y rounded-lg border border-white/20 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
					/>
				</label>
				{report.isError && <p className="text-sm text-error-200">{errorMessage(report.error)}</p>}
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" onClick={onClose} disabled={report.isPending}>
						Cancel
					</Button>
					<Button onClick={send} isLoading={report.isPending} loadingLabel="Sending report">
						Send report
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
