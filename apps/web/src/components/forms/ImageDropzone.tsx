"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

/**
 * Designs "Add Project" (Project Logo) and "Edit Profile" (Profile Image): a dashed tile + "Drag and drop or click to upload". Click, keyboard
 * (Enter/Space) and drag-and-drop all work. Raster images are scaled down to 350×350 in the browser so the stored
 * data URL stays small; SVGs and small GIFs (animation) are kept as they are.
 */

/** Design: "Recommended size: 350px x 350px. File types: JPG, JPEG, PNG, SVG or GIF". */
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/gif"] as const;
const MAX_BYTES = 5 * 1024 * 1024;
const TARGET_SIZE = 350;
const KEEP_AS_IS_BYTES = 1024 * 1024;

function readAsDataUrl(file: Blob) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = () => reject(new Error("We couldn’t read that file."));
		reader.readAsDataURL(file);
	});
}

async function toLogo(file: File) {
	if (file.type === "image/svg+xml" || (file.type === "image/gif" && file.size <= KEEP_AS_IS_BYTES)) {
		if (file.size > KEEP_AS_IS_BYTES) throw new Error("SVG images must be under 1 MB.");
		return readAsDataUrl(file);
	}
	const bitmap = await createImageBitmap(file).catch(() => {
		throw new Error("That image looks damaged. Try another file.");
	});
	// Fit inside 350×350 (never upscale), keeping the aspect ratio and transparency.
	const scale = Math.min(1, TARGET_SIZE / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	return canvas.toDataURL("image/webp", 0.9); // browsers without WebP encoding return PNG
}

export function ImageDropzone({
	value,
	onChange,
	error,
	label = "Project Logo",
	round = false,
}: {
	value: string;
	onChange: (dataUrl: string) => void;
	error?: string;
	label?: string;
	/** Preview as a circle (profile photos). */
	round?: boolean;
}) {
	const id = useId();
	const input = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [busy, setBusy] = useState(false);
	const [fileError, setFileError] = useState<string | null>(null);
	const shownError = fileError ?? error;

	async function accept(file: File | undefined) {
		if (!file) return;
		setFileError(null);
		if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) return setFileError("Use a JPG, JPEG, PNG, SVG or GIF file.");
		if (file.size > MAX_BYTES) return setFileError("That file is over 5 MB. Try a smaller image.");
		setBusy(true);
		try {
			onChange(await toLogo(file));
		} catch (e) {
			setFileError(e instanceof Error ? e.message : "We couldn’t use that image.");
		} finally {
			setBusy(false);
		}
	}

	const open = () => input.current?.click();

	return (
		<div>
			<span id={`${id}-label`} className="mb-2.5 block text-base text-white">
				{label}
			</span>
			<div
				role="button"
				tabIndex={0}
				aria-labelledby={`${id}-label ${id}-hint`}
				aria-describedby={shownError ? `${id}-error` : undefined}
				aria-busy={busy}
				onClick={open}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						open();
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
					void accept(e.dataTransfer.files[0]);
				}}
				className={cn(
					"group flex cursor-pointer flex-col items-center gap-5 rounded-lg border p-5 text-center transition-[border-color,background-color,box-shadow] duration-200 outline-none sm:flex-row sm:gap-8 sm:p-6 sm:text-left",
					"focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/30",
					dragging ? "border-primary-400 bg-primary-500/10 ring-2 ring-primary-500/30" : "border-white/70 hover:border-white",
					shownError && !dragging && "border-error-300",
				)}
			>
				<span
					className={cn(
						"relative flex size-[110px] shrink-0 items-center justify-center overflow-hidden rounded-xl text-primary-500 transition-transform duration-300 ease-(--ease-settle) md:size-[136px]",
						value ? "bg-[#1E2030]" : "border-[1.5px] border-dashed border-white/60",
						value && round && "rounded-full",
						dragging && "scale-[1.04]",
					)}
				>
					{busy ? (
						<Loader2 className="size-7 animate-spin" aria-hidden />
					) : value ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={value}
							alt={`${label} preview`}
							className={cn("animate-pop size-full", round ? "object-cover" : "object-contain")}
						/>
					) : (
						<ImagePlus className="size-8 transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden />
					)}
				</span>
				<span id={`${id}-hint`} className="flex flex-col gap-2 text-white">
					<span className="text-base">
						{dragging ? "Drop to upload" : value ? "Image added. Click or drop to replace" : "Drag and drop or click to upload"}
					</span>
					<span className="text-sm leading-6 text-white/80 sm:text-base">
						Recommended size : 350px x 350px.
						<br />
						File types: JPG, JPEG, PNG, SVG or GIF
					</span>
					{value && !busy && (
						<span className="-ml-2.5 flex flex-wrap justify-center gap-1 sm:justify-start">
							<span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-primary-300 group-hover:bg-white/5">
								<RefreshCw className="size-3.5" aria-hidden /> Replace
							</span>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onChange("");
								}}
								className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-error-200 hover:bg-error-400/10"
							>
								<Trash2 className="size-3.5" aria-hidden /> Remove
							</button>
						</span>
					)}
				</span>
			</div>
			<input
				ref={input}
				type="file"
				accept={IMAGE_TYPES.join(",")}
				className="sr-only"
				tabIndex={-1}
				aria-hidden
				onChange={(e) => {
					void accept(e.target.files?.[0]);
					e.target.value = ""; // picking the same file again still fires
				}}
			/>
			{shownError && (
				<p id={`${id}-error`} role="alert" className="animate-rise mt-1.5 text-sm text-error-200">
					{shownError}
				</p>
			)}
		</div>
	);
}
