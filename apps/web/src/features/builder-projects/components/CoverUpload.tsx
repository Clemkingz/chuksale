"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";
import { notify } from "@/lib/use-toast";
import { useRemoveCover, useUploadCover } from "@/features/builder-projects/hooks";

/**
 * Cover image (`PUT /builder/projects/{id}/cover`, multipart part `cover`): JPEG, PNG or WebP, up to 5 MB. Uploads
 * straight away; the API answers with the project and a signed link (it expires, so it's never stored).
 */
const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export function CoverUpload({ projectId, url, disabled }: { projectId: string; url: string | null; disabled?: boolean }) {
	const id = useId();
	const input = useRef<HTMLInputElement>(null);
	const upload = useUploadCover(projectId);
	const remove = useRemoveCover(projectId);
	const [error, setError] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);
	const busy = upload.isPending || remove.isPending;

	function pick(file: File | undefined) {
		if (!file) return;
		setError(null);
		if (!TYPES.includes(file.type)) return setError("Use a JPEG, PNG or WebP image.");
		if (file.size > MAX_BYTES) return setError("That image is over 5 MB. Try a smaller one.");
		upload.mutate(file, {
			onSuccess: () => notify.success("Cover updated"),
			onError: (e) =>
				setError(
					errorStatus(e) === 413
						? "That image is over 5 MB."
						: errorStatus(e) === 415
							? "That file isn’t a supported image."
							: errorStatus(e) === 503
								? "Image uploads aren’t available right now. Try again later."
								: errorMessage(e),
				),
		});
	}

	return (
		<div>
			<p id={`${id}-label`} className="mb-2.5 text-base">
				Cover image <span className="text-white/45">(optional)</span>
			</p>
			<div
				role="button"
				tabIndex={disabled ? -1 : 0}
				aria-labelledby={`${id}-label`}
				aria-describedby={`${id}-help`}
				aria-disabled={disabled || busy}
				onClick={() => !disabled && !busy && input.current?.click()}
				onKeyDown={(e) => {
					if ((e.key === "Enter" || e.key === " ") && !disabled && !busy) {
						e.preventDefault();
						input.current?.click();
					}
				}}
				onDragOver={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragLeave={() => setDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setDragging(false);
					if (!disabled && !busy) pick(e.dataTransfer.files[0]);
				}}
				className={cn(
					"relative flex h-44 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none",
					dragging ? "border-primary-400 bg-primary-500/10" : "border-white/30 hover:border-white/50",
					error && "border-error-300",
					(disabled || busy) && "cursor-default",
				)}
			>
				{url ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={url} alt="Project cover" className="absolute inset-0 size-full object-cover" />
				) : (
					<span className="flex flex-col items-center gap-2 text-sm text-white/65">
						<ImagePlus className="size-7 text-primary-300" aria-hidden />
						Drag and drop or click to upload
					</span>
				)}
				{busy && (
					<span className="absolute inset-0 flex items-center justify-center bg-black/50">
						<Loader2 className="size-6 animate-spin" aria-label={upload.isPending ? "Uploading" : "Removing"} />
					</span>
				)}
			</div>
			<div className="mt-2 flex flex-wrap items-center justify-between gap-2">
				<p id={`${id}-help`} className="text-xs text-white/45">
					JPEG, PNG or WebP, up to 5 MB. A wide image (about 1600×600) looks best.
				</p>
				{url && !disabled && (
					<div className="flex gap-1">
						<button
							type="button"
							onClick={() => input.current?.click()}
							disabled={busy}
							className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/5"
						>
							<RefreshCw className="size-3.5" /> Replace
						</button>
						<button
							type="button"
							onClick={() =>
								remove.mutate(undefined, {
									onSuccess: () => notify.info("Cover removed"),
									onError: (e) => setError(errorMessage(e)),
								})
							}
							disabled={busy}
							className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-error-200 hover:bg-error-400/10"
						>
							<Trash2 className="size-3.5" /> Remove
						</button>
					</div>
				)}
			</div>
			{error && <p className="animate-rise mt-1.5 text-sm text-error-200">{error}</p>}
			<input
				ref={input}
				type="file"
				accept={TYPES.join(",")}
				className="sr-only"
				tabIndex={-1}
				onChange={(e) => {
					pick(e.target.files?.[0]);
					e.target.value = "";
				}}
			/>
		</div>
	);
}
