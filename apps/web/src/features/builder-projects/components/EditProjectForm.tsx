"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Lock, MessageSquareWarning } from "lucide-react";
import { PROJECT_STAGE_LABEL } from "@repo/domain/labels";
import type { ProjectStage } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { errorData, errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { notify } from "@/lib/use-toast";
import { email, socialLinks, stellarAddress } from "@/lib/validation";
import { ImageDropzone } from "@/components/forms/ImageDropzone";
import { FormError, TextAreaField, TextField } from "@/components/forms/Fields";
import { EmptyState, ErrorState } from "@/components/States";
import { useCategories } from "@/features/projects/hooks";
import {
	useBuilderProject,
	useSubmitProject,
	useUpdateProject,
	type BuilderProjectDetail,
} from "@/features/builder-projects/hooks";

/**
 * /builder/projects/[id]/edit (PRD §6.2 step 10, FR-PROJ-06): only while the project is a draft or changes were
 * requested. Collects the full PRD §6.2 details the reviewer needs (summary, problem, solution, who benefits,
 * category, stage, funding target) on top of the Add Project basics. The admin's reason stays visible on top.
 */

const STAGES = Object.entries(PROJECT_STAGE_LABEL) as [ProjectStage, string][];
const optionalText = (min: number, max: number, label: string) =>
	z
		.string()
		.trim()
		.refine((v) => !v || (v.length >= min && v.length <= max), `Use ${min}–${max} characters for ${label}.`);

const schema = z.object({
	title: z.string().trim().min(3, "Use at least 3 characters.").max(80),
	logo_url: z.string(),
	project_type: z.enum(["new_idea", "existing_project"]),
	summary: z
		.string()
		.trim()
		.min(20, "Write at least 20 characters: this is the first thing people read.")
		.max(280, "Keep it under 280 characters."),
	problem: optionalText(20, 2000, "the problem"),
	solution: optionalText(20, 2000, "the solution"),
	beneficiaries: optionalText(5, 500, "who it helps"),
	category_id: z.string().min(1, "Choose a category."),
	stage: z.string().min(1, "Choose a stage."),
	contact_email: email,
	destination_address: stellarAddress("Enter the Stellar wallet that should receive contributions."),
	target_amount: z
		.string()
		.trim()
		.refine((v) => !v || /^\d+(\.\d{1,7})?$/.test(v), "Use numbers only, with up to 7 decimals."),
	target_asset_id: z.enum(["xlm", "usdc"]),
	...socialLinks,
});
type Values = z.infer<typeof schema>;

const linkOf = (p: BuilderProjectDetail, label: string) => p.links.find((l) => l.label === label)?.url ?? "";

export function EditProjectForm({ id }: { id: string }) {
	const q = useBuilderProject(id);
	if (q.isError)
		return (
			<div className="app-container py-16">
				{errorStatus(q.error) === 403 || errorStatus(q.error) === 404 ? (
					<EmptyState
						title="Project not found"
						action={
							<Button asChild>
								<Link href={routes.dashboard}>Back to dashboard</Link>
							</Button>
						}
					/>
				) : (
					<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
				)}
			</div>
		);
	if (!q.data)
		return (
			<div className="app-container max-w-[760px] py-12" aria-hidden>
				<span className="skeleton-shimmer block h-[640px] rounded-[24px]" />
			</div>
		);
	if (!q.data.editable)
		return (
			<div className="app-container py-16">
				<EmptyState
					icon={<Lock className="size-6" aria-hidden />}
					title="This project can’t be edited right now"
					description="You can edit a project while it’s a draft or after the reviewer asks for changes."
					action={
						<Button asChild>
							<Link href={routes.builderProject(id)}>View its status</Link>
						</Button>
					}
				/>
			</div>
		);
	return <Form project={q.data} />;
}

function Form({ project: p }: { project: BuilderProjectDetail }) {
	const router = useRouter();
	const categories = useCategories();
	const save = useUpdateProject(p.id);
	const submit = useSubmitProject(p.id);
	const form = useForm<Values>({
		resolver: zodResolver(schema),
		mode: "onTouched",
		defaultValues: {
			title: p.title,
			logo_url: p.logo_url ?? "",
			project_type: p.project_type,
			summary: p.summary,
			problem: p.problem,
			solution: p.solution,
			beneficiaries: p.beneficiaries,
			category_id: p.category_id ?? "",
			stage: p.stage ?? "",
			contact_email: p.contact_email ?? "",
			destination_address: p.destination_address ?? "",
			target_amount: p.target_amount ? String(Number(p.target_amount)) : "",
			target_asset_id: (p.target_asset_id as "xlm" | "usdc") ?? "xlm",
			twitter: linkOf(p, "Twitter"),
			discord: linkOf(p, "Discord"),
			telegram: linkOf(p, "Telegram"),
			website: linkOf(p, "Website"),
		},
	});
	const { errors, isDirty } = form.formState;
	const summary = useWatch({ control: form.control, name: "summary" });
	const problem = useWatch({ control: form.control, name: "problem" });
	const solution = useWatch({ control: form.control, name: "solution" });
	const type = useWatch({ control: form.control, name: "project_type" });
	const reason = p.reviews.find((r) => r.decision === "request_changes")?.reason;

	useEffect(() => {
		if (!isDirty) return;
		const warn = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [isDirty]);

	const payload = (v: Values) => ({
		title: v.title,
		summary: v.summary,
		problem: v.problem,
		solution: v.solution,
		beneficiaries: v.beneficiaries,
		category_id: v.category_id,
		stage: v.stage,
		project_type: v.project_type,
		logo_url: v.logo_url,
		contact_email: v.contact_email,
		destination_address: v.destination_address.toUpperCase(),
		target_amount: v.target_amount,
		target_asset_id: v.target_asset_id,
		links: { twitter: v.twitter, discord: v.discord, telegram: v.telegram, website: v.website },
	});
	const onServerError = (e: unknown) => {
		const field = String(errorData(e)?.field ?? "").replace("links.", "") as keyof Values;
		if (errorStatus(e) === 422 && field in form.getValues())
			form.setError(field, { message: errorMessage(e) }, { shouldFocus: true });
		else notify.fromError(e);
	};

	const saveOnly = form.handleSubmit((v) =>
		save.mutate(payload(v), {
			onSuccess: () => {
				notify.success("Changes saved");
				form.reset(v);
			},
			onError: onServerError,
		}),
	);
	const saveAndSubmit = form.handleSubmit((v) =>
		save.mutate(payload(v), {
			onSuccess: () => {
				form.reset(v);
				submit.mutate(undefined, {
					onSuccess: () => {
						notify.success("Submitted for review");
						router.push(routes.submitted(p.id));
					},
					onError: onServerError,
				});
			},
			onError: onServerError,
		}),
	);

	return (
		<div className="app-container max-w-[820px] py-8 md:py-12">
			<Link
				href={routes.builderProject(p.id)}
				className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white"
			>
				<ArrowLeft className="size-4" /> Project status
			</Link>
			<h1 className="animate-rise mt-4 font-display text-[30px] font-bold md:text-[36px]">Edit project</h1>
			{reason && (
				<div
					role="note"
					className="animate-pop mt-5 flex gap-3 rounded-2xl border border-warning-400/30 bg-warning-400/[0.06] px-5 py-4"
				>
					<MessageSquareWarning className="mt-0.5 size-5 shrink-0 text-warning-200" />
					<div>
						<p className="font-medium">What the reviewer asked for</p>
						<p className="mt-1 leading-7 text-white/80">“{reason}”</p>
					</div>
				</div>
			)}

			<form noValidate onSubmit={saveAndSubmit} className="mt-7 flex flex-col gap-8">
				<Group title="Basics">
					<TextField label="Project Name" maxLength={80} error={errors.title?.message} {...form.register("title")} />
					<Controller
						control={form.control}
						name="logo_url"
						render={({ field }) => <ImageDropzone value={field.value} onChange={field.onChange} />}
					/>
					<fieldset>
						<legend className="mb-2.5 text-base">Type</legend>
						<div className="grid grid-cols-2 gap-2.5">
							{[
								["new_idea", "New idea"],
								["existing_project", "Existing project"],
							].map(([v, l]) => (
								<label
									key={v}
									className={cn(
										"flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40",
										type === v ? "border-primary-500 bg-primary-500/10" : "border-white/25 text-white/75 hover:border-white/45",
									)}
								>
									<input type="radio" value={v} className="sr-only" {...form.register("project_type")} />
									{l}
								</label>
							))}
						</div>
					</fieldset>
					<div className="grid gap-5 sm:grid-cols-2">
						<Select label="Category" error={errors.category_id?.message} {...form.register("category_id")}>
							<option value="">Choose a category</option>
							{categories.data?.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</Select>
						<Select label="Stage" error={errors.stage?.message} {...form.register("stage")}>
							<option value="">Choose a stage</option>
							{STAGES.map(([v, l]) => (
								<option key={v} value={v}>
									{l}
								</option>
							))}
						</Select>
					</div>
				</Group>

				<Group title="The story" hint="This is what reviewers and contributors read.">
					<TextAreaField
						label="Summary"
						maxLength={280}
						count={summary.length}
						placeholder="One or two sentences: what it is and who it helps."
						error={errors.summary?.message}
						{...form.register("summary")}
					/>
					<TextAreaField
						label="The problem"
						maxLength={2000}
						count={problem.length}
						error={errors.problem?.message}
						{...form.register("problem")}
					/>
					<TextAreaField
						label="The solution"
						maxLength={2000}
						count={solution.length}
						error={errors.solution?.message}
						{...form.register("solution")}
					/>
					<TextField
						label="Who it helps"
						maxLength={500}
						placeholder="e.g. 400 students in three rural schools"
						error={errors.beneficiaries?.message}
						{...form.register("beneficiaries")}
					/>
				</Group>

				<Group title="Funding" hint="Contributions go straight to this wallet (D1). The target is a guide, not a limit.">
					<TextField
						label="Wallet Address"
						spellCheck={false}
						placeholder="G…"
						error={errors.destination_address?.message}
						{...form.register("destination_address")}
					/>
					<div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_160px]">
						<TextField
							label="Funding target (optional)"
							inputMode="decimal"
							placeholder="e.g. 5000"
							error={errors.target_amount?.message}
							{...form.register("target_amount")}
						/>
						<Select label="Asset" {...form.register("target_asset_id")}>
							<option value="xlm">XLM</option>
							<option value="usdc">USDC</option>
						</Select>
					</div>
				</Group>

				<Group title="Contact & links">
					<TextField
						label="Email Address"
						type="email"
						error={errors.contact_email?.message}
						{...form.register("contact_email")}
					/>
					<div className="grid gap-5 sm:grid-cols-2">
						<TextField
							label="Twitter Page link"
							type="url"
							placeholder="https://x.com/…"
							error={errors.twitter?.message}
							{...form.register("twitter")}
						/>
						<TextField
							label="Discord Server link"
							type="url"
							placeholder="https://discord.gg/…"
							error={errors.discord?.message}
							{...form.register("discord")}
						/>
						<TextField
							label="Telegram Group link"
							type="url"
							placeholder="https://t.me/…"
							error={errors.telegram?.message}
							{...form.register("telegram")}
						/>
						<TextField
							label="Website link"
							type="url"
							placeholder="https://…"
							error={errors.website?.message}
							{...form.register("website")}
						/>
					</div>
				</Group>

				<FormError message={submit.isError ? errorMessage(submit.error) : null} />
				<div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-white/10 bg-surface-900/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
					<Button
						type="button"
						variant="outline"
						className="h-12 px-6 sm:w-auto"
						onClick={saveOnly}
						isLoading={save.isPending && !submit.isPending}
						loadingLabel="Saving"
					>
						Save changes
					</Button>
					<Button type="submit" className="h-12 px-6 sm:w-auto" isLoading={submit.isPending} loadingLabel="Submitting">
						{p.status === "changes_requested" ? "Save and resubmit" : "Save and submit for review"}
					</Button>
				</div>
			</form>
		</div>
	);
}

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
	return (
		<section data-reveal="up" className="rounded-[20px] bg-[#16161B] px-5 py-6 sm:px-7">
			<h2 className="font-display text-xl font-bold">{title}</h2>
			{hint && <p className="mt-1 text-sm text-white/55">{hint}</p>}
			<div className="mt-5 flex flex-col gap-5">{children}</div>
		</section>
	);
}

const Select = ({
	label,
	error,
	children,
	...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string }) => (
	<label className="block">
		<span className="mb-2.5 block text-base">{label}</span>
		<select
			aria-invalid={!!error}
			className={cn(
				"h-12 w-full cursor-pointer rounded-lg border bg-transparent px-3.5 text-base outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 [&>option]:bg-[#131318]",
				error ? "border-error-300" : "border-white/70",
			)}
			{...props}
		>
			{children}
		</select>
		{error && <span className="animate-rise mt-1.5 block text-sm text-error-200">{error}</span>}
	</label>
);
