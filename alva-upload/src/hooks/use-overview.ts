import { useQuery } from "@tanstack/react-query";
import { getOverview } from "@/lib/bank-api";
import { overviewKey } from "@/lib/query";

export function useOverview() {
  return useQuery({
    queryKey: overviewKey,
    queryFn: () => getOverview(),
  });
}
