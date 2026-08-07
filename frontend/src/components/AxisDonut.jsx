import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { titleCase, categoryStyle } from "../lib/format";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-[12px]" style={{ background: "var(--color-surface-2)" }}>
      <div className="text-[var(--color-text)] font-medium">{titleCase(d.categorie)}</div>
      <div className="text-[var(--color-text-faint)]">
        {d.count} indicateur{d.count > 1 ? "s" : ""} · {(d.share * 100).toFixed(0)}%
      </div>
    </div>
  );
}

export default function AxisDonut({ categories }) {
  const total = categories.reduce((sum, c) => sum + c.sousCategories.reduce((n, sc) => n + sc.indicateurs.length, 0), 0);
  const data = categories.map((c) => {
    const count = c.sousCategories.reduce((n, sc) => n + sc.indicateurs.length, 0);
    return {
      categorie: c.categorie,
      count,
      share: total > 0 ? count / total : 0,
      color: categoryStyle(c.categorie).color,
    };
  });

  return (
    <div className="card p-5 md:p-6 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <span className="tick text-[11px] text-[var(--color-text-dim)]">Répartition des indicateurs</span>
      </div>
      <div className="relative flex-1 flex items-center justify-center min-h-[190px]">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="categorie" innerRadius={58} outerRadius={82} paddingAngle={3} strokeWidth={0}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-2xl font-bold text-[var(--color-text)]">{total}</span>
          <span className="tick text-[9.5px] text-[var(--color-text-faint)]">KPIs</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
        {data.map((d) => (
          <div key={d.categorie} className="flex items-center gap-2 text-[11.5px] text-[var(--color-text-dim)] min-w-0">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="truncate">{titleCase(d.categorie)}</span>
            <span className="ml-auto text-[var(--color-text-faint)] font-mono shrink-0">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
