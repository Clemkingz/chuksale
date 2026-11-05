"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Check, Loader2, PenLine, ShieldCheck } from "lucide-react";
import type { AdminAccount, AdminNotificationPrefs } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { errorData, errorMessage } from "@/lib/api/errors";
import { toAvatar, IMAGE_TYPES } from "@/lib/image";
import { notify } from "@/lib/notify";
import { routes } from "@/lib/routes";
import { Avatar } from "@/components/Avatar";
import { Field, FormError } from "@/components/forms/Field";
import { ErrorState, PageTitle, Pager, UnderlineTabs } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import {
	useAdminAccount,
	useAdminNotifications,
	useChangePassword,
	useDeleteAccount,
	useUpdateAccount,
	useUpdateNotificationPrefs,
	type AccountPatch,
} from "@/features/account/hooks";
import { useAdminSession } from "@/features/auth/session";

/**
 * Designs "admin page 6–8": Account settings with My profile / Security / Notification and a red
 * "Delete account". My profile shows read-only cards (page 6); "Edit" opens the form with Personal information /
 * Address sub-tabs (page 7). Security has Change password and Delete account (page 8). Tailored to the PRD:
 * the design's Tax ID is left out (an admin console has no use for it); the sign-in email isn't editable here.
 */

type Tab = "profile" | "security" | "notifications";
type Section = "personal" | "address";

export function AccountSettingsView() {
	const account = useAdminAccount();
	const [tab, setTab] = useState<Tab>("profile");
	const [editing, setEditing] = useState<Section | null>(null);
	const [deleting, setDeleting] = useState(false);
	const a = account.data;

	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>Account settings</PageTitle>
			<div className="mt-5 flex items-end justify-between gap-4 md:mt-7">
				<UnderlineTabs
					label="Settings sections"
					tabs={[
						{ id: "profile", label: "My profile" },
						{ id: "security", label: "Security" },
						{ id: "notifications", label: "Notification" },
					]}
					value={tab}
					onChange={(t) => {
						setTab(t);
						setEditing(null);
					}}
				/>
				<button
					type="button"
					onClick={() => setDeleting(true)}
					className="shrink-0 pb-3 text-base text-error-400 transition-colors hover:text-error-300 md:text-2xl"
				>
					Delete account
				</button>
			</div>

			<div className="mt-8 md:mt-11">
				{account.isError ? (
					<ErrorState
						message={errorMessage(account.error)}
						onRetry={() => void account.refetch()}
						retrying={account.isFetching}
					/>
				) : !a ? (
					<div aria-hidden className="flex flex-col gap-6">
						{[160, 300, 220].map((h) => (
							<div key={h} className="skeleton-shimmer rounded-2xl" style={{ height: h }} />
						))}
					</div>
				) : tab === "profile" ? (
					editing ? (
						<EditProfile key={editing} account={a} initial={editing} onDone={() => setEditing(null)} />
					) : (
						<ProfileCards account={a} onEdit={setEditing} />
					)
				) : tab === "security" ? (
					<Security account={a} onDelete={() => setDeleting(true)} />
				) : (
					<div className="flex flex-col gap-8">
						<NotificationFeed />
						<EmailPreferences prefs={a.notifications} />
					</div>
				)}
			</div>

			{deleting && <DeleteDialog onClose={() => setDeleting(false)} />}
		</div>
	);
}

// ------------------------------------------------------------------ page 6: read-only cards

function ProfileCards({ account: a, onEdit }: { account: AdminAccount; onEdit: (s: Section) => void }) {
	const name = `${a.first_name} ${a.last_name}`.trim();
	const place = [a.city, a.country].filter(Boolean).join(", ");
	return (
		<div className="flex flex-col gap-6 md:gap-8">
			<Card title="My profile" reveal={0}>
				<div className="mt-5 flex items-center gap-5">
					<Avatar name={name} src={a.avatar_url} className="size-20 text-2xl md:size-[100px]" />
					<div>
						<p className="font-display text-xl font-bold md:text-2xl">{name}</p>
						{a.bio && <p className="mt-1.5 text-base">{a.bio}</p>}
						{place && <p className="mt-1 text-base text-white/85">{place}</p>}
					</div>
				</div>
			</Card>
			<Card
				title="Personal information"
				reveal={1}
				action={<EditButton onClick={() => onEdit("personal")} label="Edit personal information" />}
			>
				<dl className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
					<Item label="First name" value={a.first_name} />
					<Item label="Last name" value={a.last_name} />
					<Item label="Email address" value={a.email} />
					<Item label="Phone" value={a.phone} />
					<Item label="Bio" value={a.bio} />
				</dl>
			</Card>
			<Card title="Address" reveal={2} action={<EditButton onClick={() => onEdit("address")} label="Edit address" />}>
				<dl className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
					<Item label="Country" value={a.country} />
					<Item label="City / State" value={a.city} />
					<Item label="Postal code" value={a.postal_code} />
				</dl>
			</Card>
		</div>
	);
}

function Card({ title, action, children, reveal }: { title: string; action?: ReactNode; children: ReactNode; reveal: number }) {
	return (
		<section
			data-reveal="up"
			style={{ "--d": reveal } as React.CSSProperties}
			className="admin-card relative px-5 py-5 md:px-8 md:py-6"
		>
			<div className="flex items-start justify-between gap-4">
				<h2 className="font-display text-xl font-bold md:text-2xl">{title}</h2>
				{action}
			</div>
			{children}
		</section>
	);
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className="inline-flex h-11 items-center gap-2 rounded-lg border border-primary-500 px-4 text-base transition-colors hover:bg-primary-500/10 md:mt-12 md:h-12"
		>
			Edit <PenLine className="size-4" aria-hidden />
		</button>
	);
}

function Item({ label, value }: { label: string; value: string | null }) {
	return (
		<div className="min-w-0">
			<dt className="font-display text-lg font-bold md:text-[22px]">{label}</dt>
			<dd className={cn("mt-2 truncate text-base md:text-lg", !value && "text-white/40")}>{value || "Not set"}</dd>
		</div>
	);
}

// ------------------------------------------------------------------ page 7: edit form

const personalSchema = z.object({
	first_name: z.string().trim().min(1, "Enter your first name.").max(40),
	last_name: z.string().trim().min(1, "Enter your last name.").max(40),
	phone: z
		.string()
		.trim()
		.refine((v) => !v || /^\+?[\d\s()-]{7,20}$/.test(v), "Enter a valid phone number, like +234 702 468 7426."),
	bio: z.string().trim().max(80, "Keep it under 80 characters."),
});
const addressSchema = z.object({
	country: z.string().trim().max(60),
	city: z.string().trim().max(60),
	postal_code: z.string().trim().max(12, "Use 12 characters or fewer."),
});

function EditProfile({ account: a, initial, onDone }: { account: AdminAccount; initial: Section; onDone: () => void }) {
	const [section, setSection] = useState<Section>(initial);
	const save = useUpdateAccount();
	const name = `${a.first_name} ${a.last_name}`.trim();

	return (
		<section className="admin-card animate-rise px-4 py-5 md:px-8 md:py-6">
			<h2 className="font-display text-xl font-bold md:text-2xl">My profile</h2>
			<div className="mt-6 flex items-center gap-5 rounded-2xl border border-white/10 px-5 py-6 md:gap-8 md:px-9 md:py-8">
				<PhotoPicker name={name} src={a.avatar_url} />
				<div className="min-w-0">
					<p className="truncate font-display text-xl font-bold md:text-[28px]">{name}</p>
					{a.bio && <p className="mt-1 text-base md:text-lg">{a.bio}</p>}
				</div>
			</div>

			<div className="mt-10 md:px-2">
				<UnderlineTabs
					size="md"
					label="Profile sections"
					tabs={[
						{ id: "personal", label: "Personal information" },
						{ id: "address", label: "Address" },
					]}
					value={section}
					onChange={setSection}
				/>
				<div className="mt-7">
					{section === "personal" ? (
						<SectionForm
							key="personal"
							schema={personalSchema}
							defaults={{ first_name: a.first_name, last_name: a.last_name, phone: a.phone ?? "", bio: a.bio ?? "" }}
							fields={[
								{ name: "first_name", label: "First name", autoComplete: "given-name" },
								{ name: "last_name", label: "Last name", autoComplete: "family-name" },
								{ name: "phone", label: "Phone number", autoComplete: "tel", type: "tel", placeholder: "+234 702 468 7426" },
								{ name: "bio", label: "Bio / role", placeholder: "Lead Admin" },
							]}
							save={save}
							onDone={onDone}
						/>
					) : (
						<SectionForm
							key="address"
							schema={addressSchema}
							defaults={{ country: a.country ?? "", city: a.city ?? "", postal_code: a.postal_code ?? "" }}
							fields={[
								{ name: "country", label: "Country", autoComplete: "country-name" },
								{ name: "city", label: "City / State", autoComplete: "address-level2" },
								{ name: "postal_code", label: "Postal code", autoComplete: "postal-code" },
							]}
							save={save}
							onDone={onDone}
						/>
					)}
				</div>
			</div>
		</section>
	);
}

type FieldDef = { name: string; label: string; autoComplete?: string; type?: string; placeholder?: string };

function SectionForm({
	schema,
	defaults,
	fields,
	save,
	onDone,
}: {
	schema: typeof personalSchema | typeof addressSchema;
	defaults: Record<string, string>;
	fields: FieldDef[];
	save: ReturnType<typeof useUpdateAccount>;
	onDone: () => void;
}) {
	const form = useForm<Record<string, string>>({
		// Two schemas share this form; both produce plain string fields.
		resolver: zodResolver(schema) as unknown as Resolver<Record<string, string>>,
		defaultValues: defaults,
		mode: "onTouched",
	});
	const onSubmit = form.handleSubmit((v) =>
		save.mutate(v as AccountPatch, {
			onSuccess: () => {
				notify.success("Profile saved");
				onDone();
			},
			onError: (e) => {
				const field = String(errorData(e)?.field ?? "");
				if (field in defaults) form.setError(field, { message: errorMessage(e) });
			},
		}),
	);
	return (
		<form noValidate onSubmit={onSubmit} className="grid gap-x-6 gap-y-6 md:grid-cols-2">
			{fields.map((f) => (
				<Field
					key={f.name}
					label={f.label}
					type={f.type}
					autoComplete={f.autoComplete}
					placeholder={f.placeholder}
					error={form.formState.errors[f.name]?.message}
					{...form.register(f.name)}
				/>
			))}
			<div className="md:col-span-2">
				<FormError
					message={save.isError && !(String(errorData(save.error)?.field ?? "") in defaults) ? errorMessage(save.error) : null}
				/>
			</div>
			<div className="flex justify-end gap-3 md:col-span-2">
				<Button type="button" variant="ghost" className="h-12 w-auto px-6" onClick={onDone} disabled={save.isPending}>
					Cancel
				</Button>
				<Button
					type="submit"
					className="h-12 w-[150px] text-base"
					isLoading={save.isPending}
					loadingLabel="Saving"
					disabled={!form.formState.isDirty}
				>
					Save
				</Button>
			</div>
		</form>
	);
}

/** The camera badge on the photo (design page 7): pick, shrink, save at once. */
function PhotoPicker({ name, src }: { name: string; src: string | null }) {
	const input = useRef<HTMLInputElement>(null);
	const save = useUpdateAccount();
	const [busy, setBusy] = useState(false);
	return (
		<div className="relative shrink-0">
			<Avatar
				name={name}
				src={src}
				className={cn(
					"size-24 text-2xl transition-opacity md:size-[150px] md:text-4xl",
					(busy || save.isPending) && "opacity-60",
				)}
			/>
			<button
				type="button"
				onClick={() => input.current?.click()}
				disabled={busy || save.isPending}
				aria-label="Change profile photo"
				className="absolute right-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-white text-primary-500 shadow-lg transition-transform hover:scale-105 md:right-1 md:bottom-1 md:size-11"
			>
				{busy || save.isPending ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
			</button>
			<input
				ref={input}
				type="file"
				accept={IMAGE_TYPES.join(",")}
				className="sr-only"
				tabIndex={-1}
				aria-hidden
				onChange={async (e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					if (!file) return;
					setBusy(true);
					try {
						const avatar_url = await toAvatar(file);
						save.mutate(
							{ avatar_url },
							{ onSuccess: () => notify.success("Photo updated"), onError: (err) => notify.fromError(err) },
						);
					} catch (err) {
						notify.error("Couldn’t use that image", err instanceof Error ? err.message : undefined);
					} finally {
						setBusy(false);
					}
				}}
			/>
		</div>
	);
}

// ------------------------------------------------------------------ page 8: security

const passwordSchema = z
	.object({
		current_password: z.string().min(1, "Enter your current password."),
		new_password: z
			.string()
			.min(10, "Use at least 10 characters.")
			.regex(/[A-Za-z]/, "Add at least one letter.")
			.regex(/\d/, "Add at least one number."),
		confirm: z.string().min(1, "Confirm the new password."),
	})
	.refine((v) => v.new_password === v.confirm, { path: ["confirm"], message: "Passwords don’t match." });

function Security({ account: a, onDelete }: { account: AdminAccount; onDelete: () => void }) {
	const change = useChangePassword();
	const form = useForm<z.infer<typeof passwordSchema>>({
		resolver: zodResolver(passwordSchema),
		defaultValues: { current_password: "", new_password: "", confirm: "" },
		mode: "onTouched",
	});
	const next = useWatch({ control: form.control, name: "new_password" });
	const rules = [
		{ label: "10+ characters", ok: next.length >= 10 },
		{ label: "A letter", ok: /[A-Za-z]/.test(next) },
		{ label: "A number", ok: /\d/.test(next) },
	];
	const onSubmit = form.handleSubmit((v) =>
		change.mutate(
			{ current_password: v.current_password, new_password: v.new_password },
			{
				onSuccess: () => {
					notify.success("Password updated", "Use it next time you sign in.");
					form.reset();
				},
				onError: (e) => {
					const field = errorData(e)?.field;
					if (field === "current_password" || field === "new_password")
						form.setError(field, { message: errorMessage(e) }, { shouldFocus: true });
				},
			},
		),
	);

	return (
		<div className="flex max-w-[760px] flex-col gap-14">
			<section data-reveal="up" aria-labelledby="pw-title">
				<h2 id="pw-title" className="font-display text-2xl font-bold md:text-[28px]">
					Change password
				</h2>
				{a.password_changed_at && (
					<p className="mt-1.5 text-sm text-white/55">
						Last changed {new Date(a.password_changed_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
					</p>
				)}
				<form noValidate onSubmit={onSubmit} className="mt-6 grid gap-5 md:grid-cols-2">
					<Field
						className="md:col-span-2 md:max-w-[calc(50%-10px)]"
						label="Current password"
						type="password"
						autoComplete="current-password"
						error={form.formState.errors.current_password?.message}
						{...form.register("current_password")}
					/>
					<Field
						label="New password"
						type="password"
						autoComplete="new-password"
						error={form.formState.errors.new_password?.message}
						hint={
							next ? (
								<ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Password requirements">
									{rules.map((r) => (
										<li
											key={r.label}
											className={cn("flex items-center gap-1.5 transition-colors", r.ok ? "text-success-200" : "text-white/50")}
										>
											<Check className={cn("size-3", !r.ok && "opacity-30")} strokeWidth={3} />
											{r.label}
										</li>
									))}
								</ul>
							) : null
						}
						{...form.register("new_password")}
					/>
					<Field
						label="Confirm new password"
						type="password"
						autoComplete="new-password"
						error={form.formState.errors.confirm?.message}
						{...form.register("confirm")}
					/>
					<div className="md:col-span-2">
						<FormError message={change.isError && !errorData(change.error)?.field ? errorMessage(change.error) : null} />
					</div>
					<div className="md:col-span-2">
						<Button
							type="submit"
							className="h-12 w-auto px-8 text-base"
							isLoading={change.isPending}
							loadingLabel="Updating password"
						>
							Update password
						</Button>
					</div>
				</form>
			</section>

			<section
				data-reveal="up"
				aria-labelledby="mfa-title"
				className="flex items-start gap-4 rounded-2xl border border-white/10 px-5 py-5"
			>
				<span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success-400/10 text-success-200">
					<ShieldCheck className="size-5" aria-hidden />
				</span>
				<div>
					<h2 id="mfa-title" className="font-display text-lg font-bold">
						Two-step sign-in is on
					</h2>
					<p className="mt-1 text-sm leading-6 text-white/65">
						Every admin confirms sign-in with a 6-digit code. It can’t be turned off for admin accounts.
					</p>
				</div>
			</section>

			<section data-reveal="up" aria-labelledby="delete-title">
				<h2 id="delete-title" className="font-display text-2xl font-bold md:text-[28px]">
					Delete Account
				</h2>
				<p className="mt-4 text-base md:text-lg">
					Deleting your account removes your access to the admin console. Your past decisions stay in the audit log.
				</p>
				<button type="button" onClick={onDelete} className="mt-4 text-base text-error-400 hover:text-error-300 md:text-lg">
					Delete my account
				</button>
			</section>
		</div>
	);
}

// ------------------------------------------------------------------ notifications

const PREFS: { key: keyof AdminNotificationPrefs; label: string; hint: string }[] = [
	{ key: "new_submissions", label: "New project submissions", hint: "When a builder submits a project for review." },
	{ key: "resubmissions", label: "Resubmitted projects", hint: "When a builder sends a project back after changes." },
	{ key: "reported_suggestions", label: "Reported suggestions", hint: "When someone reports a suggestion for moderation." },
	{ key: "contribution_issues", label: "Contribution issues", hint: "When a contribution can’t be verified on Stellar." },
	{ key: "weekly_summary", label: "Weekly summary", hint: "A Monday email with the week’s reviews and contributions." },
];

function EmailPreferences({ prefs }: { prefs: AdminNotificationPrefs }) {
	const save = useUpdateNotificationPrefs();
	return (
		<section data-reveal="up" aria-labelledby="prefs-title" className="admin-card max-w-[760px] px-5 py-5 md:px-8 md:py-6">
			<h2 id="prefs-title" className="font-display text-xl font-bold md:text-2xl">
				Email me about
			</h2>
			<p className="mt-1 text-sm text-white/55">Sent to your sign-in email. Changes save straight away.</p>
			<ul className="mt-5 divide-y divide-white/10">
				{PREFS.map((p) => {
					const on = prefs[p.key];
					return (
						<li key={p.key} className="flex items-center justify-between gap-6 py-4">
							<div>
								<p id={`pref-${p.key}`} className="text-base">
									{p.label}
								</p>
								<p className="mt-0.5 text-sm text-white/55">{p.hint}</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={on}
								aria-labelledby={`pref-${p.key}`}
								onClick={() =>
									save.mutate(
										{ [p.key]: !on },
										{
											onSuccess: () => notify.success(on ? "Turned off" : "Turned on", p.label),
											onError: (e) => notify.fromError(e),
										},
									)
								}
								className={cn(
									"relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-900",
									on ? "bg-primary-500" : "bg-white/20",
								)}
							>
								<span
									aria-hidden
									className={cn(
										"absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform duration-200 ease-(--ease-settle)",
										on && "translate-x-5",
									)}
								/>
							</button>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

/** Design "Account settings → Notification": a numbered list, bold title + description, newest first. */
function NotificationFeed() {
	const [page, setPage] = useState(1);
	const feed = useAdminNotifications(page);
	const d = feed.data;
	return (
		<section data-reveal="up" aria-labelledby="notif-title" className="admin-card px-5 py-5 md:px-8 md:py-7">
			<h2 id="notif-title" className="font-display text-xl font-bold md:text-2xl">
				Notifications
			</h2>
			{feed.isPending ? (
				<div aria-hidden className="mt-6 flex flex-col gap-6">
					{Array.from({ length: 4 }, (_, i) => (
						<div key={i} className="flex flex-col gap-2">
							<span className="skeleton-shimmer block h-5 w-2/3 rounded" />
							<span className="skeleton-shimmer block h-4 w-full rounded" />
						</div>
					))}
				</div>
			) : feed.isError && !d ? (
				<div className="mt-5">
					<ErrorState message={errorMessage(feed.error)} onRetry={() => void feed.refetch()} retrying={feed.isFetching} />
				</div>
			) : d && d.items.length === 0 ? (
				<p className="mt-6 text-white/60">You’re all caught up.</p>
			) : d ? (
				<ol
					className={cn("mt-6 flex flex-col gap-7 transition-opacity md:mt-8 md:gap-9", feed.isPlaceholderData && "opacity-60")}
				>
					{d.items.map((n, i) => (
						<li key={n.id} data-reveal="up" style={{ "--d": i } as React.CSSProperties} className="flex gap-3 md:gap-4">
							<span className="mt-0.5 w-7 shrink-0 font-display text-xl font-bold tabular-nums md:mt-3 md:text-[26px]">
								{(d.meta.page - 1) * d.meta.limit + i + 1}.
							</span>
							<div className="min-w-0">
								<p className="font-display text-lg leading-snug font-bold md:text-[22px]">
									{n.href ? (
										<Link href={n.href} className="transition-colors hover:text-primary-300">
											{n.title}
										</Link>
									) : (
										n.title
									)}
								</p>
								<p className="mt-2 text-[15px] leading-7 text-white/90 md:text-base">{n.body}</p>
								<p className="mt-1 text-xs text-white/45" title={new Date(n.created_at).toLocaleString()}>
									{timeAgo(n.created_at)}
								</p>
							</div>
						</li>
					))}
				</ol>
			) : null}
			{d && <Pager page={d.meta.page} pages={d.meta.total_pages} onPage={setPage} />}
		</section>
	);
}

// ------------------------------------------------------------------ delete account

function DeleteDialog({ onClose }: { onClose: () => void }) {
	const del = useDeleteAccount();
	const router = useRouter();
	const qc = useQueryClient();
	const signOut = useAdminSession((s) => s.signOut);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const ready = password.length > 0 && confirm === "DELETE";

	return (
		<Dialog open onOpenChange={(o) => !o && !del.isPending && onClose()}>
			<DialogContent className="border-white/10 bg-[#11131C] text-white sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle className="font-display text-xl text-error-200">Delete your admin account?</DialogTitle>
					<DialogDescription className="text-white/65">
						You’ll be signed out and lose access to the console straight away. Your past decisions stay in the audit log. Another
						admin can restore access.
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<Field
						label="Your password"
						type="password"
						autoComplete="current-password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					<Field
						label='Type "DELETE" to confirm'
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						autoComplete="off"
					/>
					<FormError message={del.isError ? errorMessage(del.error) : null} />
				</div>
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" onClick={onClose} disabled={del.isPending}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						disabled={!ready}
						isLoading={del.isPending}
						loadingLabel="Deleting"
						onClick={() =>
							del.mutate(password, {
								onSuccess: () => {
									signOut();
									qc.clear();
									notify.success("Account deleted");
									router.replace(routes.signIn);
								},
							})
						}
					>
						Delete account
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
