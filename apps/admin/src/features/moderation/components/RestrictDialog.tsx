"use client";

import { useState } from "react";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { detailsByField, errorMessage } from "@/lib/api/errors";
import { notify } from "@/lib/notify";
import { useRestrictWallet } from "@/features/moderation/hooks";

const G_ADDRESS = /^G[A-Z2-7]{55}$/;

/** Restrict a wallet from suggesting and reporting (never contributing), for some days or until lifted. */
export function RestrictDialog({ address: fixed, onClose }: { address?: string; onClose: () => void }) {
	const restrict = useRestrictWallet();
	const [address, setAddress] = useState(fixed ?? "");
	const [reason, setReason] = useState("");
	const [days, setDays] = useState("");
	const [touched, setTouched] = useState(false);
	const errs = restrict.isError ? detailsByField(restrict.error) : {};
	const addrError = touched && !G_ADDRESS.test(address.trim()) ? "Enter a Stellar address (56 characters, starts with G)." : undefined;
	const reasonError = touched && !reason.trim() ? "Write a reason." : errs.reason;
	const daysError = touched && days && !(Number.isInteger(Number(days)) && Number(days) > 0) ? "Use a whole number of days." : errs.days;

	return (
		<Dialog open onOpenChange={(o) => !o && !restrict.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">Restrict a wallet</DialogTitle>
					<DialogDescription className="text-white/65">
						It can’t send suggestions or reports while restricted (it gets a 403 with your reason and the end date). Contributions are
						never blocked.
					</DialogDescription>
				</DialogHeader>
				<form
					noValidate
					onSubmit={(e) => {
						e.preventDefault();
						setTouched(true);
						if (!G_ADDRESS.test(address.trim()) || !reason.trim() || (days && !(Number(days) > 0))) return;
						restrict.mutate(
							{ address: address.trim(), reason: reason.trim(), days: days ? Number(days) : undefined },
							{
								onSuccess: () => {
									notify.success("Wallet restricted");
									onClose();
								},
							},
						);
					}}
					className="flex flex-col gap-4"
				>
					{!fixed && (
						<label className="block">
							<span className="mb-1.5 block text-sm">Wallet address</span>
							<input
								value={address}
								onChange={(e) => setAddress(e.target.value.trim().toUpperCase())}
								spellCheck={false}
								placeholder="G…"
								className={cn(
									"h-11 w-full rounded-lg border bg-transparent px-3.5 font-mono text-sm outline-none focus:border-primary-500",
									addrError ? "border-error-300" : "border-white/25",
								)}
							/>
							{addrError && <span className="mt-1 block text-sm text-error-200">{addrError}</span>}
						</label>
					)}
					<label className="block">
						<span className="mb-1.5 block text-sm">Reason</span>
						<textarea
							rows={3}
							maxLength={500}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							className={cn(
								"w-full resize-y rounded-lg border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-primary-500",
								reasonError ? "border-error-300" : "border-white/25",
							)}
						/>
						{reasonError && <span className="mt-1 block text-sm text-error-200">{reasonError}</span>}
					</label>
					<label className="block">
						<span className="mb-1.5 block text-sm">
							Days <span className="text-white/45">(leave empty for “until lifted”)</span>
						</span>
						<input
							inputMode="numeric"
							value={days}
							onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))}
							className={cn(
								"h-11 w-32 rounded-lg border bg-transparent px-3.5 text-sm outline-none focus:border-primary-500",
								daysError ? "border-error-300" : "border-white/25",
							)}
						/>
						{daysError && <span className="mt-1 block text-sm text-error-200">{daysError}</span>}
					</label>
					{restrict.isError && !errs.reason && !errs.days && <p className="text-sm text-error-200">{errorMessage(restrict.error)}</p>}
					<DialogFooter className="gap-2 sm:gap-2">
						<Button type="button" variant="ghost" className="w-auto px-5" onClick={onClose} disabled={restrict.isPending}>
							Cancel
						</Button>
						<Button type="submit" variant="destructive" className="w-auto px-5" isLoading={restrict.isPending} loadingLabel="Restricting">
							Restrict wallet
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
