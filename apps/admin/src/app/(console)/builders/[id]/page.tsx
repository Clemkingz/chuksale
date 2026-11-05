import type { Metadata } from "next";
import { BuilderDetailView } from "@/features/builders/components/BuilderDetailView";

export const metadata: Metadata = { title: "Builder" };

/** /builders/[id]: design "admin developer D2". */
export default async function Page({ params }: PageProps<"/builders/[id]">) {
	const { id } = await params;
	return <BuilderDetailView id={id} />;
}
