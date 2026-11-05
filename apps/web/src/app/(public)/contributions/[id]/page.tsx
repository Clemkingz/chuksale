import type { Metadata } from "next";
import { ContributionStatusView } from "@/features/contributions/components/ContributionStatusView";

export const metadata: Metadata = { title: "Contribution status" };

/** /contributions/[id] (PRD §6.5 step 9). */
export default async function Page({ params }: PageProps<"/contributions/[id]">) {
	const { id } = await params;
	return <ContributionStatusView id={id} />;
}
