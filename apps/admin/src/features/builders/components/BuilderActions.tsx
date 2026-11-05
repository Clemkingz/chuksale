"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Copy, Eye, Mail, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import type { AdminBuilder } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage } from "@/lib/api/errors";
import { notify } from "@/lib/notify";
import { useBuilderStatus } from "@/features/builders/hooks";

/**
 * A builder's actions: the D1 table's "•••" and D2's "Action" button. Suspending needs a reason (audit log) and
 * stops the builder signing in; their public projects stay listed (D24). Reactivating is one click.
 */

type Builder = Pick<AdminBuilder, "id" | "name" | "email" | "status" | "wallet_address">;

const itemClass = "cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white";

export function BuilderActions({
	builder,
	variant = "menu",
	showView = true,
}: {
	builder: Builder;
	variant?: "menu" | "button";
	showView?: boolean;
}) {
	const [suspending, setSuspending] = useState(false);
	const status = useBuilderStatus();
	const suspended = builder.status === "suspended";

	return (
		<>
			<DropdownMenu modal={false}>
				{variant === "menu" ? (
					<DropdownMenuTrigger
						aria-label={`Actions for ${builder.name}`}
						className="inline-flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 data-[state=open]:bg-white/10"
					>
						<MoreHorizontal className="size-7" />
					</DropdownMenuTrigger>
				) : (
					<DropdownMenuTrigger asChild>
						<Button
							className="group h-12 w-full gap-2 text-base sm:w-[280px] lg:w-[320px]"
							isLoading={status.isPending}
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
					className="w-56 rounded-xl border-white/10 bg-[#131318] p-1.5 text-white shadow-xl shadow-black/40"
				>
					{showView && (
						<DropdownMenuItem asChild className={itemClass}>
							<Link href={`/builders/${builder.id}`}>
								<Eye className="size-4 text-white/60" /> View profile
							</Link>
						</DropdownMenuItem>
					)}
					<DropdownMenuItem asChild className={itemClass}>
						<a href={`mailto:${builder.email}`}>
							<Mail className="size-4 text-white/60" /> Email builder
						</a>
					</DropdownMenuItem>
					{builder.wallet_address && (
						<DropdownMenuItem
							className={itemClass}
							onSelect={async () => {
								try {
									await navigator.clipboard.writeText(builder.wallet_address!);
									notify.success("Address copied");
								} catch {
									notify.error("Couldn’t copy");
								}
							}}
						>
							<Copy className="size-4 text-white/60" /> Copy wallet address
						</DropdownMenuItem>
					)}
					<DropdownMenuSeparator className="bg-white/10" />
					{suspended ? (
						<DropdownMenuItem
							className={cn(itemClass, "text-success-200")}
							onSelect={() =>
								status.mutate(
									{ id: builder.id, status: "active" },
									{ onSuccess: () => notify.success("Builder reactivated", builder.name), onError: (e) => notify.fromError(e) },
								)
							}
						>
							<UserCheck className="size-4" /> Reactivate
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem className={cn(itemClass, "text-error-200")} onSelect={() => setSuspending(true)}>
							<UserX className="size-4" /> Suspend builder
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{suspending && <SuspendDialog builder={builder} onClose={() => setSuspending(false)} />}
		</>
	);
}

function SuspendDialog({ builder, onClose }: { builder: Builder; onClose: () => void }) {
	const status = useBuilderStatus();
	const [reason, setReason] = useState("");
	const [touched, setTouched] = useState(false);
	const tooShort = touched && reason.trim().length < 10;

	return (
		<Dialog open onOpenChange={(o) => !o && !status.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">Suspend {builder.name}?</DialogTitle>
					<DialogDescription className="text-white/65">
						They won’t be able to sign in or submit projects. Their public projects stay listed. You can reactivate them any time.
					</DialogDescription>
				</DialogHeader>
				<div>
					<label htmlFor="suspend-reason" className="mb-2 block text-sm">
						Reason <span className="text-white/45">(kept in the audit log)</span>
					</label>
					<textarea
						id="suspend-reason"
						autoFocus
						rows={3}
						maxLength={500}
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						onBlur={() => setTouched(true)}
						aria-invalid={tooShort}
						className={cn(
							"w-full resize-y rounded-lg border bg-transparent px-3.5 py-3 text-[15px] leading-6 outline-none focus:ring-2 focus:ring-primary-500/30",
							tooShort ? "border-error-300" : "border-white/30 focus:border-primary-500",
						)}
					/>
					{tooShort && <p className="animate-rise mt-1.5 text-sm text-error-200">Write at least 10 characters.</p>}
					{status.isError && <p className="mt-2 text-sm text-error-200">{errorMessage(status.error)}</p>}
				</div>
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" onClick={onClose} disabled={status.isPending}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						isLoading={status.isPending}
						loadingLabel="Suspending"
						onClick={() => {
							setTouched(true);
							if (reason.trim().length < 10) return;
							status.mutate(
								{ id: builder.id, status: "suspended", reason: reason.trim() },
								{
									onSuccess: () => {
										notify.success("Builder suspended", builder.name);
										onClose();
									},
								},
							);
						}}
					>
						Suspend builder
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
