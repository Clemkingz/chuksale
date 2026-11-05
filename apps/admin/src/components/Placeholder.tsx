import { PageTitle } from "@/components/ui";

/** Console page that's waiting for its design. Delete when no page uses it. */
export function Placeholder({ title, route, phase }: { title: string; route: string; phase: string }) {
	return (
		<div className="admin-container pt-2 md:pt-6">
			<PageTitle>{title}</PageTitle>
			<div className="admin-card mt-8 flex flex-col items-center px-6 py-16 text-center">
				<p className="font-display text-lg font-bold">Awaiting design</p>
				<p className="mt-1.5 max-w-[420px] text-sm leading-6 text-white/60">
					{route} · Phase {phase}. This area is part of the PRD and will be built when its screen is ready.
				</p>
			</div>
		</div>
	);
}
