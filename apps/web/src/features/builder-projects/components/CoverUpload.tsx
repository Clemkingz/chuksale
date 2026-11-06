"use client";

import { notify } from "@/lib/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { useRemoveCover, useRemoveLogo, useUploadCover, useUploadLogo } from "@/features/builder-projects/hooks";

/** Cover (`PUT …/cover`, part `cover`) and logo (`PUT …/logo`, part `logo`), while the project is editable. */

export function CoverUpload({ projectId, url, disabled }: { projectId: string; url: string | null; disabled?: boolean }) {
	const upload = useUploadCover(projectId);
	const remove = useRemoveCover(projectId);
	return (
		<ImageUpload
			label="Cover image"
			url={url}
			alt="Project cover"
			help="JPEG, PNG or WebP, up to 5 MB. A wide image (about 1600×600) looks best."
			disabled={disabled}
			uploading={upload.isPending}
			removing={remove.isPending}
			onUpload={(file) => upload.mutateAsync(file).then(() => notify.success("Cover updated"))}
			onRemove={() => remove.mutateAsync(undefined).then(() => notify.info("Cover removed"))}
		/>
	);
}

export function LogoUpload({ projectId, url, disabled }: { projectId: string; url: string | null; disabled?: boolean }) {
	const upload = useUploadLogo(projectId);
	const remove = useRemoveLogo(projectId);
	return (
		<ImageUpload
			label="Logo"
			shape="square"
			url={url}
			alt="Project logo"
			help="A square image (at least 256×256), JPEG, PNG or WebP up to 5 MB. Shown on cards and the project page."
			disabled={disabled}
			uploading={upload.isPending}
			removing={remove.isPending}
			onUpload={(file) => upload.mutateAsync(file).then(() => notify.success("Logo updated"))}
			onRemove={() => remove.mutateAsync(undefined).then(() => notify.info("Logo removed"))}
		/>
	);
}
