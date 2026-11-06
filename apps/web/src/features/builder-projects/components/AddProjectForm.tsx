"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PROJECT_TYPE_LABEL } from "@repo/domain/labels";
import type { ProjectType } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { detailsByField, errorMessage } from "@/lib/api/errors";
import { routes } from "@/lib/routes";
import { notify } from "@/lib/use-toast";
import { FormError, TextField } from "@/components/forms/Fields";
import { useCreateProject } from "@/features/builder-projects/hooks";
import { addProjectSchema, type AddProjectValues } from "@/features/builder-projects/schema";
import { BackLink } from "@/components/BackLink";

/**
 * Design "Dev add project 2", tailored to the API: a project starts as a private draft with just a type and a
 * name (`POST /builder/projects`). The builder fills in the rest at their own pace and submits it for review from
 * the editor that opens next.
 */

const TYPES = Object.entries(PROJECT_TYPE_LABEL) as [ProjectType, string][];
const TYPE_HINT: Record<ProjectType, string> = {
	new_idea: "Something you want to start",
	existing_project: "Already running or being built",
};

export function AddProjectForm() {
	const router = useRouter();
	const create = useCreateProject();
	const form = useForm<AddProjectValues>({
		resolver: zodResolver(addProjectSchema),
		defaultValues: { title: "", type: "new_idea" },
		mode: "onTouched",
	});
	const type = useWatch({ control: form.control, name: "type" });
	const { errors } = form.formState;

	const onSubmit = form.handleSubmit((v) =>
		create.mutate(
			{ type: v.type, title: v.title.trim() },
			{
				onSuccess: (project) => {
					notify.success("Draft created", "Add the details, then submit it for review. Only you can see it.");
					router.push(routes.editProject(project.id));
				},
				onError: (e) => {
					const byField = detailsByField(e);
					if (byField.title) form.setError("title", { message: byField.title }, { shouldFocus: true });
				},
			},
		),
	);

	return (
		<div className="app-container py-8 md:py-12">
			<BackLink href={routes.dashboard} label="Dashboard" className="mx-auto flex w-full max-w-[670px]" />
			<section
				aria-labelledby="add-project-title"
				className="animate-rise mx-auto w-full max-w-[670px] rounded-[24px] bg-[#16161B] px-5 py-8 sm:px-8 md:rounded-[26px] md:px-10 md:py-10"
			>
				<h1 id="add-project-title" className="text-center font-display text-[32px] leading-tight font-bold md:text-[40px]">
					Add Project
				</h1>
				<p className="mx-auto mt-2 max-w-[460px] text-center text-white/65">
					Start a draft. You can save as you go and submit it for review when it’s ready.
				</p>

				<form noValidate onSubmit={onSubmit} className="mt-7 flex flex-col gap-6 md:mt-8">
					<fieldset>
						<legend className="mb-2.5 text-base">What are you adding?</legend>
						<div className="grid gap-3 sm:grid-cols-2">
							{TYPES.map(([v, label]) => (
								<label
									key={v}
									className={cn(
										"flex cursor-pointer flex-col rounded-xl border px-4 py-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500/40",
										type === v ? "border-primary-500 bg-primary-500/10" : "border-white/20 hover:border-white/40",
									)}
								>
									<input type="radio" value={v} className="sr-only" {...form.register("type")} />
									<span className="font-medium">{label}</span>
									<span className="mt-0.5 text-sm text-white/55">{TYPE_HINT[v]}</span>
								</label>
							))}
						</div>
					</fieldset>

					<TextField
						label="Project Name"
						autoComplete="off"
						maxLength={120}
						error={errors.title?.message}
						{...form.register("title")}
					/>

					<FormError message={create.isError && !detailsByField(create.error).title ? errorMessage(create.error) : null} />

					<Button
						type="submit"
						size="lg"
						className="mt-1 h-14 w-full text-base md:h-[62px] md:text-lg"
						isLoading={create.isPending}
						loadingLabel="Creating your draft"
					>
						Create draft
					</Button>
					<p className="-mt-2 text-center text-xs leading-5 text-white/45">
						Drafts are private. An admin reviews every project before it goes public.
					</p>
				</form>
			</section>
		</div>
	);
}
