import { toast } from "@repo/ui/sonner";
import { errorMessage } from "@/lib/api/errors";

/**
 * Toasts (sonner; <Toaster /> sits in the root layout, styled in @repo/ui/sonner). Use these, not `toast` directly,
 * so wording stays consistent: success for settled results, `fromError` for failures, `loading` for waits on a
 * wallet or the network (update it in place with the returned id).
 */
export const notify = {
	success: (message: string, description?: string) => toast.success(message, { description }),
	error: (message: string, description?: string) => toast.error(message, { description }),
	fromError: (error: unknown, fallback?: string) => toast.error(errorMessage(error, fallback)),
	warning: (message: string, description?: string) => toast.warning(message, { description }),
	info: (message: string, description?: string) => toast.info(message, { description }),
	loading: (message: string, description?: string) => toast.loading(message, { description }),
	dismiss: (id?: string | number) => toast.dismiss(id),
	/** Mock mode stands in for email: shows the code the API "sent". */
	demoInbox: (code: string, email: string) =>
		toast.info(`Demo inbox: your code is ${code}`, { description: `Sent to ${email}. Mock mode only.`, duration: 15000 }),
};

/** Kept as a hook so call sites from the reference pattern stay the same. */
export const useToast = () => notify;
