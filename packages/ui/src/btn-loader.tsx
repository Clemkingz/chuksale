import { cn } from "./lib/utils";

/**
 * The design's button loader (A3): a ring of eight dots fading around the circle. Inherits `currentColor`.
 * Reduced-motion visitors get a static ring (the label is announced by the button's aria-busy).
 */
const DOTS = Array.from({ length: 8 }, (_, i) => i);

export default function BtnLoader({ className, label = "Loading" }: { className?: string; label?: string }) {
	return (
		<span role="status" aria-label={label} className={cn("relative inline-block size-6", className)}>
			<span className="absolute inset-0 motion-safe:animate-[spin_0.9s_steps(8)_infinite]">
				{DOTS.map((i) => (
					<span
						key={i}
						className="absolute top-1/2 left-1/2 size-[18%] rounded-full bg-current"
						style={{
							transform: `rotate(${i * 45}deg) translate(0, -170%)`,
							translate: "-50% -50%",
							opacity: 0.25 + (i / 7) * 0.75,
						}}
					/>
				))}
			</span>
		</span>
	);
}
