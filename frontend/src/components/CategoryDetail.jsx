import { pct, num, statusMeta, titleCase } from "../lib/format";

function StatusPill({ status }) {
  const meta = statusMeta(status);
  return (
    <span
      className="tick text-[9.5px] px-2 py-[3px] rounded-full border whitespace-nowrap"
      style={{ color: meta.color, borderColor: meta.color, background: meta.dim }}
    >
      {meta.label}
    </span>
  );
}

function IndicatorRow({ ind }) {
  const meta = statusMeta(ind.status);
  const ratio = ind.tauxRealisation;
  return (
    <tr className="border-b border-[var(--color-border-soft)] last:border-0 group hover:bg-[var(--color-surface-2)] transition-colors">
      <td className="py-2.5 pr-3 text-[13px] text-[var(--color-text)] font-medium">{titleCase(ind.indicateur)}</td>
      <td className="py-2.5 px-2 text-right font-mono text-[12.5px] text-[var(--color-text-dim)]">
        {ind.poids !== null ? pct(ind.poids, 0) : "—"}
      </td>
      <td className="py-2.5 px-2 text-right font-mono text-[12.5px] text-[var(--color-text-dim)]">
        {ind.objectifYTD !== null ? num(ind.objectifYTD, ind.objectifYTD % 1 === 0 ? 0 : 2) : "—"}
      </td>
      <td className="py-2.5 px-2 text-right font-mono text-[12.5px] text-[var(--color-text)]">
        {ind.realisationYTD !== null ? num(ind.realisationYTD, ind.realisationYTD % 1 === 0 ? 0 : 2) : "—"}
      </td>
      <td className="py-2.5 px-2">
        <div className="flex items-center justify-end gap-2 min-w-[120px]">
          <div className="h-1.5 w-16 rounded-full bg-[var(--color-surface-3)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(ratio ?? 0, 1) * 100}%`, background: meta.color }}
            />
          </div>
          <span className="font-mono text-[12.5px] w-12 text-right" style={{ color: meta.color }}>
            {ratio !== null ? pct(ratio, 0) : "—"}
          </span>
        </div>
      </td>
      <td className="py-2.5 pl-3 text-right">
        <StatusPill status={ind.status} />
      </td>
    </tr>
  );
}

export default function CategoryDetail({ category }) {
  if (!category) {
    return (
      <div className="card p-8 flex items-center justify-center text-[var(--color-text-faint)] text-sm">
        Sélectionnez un axe pour afficher le détail des indicateurs.
      </div>
    );
  }

  const meta = statusMeta(category.status);

  return (
    <div className="card p-5 md:p-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
          <h2 className="text-lg font-semibold tracking-tight text-[var(--color-text)]">{titleCase(category.categorie)}</h2>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-faint)]">
          <span>Poids {pct(category.poidsTotal, 0)}</span>
          <span>Taux pondéré {pct(category.tauxMoyenPondere, 1)}</span>
        </div>
      </div>

      {category.sousCategories.map((sc) => (
        <div key={sc.sousCategorie} className="mb-5 last:mb-0">
          {sc.sousCategorie !== category.categorie && (
            <div className="tick text-[10.5px] text-[var(--color-brand-soft)] mb-2">{titleCase(sc.sousCategorie)}</div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[520px]">
              <thead>
                <tr className="text-left tick text-[10px] text-[var(--color-text-faint)] border-b border-[var(--color-border)]">
                  <th className="py-2 pr-3 font-medium">Indicateur</th>
                  <th className="py-2 px-2 font-medium text-right">Poids</th>
                  <th className="py-2 px-2 font-medium text-right">Objectif YTD</th>
                  <th className="py-2 px-2 font-medium text-right">Réalisé YTD</th>
                  <th className="py-2 px-2 font-medium text-right">Taux</th>
                  <th className="py-2 pl-3 font-medium text-right">Statut</th>
                </tr>
              </thead>
              <tbody>
                {sc.indicateurs.map((ind, i) => (
                  <IndicatorRow key={`${ind.indicateur}-${i}`} ind={ind} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
