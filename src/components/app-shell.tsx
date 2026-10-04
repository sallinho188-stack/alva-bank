import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { Skeleton } from "@/components/ui/skeleton";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { getOverview } from "@/lib/bank-api";
import { overviewKey } from "@/lib/query";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user) {
      void queryClient.prefetchQuery({ queryKey: overviewKey, queryFn: () => getOverview() });
    }
  }, [user, queryClient]);

  if (isPending) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg px-5 pt-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-8 h-28 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-16 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-16 w-full rounded-2xl" />
      </div>
    );
  }
  if (!user) return <RedirectToSignIn />;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto max-w-lg pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}
