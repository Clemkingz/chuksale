"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { EyeOff, ImagePlus, Megaphone, Pencil, Trash2, X } from "lucide-react";
import type { ProjectUpdate } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/dialog";
import { cn } from "@repo/ui/lib/utils";
import { detailsByField, errorMessage, errorStatus } from "@/lib/api/errors";
import { timeAgo } from "@/lib/time";
import { notify } from "@/lib/use-toast";
import { FormError, TextAreaField, TextField } from "@/components/forms/Fields";
import { IMAGE_TYPES, ImageUpload, MAX_IMAGE_BYTES, imageErrorMessage } from "@/components/ImageUpload";
import { EmptyState, ErrorState } from "@/components/States";
import {
	useBuilderUpdates,
	useDeleteUpdate,
	useEditUpdate,
	usePostUpdate,
	useUpdateImage,
} from "@/features/builder-projects/hooks";

/**
 * Project updates on the builder's status page (approved projects): post progress for supporters. An update is
 * public at once and every wallet that contributed is notified; edits don't notify again. Plain text only. An admin
 * can remove one; the builder then sees it greyed out with the reason.
 */

const TITLE_MAX = 120;
const BODY_MAX = 5000;

const schema = z.object({
	title: z
		.string()
		.trim()
		.min(5, "Use at least 5 characters.")
		.max(TITLE_MAX, `Use ${TITLE_MAX} characters or fewer.`)
		.refine((v) => !v.includes("\n"), "Keep the title on one line."),
	body: z
		.string()
		.trim()
		.min(20, "Write at least 20 characters.")
		.max(BODY_MAX, `Use ${BODY_MAX.toLocaleString()} characters or fewer.`),
});
type Values = z.infer<typeof schema>;

export function ProjectUpdates({ projectId }: { projectId: string }) {
	const q = useBuilderUpdates(projectId);
	const [editing, setEditing] = useState<ProjectUpdate | null>(null);
	const [deleting, setDeleting] = useState<ProjectUpdate | null>(null);
	const items = q.data?.result ?? [];

	return (
		<section aria-labelledby="updates-title" data-reveal="up" className="mt-8">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<h2 id="updates-title" className="flex items-center gap-2 font-display text-xl font-bold">
						<Megaphone className="size-5 text-primary-300" aria-hidden /> Updates
					</h2>
					<p className="mt-1 text-sm text-white/55">
						Share progress with supporters. Updates are public right away, and everyone who contributed is notified.
					</p>
				</div>
			</div>

			<Composer projectId={projectId} />

			<div className="mt-6">
				{q.isPending ? (
					<div aria-hidden className="flex flex-col gap-3">
						{[0, 1].map((k) => (
							<span key={k} className="skeleton-shimmer block h-28 rounded-2xl" />
						))}
					</div>
				) : q.isError ? (
					<ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
				) : items.length === 0 ? (
					<EmptyState title="No updates yet" description="Your first update will appear on the project page." />
				) : (
					<ul className="flex flex-col gap-4">
						{items.map((u, i) => (
							<li key={u.id} data-reveal="up" style={{ "--d": i % 4 } as React.CSSProperties}>
								<UpdateItem update={u} onEdit={() => setEditing(u)} onDelete={() => setDeleting(u)} />
							</li>
						))}
					</ul>
				)}
			</div>

			{editing && <EditDialog projectId={projectId} update={editing} onClose={() => setEditing(null)} />}
			{deleting && <DeleteDialog projectId={projectId} update={deleting} onClose={() => setDeleting(null)} />}
		</section>
	);
}

function UpdateItem({ update: u, onEdit, onDelete }: { update: ProjectUpdate; onEdit: () => void; onDelete: () => void }) {
	const removed = u.status === "removed";
	return (
		<article
			className={cn(
				"rounded-2xl border p-5",
				removed ? "border-error-400/25 bg-error-400/[0.04]" : "border-white/10 bg-[#11121A]",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="flex flex-wrap items-center gap-x-2 text-xs text-white/50">
						{timeAgo(u.createdAt)}
						{u.updatedAt !== u.createdAt && !removed && <span>· edited</span>}
						{removed && (
							<span className="inline-flex items-center gap-1 rounded-full bg-error-400/15 px-2 py-0.5 text-error-100">
								<EyeOff className="size-3" aria-hidden /> Removed by an admin
							</span>
						)}
					</p>
					<h3 className={cn("mt-1.5 font-display text-lg font-bold break-words", removed && "text-white/60")}>{u.title}</h3>
				</div>
				<div className="flex shrink-0 gap-1">
					{!removed && (
						<Button variant="ghost" size="icon" className="size-9" aria-label={`Edit “${u.title}”`} onClick={onEdit}>
							<Pencil className="size-4" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="size-9 text-error-200 hover:bg-error-400/10"
						aria-label={`Delete “${u.title}”`}
						onClick={onDelete}
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>
			{removed && u.removalReason && (
				<p className="mt-3 rounded-lg border-l-2 border-error-300 bg-error-400/[0.08] px-3 py-2 text-sm leading-6 whitespace-pre-line text-white/85">
					<span className="font-medium">Reason: </span>
					{u.removalReason}
				</p>
			)}
			<p className={cn("mt-2 leading-7 break-words whitespace-pre-line", removed ? "text-white/50" : "text-white/80")}>
				{u.body}
			</p>
			{u.imageUrl && (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={u.imageUrl}
					alt=""
					className={cn("mt-4 max-h-[320px] w-full rounded-xl object-cover", removed && "opacity-50")}
				/>
			)}
		</article>
	);
}

/** New update: title + text, optional image (uploaded right after the update is created). */
function Composer({ projectId }: { projectId: string }) {
	// react-hook-form + React Compiler: memoized register() props stop tracking fields after form.reset(). Opt out.
	"use no memo";

	const post = usePostUpdate(projectId);
	const image = useUpdateImage(projectId);
	const [open, setOpen] = useState(false);
	const [file, setFile] = useState<File | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);
	const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", body: "" }, mode: "onTouched" });
	const { errors } = form.formState;
	const [title, body] = useWatch({ control: form.control, name: ["title", "body"] });

	const onSubmit = form.handleSubmit((v) =>
		post.mutate(
			{ title: v.title, body: v.body },
			{
				onSuccess: (created) => {
					const done = () => {
						notify.success("Update posted", "It’s on your project page, and your supporters were notified.");
						form.reset();
						setFile(null);
						setOpen(false);
					};
					if (!file) return done();
					image.mutate(
						{ id: created.id, file },
						{
							onSuccess: done,
							onError: (e) => {
								done();
								notify.error("The update is posted, but the image didn’t upload", imageErrorMessage(e));
							},
						},
					);
				},
				onError: (e) => {
					const byField = detailsByField(e);
					if (byField.title) form.setError("title", { message: byField.title });
					if (byField.body) form.setError("body", { message: byField.body });
				},
			},
		),
	);

	if (!open)
		return (
			<Button className="mt-4 w-auto gap-2 px-5" onClick={() => setOpen(true)}>
				<Megaphone className="size-4" /> Post an update
			</Button>
		);

	return (
		<form
			noValidate
			onSubmit={onSubmit}
			className="animate-rise mt-4 flex flex-col gap-5 rounded-2xl border border-primary-500/30 bg-[#11121A] p-5"
		>
			<TextField
				label="Title"
				maxLength={TITLE_MAX}
				placeholder="e.g. Ten more classrooms have light"
				error={errors.title?.message}
				{...form.register("title")}
			/>
			<TextAreaField
				label="What happened"
				rows={5}
				maxLength={BODY_MAX}
				count={body.length}
				placeholder="Progress, what the funds paid for, what’s next. Plain text; line breaks are kept."
				error={errors.body?.message}
				{...form.register("body")}
			/>
			<div>
				<p className="mb-2 text-base">
					Image <span className="text-white/45">(optional)</span>
				</p>
				{file ? (
					<div className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm">
						<ImagePlus className="size-4 text-primary-300" aria-hidden />
						<span className="min-w-0 flex-1 truncate">{file.name}</span>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="size-8"
							aria-label="Remove image"
							onClick={() => setFile(null)}
						>
							<X className="size-4" />
						</Button>
					</div>
				) : (
					<label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-white/30 px-4 text-sm text-white/75 hover:border-white/50">
						<ImagePlus className="size-4" aria-hidden /> Choose an image
						<input
							type="file"
							accept={IMAGE_TYPES.join(",")}
							className="sr-only"
							onChange={(e) => {
								const f = e.target.files?.[0];
								e.target.value = "";
								setFileError(null);
								if (!f) return;
								if (!IMAGE_TYPES.includes(f.type)) return setFileError("Use a JPEG, PNG or WebP image.");
								if (f.size > MAX_IMAGE_BYTES) return setFileError("That image is over 5 MB.");
								setFile(f);
							}}
						/>
					</label>
				)}
				{fileError && <p className="mt-1.5 text-sm text-error-200">{fileError}</p>}
			</div>
			<FormError
				message={
					post.isError && !detailsByField(post.error).title && !detailsByField(post.error).body
						? errorStatus(post.error) === 409
							? "Updates can only be posted while the project is approved."
							: errorMessage(post.error)
						: null
				}
			/>
			<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<Button
					type="button"
					variant="ghost"
					className="h-11 sm:w-auto sm:px-5"
					onClick={() => {
						form.reset();
						setFile(null);
						setOpen(false);
					}}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					className="h-11 sm:w-auto sm:px-6"
					disabled={!title.trim()}
					isLoading={post.isPending || image.isPending}
					loadingLabel="Posting update"
				>
					Post update
				</Button>
			</div>
		</form>
	);
}

function EditDialog({ projectId, update: u, onClose }: { projectId: string; update: ProjectUpdate; onClose: () => void }) {
	const edit = useEditUpdate(projectId);
	const image = useUpdateImage(projectId);
	const [imageUrl, setImageUrl] = useState(u.imageUrl);
	const form = useForm<Values>({
		resolver: zodResolver(schema),
		defaultValues: { title: u.title, body: u.body },
		mode: "onTouched",
	});
	const { errors } = form.formState;
	const body = useWatch({ control: form.control, name: "body" });

	const onSubmit = form.handleSubmit((v) =>
		edit.mutate(
			{ id: u.id, title: v.title, body: v.body },
			{
				onSuccess: () => {
					notify.success("Update saved");
					onClose();
				},
				onError: (e) => {
					const byField = detailsByField(e);
					if (byField.title) form.setError("title", { message: byField.title });
					if (byField.body) form.setError("body", { message: byField.body });
				},
			},
		),
	);

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-h-[92vh] overflow-y-auto border-white/10 bg-[#131318] text-white sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>Edit update</DialogTitle>
					<DialogDescription className="text-white/60">Supporters aren’t notified again about an edit.</DialogDescription>
				</DialogHeader>
				<form noValidate id="edit-update" onSubmit={onSubmit} className="flex flex-col gap-5">
					<TextField label="Title" maxLength={TITLE_MAX} error={errors.title?.message} {...form.register("title")} />
					<TextAreaField
						label="What happened"
						rows={6}
						maxLength={BODY_MAX}
						count={body.length}
						error={errors.body?.message}
						{...form.register("body")}
					/>
					<ImageUpload
						label="Image"
						url={imageUrl}
						alt="Update image"
						help="JPEG, PNG or WebP, up to 5 MB. Changes right away."
						uploading={image.isPending && !!image.variables?.file}
						removing={image.isPending && !image.variables?.file}
						onUpload={(file) => image.mutateAsync({ id: u.id, file }).then((next) => setImageUrl(next?.imageUrl ?? null))}
						onRemove={() => image.mutateAsync({ id: u.id, file: null }).then(() => setImageUrl(null))}
					/>
					<FormError
						message={edit.isError && !Object.keys(detailsByField(edit.error)).length ? errorMessage(edit.error) : null}
					/>
				</form>
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" className="sm:w-auto" onClick={onClose}>
						Cancel
					</Button>
					<Button type="submit" form="edit-update" className="sm:w-auto sm:px-6" isLoading={edit.isPending} loadingLabel="Saving">
						Save changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeleteDialog({ projectId, update: u, onClose }: { projectId: string; update: ProjectUpdate; onClose: () => void }) {
	const del = useDeleteUpdate(projectId);
	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="border-white/10 bg-[#131318] text-white sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle>Delete this update?</DialogTitle>
					<DialogDescription className="text-white/60">
						“{u.title}” and its image are deleted for good. This can’t be undone.
					</DialogDescription>
				</DialogHeader>
				{del.isError && <FormError message={errorMessage(del.error)} />}
				<DialogFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" className="sm:w-auto" onClick={onClose}>
						Keep it
					</Button>
					<Button
						variant="destructive"
						className="sm:w-auto"
						isLoading={del.isPending}
						loadingLabel="Deleting"
						onClick={() =>
							del.mutate(u.id, {
								onSuccess: () => {
									notify.info("Update deleted");
									onClose();
								},
							})
						}
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
