"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Wallet } from "lucide-react";
import { Button } from "@repo/ui/button";
import { errorData, errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { shortKey } from "@/lib/stellar/config";
import { notify } from "@/lib/use-toast";
import { FormError, TextField } from "@/components/forms/Fields";
import { useConnectedWallet } from "@/features/wallet/hooks";
import { useBuilderProfile, useCreateProject } from "@/features/builder-projects/hooks";
import { ImageDropzone } from "@/components/forms/ImageDropzone";
import { addProjectSchema, type AddProjectValues } from "@/features/builder-projects/schema";

/**
 * Design "Dev add project 2": one card, name → logo → email + wallet → four social links → Submit Project.
 * Submitting creates the project and sends it for review (status "Submitted", shown under Pending projects).
 * Email defaults to the account email; a connected wallet can fill the wallet field in one click.
 */

const SERVER_FIELDS: Record<string, keyof AddProjectValues> = {
	title: "title",
	logo_url: "logo_url",
	contact_email: "contact_email",
	destination_address: "destination_address",
	"links.twitter": "twitter",
	"links.discord": "discord",
	"links.telegram": "telegram",
	"links.website": "website",
};

export function AddProjectForm() {
	const router = useRouter();
	const create = useCreateProject();
	const profile = useBuilderProfile();
	const { address } = useConnectedWallet();

	const form = useForm<AddProjectValues>({
		resolver: zodResolver(addProjectSchema),
		defaultValues: {
			title: "",
			logo_url: "",
			contact_email: "",
			destination_address: "",
			twitter: "",
			discord: "",
			telegram: "",
			website: "",
		},
		mode: "onTouched",
	});
	const { errors, isDirty } = form.formState;
	const wallet = useWatch({ control: form.control, name: "destination_address" });

	// Prefill the contact email from the account once it loads (only if the builder hasn't typed one).
	const accountEmail = profile.data?.email;
	useEffect(() => {
		if (accountEmail && !form.getValues("contact_email")) form.resetField("contact_email", { defaultValue: accountEmail });
	}, [accountEmail, form]);

	// Leaving with unsaved input asks first (the browser's own prompt).
	const guard = isDirty && !create.isSuccess;
	useEffect(() => {
		if (!guard) return;
		const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [guard]);

	const onSubmit = form.handleSubmit((v) =>
		create.mutate(
			{
				title: v.title,
				logo_url: v.logo_url,
				contact_email: v.contact_email,
				destination_address: v.destination_address,
				links: { twitter: v.twitter, discord: v.discord, telegram: v.telegram, website: v.website },
			},
			{
				onSuccess: (project) => {
					notify.success("Project submitted for review", `We’ll notify you when ${project.title} has been reviewed.`);
					router.push(`${routes.dashboard}?tab=pending`);
				},
				onError: (error) => {
					// Field-level 422s go next to the field; anything else shows above the button.
					const field = SERVER_FIELDS[String(errorData(error)?.field ?? "")];
					if (errorStatus(error) === 422 && field) form.setError(field, { message: errorMessage(error) }, { shouldFocus: true });
				},
			},
		),
	);

	const serverFieldError = errorStatus(create.error) === 422 && !!SERVER_FIELDS[String(errorData(create.error)?.field ?? "")];

	return (
		<div className="app-container py-10 md:py-[72px]">
			<section
				aria-labelledby="add-project-title"
				className="animate-rise mx-auto w-full max-w-[670px] rounded-[24px] bg-[#16161B] px-5 py-8 sm:px-8 md:rounded-[26px] md:px-10 md:py-10"
			>
				<h1 id="add-project-title" className="text-center font-display text-[32px] leading-tight font-bold md:text-[40px]">
					Add Project
				</h1>

				<form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-5 md:mt-8 md:gap-6">
					<TextField
						label="Project Name"
						autoComplete="off"
						maxLength={80}
						error={errors.title?.message}
						{...form.register("title")}
					/>

					<Controller
						control={form.control}
						name="logo_url"
						render={({ field, fieldState }) => (
							<ImageDropzone
								value={field.value}
								onChange={(v) => {
									field.onChange(v);
									if (v) form.clearErrors("logo_url");
								}}
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
							{...form.register("contact_email")}
						/>
						<TextField
							label="Wallet Address"
							autoComplete="off"
							spellCheck={false}
							placeholder="G…"
							className="min-w-0"
							error={errors.destination_address?.message}
							hint={
								address && wallet !== address ? (
									<button
										type="button"
										onClick={() => form.setValue("destination_address", address, { shouldValidate: true, shouldDirty: true })}
										className="animate-rise mt-2 inline-flex items-center gap-1.5 text-sm text-primary-300 hover:text-primary-200"
									>
										<Wallet className="size-3.5" aria-hidden /> Use connected wallet ({shortKey(address, 4, 4)})
									</button>
								) : (
									<p className="mt-1.5 text-xs text-white/45">Contributions go straight to this Stellar address.</p>
								)
							}
							{...form.register("destination_address", { setValueAs: (v: string) => v.trim().toUpperCase() })}
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

					<FormError message={create.isError && !serverFieldError ? errorMessage(create.error) : null} />

					<Button
						type="submit"
						size="lg"
						className="mt-2 h-14 w-full text-base md:h-[62px] md:text-lg"
						isLoading={create.isPending}
						loadingLabel="Submitting your project"
					>
						Submit Project
					</Button>
					<p className="-mt-2 text-center text-xs leading-5 text-white/45">
						An admin reviews every project before it goes public. You can follow it under Pending projects.
					</p>
				</form>
			</section>
		</div>
	);
}
