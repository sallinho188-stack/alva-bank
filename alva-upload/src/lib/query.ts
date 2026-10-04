import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 8_000, retry: 1, refetchOnWindowFocus: false },
    },
  });
}

export const overviewKey = ["overview"] as const;
export const aiHistoryKey = ["ai-history"] as const;
