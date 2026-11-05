import axios from "axios";

/** Failed API calls: an axios error with the API's `{ message, data? }` body (same contract as apps/web). */
type ApiErrorBody = { status_code?: number; message?: string; data?: Record<string, unknown> };

export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
	if (axios.isAxiosError(error)) {
		if (!error.response) return "We couldn’t reach the server. Check your connection and try again.";
		return (error.response.data as ApiErrorBody | undefined)?.message ?? fallback;
	}
	if (error instanceof Error && error.message) return error.message;
	return fallback;
}

export const errorStatus = (error: unknown) => (axios.isAxiosError(error) ? error.response?.status : undefined);

export const errorData = (error: unknown) =>
	axios.isAxiosError(error) ? (error.response?.data as ApiErrorBody | undefined)?.data : undefined;
