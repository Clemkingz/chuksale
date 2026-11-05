import type { Metadata } from "next";
import { CategoriesView } from "@/features/categories/components/CategoriesView";

export const metadata: Metadata = { title: "Categories" };

export default function Page() {
	return <CategoriesView />;
}
