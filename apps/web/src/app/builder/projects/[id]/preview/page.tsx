import type { Metadata } from "next";
import { PreviewView } from "@/features/builder-projects/components/PreviewView";

export const metadata: Metadata = { title: "Preview" };

export default async function Page({ params }: PageProps<"/builder/projects/[id]">) {
	const { id } = await params;
	return <PreviewView id={id} />;
}
