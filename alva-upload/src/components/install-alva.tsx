import { Download, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone))
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function useInstallState() {
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (ios) {
      window.location.href = "/?install=1&platform=ios";
    }
  }

  return { installed, canPrompt: Boolean(deferred), ios, install };
}

export function InstallButton({
  className,
  variant = "secondary",
}: {
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
}) {
  const { installed, canPrompt, ios, install } = useInstallState();
  if (installed) return null;
  return (
    <Button variant={variant} className={className} onClick={() => void install()}>
      {ios && !canPrompt ? <Share className="size-4" /> : <Download className="size-4" />}
      Instalar o app
    </Button>
  );
}

export function InstallCard({ className }: { className?: string }) {
  const { installed, canPrompt, ios, install } = useInstallState();
  if (installed) return null;
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5",
        className,
      )}
    >
      <div>
        <p className="text-sm font-medium text-fg">Leve a Alva com você</p>
        <p className="mt-1 text-sm text-muted">
          {ios && !canPrompt
            ? "No iPhone, toque em Compartilhar e depois em Adicionar à Tela de Início."
            : "Instale o app na tela inicial — abre em tela cheia, sem o navegador."}
        </p>
      </div>
      <Button onClick={() => void install()} className="w-full">
        {ios && !canPrompt ? <Share className="size-4" /> : <Download className="size-4" />}
        Instalar Alva
      </Button>
    </div>
  );
}
