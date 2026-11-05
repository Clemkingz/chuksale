import type { Metadata } from "next";
import { WalletView } from "@/features/contributions/components/WalletView";

export const metadata: Metadata = {
	title: "My wallet",
	description: "Your Stellar wallet's balance and every contribution it has sent.",
};

/** /wallet: the contributor page (identity = connected wallet, PRD §3.2). */
export default function Page() {
	return <WalletView />;
}
