"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, KeyRound, LogOut } from "lucide-react";
import type { Me, UpdateMeInput } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { detailsByField, errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { notify } from "@/lib/use-toast";
import { isHttpsUrl } from "@/lib/validation";
import { ErrorState } from "@/components/States";
import { FormError, PasswordField, TextAreaField, TextField } from "@/components/forms/Fields";
import { useChangePassword, useMe, useSignOutEverywhere, useUpdateMe } from "@/features/builder-auth/hooks";

/**
 * Design "Edit Profile", tailored to the API (`PATCH /auth/me`): full name, the public display name shown on
 * project pages, organisation, bio, website and a public contact email. Plus password change and signing out of
 * every device. The sign-in email isn't changed here.
 */

const BIO_MAX = 1000;

const schema = z.object({
	name: z.string().trim().min(1, "Enter your full name.").max(100, "Use 100 characters or fewer."),
	displayName: z.string().trim().min(1, "Enter the name to show on your projects.").max(100, "Use 100 characters or fewer."),
	organizationName: z.string().trim().max(150, "Use 150 characters or fewer."),
	bio: z.string().trim().max(BIO_MAX, `Keep it under ${BIO_MAX.toLocaleString()} characters.`),
	websiteUrl: z
		.string()
		.trim()
		.refine((v) => !v || isHttpsUrl(v), "Use a full https:// link."),
	contactEmail: z
		.string()
		.trim()
		.refine((v) => !v || z.email().safeParse(v).success, "Enter a valid email address."),
});
type Values = z.infer<typeof schema>;
const FIELDS = ["name", "displayName", "organizationName", "bio", "websiteUrl", "contactEmail"] as const;

const toValues = (me: Me): Values => ({
	name: me.name,
	displayName: me.profile?.displayName ?? me.name,
	organizationName: me.profile?.organizationName ?? "",
	bio: me.profile?.bio ?? "",
	websiteUrl: me.profile?.websiteUrl ?? "",
	contactEmail: me.profile?.contactEmail ?? "",
});

export function EditProfileForm() {
	const me = useMe();

	return (
		<div className="app-container py-10 md:py-[72px]">
			<section
				aria-labelledby="edit-profile-title"
				className="animate-rise mx-auto w-full max-w-[670px] rounded-[24px] bg-[#16161B] px-5 py-8 sm:px-8 md:rounded-[26px] md:px-10 md:py-10"
			>
				<div className="relative">
					<Link
						href={routes.dashboard}
						aria-label="Back to dashboard"
						className="absolute top-1/2 left-0 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
					>
						<ArrowLeft className="size-5" />
					</Link>
					<h1 id="edit-profile-title" className="text-center font-display text-[32px] leading-tight font-bold md:text-[40px]">
						Edit Profile
					</h1>
				</div>

				{me.data ? (
					// Mounted once with the saved values; a background refetch never resets what's being typed.
					<ProfileForm me={me.data} />
				) : me.isError ? (
					<ErrorState
						className="mt-8"
						title="We couldn’t load your profile"
						message={errorMessage(me.error)}
						onRetry={() => void me.refetch()}
						retrying={me.isFetching}
					/>
				) : (
					<FormSkeleton />
				)}
			</section>

			{me.data && <Security />}
		</div>
	);
}

function ProfileForm({ me }: { me: Me }) {
	const router = useRouter();
	const save = useUpdateMe();
	const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(me), mode: "onTouched" });
	const { errors, isDirty } = form.formState;
	const bio = useWatch({ control: form.control, name: "bio" });

	const guard = isDirty && !save.isSuccess;
	useEffect(() => {
		if (!guard) return;
		const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [guard]);

	const onSubmit = form.handleSubmit((v) => {
		// Only documented fields; "" clears an optional one (null).
		const input: UpdateMeInput = {
			name: v.name,
			displayName: v.displayName,
			organizationName: v.organizationName || null,
			bio: v.bio || null,
			websiteUrl: v.websiteUrl || null,
			contactEmail: v.contactEmail || null,
		};
		save.mutate(input, {
			onSuccess: () => {
				notify.success("Profile updated");
				router.push(routes.dashboard);
			},
			onError: (e) => {
				const byField = detailsByField(e);
				for (const f of FIELDS) if (byField[f]) form.setError(f, { message: byField[f] }, { shouldFocus: true });
			},
		});
	});
	const fieldErrors = save.isError ? detailsByField(save.error) : {};

	return (
		<form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-5 md:mt-8 md:gap-6">
			<div className="grid gap-5 md:grid-cols-2">
				<TextField label="Full Name" autoComplete="name" error={errors.name?.message} {...form.register("name")} />
				<TextField
					label="Display name"
					autoComplete="nickname"
					error={errors.displayName?.message}
					hint={<p className="mt-1.5 text-xs text-white/45">Shown on your public project pages.</p>}
					{...form.register("displayName")}
				/>
			</div>
			<TextField
				label="Organisation (optional)"
				autoComplete="organization"
				error={errors.organizationName?.message}
				{...form.register("organizationName")}
			/>
			<TextAreaField
				label="Short Description (optional)"
				maxLength={BIO_MAX}
				count={bio.length}
				rows={4}
				placeholder="Who you are and what you build."
				error={errors.bio?.message}
				{...form.register("bio")}
			/>
			<div className="grid gap-5 md:grid-cols-2">
				<TextField
					label="Website (optional)"
					type="url"
					inputMode="url"
					placeholder="https://…"
					error={errors.websiteUrl?.message}
					{...form.register("websiteUrl")}
				/>
				<TextField
					label="Public contact email (optional)"
					type="email"
					inputMode="email"
					placeholder={me.email}
					error={errors.contactEmail?.message}
					{...form.register("contactEmail")}
				/>
			</div>
			<p className="-mt-2 text-xs text-white/45">
				You sign in as <span className="text-white/70">{me.email}</span>. That address is never shown publicly.
			</p>

			<FormError message={save.isError && !FIELDS.some((f) => fieldErrors[f]) ? errorMessage(save.error) : null} />

			<Button
				type="submit"
				size="lg"
				className="mt-1 h-14 w-full text-base md:h-[62px] md:text-lg"
				isLoading={save.isPending}
				loadingLabel="Saving your profile"
			>
				Save changes
			</Button>
		</form>
	);
}

const passwordSchema = z
	.object({
		currentPassword: z.string().min(1, "Enter your current password."),
		newPassword: z.string().min(8, "Use at least 8 characters.").max(128, "Use 128 characters or fewer."),
		confirm: z.string().min(1, "Confirm the new password."),
	})
	.refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords don’t match." });
type PasswordValues = z.infer<typeof passwordSchema>;

/** Change password (other sessions end; this one stays) and sign out everywhere. */
function Security() {
	const router = useRouter();
	const change = useChangePassword();
	const everywhere = useSignOutEverywhere();
	const form = useForm<PasswordValues>({
		resolver: zodResolver(passwordSchema),
		defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
		mode: "onTouched",
	});
	const { errors } = form.formState;

	const onSubmit = form.handleSubmit((v) =>
		change.mutate(
			{ currentPassword: v.currentPassword, newPassword: v.newPassword },
			{
				onSuccess: () => {
					notify.success("Password changed", "You’re still signed in here; other devices were signed out.");
					form.reset();
				},
				onError: (e) => {
					// A wrong current password is a 400 (never a refresh).
					if (errorStatus(e) === 400 && !detailsByField(e).newPassword)
						form.setError("currentPassword", { message: errorMessage(e) }, { shouldFocus: true });
					else if (detailsByField(e).newPassword) form.setError("newPassword", { message: detailsByField(e).newPassword });
				},
			},
		),
	);

	return (
		<section
			aria-labelledby="security-title"
			data-reveal="up"
			className="mx-auto mt-6 w-full max-w-[670px] rounded-[24px] bg-[#16161B] px-5 py-8 sm:px-8 md:px-10"
		>
			<h2 id="security-title" className="flex items-center gap-2 font-display text-2xl font-bold">
				<KeyRound className="size-5 text-primary-300" aria-hidden /> Password &amp; sessions
			</h2>
			<form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-5">
				<PasswordField
					label="Current password"
					autoComplete="current-password"
					error={errors.currentPassword?.message}
					{...form.register("currentPassword")}
				/>
				<div className="grid gap-5 md:grid-cols-2">
					<PasswordField
						label="New password"
						autoComplete="new-password"
						error={errors.newPassword?.message}
						{...form.register("newPassword")}
					/>
					<PasswordField
						label="Confirm new password"
						autoComplete="new-password"
						error={errors.confirm?.message}
						{...form.register("confirm")}
					/>
				</div>
				<FormError message={change.isError && errorStatus(change.error) !== 400 ? errorMessage(change.error) : null} />
				<Button type="submit" variant="outline" className="h-12 sm:w-auto sm:self-start sm:px-6" isLoading={change.isPending} loadingLabel="Changing password">
					Change password
				</Button>
			</form>
			<div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-white/65">Lost a device? Sign out of Chucksales everywhere, including here.</p>
				<Button
					variant="ghost"
					className="h-11 w-auto shrink-0 gap-2 px-4 text-error-200 hover:bg-error-400/10"
					isLoading={everywhere.isPending}
					loadingLabel="Signing out everywhere"
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
		</section>
	);
}

function FormSkeleton() {
	return (
		<div aria-hidden className="mt-8 flex flex-col gap-6">
			{[48, 48, 140, 48, 48].map((h, i) => (
				<div key={i} className="flex flex-col gap-2.5">
					<span className="skeleton-shimmer block h-4 w-28 rounded" />
					<span className="skeleton-shimmer block w-full rounded-lg" style={{ height: h }} />
				</div>
			))}
		</div>
	);
}
