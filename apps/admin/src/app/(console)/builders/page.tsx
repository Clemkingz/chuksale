import type { Metadata } from "next";
import { BuildersView } from "@/features/builders/components/BuildersView";

export const metadata: Metadata = { title: "Builders" };

/** /builders ("Developers" in the design): design "admin developer D1". */
export default function Page() {
	return <BuildersView />;
}
