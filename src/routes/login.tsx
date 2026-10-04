import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { AlvaMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

type LoginSearch = { mode?: Mode };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    mode: search.mode === "signup" ? "signup" : "signin",
  }),
  component: Login,
});

function Login() {
  const { mode } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <Skeleton className="h-80 w-full max-w-sm rounded-2xl" />
      </main>
    );
  }
  if (user) return <Navigate to="/app" />;
  return <LoginForm initialMode={mode ?? "signin"} />;
}

function LoginForm({ initialMode }: { initialMode: Mode }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Cliente Alva",
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message);
      }
      await navigate({ to: "/app" });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-dvh bg-bg text-fg">
      <div className="pointer-events-none absolute inset-0 alva-grain opacity-70" />
      <div className="relative mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
        <Link to="/" className="mb-10 self-start">
          <AlvaMark />
        </Link>
        <h1 className="font-display text-3xl tracking-tight">
          {mode === "signup" ? "Abra sua conta" : "Bem-vindo de volta"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {mode === "signup"
            ? "Leva menos de um minuto. Sem agência, sem fila."
            : "Entre para ver saldo, Pix e o assistente."}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-raised p-1">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={cn(
              "h-10 rounded-lg text-sm font-medium transition-colors",
              mode === "signin" ? "bg-surface text-fg" : "text-muted",
            )}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={cn(
              "h-10 rounded-lg text-sm font-medium transition-colors",
              mode === "signup" ? "bg-surface text-fg" : "text-muted",
            )}
          >
            Criar conta
          </button>
        </div>

        <form className="mt-6 flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
          {mode === "signup" ? (
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-muted">Nome</span>
              <Input
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como você se chama"
              />
            </label>
          ) : null}
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">E-mail</span>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-medium text-muted">Senha</span>
            <Input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </label>
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <Button type="submit" className="mt-1 w-full" disabled={busy} size="lg">
            {busy ? "Aguarde…" : mode === "signup" ? "Criar conta Alva" : "Entrar"}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-subtle">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        {authEnabled ? (
          <div className="flex flex-col gap-2">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                variant="secondary"
                className="w-full"
                onClick={() => void signIn(p.providerId, { callbackURL: "/app" })}
              >
                Continuar com {p.label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">O acesso está desativado neste ambiente.</p>
        )}

        <p className="mt-8 text-center text-xs text-subtle">
          Ao continuar, você entra em um banco demonstrativo com saldos simulados.
        </p>
      </div>
    </main>
  );
}

function friendlyAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  if (lower.includes("invalid") && lower.includes("password")) {
    return "E-mail ou senha incorretos.";
  }
  if (lower.includes("already") || lower.includes("exists")) {
    return "Já existe uma conta com este e-mail. Entre com a senha.";
  }
  if (lower.includes("password")) return "A senha precisa ter pelo menos 8 caracteres.";
  return message || "Não foi possível entrar. Tente de novo.";
}
