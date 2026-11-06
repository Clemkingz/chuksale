"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { errorMessage, errorStatus } from "@/lib/api/errors";

/**
 * One image field for the API's upload routes (one multipart part; JPEG, PNG or WebP up to 5 MB, checked by its
 * bytes). Uploads as soon as a file is picked or dropped; the API answers with a signed link that expires, so it's
 * shown, never stored. Shapes: `wide` (covers, banners, update images), `square` (logos), `round` (avatars).
 */

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** The API's image errors in plain words. */
export function imageErrorMessage(e: unknown) {
	const status = errorStatus(e);
	if (status === 413) return "That image is over 5 MB.";
	if (status === 415) return "That file isn’t a supported image.";
	if (status === 503) return "Image uploads aren’t available right now. Try again later.";
	return errorMessage(e);
}

export function ImageUpload({
	label,
	optional = true,
	url,
	alt,
	shape = "wide",
	help,
	disabled,
	uploading,
	removing,
	onUpload,
	onRemove,
	className,
	placeholder,
}: {
	label: string;
	optional?: boolean;
	url: string | null;
	alt: string;
	shape?: "wide" | "square" | "round";
	help: string;
	disabled?: boolean;
	uploading: boolean;
	removing?: boolean;
	/** Resolve on success; reject with the API error. */
	onUpload: (file: File) => Promise<unknown>;
	onRemove?: () => Promise<unknown>;
	className?: string;
	/** Shown in the empty box instead of the default prompt. */
	placeholder?: ReactNode;
}) {
	const id = useId();
	const input = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);
	const busy = uploading || !!removing;
	const locked = disabled || busy;

	function pick(file: File | undefined) {
		if (!file) return;
		setError(null);
		if (!IMAGE_TYPES.includes(file.type)) return setError("Use a JPEG, PNG or WebP image.");
		if (file.size > MAX_IMAGE_BYTES) return setError("That image is over 5 MB. Try a smaller one.");
		onUpload(file).catch((e) => setError(imageErrorMessage(e)));
	}

	const box = shape === "wide" ? "h-44 w-full rounded-xl" : shape === "square" ? "size-28 rounded-2xl" : "size-28 rounded-full";

	return (
		<div className={className}>
			<p id={`${id}-label`} className="mb-2.5 text-base">
				{label} {optional && <span className="text-white/45">(optional)</span>}
			</p>
			<div className={cn("flex gap-4", shape === "wide" ? "flex-col" : "items-center")}>
				<div
					role="button"
					tabIndex={locked ? -1 : 0}
					aria-labelledby={`${id}-label`}
					aria-describedby={`${id}-help`}
					aria-disabled={locked}
					onClick={() => !locked && input.current?.click()}
					onKeyDown={(e) => {
						if ((e.key === "Enter" || e.key === " ") && !locked) {
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
						if (!locked) pick(e.dataTransfer.files[0]);
					}}
					className={cn(
						"relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-dashed transition-colors focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none",
						box,
						dragging ? "border-primary-400 bg-primary-500/10" : "border-white/30 hover:border-white/50",
						error && "border-error-300",
						locked && "cursor-default",
					)}
				>
					{url ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={url} alt={alt} className="absolute inset-0 size-full object-cover" />
					) : (
						(placeholder ?? (
							<span className="flex flex-col items-center gap-2 px-2 text-center text-sm text-white/65">
								<ImagePlus className="size-7 text-primary-300" aria-hidden />
								{shape === "wide" ? "Drag and drop or click to upload" : "Upload"}
							</span>
						))
					)}
					{busy && (
						<span className="absolute inset-0 flex items-center justify-center bg-black/50">
							<Loader2 className="size-6 animate-spin" aria-label={uploading ? "Uploading" : "Removing"} />
						</span>
					)}
				</div>
				<div className={cn("flex min-w-0 flex-col gap-2", shape === "wide" && "sm:flex-row sm:items-center sm:justify-between")}>
					<p id={`${id}-help`} className="text-xs leading-5 text-white/45">
						{help}
					</p>
					{!disabled && (
						<div className="flex flex-wrap gap-1">
							<button
								type="button"
								onClick={() => input.current?.click()}
								disabled={busy}
								className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/5"
							>
								{url ? <RefreshCw className="size-3.5" /> : <ImagePlus className="size-3.5" />} {url ? "Replace" : "Choose file"}
							</button>
							{url && onRemove && (
								<button
									type="button"
									onClick={() => {
										setError(null);
										onRemove().catch((e) => setError(errorMessage(e)));
									}}
									disabled={busy}
									className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-error-200 hover:bg-error-400/10"
								>
									<Trash2 className="size-3.5" /> Remove
								</button>
							)}
						</div>
					)}
				</div>
			</div>
			{error && (
				<p role="alert" className="animate-rise mt-1.5 text-sm text-error-200">
					{error}
				</p>
			)}
			<input
				ref={input}
				type="file"
				accept={IMAGE_TYPES.join(",")}
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
