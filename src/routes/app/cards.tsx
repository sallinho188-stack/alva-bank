import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlasticCard } from "@/components/plastic-card";
import { TxRow } from "@/components/tx-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/use-overview";
import { payCreditInvoice, toggleCardFreeze } from "@/lib/bank-api";
import { formatBRL } from "@/lib/money";
import { overviewKey } from "@/lib/query";

export const Route = createFileRoute("/app/cards")({ component: CardsPage });

function CardsPage() {
  const { data, isPending } = useOverview();
  const queryClient = useQueryClient();
  const card = data?.cards[0];
  const credit = data?.accounts.find((a) => a.kind === "credit");
  const used = credit?.balanceCents ?? 0;
  const limit = credit?.creditLimitCents ?? 0;
  const available = Math.max(0, limit - used);
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  const cardTx = data?.recent.filter((t) => t.accountId === credit?.id) ?? [];

  const freeze = useMutation({
    mutationFn: (cardId: number) => toggleCardFreeze({ data: { cardId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success(res.frozen ? "Cartão congelado" : "Cartão descongelado");
      void queryClient.invalidateQueries({ queryKey: overviewKey });
    },
  });
  const pay = useMutation({
    mutationFn: () => payCreditInvoice(),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("Fatura paga");
      void queryClient.invalidateQueries({ queryKey: overviewKey });
    },
  });

  if (isPending || !data || !card) {
    return (
      <div className="px-5 pt-8">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-6 h-52 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-7">
      <h1 className="font-display text-3xl tracking-tight">Cartões</h1>
      <p className="mt-1 text-sm text-muted">Um cartão virtual, pronto para o dia a dia.</p>

      <div className="mt-6">
        <PlasticCard card={card} />
      </div>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs text-muted">Fatura atual</p>
            <p className="mt-1 text-xl font-medium tabular-nums">{formatBRL(used)}</p>
          </div>
          <p className="text-sm text-muted">
            Limite {formatBRL(limit)}
          </p>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-raised">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">Disponível {formatBRL(available)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={freeze.isPending}
            onClick={() => freeze.mutate(card.id)}
          >
            {card.frozen ? "Descongelar" : "Congelar"}
          </Button>
          <Button disabled={pay.isPending || used <= 0} onClick={() => pay.mutate()}>
            {pay.isPending ? "Pagando…" : "Pagar fatura"}
          </Button>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium">Lançamentos do cartão</h2>
        <div className="mt-1 divide-y divide-border">
          {cardTx.length ? (
            cardTx.map((tx) => <TxRow key={tx.id} tx={tx} />)
          ) : (
            <p className="py-6 text-sm text-muted">Nenhum lançamento neste cartão.</p>
          )}
        </div>
      </section>
    </div>
  );
}
