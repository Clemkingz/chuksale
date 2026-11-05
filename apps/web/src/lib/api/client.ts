import axios, { type AxiosAdapter } from "axios";
import { useBuilderSession } from "@/features/builder-auth/session";
import { USE_MOCK_API } from "@/lib/api/source";

/** In mock mode every request is answered in the browser (lib/api/source.ts); the mock is loaded only then. */
const mockAdapter: AxiosAdapter = async (config) => (await import("@repo/mock-api/adapter")).mockAdapter(config);
const adapter = USE_MOCK_API ? { adapter: mockAdapter } : {};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/** Public calls: project discovery, contributions, suggestions (wallet address goes in the body). */
export const api = axios.create({ baseURL: BASE_URL, headers: { "Content-Type": "application/json" }, ...adapter });

/** Builder calls: adds the session token; a 401 ends the session. */
export const builderApi = axios.create({ baseURL: BASE_URL, headers: { "Content-Type": "application/json" }, ...adapter });

builderApi.interceptors.request.use((config) => {
	const token = useBuilderSession.getState().token;
	if (token) config.headers.set("Authorization", `Bearer ${token}`);
	return config;
});

builderApi.interceptors.response.use(
	(response) => response,
	(error) => {
		if (axios.isAxiosError(error) && error.response?.status === 401) useBuilderSession.getState().signOut();
		return Promise.reject(error);
	},
);

/** The `{ status_code, message, data }` envelope, unwrapped. */
export const unwrap = <T>(res: { data: { data: T } }) => res.data.data;
