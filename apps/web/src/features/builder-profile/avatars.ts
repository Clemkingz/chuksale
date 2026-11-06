/**
 * Ready-made profile pictures for builders who'd rather not upload a photo. Original artwork drawn as SVG (brand
 * periwinkle plus the status hues, a space motif each). Picking one renders it to a 512×512 PNG in the browser and
 * uploads it through the normal profile picture route (`PUT /auth/me/avatar`; the API takes JPEG, PNG or WebP).
 */

export interface AvatarPreset {
	id: string;
	label: string;
	svg: string;
}

const frame = (id: string, from: string, to: string, art: string) =>
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="512" height="512">` +
	`<defs><linearGradient id="g-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
	`<rect width="256" height="256" fill="url(#g-${id})"/>${art}</svg>`;

/** A friendly bust: head and shoulders, in a lighter tint of the background. */
const person = (fill: string) =>
	`<circle cx="128" cy="104" r="44" fill="${fill}"/><path d="M40 256c0-52 39-86 88-86s88 34 88 86z" fill="${fill}"/>`;

const star = (cx: number, cy: number, r: number, fill: string) => {
	const pts = Array.from({ length: 10 }, (_, i) => {
		const a = (Math.PI / 5) * i - Math.PI / 2;
		const rr = i % 2 ? r * 0.45 : r;
		return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
	}).join(" ");
	return `<polygon points="${pts}" fill="${fill}"/>`;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
	{ id: "builder-periwinkle", label: "Periwinkle builder", svg: frame("a", "#8EA9F2", "#3B5BDB", person("#DCE5FB")) },
	{ id: "builder-teal", label: "Teal builder", svg: frame("b", "#5FD3B6", "#1F7A66", person("#D3F4EB")) },
	{ id: "builder-amber", label: "Amber builder", svg: frame("c", "#F5B971", "#C2642A", person("#FDEBD5")) },
	{
		id: "planet",
		label: "Ringed planet",
		svg: frame(
			"d",
			"#2B2F55",
			"#0B0D1A",
			`<circle cx="128" cy="128" r="56" fill="#688CEC"/><circle cx="110" cy="110" r="18" fill="#8EA9F2" opacity=".6"/>` +
				`<ellipse cx="128" cy="132" rx="104" ry="26" fill="none" stroke="#F5B971" stroke-width="10" transform="rotate(-18 128 132)"/>` +
				`<circle cx="44" cy="52" r="3" fill="#fff"/><circle cx="204" cy="40" r="2.5" fill="#fff"/><circle cx="214" cy="214" r="3" fill="#fff"/>`,
		),
	},
	{
		id: "star",
		label: "Bright star",
		svg: frame(
			"e",
			"#8B6CEC",
			"#3A2580",
			star(128, 130, 78, "#FFE7A3") +
				`<circle cx="56" cy="60" r="4" fill="#fff"/><circle cx="200" cy="196" r="5" fill="#fff" opacity=".8"/>`,
		),
	},
	{
		id: "moon",
		label: "Crescent moon",
		svg: frame(
			"f",
			"#1C2A4A",
			"#06080F",
			`<circle cx="128" cy="128" r="70" fill="#EAF0FF"/><circle cx="160" cy="104" r="62" fill="#14203A"/>` +
				`<circle cx="190" cy="186" r="4" fill="#fff"/><circle cx="60" cy="70" r="3" fill="#fff"/><circle cx="206" cy="58" r="2.5" fill="#fff"/>`,
		),
	},
	{
		id: "sun",
		label: "Sunrise",
		svg: frame(
			"g",
			"#FFB36B",
			"#D3577A",
			Array.from({ length: 12 }, (_, i) => {
				const a = (Math.PI / 6) * i;
				return `<line x1="${128 + 64 * Math.cos(a)}" y1="${128 + 64 * Math.sin(a)}" x2="${128 + 92 * Math.cos(a)}" y2="${128 + 92 * Math.sin(a)}" stroke="#FFF3D6" stroke-width="10" stroke-linecap="round"/>`;
			}).join("") + `<circle cx="128" cy="128" r="50" fill="#FFF3D6"/>`,
		),
	},
	{
		id: "constellation",
		label: "Constellation",
		svg: frame(
			"h",
			"#2E3A8C",
			"#0F1433",
			`<polyline points="48,176 92,120 136,140 176,76 212,104" fill="none" stroke="#8EA9F2" stroke-width="4" stroke-linejoin="round"/>` +
				[
					[48, 176],
					[92, 120],
					[136, 140],
					[176, 76],
					[212, 104],
				]
					.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#FFFFFF"/>`)
					.join(""),
		),
	},
	{
		id: "comet",
		label: "Comet",
		svg: frame(
			"i",
			"#3C9BE0",
			"#123B6B",
			`<path d="M40 216 L150 106" stroke="#CFE8FF" stroke-width="22" stroke-linecap="round" opacity=".45"/>` +
				`<path d="M70 196 L150 106" stroke="#EAF5FF" stroke-width="12" stroke-linecap="round" opacity=".8"/>` +
				`<circle cx="164" cy="92" r="32" fill="#FFFFFF"/>`,
		),
	},
	{
		id: "orbit",
		label: "Orbits",
		svg: frame(
			"j",
			"#2FA58C",
			"#0E3D34",
			`<circle cx="128" cy="128" r="26" fill="#E6FFF7"/>` +
				`<circle cx="128" cy="128" r="60" fill="none" stroke="#9BE7D3" stroke-width="5"/>` +
				`<circle cx="128" cy="128" r="94" fill="none" stroke="#9BE7D3" stroke-width="4" opacity=".6"/>` +
				`<circle cx="188" cy="128" r="11" fill="#FFE7A3"/><circle cx="62" cy="62" r="9" fill="#FFFFFF"/>`,
		),
	},
];

export const presetSrc = (p: AvatarPreset) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.svg)}`;

/** Renders a preset to a 512×512 PNG file for upload. */
export async function presetToFile(p: AvatarPreset): Promise<File> {
	const img = new Image();
	img.decoding = "async";
	img.src = presetSrc(p);
	await img.decode();
	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 512;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Your browser couldn’t prepare that picture. Try uploading one instead.");
	ctx.drawImage(img, 0, 0, 512, 512);
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
	if (!blob) throw new Error("Your browser couldn’t prepare that picture. Try uploading one instead.");
	return new File([blob], `${p.id}.png`, { type: "image/png" });
}
