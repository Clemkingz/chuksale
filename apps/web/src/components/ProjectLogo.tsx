import { cn } from "@repo/ui/lib/utils";

/** The project's logo in a circle (design: 46px white circle). No logo yet → initials on a tint from the title. */
const TINTS = ["#688CEC", "#8B6CEC", "#2FA58C", "#E08A3C", "#D3577A", "#3C9BE0"];

export function ProjectLogo({ title, src, className }: { title: string; src: string | null; className?: string }) {
	if (src)
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img src={src} alt="" className={cn("size-[46px] shrink-0 rounded-full bg-white object-cover", className)} />
		);
	const initials = title
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");
	const tint = TINTS[[...title].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
	return (
		<span
			aria-hidden
			style={{ backgroundColor: tint }}
			className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", className)}
		>
			{initials}
		</span>
	);
}
