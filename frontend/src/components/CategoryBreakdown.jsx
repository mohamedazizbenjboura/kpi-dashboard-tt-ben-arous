import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { pct, statusMeta, titleCase } from "../lib/format";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const meta = statusMeta(d.status);
  return (
    <div className="card px-3 py-2 text-[12px]" style={{ background: "var(--color-surface-2)" }}>
      <div className="text-[11px] text-[var(--color-text-faint)] mb-1">{titleCase(d.categorie)}</div>
      <div className="font-mono font-semibold" style={{ color: meta.color }}>
        {pct(d.tauxMoyenPondere, 1)}
      </div>
    </div>
  );
}

export default function CategoryBreakdown({ categories, selected, onSelect }) {
  const data = categories.map((c) => ({
    categorie: c.categorie,
    label: titleCase(c.categorie).length > 14 ? `${titleCase(c.categorie).slice(0, 13)}…` : titleCase(c.categorie),
    tauxMoyenPondere: c.tauxMoyenPondere ?? 0,
    status: c.status,
  }));

  return (
    <div className="card p-5 md:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="tick text-[11px] text-[var(--color-text-dim)]">Taux pondéré par axe</span>
        <span className="text-[11px] text-[var(--color-text-faint)]">Objectif 90%</span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 46)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-border-soft)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, Math.max(1, ...data.map((d) => d.tauxMoyenPondere))]}
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fill: "var(--color-text-faint)", fontSize: 11, fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={100}
            tick={{ fill: "var(--color-text-dim)", fontSize: 11.5 }}
            axisLine={{ stroke: "var(--color-border)" }}
            tickLine={false}
          />
          <ReferenceLine x={0.9} stroke="var(--color-good)" strokeDasharray="4 4" opacity={0.5} />
          <Tooltip cursor={{ fill: "var(--color-surface-2)" }} content={<CustomTooltip />} />
          <Bar
            dataKey="tauxMoyenPondere"
            radius={[0, 8, 8, 0]}
            maxBarSize={20}
            onClick={(d) => onSelect?.(d.categorie)}
            style={{ cursor: "pointer" }}
          >
            {data.map((d, i) => {
              const meta = statusMeta(d.status);
              const isSelected = selected === d.categorie;
              return (
                <Cell
                  key={i}
                  fill={meta.color}
                  opacity={isSelected || !selected ? 1 : 0.4}
                  style={{
                    filter: isSelected ? `drop-shadow(0 0 5px ${meta.color})` : undefined,
                    transition: "opacity 200ms",
                  }}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
