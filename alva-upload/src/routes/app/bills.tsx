import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/use-overview";
import { payBill } from "@/lib/bank-api";
import { formatBRL, formatDue } from "@/lib/money";
import { overviewKey } from "@/lib/query";

export const Route = createFileRoute("/app/bills")({ component: BillsPage });

function BillsPage() {
  const { data, isPending } = useOverview();
  const queryClient = useQueryClient();
  const mut = useMutation({
    mutationFn: (billId: number) => payBill({ data: { billId } }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("Boleto pago");
      void queryClient.invalidateQueries({ queryKey: overviewKey });
    },
    onError: () => toast.error("Não foi possível pagar."),
  });

  if (isPending || !data) {
    return (
      <div className="px-5 pt-8">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const open = data.bills.filter((b) => !b.paidAt);
  const paid = data.bills.filter((b) => b.paidAt);

  return (
    <div className="px-5 pt-7">
      <h1 className="font-display text-3xl tracking-tight">Pagar</h1>
      <p className="mt-1 text-sm text-muted">Boletos em aberto saem da conta Alva.</p>

      <div className="mt-6 flex flex-col gap-3">
        {open.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
            Nada em aberto. Você está em dia.
          </p>
        ) : (
          open.map((bill) => (
            <article
              key={bill.id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{bill.payee}</p>
                  <p className="mt-1 text-xs text-muted">Vence {formatDue(bill.dueDate)}</p>
                </div>
                <p className="text-sm font-medium tabular-nums">{formatBRL(bill.amountCents)}</p>
              </div>
              {bill.barcode ? (
                <p className="mt-3 truncate font-sans text-xs tracking-wide text-subtle">
                  {bill.barcode}
                </p>
              ) : null}
              <Button
                className="mt-4 w-full"
                disabled={mut.isPending}
                onClick={() => mut.mutate(bill.id)}
              >
                {mut.isPending ? "Pagando…" : "Pagar agora"}
              </Button>
            </article>
          ))
        )}
      </div>

      {paid.length ? (
        <section className="mt-8">
          <h2 className="text-sm font-medium text-muted">Pagos</h2>
          <ul className="mt-2 divide-y divide-border">
            {paid.map((bill) => (
              <li key={bill.id} className="flex items-center justify-between py-3 text-sm">
                <span>{bill.payee}</span>
                <span className="tabular-nums text-muted">{formatBRL(bill.amountCents)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
