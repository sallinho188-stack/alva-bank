import type { Card } from "@/lib/bank-api";
import { cn } from "@/lib/utils";

export function PlasticCard({
  card,
  className,
}: {
  card: Card;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-52 w-full overflow-hidden rounded-2xl border border-border bg-raised p-5 text-fg",
        card.frozen && "opacity-70 grayscale",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 alva-grain opacity-70" />
      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <span className="font-display text-2xl tracking-tight">Alva</span>
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            {card.virtual ? "Virtual" : "Físico"} · {card.brand}
          </span>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-sans text-lg tracking-[0.18em] tabular-nums">
              •••• {card.last4}
            </p>
            <p className="mt-1 text-xs text-muted">{card.holder}</p>
          </div>
          <p className="text-xs tabular-nums text-muted">
            {String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}
          </p>
        </div>
      </div>
      {card.frozen ? (
        <div className="absolute inset-0 grid place-items-center bg-bg/40 text-sm font-medium">
          Cartão congelado
        </div>
      ) : null}
    </div>
  );
}
