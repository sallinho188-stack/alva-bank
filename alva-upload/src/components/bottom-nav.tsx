import { Link, useRouterState } from "@tanstack/react-router";
import { CreditCard, Home, Sparkles, UserRound, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/app/pix", label: "Pix", icon: Zap, exact: false },
  { to: "/app/ai", label: "IA", icon: Sparkles, exact: false },
  { to: "/app/cards", label: "Cartões", icon: CreditCard, exact: false },
  { to: "/app/profile", label: "Você", icon: UserRound, exact: false },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur-sm"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-1">
        {ITEMS.map((item) => {
          const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  active ? "text-fg" : "text-subtle",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.7} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
