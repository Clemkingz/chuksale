"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, KeyRound, LogOut, Plus, Trash2 } from "lucide-react";
import { SOCIAL_PLATFORM_LABEL } from "@repo/domain/labels";
import type { Me, SocialPlatform, UpdateMeInput } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { detailsByField, errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { notify } from "@/lib/use-toast";
import { isHttpsUrl } from "@/lib/validation";
import { BackLink } from "@/components/BackLink";
import { ImageUpload } from "@/components/ImageUpload";
import { ErrorState } from "@/components/States";
import { FormError, PasswordField, TextAreaField, TextField } from "@/components/forms/Fields";
import { useBanner, useChangePassword, useMe, useSignOutEverywhere, useUpdateMe } from "@/features/builder-auth/hooks";
import { AvatarPicker } from "@/features/builder-profile/components/AvatarPicker";
import { ProfileProgress } from "@/features/builder-profile/components/ProfileProgress";
import { WalletLinkCard } from "@/features/builder-profile/components/WalletLinkCard";

/**
 * /builder/profile (design "Edit Profile", tailored to the API). After email verification it opens as "Complete your
 * profile" (`?welcome=1`, optional `next`): a progress bar over the saved profile, picture (upload or a ready-made
 * avatar) and banner, the public details (`PATCH /auth/me`: names, bio, website, contact email, social links), and
 * the verified wallet. Outside the welcome flow it also has password and sessions. The sign-in email isn't changed here.
 */

const BIO_MAX = 1000;
const PLATFORMS = Object.entries(SOCIAL_PLATFORM_LABEL) as [SocialPlatform, string][];

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
	socialLinks: z
		.array(
			z.object({
				platform: z.enum(PLATFORMS.map(([p]) => p) as [SocialPlatform, ...SocialPlatform[]]),
				url: z.string().trim().max(300, "Use 300 characters or fewer.").refine(isHttpsUrl, "Use a full https:// link."),
			}),
		)
		.max(10, "Up to 10 links."),
});
type Values = z.infer<typeof schema>;
const FIELDS = ["name", "displayName", "organizationName", "bio", "websiteUrl", "contactEmail", "socialLinks"] as const;

const toValues = (me: Me): Values => ({
	name: me.name,
	displayName: me.profile?.displayName ?? me.name,
	organizationName: me.profile?.organizationName ?? "",
	bio: me.profile?.bio ?? "",
	websiteUrl: me.profile?.websiteUrl ?? "",
	contactEmail: me.profile?.contactEmail ?? "",
	socialLinks: me.profile?.socialLinks ?? [],
});

const card = "mx-auto w-full max-w-[720px] rounded-[24px] bg-[#16161B] px-5 py-8 sm:px-8 md:px-10";

/** Where "Continue" goes after the welcome flow: a safe in-app `next`, else the dashboard. */
function useAfter() {
	const params = useSearchParams();
	const next = params.get("next");
	return {
		welcome: params.get("welcome") === "1",
		after: next && next.startsWith("/") && !next.startsWith("//") ? next : routes.dashboard,
	};
}

export function EditProfileForm() {
	const me = useMe();
	const { welcome, after } = useAfter();

	return (
		<div className="app-container py-8 md:py-12">
			<div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-4">
				{welcome ? <span /> : <BackLink href={routes.dashboard} label="Dashboard" />}
				{welcome && (
					<Button asChild variant="ghost" size="sm" className="h-9 w-auto gap-1.5 px-3 text-white/65">
						<Link href={after}>
							Skip for now <ArrowRight className="size-4" />
						</Link>
					</Button>
				)}
			</div>
			<header className="mx-auto mt-3 w-full max-w-[720px]">
				<h1 className="animate-rise font-display text-[30px] leading-tight font-bold md:text-[40px]">
					{welcome ? "Complete your profile" : "Edit profile"}
				</h1>
				<p className="animate-rise mt-1.5 text-white/60 [--i:1]">
					{welcome
						? "Your account is ready. Tell supporters who’s behind your projects: it takes about two minutes."
						: "This is what supporters see next to your projects."}
				</p>
			</header>

			{me.data ? (
				<div className="mt-6 flex flex-col gap-6 md:mt-8">
					<ProfileProgress me={me.data} className="animate-rise mx-auto w-full max-w-[720px] [--i:2]" />

					<section id="picture" aria-labelledby="picture-title" className={`${card} animate-rise scroll-mt-28 [--i:3]`}>
						<h2 id="picture-title" className="font-display text-xl font-bold md:text-2xl">
							Picture and banner
						</h2>
						<div className="mt-6 flex flex-col gap-8">
							<AvatarPicker me={me.data} />
							<BannerField me={me.data} />
						</div>
					</section>

					{/* Mounted once with the saved values; a background refetch never resets what's being typed. */}
					<ProfileForm me={me.data} welcome={welcome} after={after} />

					<section id="wallet" aria-label="Verified wallet" data-reveal="up" className={`${card} scroll-mt-28`}>
						<WalletLinkCard me={me.data} />
					</section>

					{welcome ? (
						<div className="mx-auto flex w-full max-w-[720px] justify-end">
							<Button asChild className="h-12 w-auto gap-2 px-6">
								<Link href={after}>
									Continue to {after === routes.dashboard ? "your dashboard" : "where you were"} <ArrowRight className="size-4" />
								</Link>
							</Button>
						</div>
					) : (
						<Security />
					)}
				</div>
			) : me.isError ? (
				<ErrorState
					className="mx-auto mt-8 max-w-[720px]"
					title="We couldn’t load your profile"
					message={errorMessage(me.error)}
					onRetry={() => void me.refetch()}
					retrying={me.isFetching}
				/>
			) : (
				<FormSkeleton />
			)}
		</div>
	);
}

function BannerField({ me }: { me: Me }) {
	const banner = useBanner();
	return (
		<ImageUpload
			label="Banner"
			url={me.profile?.bannerUrl ?? null}
			alt="Profile banner"
			help="A wide image (about 1500×500, 3:1) for the top of your profile. JPEG, PNG or WebP up to 5 MB."
			uploading={banner.isPending && !!banner.variables}
			removing={banner.isPending && banner.variables === null}
			onUpload={(file) => banner.mutateAsync(file).then(() => notify.success("Banner updated"))}
			onRemove={() => banner.mutateAsync(null).then(() => notify.info("Banner removed"))}
		/>
	);
}

function ProfileForm({ me, welcome, after }: { me: Me; welcome: boolean; after: string }) {
	// react-hook-form + React Compiler: memoized register() props stop tracking fields after form.reset(). Opt out.
	"use no memo";

	const router = useRouter();
	const save = useUpdateMe();
	const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(me), mode: "onTouched" });
	const socials = useFieldArray({ control: form.control, name: "socialLinks" });
	const { errors, isDirty } = form.formState;
	const bio = useWatch({ control: form.control, name: "bio" });

	useEffect(() => {
		if (!isDirty) return;
		const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [isDirty]);

	const onSubmit = form.handleSubmit((v) => {
		// Only documented fields; "" clears an optional one (null). Social links replace the whole list.
		const input: UpdateMeInput = {
			name: v.name,
			displayName: v.displayName,
			organizationName: v.organizationName || null,
			bio: v.bio || null,
			websiteUrl: v.websiteUrl || null,
			contactEmail: v.contactEmail || null,
			socialLinks: v.socialLinks.map((s) => ({ platform: s.platform, url: s.url.trim() })),
		};
		save.mutate(input, {
			onSuccess: (next) => {
				notify.success("Profile saved");
				form.reset(toValues(next));
				if (!welcome) router.push(routes.dashboard);
				else if (next.avatarUrl && next.profile?.walletAddress) router.push(after);
			},
			onError: (e) => {
				const byField = detailsByField(e);
				for (const f of FIELDS) if (byField[f]) form.setError(f, { message: byField[f] }, { shouldFocus: true });
			},
		});
	});
	const fieldErrors = save.isError ? detailsByField(save.error) : {};

	return (
		<section id="about" aria-labelledby="about-title" data-reveal="up" className={`${card} scroll-mt-28`}>
			<h2 id="about-title" className="font-display text-xl font-bold md:text-2xl">
				About you
			</h2>
			<form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-5 md:gap-6">
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
					label="Short bio (optional)"
					maxLength={BIO_MAX}
					count={bio.length}
					rows={4}
					placeholder="Who you are and what you build."
					error={errors.bio?.message}
					{...form.register("bio")}
				/>

				<div id="links" className="grid scroll-mt-28 gap-5 md:grid-cols-2">
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

				<fieldset>
					<legend className="mb-2.5 text-base">
						Social links <span className="text-white/45">(optional)</span>
					</legend>
					{socials.fields.length > 0 && (
						<ul className="flex flex-col gap-3">
							{socials.fields.map((f, i) => (
								<li
									key={f.id}
									className="animate-rise grid grid-cols-[120px_minmax(0,1fr)_auto] items-start gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]"
								>
									<select
										aria-label={`Link ${i + 1} platform`}
										className="h-12 rounded-lg border border-white/15 bg-transparent px-3 text-sm text-white focus:border-primary-400 focus:outline-none [&>option]:bg-[#16161B]"
										{...form.register(`socialLinks.${i}.platform`)}
									>
										{PLATFORMS.map(([p, label]) => (
											<option key={p} value={p}>
												{label}
											</option>
										))}
									</select>
									<TextField
										label={`Link ${i + 1} address`}
										className="[&>label]:sr-only"
										type="url"
										inputMode="url"
										placeholder="https://…"
										error={errors.socialLinks?.[i]?.url?.message}
										{...form.register(`socialLinks.${i}.url`)}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-12 text-white/60 hover:text-error-200"
										aria-label={`Remove link ${i + 1}`}
										onClick={() => socials.remove(i)}
									>
										<Trash2 className="size-4" />
									</Button>
								</li>
							))}
						</ul>
					)}
					{socials.fields.length < 10 && (
						<Button
							type="button"
							variant="outline"
							className="mt-3 h-10 w-auto gap-2 px-4"
							onClick={() => socials.append({ platform: socials.fields.length ? "other" : "x", url: "" })}
						>
							<Plus className="size-4" /> Add a link
						</Button>
					)}
					{(errors.socialLinks?.message || errors.socialLinks?.root?.message) && (
						<p className="mt-1.5 text-sm text-error-200">{errors.socialLinks?.message ?? errors.socialLinks?.root?.message}</p>
					)}
				</fieldset>

				<FormError message={save.isError && !FIELDS.some((f) => fieldErrors[f]) ? errorMessage(save.error) : null} />

				<Button
					type="submit"
					size="lg"
					className="mt-1 h-14 w-full text-base md:h-[62px] md:text-lg"
					isLoading={save.isPending}
					loadingLabel="Saving your profile"
				>
					{welcome ? "Save details" : "Save changes"}
				</Button>
			</form>
		</section>
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
	// react-hook-form + React Compiler: memoized register() props stop tracking fields after form.reset(). Opt out.
	"use no memo";

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
		<section aria-labelledby="security-title" data-reveal="up" className={card}>
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
				<Button
					type="submit"
					variant="outline"
					className="h-12 sm:w-auto sm:self-start sm:px-6"
					isLoading={change.isPending}
					loadingLabel="Changing password"
				>
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
		<div aria-hidden className="mx-auto mt-8 flex w-full max-w-[720px] flex-col gap-6">
			<span className="skeleton-shimmer block h-36 rounded-[24px]" />
			<span className="skeleton-shimmer block h-72 rounded-[24px]" />
			<span className="skeleton-shimmer block h-96 rounded-[24px]" />
		</div>
	);
}
