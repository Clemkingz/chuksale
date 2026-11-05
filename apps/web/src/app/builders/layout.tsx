import { AuthShell } from "@/features/builder-auth/components/AuthShell";

/** Builder auth (designs A1–A4): split screen, no site header. */
export default function BuildersAuthLayout({ children }: { children: React.ReactNode }) {
	return <AuthShell>{children}</AuthShell>;
}
