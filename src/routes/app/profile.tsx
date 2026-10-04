import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { InstallCard } from "@/components/install-alva";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/use-overview";
import { authEnabled, signOut } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { transferOwn } from "@/lib/bank-api";
import { formatBRL, parseReaisToCents } from "@/lib/money";
import { overviewKey } from "@/lib/query";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

const subscribeToNothing = () => () => {};
const noGateOnServer = () => false;

function ProfilePage() {
  const user = useCurrentUser();
  const { data, isPending } = useOverview();
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateOnServer,
  );
  const checking = data?.accounts.find((a) => a.kind === "checking");
  const savings = data?.accounts.find((a) => a.kind === "savings");
  const investTotal =
    data?.investments.reduce((sum, i) => sum + i.amountCents, 0) ?? 0;

  if (isPending || !data) {
    return (
      <div className="px-5 pt-8">
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }

  const initial = (data.customer.fullName || "?").charAt(0).toUpperCase();

  return (
    <div className="px-5 pt-7">
      <h1 className="font-display text-3xl tracking-tight">Você</h1>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
        {user?.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="size-12 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-12 place-items-center rounded-full bg-raised font-display text-xl">
            {initial}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-medium">{data.customer.fullName}</p>
          <p className="truncate text-sm text-muted">
            {user?.primaryEmail ?? "Conta Alva"}
          </p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-border rounded-2xl border border-border bg-surface px-4">
        <Row label="Agência" value={data.customer.agency} />
        <Row label="Conta" value={data.customer.accountNo} />
        <Row label="Conta corrente" value={formatBRL(checking?.balanceCents ?? 0)} />
        <Row label="Poupança" value={formatBRL(savings?.balanceCents ?? 0)} />
        <Row label="Investimentos" value={formatBRL(investTotal)} />
      </dl>

      <TransferBox />

      <div className="mt-4 flex flex-col gap-2">
        <Link
          to="/app/invest"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium"
        >
          Ver investimentos
        </Link>
        <Link
          to="/app/activity"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium"
        >
          Extrato completo
        </Link>
        <Link
          to="/app/bills"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium"
        >
          Boletos
        </Link>
      </div>

      <InstallCard className="mt-4" />

      {authEnabled && !gateSession ? (
        <Button
          variant="outline"
          className="mt-6 w-full"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut("/").catch(() => {
              setSigningOut(false);
              toast.error("Não foi possível sair. Tente de novo.");
            });
          }}
        >
          {signingOut ? "Saindo…" : "Sair da conta"}
        </Button>
      ) : null}

      <p className="mt-6 text-center text-xs leading-relaxed text-subtle">
        Alva é um banco demonstrativo. Saldos, Pix e cartões são simulados e não
        movimentam dinheiro real.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function TransferBox() {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [dir, setDir] = useState<"toSavings" | "toChecking">("toSavings");
  const mut = useMutation({
    mutationFn: (amountCents: number) =>
      transferOwn({
        data: {
          fromKind: dir === "toSavings" ? "checking" : "savings",
          toKind: dir === "toSavings" ? "savings" : "checking",
          amountCents,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error);
      toast.success("Transferência feita");
      setAmount("");
      void queryClient.invalidateQueries({ queryKey: overviewKey });
    },
  });

  return (
    <form
      className="mt-4 rounded-2xl border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const cents = parseReaisToCents(amount);
        if (!cents) return toast.error("Informe um valor válido");
        mut.mutate(cents);
      }}
    >
      <p className="text-sm font-medium">Mover entre contas</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={dir === "toSavings" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setDir("toSavings")}
        >
          Para poupança
        </Button>
        <Button
          type="button"
          variant={dir === "toChecking" ? "primary" : "secondary"}
          size="sm"
          onClick={() => setDir("toChecking")}
        >
          Para conta
        </Button>
      </div>
      <div className="mt-3 flex gap-2">
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
        />
        <Button type="submit" disabled={mut.isPending}>
          Mover
        </Button>
      </div>
    </form>
  );
}
