/** "just now", "5m ago", "2h ago", "3d ago", then a short date. Matches the notifications design ("2h ago"). */
export function timeAgo(iso: string, now = Date.now()) {
	const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
	if (seconds < 45) return "just now";
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.round(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Time left until a funding deadline: "12 days left", "5 hours left", "40 min left", or ended. Counted on the client
 * from the API's `endsAt`; the API's `ended` flag stays the authority on whether contributions are refused.
 */
export function timeLeft(endsAt: string, now = Date.now()) {
	const ms = new Date(endsAt).getTime() - now;
	if (ms <= 0) return { ended: true, soon: true, label: "Funding ended" };
	const minutes = Math.ceil(ms / 60_000);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const label =
		days >= 2 ? `${days} days left` : hours >= 2 ? `${hours} hours left` : hours === 1 ? "1 hour left" : `${minutes} min left`;
	return { ended: false, soon: days < 3, label };
}

/** "Ends 18 Nov 2026" / "Ended 4 Nov 2026". */
export const deadlineDate = (endsAt: string) =>
	new Date(endsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
