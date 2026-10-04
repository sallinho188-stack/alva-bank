import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CreditCard,
  Sparkles,
  Utensils,
  Car,
  ShoppingBag,
  HeartPulse,
  Clapperboard,
  Banknote,
} from "lucide-react";
import type { Tx } from "@/lib/bank-api";
import { CATEGORY_LABEL, formatDatePt } from "@/lib/money";
import { MoneyText } from "@/components/money-text";

const ICONS: Record<string, typeof Banknote> = {
  income: ArrowDownLeft,
  pix: Sparkles,
  food: Utensils,
  transport: Car,
  shopping: ShoppingBag,
  health: HeartPulse,
  entertainment: Clapperboard,
  bills: Building2,
  transfer: ArrowUpRight,
  yield: Banknote,
  other: CreditCard,
};

export function TxRow({ tx }: { tx: Tx }) {
  const Icon = ICONS[tx.category] ?? CreditCard;
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-raised text-muted">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{tx.description}</p>
        <p className="truncate text-xs text-muted">
          {CATEGORY_LABEL[tx.category] ?? tx.category} · {formatDatePt(tx.createdAt)}
        </p>
      </div>
      <MoneyText
        cents={tx.amountCents}
        signed
        className="text-sm font-medium"
      />
    </div>
  );
}
