import { useMemo } from "react";
import { pct, num, statusMeta, titleCase } from "../lib/format";

// Flat, searchable overview of every indicator in the active sheet — the
// "Suivi des indicateurs clés" table from the reference design.
export default function IndicatorTable({ indicateurs, search, limit }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = indicateurs;
    if (q) {
      rows = rows.filter(
        (i) =>
          i.indicateur.toLowerCase().includes(q) ||
          i.categorie.toLowerCase().includes(q) ||
          i.sousCategorie.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => (b.poids ?? 0) - (a.poids ?? 0));
    return limit ? rows.slice(0, limit) : rows;
  }, [indicateurs, search, limit]);

  return (
    <div className="card p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="tick text-[11px] text-[var(--color-text-dim)]">Suivi des indicateurs clés</span>
        <span className="text-[11px] text-[var(--color-text-faint)]">{filtered.length} affiché(s)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[720px]">
          <thead>
            <tr className="text-left tick text-[10px] text-[var(--color-text-faint)] border-b border-[var(--color-border)]">
              <th className="py-2 pr-3 font-medium">Indicateur</th>
              <th className="py-2 px-2 font-medium">Axe</th>
              <th className="py-2 px-2 font-medium text-right">Objectif YTD</th>
              <th className="py-2 px-2 font-medium text-right">Réalisé YTD</th>
              <th className="py-2 px-2 font-medium">Progression</th>
              <th className="py-2 pl-3 font-medium text-right">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[12.5px] text-[var(--color-text-faint)]">
                  Aucun indicateur ne correspond à la recherche.
                </td>
              </tr>
            )}
            {filtered.map((ind, i) => {
              const meta = statusMeta(ind.status);
              const ratio = ind.tauxRealisation;
              return (
                <tr key={`${ind.indicateur}-${i}`} className="border-b border-[var(--color-border-soft)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors">
                  <td className="py-2.5 pr-3 text-[13px] text-[var(--color-text)] font-medium whitespace-nowrap">
                    {titleCase(ind.indicateur)}
                  </td>
                  <td className="py-2.5 px-2 text-[12px] text-[var(--color-text-faint)] whitespace-nowrap">
                    {titleCase(ind.categorie)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[12.5px] text-[var(--color-text-dim)] whitespace-nowrap">
                    {ind.objectifYTD !== null ? num(ind.objectifYTD, ind.objectifYTD % 1 === 0 ? 0 : 2) : "—"}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-[12.5px] text-[var(--color-text)] whitespace-nowrap">
                    {ind.realisationYTD !== null ? num(ind.realisationYTD, ind.realisationYTD % 1 === 0 ? 0 : 2) : "—"}
                  </td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2 min-w-[130px]">
                      <div className="h-1.5 flex-1 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(ratio ?? 0, 1) * 100}%`, background: meta.color }}
                        />
                      </div>
                      <span className="font-mono text-[12px] w-11 text-right shrink-0" style={{ color: meta.color }}>
                        {ratio !== null ? pct(ratio, 0) : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    <span
                      className="tick text-[9.5px] px-2 py-[3px] rounded-full border whitespace-nowrap"
                      style={{ color: meta.color, borderColor: meta.color, background: meta.dim }}
                    >
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
