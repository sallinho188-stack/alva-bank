import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-border bg-raised px-3 text-sm text-fg placeholder:text-subtle",
        "outline-none transition-colors duration-150 focus:border-border-strong focus:ring-2 focus:ring-accent/40",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
