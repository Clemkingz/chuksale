import { cn } from "@repo/ui/lib/utils";
import { STEPS } from "@/features/landing/content";

/**
 * Timeline card: a centre rule with steps alternating sides (image left / text right, then swapped).
 * On mobile the rule moves to the left and each step stacks number, title, text, image.
 */
export function HowItWorks() {
	return (
		<section id="how-it-works" aria-labelledby="how-title" className="relative isolate overflow-hidden py-20 md:py-[120px]">
			<div aria-hidden className="lp-glow -left-80 top-0 -z-10 h-[800px] w-[640px]" />
			<h2 data-reveal="up" id="how-title" className="text-center font-display text-3xl font-bold md:text-[40px]">
				How it works
			</h2>

			<div className="mx-auto mt-10 w-full max-w-[958px] px-4 sm:px-6 md:mt-[50px] lg:px-5">
				<ol
					data-progress
					className="relative rounded-[24px] bg-surface-600 px-5 py-10 md:rounded-[32px] md:px-[60px] md:py-[80px]"
				>
					{/* The rule fills as you scroll through the steps (--progress from @repo/ui/scroll-reveal). */}
					<span aria-hidden className="absolute top-[80px] bottom-[80px] left-[44px] w-px bg-white/15 md:left-1/2">
						<span className="absolute inset-0 origin-top scale-y-(--progress,1) bg-gradient-to-b from-white/80 to-primary-400" />
					</span>
					{STEPS.map((step, i) => {
						const imageLeft = i % 2 === 0;
						return (
							<li
								key={step.title}
								className="relative grid gap-6 pb-14 pl-12 last:pb-0 md:grid-cols-2 md:gap-[100px] md:pb-[110px] md:pl-0"
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									data-reveal={imageLeft ? "left" : "right"}
									style={{ "--d": 1 } as React.CSSProperties}
									src={step.image}
									alt=""
									width={400}
									height={400}
									loading="lazy"
									decoding="async"
									className={cn(
										"order-2 size-[150px] rounded-[14px] object-cover md:order-none md:size-[180px] md:rounded-[16px]",
										imageLeft ? "md:col-start-1 md:row-start-1 md:justify-self-end" : "md:col-start-2 md:row-start-1 md:mt-4",
									)}
								/>
								<div
									data-reveal="up"
									className={cn(
										"order-1 md:order-none md:row-start-1",
										imageLeft ? "md:col-start-2 md:pt-4" : "md:col-start-1 md:flex md:flex-col md:items-end md:text-right",
									)}
								>
									<span className="-ml-[52px] flex size-9 items-center justify-center rounded-full bg-primary-500 text-lg font-bold md:ml-0 md:size-[52px] md:text-[28px]">
										{i + 1}
									</span>
									<h3 className="mt-3 font-display text-xl font-bold md:mt-4 md:text-2xl">{step.title}</h3>
									<p className="mt-3 max-w-[400px] text-[15px] leading-6 text-white/90 md:text-base">{step.body}</p>
								</div>
							</li>
						);
					})}
				</ol>
			</div>
		</section>
	);
}
