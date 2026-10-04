import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy } from "lucide-react";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { MoneyText } from "@/components/money-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/use-overview";
import { sendPix, simulateIncomingPix } from "@/lib/bank-api";
import { parseReaisToCents } from "@/lib/money";
import { overviewKey } from "@/lib/query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/pix")({ component: PixPage });

type Tab = "send" | "receive";

const KEY_LABEL: Record<string, string> = {
  email: "E-mail",
  phone: "Celular",
  random: "Aleatória",
  cpf: "CPF",
};

function PixPage() {
  const { data, isPending } = useOverview();
  const [tab, setTab] = useState<Tab>("send");
  const checking = data?.accounts.find((a) => a.kind === "checking");

  if (isPending || !data) {
    return (
      <div className="px-5 pt-8">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-7">
      <h1 className="font-display text-3xl tracking-tight">Pix</h1>
      <p className="mt-1 text-sm text-muted">
        Disponível: <MoneyText cents={checking?.balanceCents ?? 0} className="text-fg" />
      </p>

      <div className="mt-5 grid grid-cols-2 rounded-xl bg-raised p-1">
        {(["send", "receive"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "h-10 rounded-lg text-sm font-medium",
              tab === id ? "bg-surface text-fg" : "text-muted",
            )}
          >
            {id === "send" ? "Enviar" : "Receber"}
          </button>
        ))}
      </div>

      {tab === "send" ? <SendForm /> : <ReceivePanel />}
    </div>
  );
}

function SendForm() {
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const mut = useMutation({
    mutationFn: (payload: { key: string; amountCents: number; description?: string }) =>
      sendPix({ data: payload }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Pix enviado");
      setKey("");
      setAmount("");
      setNote("");
      void queryClient.invalidateQueries({ queryKey: overviewKey });
    },
    onError: () => toast.error("Não foi possível enviar o Pix."),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const cents = parseReaisToCents(amount);
    if (!cents) {
      toast.error("Informe um valor válido, como 25,90");
      return;
    }
    mut.mutate({
      key: key.trim(),
      amountCents: cents,
      description: note.trim() || undefined,
    });
  }

  return (
    <form className="mt-6 flex flex-col gap-3" onSubmit={submit}>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted">Chave</span>
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="E-mail, celular ou chave aleatória"
          required
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted">Valor</span>
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0,00"
          required
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-muted">Mensagem (opcional)</span>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Almoço, aluguel, presente…"
        />
      </label>
      <Button type="submit" className="mt-2 w-full" size="lg" disabled={mut.isPending}>
        {mut.isPending ? "Enviando…" : "Enviar Pix"}
      </Button>
    </form>
  );
}

function ReceivePanel() {
  const { data } = useOverview();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () => simulateIncomingPix({ data: { amountCents: 15000 } }),
    onSuccess: () => {
      toast.success("Pix de R$ 150,00 recebido");
      void queryClient.invalidateQueries({ queryKey: overviewKey });
    },
  });

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      toast.success("Chave copiada");
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <p className="text-sm text-muted">
        Compartilhe uma chave para receber na hora. Se a outra pessoa também tiver Alva, o
        crédito cai direto na conta.
      </p>
      {data?.pixKeys.map((k) => (
        <button
          key={k.id}
          type="button"
          onClick={() => void copy(k.value)}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left"
        >
          <span className="grid size-10 place-items-center rounded-lg bg-raised text-muted">
            {copied === k.value ? <Check className="size-4" /> : <Copy className="size-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">{KEY_LABEL[k.type] ?? k.type}</span>
            <span className="block truncate text-sm font-medium">{k.value}</span>
          </span>
        </button>
      ))}
      <Button
        variant="secondary"
        className="mt-2"
        disabled={mut.isPending}
        onClick={() => mut.mutate()}
      >
        {mut.isPending ? "Recebendo…" : "Simular Pix recebido de R$ 150"}
      </Button>
    </div>
  );
}
