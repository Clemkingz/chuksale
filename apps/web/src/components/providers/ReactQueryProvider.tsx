"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { persistQueryCache } from "@/lib/query-cache";
import { SlowServerNotice } from "@/components/SlowServerNotice";

export function ReactQueryProvider({ children }: { children: ReactNode }) {
	const [client] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					// Cached data shows at once; it's refreshed in the background after a minute.
					queries: { staleTime: 60_000, gcTime: 30 * 60_000, retry: 2, refetchOnWindowFocus: false },
					// Never auto-retry a write: a retried contribution could go out twice.
					mutations: { retry: false },
				},
			}),
	);

	// Public data is saved as it arrives; the next visit paints it at once (`useSaved` in the public hooks).
	useEffect(() => persistQueryCache(client), [client]);

	return (
		<QueryClientProvider client={client}>
			{children}
			<SlowServerNotice />
			<ReactQueryDevtools initialIsOpen={false} />
		</QueryClientProvider>
	);
}
