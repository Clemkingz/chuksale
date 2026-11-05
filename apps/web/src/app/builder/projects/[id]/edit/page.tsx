import type { Metadata } from "next";
import { EditProjectForm } from "@/features/builder-projects/components/EditProjectForm";

export const metadata: Metadata = { title: "Edit project" };

export default async function Page({ params }: PageProps<"/builder/projects/[id]">) {
	const { id } = await params;
	return <EditProjectForm id={id} />;
}
