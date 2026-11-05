"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BellOff, CheckCheck, LogOut } from "lucide-react";
import type { Me } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { detailsByField, errorMessage, errorStatus } from "@/lib/api/errors";
import { fullDate, timeAgo } from "@/lib/format";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/Avatar";
import { Field, FormError } from "@/components/forms/Field";
import { EmptyState, ErrorState, PageTitle, Pager, RowsSkeleton, UnderlineTabs } from "@/components/ui";
import { useMe } from "@/features/auth/hooks";
import {
	INBOX_PAGE,
	useChangePassword,
	useInbox,
	useInboxUnread,
	useMarkAllRead,
	useMarkRead,
	useSignOutEverywhere,
	useUpdateName,
} from "@/features/account/hooks";

/**
 * Settings (designs "admin page 6–8"), tailored to the API: Profile (admins can change their name; the email is
 * their sign-in), Security (change password, sign out everywhere) and Notifications (the admin's in-app inbox).
 */

type Tab = "profile" | "security" | "notifications";

export function AccountSettingsView() {
	const me = useMe();
	const unread = useInboxUnread();
	const [tab, setTab] = useState<Tab>("profile");
	return (
		<div className="admin-container max-w-[960px] pt-2 md:pt-6">
			<PageTitle>Settings</PageTitle>
			<div className="mt-6">
				<UnderlineTabs
					label="Settings"
					size="md"
					tabs={[
						{ id: "profile", label: "Profile" },
						{ id: "security", label: "Security" },
						{ id: "notifications", label: "Notifications" },
					]}
					counts={{ notifications: unread.data || undefined }}
					value={tab}
					onChange={setTab}
				/>
			</div>
			<div className="mt-7">
				{me.isError ? (
					<ErrorState message={errorMessage(me.error)} onRetry={() => void me.refetch()} retrying={me.isFetching} />
				) : !me.data ? (
					<div className="admin-card">
						<RowsSkeleton rows={3} cols={2} />
					</div>
				) : tab === "profile" ? (
					<Profile me={me.data} />
				) : tab === "security" ? (
					<Security />
				) : (
					<Inbox />
				)}
			</div>
		</div>
	);
}

function Card({ title, children, reveal = 0 }: { title: string; children: ReactNode; reveal?: number }) {
	return (
		<section data-reveal="up" style={{ "--d": reveal } as CSSProperties} className="admin-card px-5 py-6 md:px-7">
			<h2 className="font-display text-xl font-bold">{title}</h2>
			<div className="mt-5">{children}</div>
		</section>
	);
}

function Profile({ me }: { me: Me }) {
	const save = useUpdateName();
	const [name, setName] = useState(me.name);
	const tooShort = !name.trim() || name.trim().length > 100;
	return (
		<div className="flex flex-col gap-6">
			<section className="admin-card flex items-center gap-5 px-5 py-6 md:px-7">
				<Avatar name={me.name} className="size-16 text-xl" />
				<div className="min-w-0">
					<p className="truncate font-display text-2xl font-bold">{me.name}</p>
					<p className="truncate text-white/70">{me.email}</p>
					<p className="mt-0.5 text-xs text-white/45">Admin since {fullDate(me.createdAt)}</p>
				</div>
			</section>
			<Card title="Your name" reveal={1}>
				<form
					noValidate
					onSubmit={(e) => {
						e.preventDefault();
						if (tooShort || name.trim() === me.name) return;
						save.mutate(name.trim(), { onSuccess: () => notify.success("Name updated") });
					}}
					className="flex flex-col gap-4 sm:flex-row sm:items-end"
				>
					<div className="flex-1">
						<Field
							label="Name (shown in the audit log and on review decisions)"
							value={name}
							maxLength={100}
							onChange={(e) => setName(e.target.value)}
							error={save.isError ? (detailsByField(save.error).name ?? errorMessage(save.error)) : name && tooShort ? "Use 1–100 characters." : undefined}
						/>
					</div>
					<Button type="submit" className="h-12 w-auto px-6" disabled={tooShort || name.trim() === me.name} isLoading={save.isPending} loadingLabel="Saving">
						Save
					</Button>
				</form>
				<p className="mt-3 text-sm text-white/50">Your email is your sign-in and can’t be changed here.</p>
			</Card>
		</div>
	);
}

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, "Enter your current password."),
		newPassword: z.string().min(8, "Use at least 8 characters.").max(128, "Use 128 characters or fewer."),
		confirm: z.string().min(1, "Confirm the new password."),
	})
	.refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don’t match." });

function Security() {
	const router = useRouter();
	const change = useChangePassword();
	const everywhere = useSignOutEverywhere();
	const form = useForm<z.infer<typeof passwordSchema>>({
		resolver: zodResolver(passwordSchema),
		defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
		mode: "onTouched",
	});
	const { errors } = form.formState;
	return (
		<div className="flex flex-col gap-6">
			<Card title="Change password">
				<form
					noValidate
					onSubmit={form.handleSubmit((v) =>
						change.mutate(
							{ currentPassword: v.currentPassword, newPassword: v.newPassword },
							{
								onSuccess: () => {
									notify.success("Password changed", "Other devices were signed out; you’re still signed in here.");
									form.reset();
								},
								onError: (e) => {
									const byField = detailsByField(e);
									if (byField.newPassword) form.setError("newPassword", { message: byField.newPassword });
									else if (errorStatus(e) === 400) form.setError("currentPassword", { message: errorMessage(e) }, { shouldFocus: true });
								},
							},
						),
					)}
					className="flex max-w-[520px] flex-col gap-4"
				>
					<Field label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register("currentPassword")} />
					<Field label="New password" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...form.register("newPassword")} />
					<Field label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...form.register("confirm")} />
					<FormError message={change.isError && errorStatus(change.error) !== 400 ? errorMessage(change.error) : null} />
					<Button type="submit" className="h-12 w-auto self-start px-6" isLoading={change.isPending} loadingLabel="Changing password">
						Change password
					</Button>
				</form>
			</Card>
			<Card title="Sessions" reveal={1}>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-white/70">Lost a device? Sign out of the console everywhere, including here.</p>
					<Button
						variant="outline"
						className="h-11 w-auto shrink-0 gap-2 border-error-400/40 px-5 text-error-200 hover:bg-error-400/10"
						isLoading={everywhere.isPending}
						loadingLabel="Signing out"
						onClick={() =>
							everywhere.mutate(undefined, {
								onSuccess: () => {
									notify.info("Signed out everywhere");
									router.replace(routes.signIn);
								},
								onError: (e) => notify.fromError(e),
							})
						}
					>
						<LogOut className="size-4" /> Sign out everywhere
					</Button>
				</div>
			</Card>
		</div>
	);
}

function Inbox() {
	const [page, setPage] = useState(1);
	const q = useInbox(page);
	const unread = useInboxUnread();
	const read = useMarkRead();
	const all = useMarkAllRead();
	const d = q.data;
	const pages = d ? Math.max(1, Math.ceil(d.paginationMeta.totalCount / INBOX_PAGE)) : 1;
	return (
		<section className="admin-card overflow-hidden">
			<div className="flex items-center justify-between gap-3 px-5 py-5 md:px-7">
				<h2 className="font-display text-xl font-bold">Notifications</h2>
				{!!unread.data && (
					<Button variant="ghost" size="sm" className="w-auto gap-1.5 px-3" isLoading={all.isPending} loadingLabel="Marking read" onClick={() => all.mutate()}>
						<CheckCheck className="size-4" /> Mark all read
					</Button>
				)}
			</div>
			{q.isPending ? (
				<RowsSkeleton rows={4} cols={2} />
			) : q.isError && !d ? (
				<div className="p-4">
					<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
				</div>
			) : d && d.result.length === 0 ? (
				<EmptyState icon={<BellOff className="size-6" aria-hidden />} title="No notifications" description="When a builder submits a project, you’re told here." />
			) : d ? (
				<ul>
					{d.result.map((n) => (
						<li key={n.id} className={cn("border-t border-white/10", !n.readAt && "bg-primary-500/[0.05]")}>
							<Link
								href={n.projectId ? routes.project(n.projectId) : routes.overview}
								onClick={() => !n.readAt && read.mutate(n.id)}
								className="flex gap-3 px-5 py-4 hover:bg-white/[0.03] md:px-7"
							>
								<span className={cn("mt-2 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-primary-500")} aria-hidden />
								<span className="min-w-0 flex-1">
									<span className={cn("block", !n.readAt && "font-medium")}>{n.title}</span>
									{n.body && <span className="mt-1 block text-sm whitespace-pre-line text-white/65">{n.body}</span>}
									<span className="mt-1 block text-xs text-white/45">{timeAgo(n.createdAt)}</span>
								</span>
							</Link>
						</li>
					))}
				</ul>
			) : null}
			{pages > 1 && (
				<div className="px-5 pb-5">
					<Pager page={page} pages={pages} onPage={setPage} />
				</div>
			)}
		</section>
	);
}
