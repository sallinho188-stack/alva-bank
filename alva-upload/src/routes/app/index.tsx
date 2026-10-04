import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MoneyText } from "@/components/money-text";
import { TxRow } from "@/components/tx-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/use-overview";
import { generateInsight } from "@/lib/bank-api";
import { firstName, formatBRL, greetingNow } from "@/lib/money";
import { overviewKey } from "@/lib/query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/")({ component: Dashboard });

function Dashboard() {
  const { data, isPending, error } = useOverview();
  const [hidden, setHidden] = useState(false);
  const queryClient = useQueryClient();
  const insightMut = useMutation({
    mutationFn: () => generateInsight(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: overviewKey });
    },
    onError: () => toast.error("Não deu para gerar o insight agora."),
  });

  const checking = data?.accounts.find((a) => a.kind === "checking");
  const savings = data?.accounts.find((a) => a.kind === "savings");
  const credit = data?.accounts.find((a) => a.kind === "credit");
  const available = (credit?.creditLimitCents ?? 0) - (credit?.balanceCents ?? 0);
  const pendingBills = data?.bills.filter((b) => !b.paidAt) ?? [];
  const monthSpend = useMemo(() => {
    if (!data) return 0;
    const now = new Date();
    return data.recent
      .filter((t) => {
        const d = new Date(t.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.amountCents < 0;
      })
      .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
  }, [data]);

  if (isPending) {
    return (
      <div className="px-5 pt-8">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-6 h-32 w-full rounded-2xl" />
        <Skeleton className="mt-4 h-20 w-full rounded-2xl" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <p className="px-5 pt-16 text-sm text-muted">
        Não foi possível carregar sua conta. Saia e entre de novo.
      </p>
    );
  }

  return (
    <div className="px-5 pt-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{greetingNow()}</p>
          <h1 className="font-display text-3xl tracking-tight">
            {firstName(data.customer.fullName)}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setHidden((v) => !v)}
          className="grid size-11 place-items-center rounded-lg border border-border text-muted"
          aria-label={hidden ? "Mostrar saldos" : "Ocultar saldos"}
        >
          {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </header>

      <section className="alva-enter mt-6 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
          Saldo em conta
        </p>
        <p className="mt-2 font-display text-4xl tracking-tight">
          <MoneyText cents={checking?.balanceCents ?? 0} hidden={hidden} />
        </p>
        <p className="mt-2 text-sm text-muted">
          Ag {data.customer.agency} · Cc {data.customer.accountNo}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <MiniStat
            label="Poupança"
            value={hidden ? "••••" : formatBRL(savings?.balanceCents ?? 0)}
          />
          <MiniStat
            label="Limite livre"
            value={hidden ? "••••" : formatBRL(available)}
          />
        </div>
      </section>

      <nav className="mt-5 grid grid-cols-4 gap-2">
        <Quick to="/app/pix" icon={Zap} label="Pix" />
        <Quick to="/app/bills" icon={FileText} label="Pagar" />
        <Quick to="/app/cards" icon={CreditCard} label="Cartão" />
        <Quick to="/app/invest" icon={Landmark} label="Investir" />
      </nav>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-accent" />
            Assistente
          </div>
          <Link to="/app/ai" className="text-xs font-medium text-muted hover:text-fg">
            Conversar
          </Link>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {data.insight ??
            "Peça um olhar da IA sobre seus gastos, boletos e o que vale guardar agora."}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          disabled={insightMut.isPending}
          onClick={() => insightMut.mutate()}
        >
          {insightMut.isPending ? "Analisando…" : data.insight ? "Atualizar insight" : "Gerar insight"}
        </Button>
      </section>

      {pendingBills.length > 0 ? (
        <Link
          to="/app/bills"
          className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium">{pendingBills.length} boletos em aberto</p>
            <p className="text-xs text-muted">
              Próximo: {pendingBills[0]?.payee} · {formatBRL(pendingBills[0]?.amountCents ?? 0)}
            </p>
          </div>
          <ArrowRight className="size-4 text-muted" />
        </Link>
      ) : null}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Atividade</h2>
          <Link to="/app/activity" className="text-xs font-medium text-muted hover:text-fg">
            Ver tudo
          </Link>
        </div>
        <p className="mt-1 text-xs text-muted">
          Saídas neste mês: {hidden ? "••••" : formatBRL(monthSpend)}
        </p>
        <div className="mt-1 divide-y divide-border">
          {data.recent.slice(0, 6).map((tx) => (
            <TxRow key={tx.id} tx={tx} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-raised px-3 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

function Quick({
  to,
  icon: Icon,
  label,
}: {
  to: "/app/pix" | "/app/bills" | "/app/cards" | "/app/invest";
  icon: typeof Zap;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface text-xs font-medium",
        "transition-transform duration-150 active:scale-[0.96]",
      )}
    >
      <Icon className="size-4 text-accent" strokeWidth={1.75} />
      {label}
    </Link>
  );
}
