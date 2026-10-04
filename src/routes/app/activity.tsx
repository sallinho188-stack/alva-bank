import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { TxRow } from "@/components/tx-row";
import { Skeleton } from "@/components/ui/skeleton";
import { useOverview } from "@/hooks/use-overview";
import { CATEGORY_LABEL, formatBRL } from "@/lib/money";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/activity")({ component: ActivityPage });

const PIE_COLORS = [
  "var(--color-accent)",
  "var(--color-positive)",
  "var(--color-muted)",
  "var(--color-negative)",
  "var(--color-warn)",
  "var(--color-subtle)",
];

const tooltipStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  color: "var(--color-fg)",
};

function ActivityPage() {
  const { data, isPending } = useOverview();
  const [filter, setFilter] = useState<string>("all");

  const { pie, bars, filtered } = useMemo(() => {
    const txs = data?.recent ?? [];
    const spend = txs.filter((t) => t.amountCents < 0);
    const byCat = new Map<string, number>();
    for (const t of spend) {
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + Math.abs(t.amountCents));
    }
    const pieData = [...byCat.entries()]
      .map(([name, value]) => ({ name: CATEGORY_LABEL[name] ?? name, value }))
      .sort((a, b) => b.value - a.value);

    const byDay = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, 0);
    }
    for (const t of spend) {
      const key = t.createdAt.slice(0, 10);
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Math.abs(t.amountCents));
    }
    const barData = [...byDay.entries()].map(([day, value]) => ({
      day: day.slice(8),
      value,
    }));

    const filteredTx =
      filter === "all" ? txs : txs.filter((t) => t.category === filter);
    return { pie: pieData, bars: barData, filtered: filteredTx };
  }, [data, filter]);

  if (isPending || !data) {
    return (
      <div className="px-5 pt-8">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const cats = ["all", ...new Set(data.recent.map((t) => t.category))];

  return (
    <div className="px-5 pt-7">
      <h1 className="font-display text-3xl tracking-tight">Atividade</h1>
      <p className="mt-1 text-sm text-muted">Onde o dinheiro foi nos últimos dias.</p>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-medium text-muted">Saídas por categoria</p>
        {pie.length ? (
          <div className="mt-2 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} stroke="none">
                  {pie.map((slice, i) => (
                    <Cell key={slice.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatBRL(Number(value ?? 0))}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-8 text-sm text-muted">Sem saídas para mostrar.</p>
        )}
        <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
          {pie.slice(0, 6).map((p, i) => (
            <li key={p.name} className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              {p.name}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-medium text-muted">Últimos 7 dias</p>
        <div className="mt-2 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => formatBRL(Number(value ?? 0))}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="value" fill="var(--color-accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {cats.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={cn(
              "h-9 shrink-0 rounded-full px-3 text-xs font-medium",
              filter === c ? "bg-accent text-accent-fg" : "bg-raised text-muted",
            )}
          >
            {c === "all" ? "Tudo" : (CATEGORY_LABEL[c] ?? c)}
          </button>
        ))}
      </div>

      <div className="mt-2 divide-y divide-border">
        {filtered.map((tx) => (
          <TxRow key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
}
