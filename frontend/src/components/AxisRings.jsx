import { motion } from "motion/react";
import { pct, statusMeta, titleCase, categoryStyle } from "../lib/format";

function Ring({ ratio, color, size = 84 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(ratio, 0), 1));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={7} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.16,1,.3,1)", filter: `drop-shadow(0 0 4px ${color}66)` }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)" fontSize="16" fontWeight="700" fill="var(--color-text)">
        {Math.round(ratio * 100)}%
      </text>
    </svg>
  );
}

export default function AxisRings({ categories, onSelect, selected }) {
  return (
    <div className="card p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <span className="tick text-[11px] text-[var(--color-text-dim)]">Performance par axe</span>
        <span className="text-[11px] text-[var(--color-text-faint)]">Objectif 90%</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((c, i) => {
          const style = categoryStyle(c.categorie);
          const meta = statusMeta(c.status);
          const ratio = c.tauxMoyenPondere ?? 0;
          const active = selected === c.categorie;
          return (
            <motion.button
              key={c.categorie}
              onClick={() => onSelect?.(c.categorie)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className={`flex flex-col items-center gap-2 rounded-2xl py-4 px-2 border transition-colors cursor-pointer ${
                active ? "border-[var(--color-border)] bg-[var(--color-surface-2)]" : "border-transparent hover:bg-[var(--color-surface-2)]"
              }`}
            >
              <Ring ratio={ratio} color={style.color} />
              <span className="text-[12px] font-medium text-[var(--color-text)] text-center leading-tight">
                {titleCase(c.categorie)}
              </span>
              <span className="tick text-[9.5px]" style={{ color: meta.color }}>
                {meta.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
