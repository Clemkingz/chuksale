import { READY } from "@/features/landing/content";

/** Full-bleed periwinkle band with two audience CTAs and the overlapping photo pair. */
export function ReadyCta() {
	return (
		<section aria-labelledby="ready-title" className="bg-primary-500 py-16 md:py-[76px]">
			<div className="lp-container grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-10">
				<div className="max-w-[680px]">
					<h2
						data-reveal="up"
						id="ready-title"
						className="font-display text-[32px] leading-[1.1] font-bold text-balance text-white md:text-5xl lg:text-[44px] xl:text-5xl"
					>
						{READY.titleTop} <br className="hidden xl:block" />
						{READY.titleBottom}
					</h2>
					<p data-reveal="up" style={{ "--d": 1 } as React.CSSProperties} className="mt-4 text-base leading-[1.6] text-white/95">
						{READY.body}
					</p>
					<div
						data-reveal="up"
						style={{ "--d": 2 } as React.CSSProperties}
						className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-6"
					>
						<a
							href={READY.builder.href}
							className="lp-btn h-12 bg-white px-6 text-base text-primary-500 hover:bg-primary-50 sm:w-[183px]"
						>
							{READY.builder.label}
						</a>
						<a
							href={READY.contributor.href}
							className="lp-btn h-12 bg-white px-6 text-base text-primary-500 hover:bg-primary-50 sm:w-[183px]"
						>
							{READY.contributor.label}
						</a>
					</div>
				</div>

				<div className="relative mx-auto h-[260px] w-full max-w-[508px] sm:h-[317px] lg:w-[460px] xl:w-[508px]">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						data-reveal="right"
						src="/images/ready-builder.webp"
						alt="A builder reviewing code on a large screen"
						width={800}
						height={533}
						loading="lazy"
						decoding="async"
						className="absolute top-0 right-0 h-full w-[76%] rounded-[20px] object-cover"
					/>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						data-reveal="zoom"
						style={{ "--d": 3 } as React.CSSProperties}
						src="/images/ready-contributor.webp"
						alt="A smiling contributor at his desk"
						width={400}
						height={400}
						loading="lazy"
						decoding="async"
						className="absolute top-[24%] left-0 aspect-square w-[34%] rounded-[16px] object-cover ring-4 ring-primary-500"
					/>
				</div>
			</div>
		</section>
	);
}
