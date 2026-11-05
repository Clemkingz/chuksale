import { Eye, LockKeyhole, ShieldCheck } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { FEATURES, type FeatureIcon } from "@/features/landing/content";

const ICONS: Record<FeatureIcon, typeof Eye> = { eye: Eye, lock: LockKeyhole, check: ShieldCheck };

/** Three alternating image/text rows (image left, right, left on desktop; image first on mobile). */
export function Features() {
	return (
		<section aria-label="Why Chucksales" className="relative isolate overflow-hidden py-16 md:py-[130px]">
			<div aria-hidden className="lp-glow -right-72 top-[45%] -z-10 h-[700px] w-[560px]" />
			<div className="lp-narrow flex flex-col gap-20 md:gap-[240px]">
				{FEATURES.map((feature, i) => {
					const Icon = ICONS[feature.icon];
					const reversed = i % 2 === 1;
					return (
						<article key={feature.title} className="grid items-center gap-8 md:grid-cols-2 md:gap-[80px]">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								data-reveal={reversed ? "right" : "left"}
								src={feature.image.src}
								alt={feature.image.alt}
								width={480}
								height={480}
								loading="lazy"
								decoding="async"
								className={cn("aspect-square w-full rounded-[20px] object-cover md:rounded-[24px]", reversed && "md:order-2")}
							/>
							<div className={cn("flex flex-col items-start", reversed && "md:order-1")}>
								<span
									data-reveal="zoom"
									className="flex size-12 items-center justify-center rounded-lg bg-surface-500 text-primary-500"
								>
									<Icon className="size-6" aria-hidden />
								</span>
								<h2
									data-reveal="up"
									style={{ "--d": 1 } as React.CSSProperties}
									className="mt-3 font-display text-[28px] leading-[1.1] font-bold text-primary-500 md:text-[32px]"
								>
									{feature.title}
								</h2>
								<p
									data-reveal="up"
									style={{ "--d": 2 } as React.CSSProperties}
									className="mt-3 text-base leading-6 text-white/90 lg:text-justify"
								>
									{feature.body}
								</p>
								<a
									data-reveal="up"
									style={{ "--d": 3 } as React.CSSProperties}
									href={feature.cta.href}
									className="lp-btn mt-7 h-[52px] min-w-[147px] bg-primary-500 px-6 text-base text-white hover:bg-primary-600"
								>
									{feature.cta.label}
								</a>
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
}
