import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchHistory, historyDownloadUrl, deleteHistoryEntry, deleteAllHistory } from "../lib/api";
import { pct, formatTimestamp } from "../lib/format";
import { IconHistory, IconClock, IconTrash, IconDownload } from "./icons";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-[12px]" style={{ background: "var(--color-surface-2)" }}>
      <div className="text-[11px] text-[var(--color-text-faint)] mb-1">{d.month}</div>
      <div className="font-mono font-semibold" style={{ color: "var(--color-brand)" }}>
        {d.scoreGlobal !== null ? pct(d.scoreGlobal, 1) : "—"}
      </div>
    </div>
  );
}

export default function HistoryPage({ onOpenVersion, activeVersionId, openingId, onEntryDeleted, onAllDeleted }) {
  const [entries, setEntries] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetchHistory().then(setEntries).catch(() => setEntries([]));
  }, []);

  async function handleDeleteOne(e, entry) {
    e.stopPropagation();
    const ok = window.confirm(`Supprimer définitivement la version ${entry.month} de l'historique ?`);
    if (!ok) return;
    setActionError("");
    setDeletingId(entry.id);
    try {
      await deleteHistoryEntry(entry.id);
      setEntries((prev) => (prev || []).filter((x) => x.id !== entry.id));
      onEntryDeleted?.(entry.id);
    } catch (err) {
      setActionError(err.message || "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteAll() {
    const ok = window.confirm(
      "Supprimer TOUT l'historique ? Toutes les versions archivées et leurs fichiers seront définitivement effacés. Le tableau de bord en direct n'est pas affecté."
    );
    if (!ok) return;
    setActionError("");
    setDeletingAll(true);
    try {
      await deleteAllHistory();
      setEntries([]);
      onAllDeleted?.();
    } catch (err) {
      setActionError(err.message || "Suppression impossible.");
    } finally {
      setDeletingAll(false);
    }
  }

  if (!entries) {
    return <div className="text-[13px] text-[var(--color-text-faint)]">Chargement de l'historique…</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="card p-8 flex flex-col items-center text-center gap-3 max-w-lg">
        <span className="h-11 w-11 rounded-2xl flex items-center justify-center bg-[var(--color-surface-3)] text-[var(--color-text-faint)]">
          <IconHistory size={20} />
        </span>
        <p className="text-[13px] text-[var(--color-text-dim)]">
          Aucune version archivée pour l'instant. Chaque fois qu'une mise à jour Google Drive est appliquée,
          l'ancienne version du fichier est conservée ici automatiquement, avec le mois et l'heure exacte.
        </p>
      </div>
    );
  }

  // Chronologique (ancien → récent) pour le graphique.
  const chartData = [...entries]
    .reverse()
    .map((e) => ({ month: e.month, scoreGlobal: e.scoreGlobal, appliedAt: e.appliedAt }));

  return (
    <div className="flex flex-col gap-5">
      <div className="card p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="tick text-[11px] text-[var(--color-text-dim)]">Évolution du score global</span>
          <span className="text-[11px] text-[var(--color-text-faint)]">{entries.length} version(s) archivée(s)</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "var(--color-text-faint)", fontSize: 11 }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fill: "var(--color-text-faint)", fontSize: 11, fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="scoreGlobal"
              stroke="var(--color-brand)"
              strokeWidth={2.4}
              dot={{ r: 3.5, fill: "var(--color-brand)", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-2">
        {actionError && (
          <p className="px-3 py-2 text-[12px] text-[var(--color-bad)]">{actionError}</p>
        )}
        {entries.map((e, i) => {
          const isActive = activeVersionId === e.id;
          const isOpening = openingId === e.id;
          const isDeleting = deletingId === e.id;
          return (
            <div
              key={e.id}
              className={`flex items-center gap-1.5 transition-colors ${i !== entries.length - 1 ? "border-b border-[var(--color-border-soft)]" : ""} ${isActive ? "bg-[var(--color-surface-3)]" : ""}`}
            >
              <button
                type="button"
                onClick={() => onOpenVersion?.(e)}
                disabled={!onOpenVersion || isOpening || isDeleting}
                title={`Voir le tableau de bord de ${e.month} tel qu'appliqué le ${formatTimestamp(new Date(e.appliedAt).getTime())}`}
                className={`flex-1 min-w-0 flex items-center gap-3.5 px-4 py-3.5 text-left transition-colors cursor-pointer disabled:cursor-wait ${isActive ? "" : "hover:bg-[var(--color-surface-2)]"}`}
              >
                <span className="h-9 w-9 rounded-xl flex items-center justify-center bg-[var(--color-surface-3)] text-[var(--color-text-dim)] shrink-0">
                  <IconClock size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-[var(--color-text)] flex items-center gap-2">
                    {e.month}
                    {isActive && (
                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-md bg-[var(--color-brand)]/15 text-[var(--color-brand)]">
                        consultée
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[var(--color-text-faint)]">
                    {isOpening ? "Chargement…" : `Appliqué le ${formatTimestamp(new Date(e.appliedAt).getTime())}`}
                    {e.nombreIndicateurs ? ` · ${e.nombreIndicateurs} indicateurs` : ""}
                  </div>
                </div>
                <span className="text-[13px] font-mono font-semibold text-[var(--color-brand)] shrink-0">
                  {e.scoreGlobal !== null && e.scoreGlobal !== undefined ? pct(e.scoreGlobal, 1) : "—"}
                </span>
              </button>

              <a
                href={historyDownloadUrl(e.id)}
                onClick={(ev) => ev.stopPropagation()}
                title={`Télécharger le classeur de ${e.month}`}
                className="h-9 w-9 shrink-0 mr-1 rounded-xl flex items-center justify-center text-[var(--color-text-faint)] hover:text-[var(--color-brand)] hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
              >
                <IconDownload size={16} />
              </a>

              <button
                type="button"
                onClick={(ev) => handleDeleteOne(ev, e)}
                disabled={isDeleting}
                title={`Supprimer la version ${e.month}`}
                className="h-9 w-9 shrink-0 mr-2 rounded-xl flex items-center justify-center text-[var(--color-text-faint)] hover:text-[var(--color-bad)] hover:bg-[var(--color-bad-dim)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-wait"
              >
                <IconTrash size={16} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleDeleteAll}
          disabled={deletingAll}
          className="flex items-center gap-1.5 text-[12.5px] font-medium px-3.5 py-2.5 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] text-[var(--color-bad)] hover:bg-[var(--color-bad-dim)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <IconTrash size={14} />
          {deletingAll ? "Suppression…" : "Supprimer tout"}
        </button>
      </div>
    </div>
  );
}
