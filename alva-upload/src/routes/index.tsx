import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ArrowRight, CreditCard, Shield, Sparkles, Zap } from "lucide-react";
import { AlvaMark } from "@/components/brand";
import { InstallButton } from "@/components/install-alva";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { user, isPending } = useCurrentUserState();
  if (user) return <Navigate to="/app" />;
  return <Landing showCtas={!isPending} />;
}

function Landing({ showCtas }: { showCtas: boolean }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg text-fg">
      <div className="pointer-events-none absolute inset-0 alva-grain opacity-80" />
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-6 pb-10 pt-6">
        <header className="flex items-center justify-between">
          <AlvaMark />
          <div className="flex items-center gap-2">
            <InstallButton variant="ghost" className="hidden h-10 sm:inline-flex" />
            <Link
              to="/login"
              className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-muted hover:text-fg"
            >
              Entrar
            </Link>
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-10">
          <p className="alva-enter text-xs font-medium uppercase tracking-[0.22em] text-muted">
            Banco digital
          </p>
          <h1 className="alva-enter alva-enter-delay-1 mt-4 font-display text-[2.75rem] leading-[1.05] tracking-tight text-fg">
            O banco que pensa com você.
          </h1>
          <p className="alva-enter alva-enter-delay-2 mt-5 max-w-md text-base leading-relaxed text-muted">
            Conta, Pix, cartão virtual e um assistente de IA que entende o seu
            dinheiro — com a clareza de um extrato, sem o ruído de um banco antigo.
          </p>
          {showCtas ? (
            <>
              <div className="alva-enter alva-enter-delay-3 mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/login" search={{ mode: "signup" }} className="flex-1">
                  <Button className="h-12 w-full" size="lg">
                    Criar conta
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
                <Link to="/login" className="flex-1">
                  <Button variant="secondary" className="h-12 w-full" size="lg">
                    Já tenho conta
                  </Button>
                </Link>
              </div>
              <InstallButton variant="outline" className="alva-enter alva-enter-delay-4 mt-3 h-12 w-full" />
            </>
          ) : (
            <div className="mt-8 flex flex-col gap-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          )}
        </section>

        <section className="alva-enter alva-enter-delay-4 grid gap-3">
          <Feature
            icon={Zap}
            title="Pix na hora"
            body="Envie, receba e gerencie chaves sem sair do app."
          />
          <Feature
            icon={CreditCard}
            title="Cartão virtual"
            body="Congele, pague a fatura e acompanhe o limite em um toque."
          />
          <Feature
            icon={Sparkles}
            title="Assistente Alva"
            body="Pergunte pelos gastos, boletos e o que guardar neste mês."
          />
          <Feature
            icon={Shield}
            title="Sua conta, só sua"
            body="Entre com e-mail, Google ou X. Os dados ficam no seu perfil."
          />
        </section>

        <p className="mt-10 text-center text-xs leading-relaxed text-subtle">
          Alva é um banco demonstrativo. Os saldos são simulados e não representam
          dinheiro real nem uma instituição financeira licenciada.
        </p>
      </div>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Zap;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-raised text-accent">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-sm text-muted">{body}</p>
      </div>
    </div>
  );
}
