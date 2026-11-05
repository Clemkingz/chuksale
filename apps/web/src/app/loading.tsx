import { BrandLoader } from "@/components/BrandLoader";

/** First paint of any route without its own loading.tsx. */
export default function Loading() {
	return <BrandLoader className="min-h-dvh" />;
}
