"use client";

/**
 * Last-resort boundary (the root layout itself failed), so it brings its own <html> and inline styles: the app's
 * CSS may not have loaded.
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return (
		<html lang="en">
			<body
				style={{
					margin: 0,
					minHeight: "100dvh",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					background: "#05070c",
					color: "#fff",
					fontFamily: "Roboto, system-ui, sans-serif",
					textAlign: "center",
					padding: 24,
				}}
			>
				<div style={{ maxWidth: 420 }}>
					<h1 style={{ fontSize: 30, margin: 0 }}>Chucksales is having trouble</h1>
					<p style={{ color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
						Something went wrong while loading the app. Nothing was sent from your wallet. Please try again.
					</p>
					<button
						onClick={retry}
						style={{
							marginTop: 16,
							height: 48,
							padding: "0 28px",
							border: 0,
							borderRadius: 8,
							background: "#688cec",
							color: "#fff",
							fontSize: 16,
							cursor: "pointer",
						}}
					>
						Try again
					</button>
				</div>
			</body>
		</html>
	);
}
