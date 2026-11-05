"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Copy, Eye, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import type { UserSummary } from "@repo/domain/types";
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
import { detailsByField, errorMessage } from "@/lib/api/errors";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { useRestoreUser, useSuspendUser } from "@/features/builders/hooks";

/**
 * An account's actions: the table's "•••" and the detail page's "Action" button. Suspending needs a reason
 * (audit-logged) and signs them out everywhere; restoring is one click.
 */

type User = Pick<UserSummary, "id" | "name" | "email" | "suspended">;

const itemClass = "cursor-pointer gap-2.5 rounded-lg p-2.5 focus:bg-white/[0.06] focus:text-white";

export function BuilderActions({ builder: u, variant = "menu", showView = true }: { builder: User; variant?: "menu" | "button"; showView?: boolean }) {
	const [suspending, setSuspending] = useState(false);
	const restore = useRestoreUser();

	return (
		<>
			<DropdownMenu modal={false}>
				{variant === "menu" ? (
					<DropdownMenuTrigger
						aria-label={`Actions for ${u.name}`}
						className="inline-flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-white/10 data-[state=open]:bg-white/10"
					>
						<MoreHorizontal className="size-7" />
					</DropdownMenuTrigger>
				) : (
					<DropdownMenuTrigger asChild>
						<Button className="group h-12 w-full gap-2 text-base sm:w-[260px]" isLoading={restore.isPending} loadingLabel="Saving">
							Action
							<ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
						</Button>
					</DropdownMenuTrigger>
				)}
				<DropdownMenuContent align="end" sideOffset={6} className="w-56 rounded-xl border-white/10 bg-[#131318] p-1.5 text-white shadow-xl">
					{showView && (
						<DropdownMenuItem asChild className={itemClass}>
							<Link href={routes.builder(u.id)}>
								<Eye className="size-4 text-white/60" /> View account
							</Link>
						</DropdownMenuItem>
					)}
					<DropdownMenuItem
						className={itemClass}
						onSelect={async () => {
							try {
								await navigator.clipboard.writeText(u.email);
								notify.success("Email copied");
							} catch {
								notify.error("Couldn’t copy", "Select it and copy it manually.");
							}
						}}
					>
						<Copy className="size-4 text-white/60" /> Copy email
					</DropdownMenuItem>
					<DropdownMenuSeparator className="bg-white/10" />
					{u.suspended ? (
						<DropdownMenuItem
							className={cn(itemClass, "text-success-200")}
							onSelect={() =>
								restore.mutate(u.id, {
									onSuccess: () => notify.success("Account restored", `${u.name} can sign in again.`),
									onError: (e) => notify.fromError(e),
								})
							}
						>
							<UserCheck className="size-4" /> Restore account
						</DropdownMenuItem>
					) : (
						<DropdownMenuItem className={cn(itemClass, "text-error-200")} onSelect={() => setSuspending(true)}>
							<UserX className="size-4" /> Suspend account
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{suspending && <SuspendDialog user={u} onClose={() => setSuspending(false)} />}
		</>
	);
}

function SuspendDialog({ user, onClose }: { user: User; onClose: () => void }) {
	const suspend = useSuspendUser();
	const [reason, setReason] = useState("");
	const [touched, setTouched] = useState(false);
	const tooShort = reason.trim().length < 3;
	const serverError = suspend.isError ? (detailsByField(suspend.error).reason ?? null) : null;
	return (
		<Dialog open onOpenChange={(o) => !o && !suspend.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">Suspend {user.name}?</DialogTitle>
					<DialogDescription className="text-white/65">
						They’re signed out everywhere and can’t sign in until restored. Their projects disappear from public lists.
					</DialogDescription>
				</DialogHeader>
				<label htmlFor="suspend-reason" className="block text-sm">
					Reason <span className="text-error-200">*</span> <span className="text-white/45">(3–500 characters, recorded in the audit log)</span>
				</label>
				<textarea
					id="suspend-reason"
					rows={3}
					maxLength={500}
					autoFocus
					value={reason}
					onChange={(e) => setReason(e.target.value)}
					onBlur={() => setTouched(true)}
					className={cn(
						"w-full resize-y rounded-lg border bg-transparent px-3.5 py-3 text-[15px] outline-none focus:ring-2 focus:ring-primary-500/30",
						(touched && tooShort) || serverError ? "border-error-300" : "border-white/30 focus:border-primary-500",
					)}
				/>
				{((touched && tooShort) || serverError) && <p className="text-sm text-error-200">{serverError ?? "Write at least 3 characters."}</p>}
				{suspend.isError && !serverError && <p className="text-sm text-error-200">{errorMessage(suspend.error)}</p>}
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" className="w-auto px-5" onClick={onClose} disabled={suspend.isPending}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						className="w-auto px-5"
						isLoading={suspend.isPending}
						loadingLabel="Suspending"
						onClick={() => {
							setTouched(true);
							if (tooShort) return;
							suspend.mutate(
								{ id: user.id, reason: reason.trim() },
								{
									onSuccess: () => {
										notify.success("Account suspended", user.name);
										onClose();
									},
								},
							);
						}}
					>
						Suspend account
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
