import { pct, statusMeta, titleCase } from "../lib/format";
import { IconAlertTriangle } from "./icons";

export default function AlertsPanel({ alerts }) {
  return (
    <div className="card p-5 flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg flex items-center justify-center bg-[var(--color-bad-dim)] text-[var(--color-bad)]">
            <IconAlertTriangle size={14} />
          </span>
          <span className="tick text-[11px] text-[var(--color-text-dim)]">Points de vigilance</span>
        </div>
        {alerts.length > 0 && (
          <span className="text-[11px] font-semibold text-[var(--color-bad)]">{alerts.length}</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {alerts.length === 0 && (
          <p className="text-[12.5px] text-[var(--color-text-faint)]">Aucun point de vigilance ce mois-ci.</p>
        )}
        {alerts.map((a, i) => {
          const meta = statusMeta(a.status);
          return (
            <div key={`${a.indicateur}-${i}`} className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-2)] px-3 py-2.5">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium text-[var(--color-text)] truncate">{titleCase(a.indicateur)}</div>
                <div className="text-[10.5px] text-[var(--color-text-faint)] truncate">
                  {titleCase(a.categorie)} · {titleCase(a.sousCategorie)}
                </div>
              </div>
              <span className="text-[12px] font-mono font-semibold shrink-0" style={{ color: meta.color }}>
                {a.tauxRealisation !== null ? pct(a.tauxRealisation, 0) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
