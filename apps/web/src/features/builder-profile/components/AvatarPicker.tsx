"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { Me } from "@repo/domain/types";
import { Button } from "@repo/ui/button";
import { cn } from "@repo/ui/lib/utils";
import { notify } from "@/lib/use-toast";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, imageErrorMessage } from "@/components/ImageUpload";
import { ProjectLogo } from "@/components/ProjectLogo";
import { useAvatar } from "@/features/builder-auth/hooks";
import { AVATAR_PRESETS, presetSrc, presetToFile, type AvatarPreset } from "@/features/builder-profile/avatars";

/**
 * Profile picture: upload a photo, or pick one of the ready-made avatars (rendered to PNG and uploaded the same way,
 * `PUT /auth/me/avatar`). The API answers with a signed link that expires, so the picture is always read from
 * `GET /auth/me`, never stored.
 */
export function AvatarPicker({ me }: { me: Me }) {
	const avatar = useAvatar();
	const input = useRef<HTMLInputElement>(null);
	const [error, setError] = useState<string | null>(null);
	const [busyPreset, setBusyPreset] = useState<string | null>(null);
	const [chosen, setChosen] = useState<string | null>(null);
	const name = me.profile?.displayName || me.name;

	async function upload(file: File, preset?: AvatarPreset) {
		setError(null);
		setBusyPreset(preset?.id ?? "upload");
		try {
			await avatar.mutateAsync(file);
			setChosen(preset?.id ?? null);
			notify.success("Profile picture updated");
		} catch (e) {
			setError(imageErrorMessage(e));
		} finally {
			setBusyPreset(null);
		}
	}

	async function pickPreset(p: AvatarPreset) {
		try {
			await upload(await presetToFile(p), p);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Couldn’t use that picture.");
			setBusyPreset(null);
		}
	}

	return (
		<div>
			<p className="mb-3 text-base">Profile picture</p>
			<div className="flex flex-col gap-5 sm:flex-row sm:items-center">
				<div className="relative shrink-0 self-start">
					<ProjectLogo title={name} src={me.avatarUrl} className="size-24 text-2xl ring-4 ring-white/5" />
					{busyPreset === "upload" && (
						<span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55">
							<Loader2 className="size-6 animate-spin" aria-label="Uploading" />
						</span>
					)}
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							className="h-10 w-auto gap-2 px-4"
							disabled={!!busyPreset}
							onClick={() => input.current?.click()}
						>
							<ImagePlus className="size-4" /> Upload a photo
						</Button>
						{me.avatarUrl && (
							<Button
								type="button"
								variant="ghost"
								className="h-10 w-auto gap-2 px-3 text-error-200 hover:bg-error-400/10"
								disabled={!!busyPreset}
								isLoading={avatar.isPending && avatar.variables === null}
								loadingLabel="Removing"
								onClick={() =>
									avatar.mutate(null, {
										onSuccess: () => {
											setChosen(null);
											notify.info("Profile picture removed");
										},
										onError: (e) => setError(imageErrorMessage(e)),
									})
								}
							>
								<Trash2 className="size-4" /> Remove
							</Button>
						)}
					</div>
					<p className="text-xs leading-5 text-white/45">JPEG, PNG or WebP up to 5 MB. A square photo works best.</p>
				</div>
			</div>

			<p className="mt-6 text-sm text-white/65">Or choose one of ours</p>
			<ul className="mt-3 grid grid-cols-5 gap-2.5 sm:grid-cols-10 sm:gap-3" aria-label="Ready-made avatars">
				{AVATAR_PRESETS.map((p) => {
					const selected = chosen === p.id && !!me.avatarUrl;
					return (
						<li key={p.id}>
							<button
								type="button"
								onClick={() => void pickPreset(p)}
								disabled={!!busyPreset}
								aria-label={`Use the “${p.label}” avatar`}
								aria-pressed={selected}
								title={p.label}
								className={cn(
									"relative block aspect-square w-full overflow-hidden rounded-full ring-2 ring-transparent transition-[transform,box-shadow] duration-200 hover:scale-105 focus-visible:ring-primary-400 focus-visible:outline-none disabled:cursor-default disabled:hover:scale-100",
									selected && "ring-primary-400",
								)}
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={presetSrc(p)} alt="" className="size-full" />
								{busyPreset === p.id && (
									<span className="absolute inset-0 flex items-center justify-center bg-black/55">
										<Loader2 className="size-5 animate-spin" aria-label="Setting picture" />
									</span>
								)}
								{selected && busyPreset !== p.id && (
									<span className="absolute right-0.5 bottom-0.5 flex size-5 items-center justify-center rounded-full bg-primary-500 ring-2 ring-[#16161B]">
										<Check className="size-3" aria-hidden />
									</span>
								)}
							</button>
						</li>
					);
				})}
			</ul>
			{error && (
				<p role="alert" className="animate-rise mt-3 text-sm text-error-200">
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
					const f = e.target.files?.[0];
					e.target.value = "";
					if (!f) return;
					if (!IMAGE_TYPES.includes(f.type)) return setError("Use a JPEG, PNG or WebP image.");
					if (f.size > MAX_IMAGE_BYTES) return setError("That image is over 5 MB. Try a smaller one.");
					void upload(f);
				}}
			/>
		</div>
	);
}
