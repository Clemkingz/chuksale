/**
 * The social preview card (1200×630) every app renders through `next/og` in its `opengraph-image.tsx`
 * (stellance-v3 pattern). Inline styles only: the renderer supports a subset of CSS and needs `display: flex`
 * on any element with more than one child. Brand: #05070C background, #688CEC primary, Roboto.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export interface OgCardProps {
	/** Data URLs (the app reads the files at build time). PNG or JPEG only: the renderer can't read WebP. */
	logo: string;
	illustration?: string;
	eyebrow: string;
	title: string;
	subtitle: string;
	/** Footer line, usually the site's host. */
	domain: string;
	/** A project funding card in the corner, the product's core idea. */
	showFunding?: boolean;
}

export function OgCard({ logo, illustration, eyebrow, title, subtitle, domain, showFunding = true }: OgCardProps) {
	const narrow = !!illustration || showFunding;
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				position: "relative",
				backgroundColor: "#05070c",
				backgroundImage:
					"radial-gradient(circle at 0% 100%, rgba(104,140,236,0.35) 0%, rgba(5,7,12,0) 45%), radial-gradient(circle at 100% 0%, rgba(104,140,236,0.28) 0%, rgba(5,7,12,0) 40%)",
				fontFamily: "Roboto",
				color: "#ffffff",
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					padding: "64px 72px",
					width: narrow ? 720 : 1056,
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
					<img src={logo} width={52} height={52} alt="" style={{ borderRadius: 999 }} />
					<span style={{ fontSize: 36, fontWeight: 700 }}>Chucksales</span>
				</div>

				<div style={{ display: "flex", flexDirection: "column" }}>
					<div
						style={{
							display: "flex",
							alignSelf: "flex-start",
							fontSize: 20,
							fontWeight: 500,
							padding: "8px 18px",
							borderRadius: 999,
							color: "#a3c1fb",
							border: "1px solid rgba(104,140,236,0.5)",
							backgroundColor: "rgba(104,140,236,0.12)",
						}}
					>
						{eyebrow}
					</div>
					<div style={{ display: "flex", fontSize: 62, fontWeight: 700, lineHeight: 1.08, marginTop: 26, letterSpacing: -1 }}>
						{title}
					</div>
					<div
						style={{
							display: "flex",
							fontSize: 26,
							fontWeight: 500,
							lineHeight: 1.4,
							marginTop: 22,
							color: "rgba(255,255,255,0.72)",
						}}
					>
						{subtitle}
					</div>
				</div>

				<div style={{ display: "flex", fontSize: 20, color: "#688cec", fontWeight: 500 }}>{domain}</div>
			</div>

			{illustration && (
				<img
					src={illustration}
					alt=""
					width={380}
					height={380}
					style={{ position: "absolute", right: 72, top: 125, borderRadius: 28, opacity: showFunding ? 0.9 : 1 }}
				/>
			)}

			{showFunding && (
				<div
					style={{
						position: "absolute",
						right: illustration ? 300 : 72,
						top: illustration ? 360 : 200,
						width: 320,
						display: "flex",
						flexDirection: "column",
						padding: 24,
						borderRadius: 20,
						backgroundColor: "#161626",
						border: "1px solid rgba(255,255,255,0.12)",
						boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "rgba(255,255,255,0.6)" }}>
						<span>Raised</span>
						<span>Stellar Testnet</span>
					</div>
					<div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#ffffff", marginTop: 8 }}>3,750 XLM</div>
					<div
						style={{ display: "flex", height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", marginTop: 16 }}
					>
						<div style={{ display: "flex", width: "75%", height: 8, borderRadius: 999, backgroundColor: "#688cec" }} />
					</div>
					<div
						style={{
							display: "flex",
							justifyContent: "space-between",
							fontSize: 16,
							marginTop: 12,
							color: "rgba(255,255,255,0.6)",
						}}
					>
						<span>75% of 5,000 XLM</span>
						<span style={{ color: "#a3c1fb" }}>Verified on-chain</span>
					</div>
				</div>
			)}
		</div>
	);
}
