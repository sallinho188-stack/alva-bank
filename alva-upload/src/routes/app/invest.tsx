import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/use-overview";
import { formatBRL } from "@/lib/money";

export const Route = createFileRoute("/app/invest")({ component: InvestPage });

function InvestPage() {
  const { data, isPending } = useOverview();
  if (isPending || !data) {
    return (
      <div className="px-5 pt-8">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
      </div>
    );
  }

  const total = data.investments.reduce((sum, i) => sum + i.amountCents, 0);
  const savings = data.accounts.find((a) => a.kind === "savings");

  return (
    <div className="px-5 pt-7">
      <h1 className="font-display text-3xl tracking-tight">Investir</h1>
      <p className="mt-1 text-sm text-muted">Reserva e produtos com rentabilidade simulada.</p>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Carteira</p>
        <p className="mt-2 font-display text-4xl tracking-tight">{formatBRL(total)}</p>
        <p className="mt-2 text-sm text-muted">
          Poupança à parte: {formatBRL(savings?.balanceCents ?? 0)}
        </p>
      </section>

      <div className="mt-4 flex flex-col gap-3">
        {data.investments.map((inv) => (
          <article key={inv.id} className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm font-medium">{inv.product}</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-lg font-medium tabular-nums">{formatBRL(inv.amountCents)}</p>
              <p className="text-xs text-positive">
                {(inv.yieldBps / 100).toFixed(2).replace(".", ",")}% a.a.
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-accent" />
          Sugestão da IA
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Se sobrar na conta depois dos boletos, mover para a poupança é o passo mais simples.
          O CDB Alva rende mais, com liquidez no vencimento simulado.
        </p>
        <Link to="/app/ai" className="mt-4 block">
          <Button variant="secondary" className="w-full">
            Perguntar ao assistente
          </Button>
        </Link>
      </div>
    </div>
  );
}
