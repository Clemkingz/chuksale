"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, BadgeCheck, Lock, MessageSquareWarning, Plus, Trash2, Wallet } from "lucide-react";
import { PROJECT_STAGE_LABEL, PROJECT_TYPE_LABEL } from "@repo/domain/labels";
import type { Project, ProjectInput, ProjectStage, ProjectType } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { detailsByField, errorDetails, errorMessage, errorStatus } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { shortKey } from "@/lib/stellar/config";
import { assetLabel, useNetwork } from "@/lib/stellar/network";
import { notify } from "@/lib/use-toast";
import { FormError, TextAreaField, TextField } from "@/components/forms/Fields";
import { EmptyState, ErrorState } from "@/components/States";
import { useCategories } from "@/features/projects/hooks";
import { useConnectedWallet } from "@/features/wallet/hooks";
import { CoverUpload, LogoUpload } from "@/features/builder-projects/components/CoverUpload";
import { BackLink } from "@/components/BackLink";
import { useMe } from "@/features/builder-auth/hooks";
import { useBuilderProject, useSubmitProject, useUpdateProject } from "@/features/builder-projects/hooks";
import { projectSchema, type ProjectValues, dayOf, endOfDay } from "@/features/builder-projects/schema";

/**
 * /builder/projects/[id]/edit (backend guide, "Builder: create and edit"): only while `permissions.canEdit`
 * (draft or changes requested). Save keeps a draft; Submit saves then sends it for review. The API checks what a
 * submission needs and answers one line per problem, shown beside each field (and listed on top).
 */

const STAGES = Object.entries(PROJECT_STAGE_LABEL) as [ProjectStage, string][];
const TYPES = Object.entries(PROJECT_TYPE_LABEL) as [ProjectType, string][];

/** API field name → form field (the submit check speaks the API's names). */
const FIELD_OF: Record<string, FieldPath<ProjectValues>> = {
	title: "title",
	type: "type",
	summary: "summary",
	problem: "problem",
	solution: "solution",
	beneficiaries: "beneficiaries",
	categoryId: "categoryId",
	category: "categoryId",
	stage: "stage",
	teamMembers: "teamMembers",
	links: "links",
	targetAmount: "targetAmount",
	targetAssetId: "targetAssetId",
	acceptedAssetIds: "acceptedAssetIds",
	payoutAddress: "payoutAddress",
	fundingEndsAt: "fundingEndsAt",
};

const toValues = (p: Project): ProjectValues => ({
	title: p.title,
	type: p.type,
	categoryId: p.category?.id ?? "",
	stage: p.stage ?? "",
	summary: p.summary ?? "",
	problem: p.problem ?? "",
	solution: p.solution ?? "",
	beneficiaries: p.beneficiaries ?? "",
	teamMembers: p.teamMembers,
	links: p.links,
	fundraisingEnabled: p.fundraisingEnabled,
	targetAmount: p.targetAmount ?? "",
	targetAssetId: p.targetAsset?.id ?? "",
	acceptedAssetIds: p.acceptedAssets.map((a) => a.id),
	payoutAddress: p.payoutAddress ?? "",
	fundingEndsAt: dayOf(p.fundingEndsAt),
});

/** Only documented fields; empty text clears (null). */
const toInput = (v: ProjectValues): ProjectInput => {
	const t = (s: string) => (s.trim() ? s.trim() : null);
	return {
		title: v.title.trim(),
		type: v.type,
		categoryId: t(v.categoryId),
		stage: (t(v.stage) as ProjectStage | null) ?? null,
		summary: t(v.summary),
		problem: t(v.problem),
		solution: t(v.solution),
		beneficiaries: t(v.beneficiaries),
		teamMembers: v.teamMembers.map((m) => ({ name: m.name.trim(), role: m.role.trim() })),
		links: v.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
		fundraisingEnabled: v.fundraisingEnabled,
		targetAmount: t(v.targetAmount),
		targetAssetId: t(v.targetAssetId),
		acceptedAssetIds: v.acceptedAssetIds,
		payoutAddress: t(v.payoutAddress),
		fundingEndsAt: v.fundingEndsAt ? endOfDay(v.fundingEndsAt).toISOString() : null,
	};
};

export function EditProjectForm({ id }: { id: string }) {
	const q = useBuilderProject(id);
	if (q.isError)
		return (
			<div className="app-container py-16">
				{errorStatus(q.error) === 403 || errorStatus(q.error) === 404 ? (
					<EmptyState
						title="Project not found"
						action={
							<Button asChild className="w-auto px-6">
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
			<div className="app-container max-w-[820px] py-12" aria-hidden>
				<span className="skeleton-shimmer block h-[640px] rounded-[24px]" />
			</div>
		);
	if (!q.data.permissions.canEdit)
		return (
			<div className="app-container py-16">
				<EmptyState
					icon={<Lock className="size-6" aria-hidden />}
					title="This project can’t be edited right now"
					description="You can edit a project while it’s a draft or after the reviewer asks for changes."
					action={
						<Button asChild className="w-auto px-6">
							<Link href={routes.builderProject(id)}>View its status</Link>
						</Button>
					}
				/>
			</div>
		);
	return <Form project={q.data} />;
}

function Form({ project: p }: { project: Project }) {
	// react-hook-form + React Compiler: memoized register() props stop tracking fields after form.reset(). Opt out.
	"use no memo";

	const router = useRouter();
	const categories = useCategories();
	const network = useNetwork();
	const { address } = useConnectedWallet();
	const verified = useMe().data?.profile?.walletAddress ?? null;
	const save = useUpdateProject(p.id);
	const submit = useSubmitProject(p.id);
	const [problems, setProblems] = useState<string[]>([]);
	const form = useForm<ProjectValues>({ resolver: zodResolver(projectSchema), mode: "onTouched", defaultValues: toValues(p) });
	const team = useFieldArray({ control: form.control, name: "teamMembers" });
	const links = useFieldArray({ control: form.control, name: "links" });
	const { errors, isDirty } = form.formState;
	const [summary, problem, solution, beneficiaries, type, fundraising, accepted, targetAsset, payout] = useWatch({
		control: form.control,
		name: [
			"summary",
			"problem",
			"solution",
			"beneficiaries",
			"type",
			"fundraisingEnabled",
			"acceptedAssetIds",
			"targetAssetId",
			"payoutAddress",
		],
	});
	const reason = p.status === "changes_requested" ? p.latestFeedback?.reason : null;

	useEffect(() => {
		if (!isDirty) return;
		const warn = (e: BeforeUnloadEvent) => e.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [isDirty]);

	/** The API's lines go beside their fields; all of them are listed on top too. */
	const showProblems = (e: unknown) => {
		const lines = errorDetails(e);
		if (errorStatus(e) !== 400 || !lines.length) {
			setProblems([]);
			return notify.fromError(e);
		}
		setProblems(lines);
		const byField = detailsByField(e);
		let focused = false;
		for (const [apiField, message] of Object.entries(byField)) {
			const field = FIELD_OF[apiField];
			if (!field) continue;
			form.setError(field, { message }, { shouldFocus: !focused });
			focused = true;
		}
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	// Errors the API set (e.g. on the whole team list) would otherwise block every later save: clear them first.
	const fresh = (run: () => Promise<void>) => () => {
		form.clearErrors();
		void run();
	};

	const saveOnly = fresh(
		form.handleSubmit((v) => {
			setProblems([]);
			save.mutate(toInput(v), {
				onSuccess: (next) => {
					notify.success("Draft saved");
					form.reset(toValues(next));
				},
				onError: showProblems,
			});
		}),
	);

	const saveAndSubmit = fresh(
		form.handleSubmit((v) => {
			setProblems([]);
			save.mutate(toInput(v), {
				onSuccess: () => {
					submit.mutate(undefined, {
						onSuccess: () => {
							notify.success("Submitted for review");
							router.push(routes.submitted(p.id));
						},
						onError: showProblems,
					});
				},
				onError: showProblems,
			});
		}),
	);

	const toggleAsset = (id: string) =>
		form.setValue("acceptedAssetIds", accepted.includes(id) ? accepted.filter((a) => a !== id) : [...accepted, id], {
			shouldDirty: true,
			shouldValidate: true,
		});

	return (
		<div className="app-container max-w-[820px] py-8 md:py-12">
			<BackLink href={routes.builderProject(p.id)} label="Project status" />
			<h1 className="animate-rise mt-4 font-display text-[30px] font-bold md:text-[36px]">
				{p.status === "draft" ? "Finish your project" : "Edit project"}
			</h1>
			<p className="animate-rise mt-1 text-white/60 [--i:1]">Save as often as you like. Only you can see a draft.</p>
			{reason && (
				<div
					role="note"
					className="animate-pop mt-5 flex gap-3 rounded-2xl border border-warning-400/30 bg-warning-400/[0.06] px-5 py-4"
				>
					<MessageSquareWarning className="mt-0.5 size-5 shrink-0 text-warning-200" />
					<div>
						<p className="font-medium">What the reviewer asked for</p>
						<p className="mt-1 leading-7 whitespace-pre-line text-white/80">{reason}</p>
					</div>
				</div>
			)}
			{problems.length > 0 && (
				<div role="alert" className="animate-pop mt-5 rounded-2xl border border-error-400/30 bg-error-400/[0.07] px-5 py-4">
					<p className="flex items-center gap-2 font-medium text-error-100">
						<AlertTriangle className="size-4" /> A few things to fix before it can be reviewed
					</p>
					<ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-white/80">
						{problems.map((line) => (
							<li key={line}>{line.charAt(0).toUpperCase() + line.slice(1)}</li>
						))}
					</ul>
				</div>
			)}

			<form
				noValidate
				onSubmit={(e) => {
					e.preventDefault();
					saveAndSubmit();
				}}
				className="mt-7 flex flex-col gap-8"
			>
				<Group title="Basics">
					<TextField label="Project Name" maxLength={120} error={errors.title?.message} {...form.register("title")} />
					<fieldset>
						<legend className="mb-2.5 text-base">Type</legend>
						<div className="grid grid-cols-2 gap-2.5">
							{TYPES.map(([v, l]) => (
								<label
									key={v}
									className={cn(
										"flex cursor-pointer items-center justify-center rounded-lg border px-3 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40",
										type === v ? "border-primary-500 bg-primary-500/10" : "border-white/25 text-white/75 hover:border-white/45",
									)}
								>
									<input type="radio" value={v} className="sr-only" {...form.register("type")} />
									{l}
								</label>
							))}
						</div>
					</fieldset>
					<div className="grid gap-5 sm:grid-cols-2">
						<Select label="Category" error={errors.categoryId?.message} {...form.register("categoryId")}>
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
					{/* Stacked at every width: side by side, the logo's help text squeezed the cover into a sliver. */}
					<div className="flex min-w-0 flex-col gap-6">
						<LogoUpload projectId={p.id} url={p.logoUrl} />
						<CoverUpload projectId={p.id} url={p.coverImageUrl} />
					</div>
				</Group>

				<Group title="The story" hint="This is what reviewers and contributors read.">
					<TextAreaField
						label="Summary (20–280 characters)"
						maxLength={280}
						count={summary.length}
						placeholder="One or two sentences: what it is and who it helps."
						error={errors.summary?.message}
						{...form.register("summary")}
					/>
					<TextAreaField
						label="The problem (50–5,000 characters)"
						maxLength={5000}
						count={problem.length}
						error={errors.problem?.message}
						{...form.register("problem")}
					/>
					<TextAreaField
						label="The solution (50–5,000 characters)"
						maxLength={5000}
						count={solution.length}
						error={errors.solution?.message}
						{...form.register("solution")}
					/>
					<TextAreaField
						label="Who it helps (10–2,000 characters)"
						maxLength={2000}
						count={beneficiaries.length}
						rows={3}
						placeholder="e.g. Market traders and their suppliers in Lagos"
						error={errors.beneficiaries?.message}
						{...form.register("beneficiaries")}
					/>
				</Group>

				<Group title="Team" hint="At least one person is needed to submit (up to 20).">
					{team.fields.map((f, i) => (
						<div key={f.id} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
							<TextField
								label={`Name ${i + 1}`}
								maxLength={100}
								error={errors.teamMembers?.[i]?.name?.message}
								{...form.register(`teamMembers.${i}.name`)}
							/>
							<TextField
								label="Role"
								maxLength={100}
								placeholder="e.g. Founder, product"
								error={errors.teamMembers?.[i]?.role?.message}
								{...form.register(`teamMembers.${i}.role`)}
							/>
							<RemoveButton label={`Remove person ${i + 1}`} onClick={() => team.remove(i)} />
						</div>
					))}
					{(errors.teamMembers?.message || errors.teamMembers?.root?.message) && (
						<p className="text-sm text-error-200">{errors.teamMembers?.message ?? errors.teamMembers?.root?.message}</p>
					)}
					{team.fields.length < 20 && <AddButton onClick={() => team.append({ name: "", role: "" })}>Add a person</AddButton>}
				</Group>

				<Group title="Links" hint="Website, repository, socials. https:// only, up to 10.">
					{links.fields.map((f, i) => (
						<div key={f.id} className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-start">
							<TextField
								label="Label"
								maxLength={50}
								placeholder="e.g. GitHub"
								error={errors.links?.[i]?.label?.message}
								{...form.register(`links.${i}.label`)}
							/>
							<TextField
								label="Link"
								type="url"
								inputMode="url"
								placeholder="https://…"
								error={errors.links?.[i]?.url?.message}
								{...form.register(`links.${i}.url`)}
							/>
							<RemoveButton label={`Remove link ${i + 1}`} onClick={() => links.remove(i)} />
						</div>
					))}
					{(errors.links?.message || errors.links?.root?.message) && (
						<p className="text-sm text-error-200">{errors.links?.message ?? errors.links?.root?.message}</p>
					)}
					{links.fields.length < 10 && <AddButton onClick={() => links.append({ label: "", url: "" })}>Add a link</AddButton>}
				</Group>

				<Group
					title="Fundraising"
					hint="Contributions go straight from the contributor’s wallet to yours. Chucksales never holds funds."
				>
					<label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 px-4 py-3.5">
						<input type="checkbox" className="mt-1 size-4 accent-primary-500" {...form.register("fundraisingEnabled")} />
						<span>
							<span className="block font-medium">Accept contributions</span>
							<span className="block text-sm text-white/55">Turn off to list the project for feedback and suggestions only.</span>
						</span>
					</label>
					{fundraising && (
						<div className="animate-rise flex flex-col gap-5">
							<fieldset>
								<legend className="mb-2.5 text-base">Accepted assets</legend>
								<div className="grid gap-2.5 sm:grid-cols-2">
									{network.data?.assets.map((a) => (
										<label
											key={a.id}
											className={cn(
												"flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors",
												accepted.includes(a.id)
													? "border-primary-500 bg-primary-500/10"
													: "border-white/25 hover:border-white/45",
											)}
										>
											<input
												type="checkbox"
												checked={accepted.includes(a.id)}
												onChange={() => toggleAsset(a.id)}
												className="size-4 accent-primary-500"
											/>
											<span className="min-w-0">
												<span className="block">{a.code}</span>
												<span className="block truncate text-xs text-white/50">{a.native ? "Native asset" : assetLabel(a)}</span>
											</span>
										</label>
									)) ?? <span className="skeleton-shimmer block h-14 rounded-lg" />}
								</div>
								{errors.acceptedAssetIds?.message && (
									<p className="mt-1.5 text-sm text-error-200">{errors.acceptedAssetIds.message}</p>
								)}
								{accepted.some((idA) => network.data?.assets.find((a) => a.id === idA && !a.native)) && (
									<p className="mt-2 text-xs leading-5 text-white/55">
										To receive{" "}
										{network.data?.assets
											.filter((a) => !a.native && accepted.includes(a.id))
											.map((a) => a.code)
											.join(", ")}
										, your payout wallet needs a trustline for it. The API checks this when you submit.
									</p>
								)}
							</fieldset>
							<div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px]">
								<TextField
									label="Target (optional, a guide not a cap)"
									inputMode="decimal"
									placeholder="e.g. 2500"
									error={errors.targetAmount?.message}
									{...form.register("targetAmount")}
								/>
								<Select label="Target asset" error={errors.targetAssetId?.message} {...form.register("targetAssetId")}>
									<option value="">Choose</option>
									{network.data?.assets.map((a) => (
										<option key={a.id} value={a.id}>
											{a.code}
										</option>
									))}
								</Select>
							</div>
							<TextField
								label="Payout wallet"
								spellCheck={false}
								autoComplete="off"
								placeholder="G…"
								error={errors.payoutAddress?.message}
								hint={
									verified && payout !== verified ? (
										<button
											type="button"
											onClick={() => form.setValue("payoutAddress", verified, { shouldValidate: true, shouldDirty: true })}
											className="animate-rise mt-2 inline-flex items-center gap-1.5 text-sm text-primary-300 hover:text-primary-200"
										>
											<BadgeCheck className="size-3.5" aria-hidden /> Use my verified wallet ({shortKey(verified, 4, 4)})
										</button>
									) : address && payout !== address ? (
										<button
											type="button"
											onClick={() => form.setValue("payoutAddress", address, { shouldValidate: true, shouldDirty: true })}
											className="animate-rise mt-2 inline-flex items-center gap-1.5 text-sm text-primary-300 hover:text-primary-200"
										>
											<Wallet className="size-3.5" aria-hidden /> Use connected wallet ({shortKey(address, 4, 4)})
										</button>
									) : (
										<p className="mt-1.5 text-xs text-white/45">
											It must exist on Stellar {network.data?.network === "mainnet" ? "" : "Testnet "}(funded with XLM). Never
											enter a secret key.
										</p>
									)
								}
								{...form.register("payoutAddress", { setValueAs: (v: string) => v.trim().toUpperCase() })}
							/>
							<TextField
								label="Funding deadline (optional)"
								type="date"
								error={errors.fundingEndsAt?.message}
								hint={
									<p className="mt-1.5 text-xs text-white/45">
										Contributions close at the end of this day. Leave it empty to keep funding open.
									</p>
								}
								{...form.register("fundingEndsAt")}
							/>
							{targetAsset && !accepted.includes(targetAsset) && (
								<p className="text-sm text-warning-200">Accept the target’s asset too, so contributions can count toward it.</p>
							)}
						</div>
					)}
				</Group>

				<FormError message={save.isError && !problems.length ? errorMessage(save.error) : null} />
				<div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-white/10 bg-surface-900/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
					<Button
						type="button"
						variant="outline"
						className="h-12 px-6 sm:w-auto"
						onClick={saveOnly}
						isLoading={save.isPending && !submit.isPending}
						loadingLabel="Saving"
					>
						Save draft
					</Button>
					{p.permissions.canSubmit && (
						<Button
							type="submit"
							className="h-12 px-6 sm:w-auto"
							isLoading={submit.isPending || (save.isPending && form.formState.isSubmitting)}
							loadingLabel="Submitting"
						>
							{p.status === "changes_requested" ? "Save and resubmit" : "Save and submit for review"}
						</Button>
					)}
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

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-dashed border-white/25 px-4 text-sm text-white/80 hover:border-primary-400 hover:text-white"
		>
			<Plus className="size-4" /> {children}
		</button>
	);
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className="flex size-12 items-center justify-center self-end rounded-lg text-white/50 hover:bg-error-400/10 hover:text-error-200 sm:mt-[38px] sm:self-start"
		>
			<Trash2 className="size-4" />
		</button>
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
