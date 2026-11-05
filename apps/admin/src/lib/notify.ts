import { toast } from "@repo/ui/sonner";
import { errorMessage } from "@/lib/api/errors";

/** Toasts for the console (same wording rules as apps/web's `notify`). */
export const notify = {
	success: (message: string, description?: string) => toast.success(message, { description }),
	error: (message: string, description?: string) => toast.error(message, { description }),
	fromError: (error: unknown, fallback?: string) => toast.error(errorMessage(error, fallback)),
	info: (message: string, description?: string) => toast.info(message, { description }),
	/** Mock mode stands in for the authenticator: shows a code to use. */
	demoInbox: (code: string) =>
		toast.info(`Demo: your sign-in code is ${code}`, { description: "Any 6-digit code works in mock mode.", duration: 15000 }),
};
