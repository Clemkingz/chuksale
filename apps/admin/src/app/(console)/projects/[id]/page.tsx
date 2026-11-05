import type { Metadata } from "next";
import { ProjectDetailView } from "@/features/projects/components/ProjectDetailView";

export const metadata: Metadata = { title: "Project" };

/** /projects/[id] (PRD /admin/projects/:id): design "admin page 4". */
export default async function Page({ params }: PageProps<"/projects/[id]">) {
	const { id } = await params;
	return <ProjectDetailView id={id} />;
}
