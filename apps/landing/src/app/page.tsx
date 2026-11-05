import { Features } from "@/features/landing/components/Features";
import { Footer } from "@/features/landing/components/Footer";
import { Header } from "@/features/landing/components/Header";
import { Hero } from "@/features/landing/components/Hero";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { ReadyCta } from "@/features/landing/components/ReadyCta";

export default function Home() {
	return (
		<>
			<Header />
			<main className="min-w-0">
				<Hero />
				<Features />
				<ReadyCta />
				<HowItWorks />
			</main>
			<Footer />
		</>
	);
}
