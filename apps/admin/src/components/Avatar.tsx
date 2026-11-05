import { cn } from "@repo/ui/lib/utils";

/** A person's photo, or their initials on the brand gradient. */
export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
	const initials = name
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? "")
		.join("");
	return src ? (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt="" className={cn("size-12 shrink-0 rounded-full object-cover", className)} />
	) : (
		<span
			aria-hidden
			className={cn(
				"flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-700 font-display font-bold text-white",
				className,
			)}
		>
			{initials}
		</span>
	);
}

/** A wallet's colour dot (contributors have no photos): two hues derived from the address. */
export function WalletDot({ address, className }: { address: string; className?: string }) {
	let h = 0;
	for (const ch of address) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	const a = h % 360;
	const b = (a + 40 + ((h >> 8) % 80)) % 360;
	return (
		<span
			aria-hidden
			style={{ backgroundImage: `linear-gradient(135deg, hsl(${a} 70% 62%), hsl(${b} 70% 45%))` }}
			className={cn("inline-block size-8 shrink-0 rounded-full ring-2 ring-surface-900", className)}
		/>
	);
}
