import { AdminShell } from "@/components/layouts/AdminShell";
import { RequireAdmin } from "@/features/auth/RequireAdmin";

/** Every console page: admins only, inside the sidebar shell. */
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
	return (
		<RequireAdmin>
			<AdminShell>{children}</AdminShell>
		</RequireAdmin>
	);
}
