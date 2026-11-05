/** Profile photos: JPG/PNG/GIF/SVG up to 5 MB, downscaled in the browser to fit 350×350 (D21). */
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024;
const SIZE = 350;

const read = (file: Blob) =>
	new Promise<string>((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => resolve(String(r.result));
		r.onerror = () => reject(new Error("We couldn’t read that file."));
		r.readAsDataURL(file);
	});

export async function toAvatar(file: File) {
	if (!IMAGE_TYPES.includes(file.type)) throw new Error("Use a JPG, PNG, SVG or GIF image.");
	if (file.size > MAX_BYTES) throw new Error("That file is over 5 MB. Try a smaller image.");
	if (file.type === "image/svg+xml") {
		if (file.size > 1024 * 1024) throw new Error("SVG images must be under 1 MB.");
		return read(file);
	}
	const bitmap = await createImageBitmap(file).catch(() => {
		throw new Error("That image looks damaged. Try another file.");
	});
	// Square crop from the centre, then scale: avatars are always round.
	const side = Math.min(bitmap.width, bitmap.height);
	const out = Math.min(SIZE, side);
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = out;
	canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
	bitmap.close();
	return canvas.toDataURL("image/webp", 0.9);
}
