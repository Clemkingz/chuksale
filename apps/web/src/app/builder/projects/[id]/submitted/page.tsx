import type { Metadata } from "next";
import { SubmittedView } from "@/features/builder-projects/components/SubmittedView";

export const metadata: Metadata = { title: "Submitted" };

export default async function Page({ params }: PageProps<"/builder/projects/[id]">) {
	const { id } = await params;
	return <SubmittedView id={id} />;
}
