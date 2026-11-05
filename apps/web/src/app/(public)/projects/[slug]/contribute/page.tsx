import type { Metadata } from "next";
import { ContributeView } from "@/features/contributions/components/ContributeView";

export const metadata: Metadata = { title: "Contribute" };

/** /projects/[slug]/contribute (PRD §6.5). */
export default async function Page({ params }: PageProps<"/projects/[slug]/contribute">) {
	const { slug } = await params;
	return <ContributeView slug={slug} />;
}
