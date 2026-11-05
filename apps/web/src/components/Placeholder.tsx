/** Temporary page body until the screen is built from its design. Delete when no page uses it. */
export function Placeholder({ title, route, phase }: { title: string; route: string; phase: string }) {
	return (
		<section className="app-container animate-page py-16 md:py-24">
			<p className="text-sm text-white/50">
				{route} · Phase {phase} · awaiting design
			</p>
			<h1 className="mt-2 font-display text-3xl font-bold md:text-5xl">{title}</h1>
		</section>
	);
}
