import { cn } from "@/lib/utils";

export function AlvaMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-md bg-accent text-accent-fg"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none">
          <path
            d="M4 19 L12 5 L20 19"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M8.2 13.5 H15.8" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      </span>
      <span className="font-display text-xl tracking-tight text-fg">Alva</span>
    </span>
  );
}
