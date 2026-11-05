"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Wallet } from "lucide-react";
import type { BuilderProfileSummary } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { errorData, errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { shortKey } from "@/lib/stellar/config";
import { notify } from "@/lib/use-toast";
import { email, socialLinks, stellarAddress } from "@/lib/validation";
import { ErrorState } from "@/components/States";
import { FormError, TextAreaField, TextField } from "@/components/forms/Fields";
import { ImageDropzone } from "@/components/forms/ImageDropzone";
import { useConnectedWallet } from "@/features/wallet/hooks";
import { useBuilderProfile, useUpdateProfile } from "@/features/builder-projects/hooks";

/**
 * Design "Edit Profile": Full Name, Short Description, Profile Image, Email + Wallet, four social links.
 * Email here is the public contact email (the sign-in email doesn't change from this form).
 * Prefilled from GET /builder/profile; saves with PATCH and goes back to the dashboard.
 */

const BIO_MAX = 280;

const schema = z.object({
	display_name: z.string().trim().min(2, "Enter your full name.").max(60, "Use 60 characters or fewer."),
	bio: z.string().trim().max(BIO_MAX, `Keep it under ${BIO_MAX} characters.`),
	avatar_url: z.string(),
	contact_email: email,
	wallet_address: stellarAddress(false),
	...socialLinks,
});
type Values = z.infer<typeof schema>;

const SERVER_FIELDS: Record<string, keyof Values> = {
	display_name: "display_name",
	bio: "bio",
	avatar_url: "avatar_url",
	contact_email: "contact_email",
	wallet_address: "wallet_address",
	twitter_url: "twitter",
	discord_url: "discord",
	telegram_url: "telegram",
	website: "website",
};

const toValues = (p: BuilderProfileSummary): Values => ({
	display_name: p.display_name,
	bio: p.bio ?? "",
	avatar_url: p.avatar_url ?? "",
	contact_email: p.contact_email ?? p.email,
	wallet_address: p.wallet_address ?? "",
	twitter: p.twitter_url ?? "",
	discord: p.discord_url ?? "",
	telegram: p.telegram_url ?? "",
	website: p.website ?? "",
});

export function EditProfileForm() {
	const profile = useBuilderProfile();

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

				{profile.data ? (
					// Mounted once with the saved values; a background refetch never resets what's being typed.
					<ProfileForm initial={toValues(profile.data)} />
				) : profile.isError ? (
					<ErrorState
						className="mt-8"
						title="We couldn’t load your profile"
						message={errorMessage(profile.error)}
						onRetry={() => void profile.refetch()}
						retrying={profile.isFetching}
					/>
				) : (
					<FormSkeleton />
				)}
			</section>
		</div>
	);
}

function ProfileForm({ initial }: { initial: Values }) {
	const router = useRouter();
	const save = useUpdateProfile();
	const { address } = useConnectedWallet();
	const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial, mode: "onTouched" });
	const { errors, isDirty } = form.formState;
	const bio = useWatch({ control: form.control, name: "bio" });
	const wallet = useWatch({ control: form.control, name: "wallet_address" });

	const guard = isDirty && !save.isSuccess;
	useEffect(() => {
		if (!guard) return;
		const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [guard]);

	const onSubmit = form.handleSubmit((v) =>
		save.mutate(
			{
				display_name: v.display_name,
				bio: v.bio,
				avatar_url: v.avatar_url,
				contact_email: v.contact_email,
				wallet_address: v.wallet_address.toUpperCase(),
				twitter_url: v.twitter,
				discord_url: v.discord,
				telegram_url: v.telegram,
				website: v.website,
			},
			{
				onSuccess: () => {
					notify.success("Profile updated");
					router.push(routes.dashboard);
				},
				onError: (error) => {
					const field = SERVER_FIELDS[String(errorData(error)?.field ?? "")];
					if (errorStatus(error) === 422 && field) form.setError(field, { message: errorMessage(error) }, { shouldFocus: true });
				},
			},
		),
	);
	const serverFieldError = errorStatus(save.error) === 422 && !!SERVER_FIELDS[String(errorData(save.error)?.field ?? "")];

	return (
		<form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-5 md:mt-8 md:gap-6">
			<TextField label="Full Name" autoComplete="name" error={errors.display_name?.message} {...form.register("display_name")} />
			<TextAreaField
				label="Short Description"
				placeholder="What you build and who it’s for."
				maxLength={BIO_MAX}
				count={bio.length}
				error={errors.bio?.message}
				{...form.register("bio")}
			/>
			<Controller
				control={form.control}
				name="avatar_url"
				render={({ field, fieldState }) => (
					<ImageDropzone
						label="Profile Image"
						round
						value={field.value}
						onChange={field.onChange}
						error={fieldState.error?.message}
					/>
				)}
			/>
			<div className="grid gap-5 md:grid-cols-2 md:gap-x-5 md:gap-y-6">
				<TextField
					label="Email Address"
					type="email"
					inputMode="email"
					autoComplete="email"
					error={errors.contact_email?.message}
					hint={<p className="mt-1.5 text-xs text-white/45">Where admins and the community can reach you.</p>}
					{...form.register("contact_email")}
				/>
				<TextField
					label="Wallet Address"
					autoComplete="off"
					spellCheck={false}
					placeholder="G…"
					className="min-w-0"
					error={errors.wallet_address?.message}
					hint={
						address && wallet.toUpperCase() !== address ? (
							<button
								type="button"
								onClick={() => form.setValue("wallet_address", address, { shouldValidate: true, shouldDirty: true })}
								className="animate-rise mt-2 inline-flex items-center gap-1.5 text-sm text-primary-300 hover:text-primary-200"
							>
								<Wallet className="size-3.5" aria-hidden /> Use connected wallet ({shortKey(address, 4, 4)})
							</button>
						) : (
							<p className="mt-1.5 text-xs text-white/45">Your public Stellar address, shown on your profile.</p>
						)
					}
					{...form.register("wallet_address")}
				/>
				<TextField
					label="Twitter Page link"
					type="url"
					inputMode="url"
					placeholder="https://x.com/…"
					error={errors.twitter?.message}
					{...form.register("twitter")}
				/>
				<TextField
					label="Discord Server link"
					type="url"
					inputMode="url"
					placeholder="https://discord.gg/…"
					error={errors.discord?.message}
					{...form.register("discord")}
				/>
				<TextField
					label="Telegram Group link"
					type="url"
					inputMode="url"
					placeholder="https://t.me/…"
					error={errors.telegram?.message}
					{...form.register("telegram")}
				/>
				<TextField
					label="Website link"
					type="url"
					inputMode="url"
					placeholder="https://…"
					error={errors.website?.message}
					{...form.register("website")}
				/>
			</div>

			<FormError message={save.isError && !serverFieldError ? errorMessage(save.error) : null} />

			<Button
				type="submit"
				size="lg"
				className="mt-2 h-14 w-full text-base md:h-[62px] md:text-lg"
				isLoading={save.isPending}
				loadingLabel="Saving your profile"
				disabled={!isDirty && !save.isPending}
			>
				Save changes
			</Button>
		</form>
	);
}

function FormSkeleton() {
	return (
		<div aria-hidden className="mt-8 flex flex-col gap-6">
			{[48, 140, 150, 48, 48, 48].map((h, i) => (
				<div key={i} className="flex flex-col gap-2.5">
					<span className="skeleton-shimmer block h-4 w-28 rounded" />
					<span className="skeleton-shimmer block w-full rounded-lg" style={{ height: h }} />
				</div>
			))}
		</div>
	);
}
