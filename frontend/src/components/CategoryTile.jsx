import { pct, statusMeta, titleCase } from "../lib/format";
import SignalBars from "./SignalBars";

export default function CategoryTile({ category, active, onClick }) {
  const ratio = category.tauxMoyenPondere ?? 0;
  const meta = statusMeta(category.status);

  return (
    <button
      onClick={onClick}
      className={`panel text-left px-4 py-3.5 flex flex-col gap-2.5 transition-all duration-200 cursor-pointer
        hover:-translate-y-0.5 hover:brightness-110
        ${active ? "ring-1 ring-[var(--color-brand)]" : ""}`}
      style={{ borderColor: active ? "var(--color-brand)" : undefined }}
    >
      <div className="flex items-center justify-between">
        <span className="tick text-[10.5px] text-[var(--color-text-dim)]">{titleCase(category.categorie)}</span>
        <SignalBars ratio={ratio} color={meta.color} size={15} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold text-[var(--color-text)]">{pct(ratio, 1)}</span>
      </div>
      <div className="h-1 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${Math.min(ratio, 1) * 100}%`, background: meta.color }}
        />
      </div>
      <span className="text-[11px] text-[var(--color-text-faint)]">
        poids {pct(category.poidsTotal, 0)} · {category.sousCategories.reduce((n, sc) => n + sc.indicateurs.length, 0)} indicateurs
      </span>
    </button>
  );
}
