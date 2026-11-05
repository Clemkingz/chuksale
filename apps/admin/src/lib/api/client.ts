import axios, { type AxiosAdapter } from "axios";
import { useAdminSession } from "@/features/auth/session";
import { USE_MOCK_API } from "@/lib/api/source";

/** In mock mode every request is answered in the browser; the mock is loaded only then. */
const mockAdapter: AxiosAdapter = async (config) => (await import("@repo/mock-api/adapter")).mockAdapter(config);

/** The API client: adds the admin's token, and a 401 ends the session. */
export const api = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_URL,
	headers: { "Content-Type": "application/json" },
	...(USE_MOCK_API ? { adapter: mockAdapter } : {}),
});

api.interceptors.request.use((config) => {
	const token = useAdminSession.getState().token;
	if (token) config.headers.set("Authorization", `Bearer ${token}`);
	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (axios.isAxiosError(error) && error.response?.status === 401 && useAdminSession.getState().token) {
			useAdminSession.getState().signOut();
		}
		return Promise.reject(error);
	},
);

/** The API's `{ status_code, message, data }` envelope, unwrapped. */
export async function getData<T>(url: string): Promise<T> {
	const { data } = await api.get(url);
	return data.data as T;
}

/** The `{ status_code, message, data }` envelope, unwrapped. */
export const unwrap = <T>(res: { data: { data: T } }) => res.data.data;
