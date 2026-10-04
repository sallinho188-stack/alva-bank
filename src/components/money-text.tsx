import { formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export function MoneyText({
  cents,
  hidden,
  className,
  signed,
}: {
  cents: number;
  hidden?: boolean;
  className?: string;
  signed?: boolean;
}) {
  const display = hidden
    ? "R$ •••••"
    : signed && cents > 0
      ? `+${formatBRL(cents)}`
      : formatBRL(cents);
  const tone =
    signed && !hidden ? (cents >= 0 ? "text-positive" : "text-negative") : undefined;
  return <span className={cn("tabular-nums", tone, className)}>{display}</span>;
}
