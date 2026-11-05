import { cn } from "@repo/ui/lib/utils";
import { withBasePath } from "@/lib/site";

/**
 * Full-page loader: the logo mark breathing inside a periwinkle ring that orbits, with a short status line.
 * Used by every `loading.tsx` and while a guarded area checks the session. Calm, not flashy: it's a money product.
 */
export function BrandLoader({ label = "Loading", className }: { label?: string; className?: string }) {
	return (
		<div
			role="status"
			aria-live="polite"
			className={cn("flex min-h-[60vh] flex-col items-center justify-center gap-5", className)}
		>
			<div className="relative size-20">
				<svg viewBox="0 0 80 80" className="animate-orbit absolute inset-0" aria-hidden>
					<circle cx="40" cy="40" r="36" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="3" />
					<circle
						cx="40"
						cy="40"
						r="36"
						fill="none"
						stroke="#688cec"
						strokeWidth="3"
						strokeLinecap="round"
						strokeDasharray="60 170"
					/>
				</svg>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={withBasePath("/apple-icon.png")}
					alt=""
					width={48}
					height={48}
					className="animate-breathe absolute inset-4 size-12 rounded-full"
				/>
			</div>
			<p className="text-sm text-white/60">{label}…</p>
		</div>
	);
}
