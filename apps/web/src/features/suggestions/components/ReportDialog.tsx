"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { REPORT_REASON_LABEL } from "@repo/domain/labels";
import type { ReportReason } from "@repo/domain/types";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { notify } from "@/lib/use-toast";
import { useRequireWallet } from "@/features/wallet/hooks";
import { useReport } from "@/features/suggestions/hooks";

/**
 * Report a public suggestion or project. Reports go to the moderation queue; nothing is hidden automatically.
 * One report per wallet per item (a second gets 409: "Already reported").
 */
const REASONS = Object.entries(REPORT_REASON_LABEL) as [ReportReason, string][];

export type ReportTarget = { kind: "suggestion"; id: string } | { kind: "project"; slug: string };

export function ReportDialog({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
	const report = useReport();
	const requireWallet = useRequireWallet();
	const [reason, setReason] = useState<ReportReason>("spam");
	const [detail, setDetail] = useState("");
	const noun = target.kind === "suggestion" ? "suggestion" : "project";

	const send = () =>
		requireWallet(
			() =>
				report.mutate(
					{ target, input: { reason, ...(detail.trim() ? { details: detail.trim() } : {}) } },
					{
						onSuccess: () => {
							notify.success("Report sent", "A moderator will take a look.");
							onClose();
						},
						onError: (e) => {
							if (errorStatus(e) === 409) {
								notify.info("Already reported", `You’ve already reported this ${noun}.`);
								onClose();
							}
						},
					},
				),
			"Connect a wallet so moderators can tell reports apart. Your wallet isn’t shown publicly.",
		);

	return (
		<Dialog open onOpenChange={(o) => !o && !report.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[460px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">Report this {noun}</DialogTitle>
					<DialogDescription className="text-white/65">
						Tell the moderators what’s wrong. It stays up until they review it.
					</DialogDescription>
				</DialogHeader>
				<fieldset className="flex flex-col gap-2">
					<legend className="sr-only">Reason</legend>
					{REASONS.map(([r, label]) => (
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
							{label}
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
				{report.isError && errorStatus(report.error) !== 409 && <p className="text-sm text-error-200">{errorMessage(report.error)}</p>}
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" className="w-auto px-5" onClick={onClose} disabled={report.isPending}>
						Cancel
					</Button>
					<Button className="w-auto px-5" onClick={send} isLoading={report.isPending} loadingLabel="Sending report">
						Send report
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
