import axios from "axios";

/** What a failed API call looks like to the UI: an axios error with the API's `{ message, data? }` body. */
export type ApiErrorBody = { status_code?: number; message?: string; data?: Record<string, unknown> };

/** The sentence to show for a failed request; network failures get their own wording. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
	if (axios.isAxiosError(error)) {
		if (!error.response) return "We couldn’t reach the server. Check your connection and try again.";
		return (error.response.data as ApiErrorBody | undefined)?.message ?? fallback;
	}
	if (error instanceof Error && error.message) return error.message;
	return fallback;
}

export function errorStatus(error: unknown) {
	return axios.isAxiosError(error) ? error.response?.status : undefined;
}

/** Machine-readable detail the API attaches to some errors (e.g. `{ reason: "email_unverified" }`). */
export function errorData(error: unknown) {
	return axios.isAxiosError(error) ? (error.response?.data as ApiErrorBody | undefined)?.data : undefined;
}
