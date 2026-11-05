import type { Metadata } from "next";
import { ProjectStatusView } from "@/features/builder-projects/components/ProjectStatusView";

export const metadata: Metadata = { title: "Project status" };

export default async function Page({ params }: PageProps<"/builder/projects/[id]">) {
	const { id } = await params;
	return <ProjectStatusView id={id} />;
}
