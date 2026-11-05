import { preload } from "react-dom";
import { CountUp } from "@repo/ui/count-up";
import { HERO, STATS } from "@/features/landing/content";

const rise = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** Hero + stats card. The dark cube grid sits behind the headline; side glows come from `lp-glow`. */
export function Hero() {
	// The grid is a CSS background, which the browser finds late; fetch it with the HTML instead.
	preload("/images/hero-grid.webp", { as: "image", fetchPriority: "high" });

	return (
		<section className="relative isolate overflow-hidden pb-20 md:pb-28">
			<div
				aria-hidden
				data-parallax="0.3"
				className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[url('/images/hero-grid.webp')] bg-cover bg-center opacity-90 md:h-[880px] [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
			/>
			<div aria-hidden className="lp-glow -left-64 top-40 -z-10 h-[620px] w-[520px] md:-left-48" />
			<div aria-hidden className="lp-glow -right-64 top-10 -z-10 h-[620px] w-[520px] md:-right-48" />

			<div className="lp-container flex flex-col items-center pt-24 text-center md:pt-[230px]">
				<h1
					style={rise(0)}
					className="animate-rise font-display text-[44px] leading-[1.08] font-bold tracking-[-0.02em] sm:text-6xl md:text-7xl lg:text-[88px]"
				>
					{HERO.titleTop}
					<br />
					{HERO.titleBottom}
				</h1>
				<p style={rise(1)} className="animate-rise mt-5 max-w-[640px] text-base text-white/90 md:mt-6 md:text-lg">
					{HERO.subtitle}
				</p>

				<div style={rise(2)} className="animate-rise mt-9 flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:gap-8">
					<a
						href={HERO.primary.href}
						className="lp-btn h-14 bg-primary-500 text-lg text-white hover:bg-primary-600 sm:h-[62px] sm:w-[234px]"
					>
						{HERO.primary.label}
					</a>
					<a
						href={HERO.secondary.href}
						className="lp-btn h-14 border border-primary-500 text-lg text-primary-400 hover:bg-primary-500/10 sm:h-[62px] sm:w-[234px]"
					>
						{HERO.secondary.label}
					</a>
				</div>
			</div>

			<div className="lp-narrow mt-20 md:mt-[228px]">
				<dl
					data-reveal="up"
					className="grid grid-cols-3 gap-2 rounded-[24px] bg-surface-700 px-4 py-7 md:rounded-[32px] md:px-10 md:py-10"
				>
					{STATS.map((stat) => (
						<div key={stat.label} className="flex flex-col-reverse items-center text-center">
							<dt className="mt-1 text-sm text-white/90 md:text-xl">{stat.label}</dt>
							<dd className="font-display text-3xl font-bold text-primary-500 md:text-5xl">
								<CountUp value={stat.value} />
								<sup className="ml-0.5 align-super text-base text-primary-400 md:text-2xl">+</sup>
							</dd>
						</div>
					))}
				</dl>
			</div>
		</section>
	);
}
