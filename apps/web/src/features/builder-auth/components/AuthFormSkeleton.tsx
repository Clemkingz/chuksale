/** Placeholder with the auth form's shape, so the page doesn't jump when it loads. */
export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
	return (
		<div aria-hidden className="flex flex-col gap-5">
			<span className="skeleton-shimmer mx-auto h-9 w-3/4 rounded-lg" />
			{Array.from({ length: fields }, (_, i) => (
				<span key={i} className="flex flex-col gap-2.5">
					<span className="skeleton-shimmer h-4 w-28 rounded" />
					<span className="skeleton-shimmer h-12 rounded-lg" />
				</span>
			))}
			<span className="skeleton-shimmer h-12 rounded-lg" />
		</div>
	);
}
