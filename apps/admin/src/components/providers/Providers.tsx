"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SlowServerNotice } from "@/components/SlowServerNotice";

export function Providers({ children }: { children: ReactNode }) {
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					// Revisited screens show what's cached at once and refresh in the background.
					queries: { staleTime: 30_000, gcTime: 15 * 60_000, refetchOnWindowFocus: false },
					mutations: { retry: false },
				},
			}),
	);
	return (
		<QueryClientProvider client={client}>
			{children}
			<SlowServerNotice />
		</QueryClientProvider>
	);
}
