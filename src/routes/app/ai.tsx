import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getAiHistory, sendAiMessage } from "@/lib/bank-api";
import { aiHistoryKey } from "@/lib/query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/ai")({ component: AiPage });

const SUGGESTIONS = [
  "Como estão meus gastos este mês?",
  "Vale pagar os boletos agora?",
  "Quanto posso guardar na poupança?",
];

function AiPage() {
  const queryClient = useQueryClient();
  const history = useQuery({
    queryKey: aiHistoryKey,
    queryFn: () => getAiHistory(),
  });
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const mut = useMutation({
    mutationFn: (message: string) => sendAiMessage({ data: { message } }),
    onSuccess: () => {
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: aiHistoryKey });
    },
    onError: () => {
      setPending(null);
      toast.error("O assistente não respondeu. Tente de novo.");
    },
  });

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.data, pending, mut.isPending]);

  function send(text: string) {
    const message = text.trim();
    if (!message || mut.isPending) return;
    setDraft("");
    setPending(message);
    mut.mutate(message);
  }

  const messages = history.data ?? [];

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col px-5 pt-7">
      <h1 className="font-display text-3xl tracking-tight">Assistente</h1>
      <p className="mt-1 text-sm text-muted">
        Pergunte em português. Eu vejo seu saldo, extrato e boletos.
      </p>

      <div className="mt-6 flex flex-1 flex-col gap-3">
        {history.isPending ? (
          <>
            <Skeleton className="h-16 w-4/5 rounded-2xl" />
            <Skeleton className="ml-auto h-12 w-3/5 rounded-2xl" />
          </>
        ) : messages.length === 0 && !pending ? (
          <div className="flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-left text-sm text-fg"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "ml-auto bg-accent text-accent-fg"
                    : "bg-surface text-fg",
                )}
              >
                {m.content}
              </div>
            ))}
            {pending ? (
              <div className="ml-auto max-w-[85%] rounded-2xl bg-accent px-4 py-3 text-sm text-accent-fg">
                {pending}
              </div>
            ) : null}
          </>
        )}
        {mut.isPending ? (
          <div className="w-fit rounded-2xl bg-surface px-4 py-3 text-sm text-muted">
            Pensando…
          </div>
        ) : null}
        <div ref={bottom} />
      </div>

      <form
        className="sticky bottom-0 mt-4 flex gap-2 bg-bg py-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escreva sua pergunta"
          maxLength={500}
          disabled={mut.isPending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={mut.isPending || !draft.trim()}
          aria-label="Enviar"
        >
          <ArrowUp className="size-4" />
        </Button>
      </form>
    </div>
  );
}
