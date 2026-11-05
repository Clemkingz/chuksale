import type { Metadata } from "next";
import { ContributorDetailView } from "@/features/contributors/components/ContributorDetailView";

export const metadata: Metadata = { title: "Contributor" };

/** /contributors/[address]: one wallet's balance and funds sent. */
export default async function Page({ params }: PageProps<"/contributors/[address]">) {
	const { address } = await params;
	return <ContributorDetailView address={address} />;
}
