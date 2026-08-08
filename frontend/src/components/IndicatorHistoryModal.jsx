import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { fetchHistory, fetchHistoryEntry } from "../lib/api";
import { pct, num, statusMeta, titleCase } from "../lib/format";
import { IconX, IconClock } from "./icons";

// Historique max de versions interrogées pour tracer la courbe d'un seul
// indicateur (au-delà, on tronque pour éviter trop d'appels réseau).
const MAX_VERSIONS = 20;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-[12px]" style={{ background: "var(--color-surface-2)" }}>
      <div className="text-[var(--color-text)] font-medium">{label}</div>
      <div className="text-[var(--color-text-faint)]">
        Réalisation : <span style={{ color: p.color }}>{p.taux !== null ? pct(p.taux, 1) : "—"}</span>
      </div>
      {p.appliedAt && <div className="text-[var(--color-text-faint)]">{p.appliedAt}</div>}
    </div>
  );
}

// Popup déclenché par un clic sur n'importe quel indicateur : détail complet
// + courbe d'évolution reconstruite à partir des versions archivées
// (data/history) qui contiennent aussi cet indicateur, dans l'ordre
// chronologique réel de la période couverte (pas la date d'application).
export default function IndicatorHistoryModal({ indicator, currentPeriod, onClose }) {
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [points, setPoints] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setStatus("loading");
      try {
        const history = await fetchHistory();
        const sorted = [...history].sort((a, b) => new Date(a.appliedAt) - new Date(b.appliedAt)).slice(-MAX_VERSIONS);
        const results = await Promise.all(
          sorted.map((entry) =>
            fetchHistoryEntry(entry.id)
              .then((res) => ({ entry, res }))
              .catch(() => null)
          )
        );
        const built = [];
        for (const item of results) {
          if (!item) continue;
          const found = (item.res?.sheet?.indicateurs ?? []).find(
            (i) => i.indicateur === indicator.indicateur && i.categorie === indicator.categorie
          );
          if (!found) continue;
          built.push({
            label: item.entry.month,
            appliedAt: `Appliqué le ${new Date(item.entry.appliedAt).toLocaleDateString("fr-FR")}`,
            taux: found.tauxRealisation,
            color: statusMeta(found.status).color,
          });
        }
        // Toujours terminer sur la valeur actuellement affichée en direct,
        // pour que la courbe se termine sur "maintenant".
        built.push({
          label: currentPeriod ? `${currentPeriod} (direct)` : "Direct",
          appliedAt: "Version en direct",
          taux: indicator.tauxRealisation,
          color: statusMeta(indicator.status).color,
        });
        if (!cancelled) {
          setPoints(built);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [indicator, currentPeriod]);

  const meta = statusMeta(indicator.status);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          aria-label="Fermer"
          onClick={onClose}
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        />
        <motion.div
          className="card relative w-full max-w-[640px] max-h-[88vh] overflow-y-auto p-5 md:p-7"
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center text-[var(--color-text-faint)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer"
          >
            <IconX size={16} />
          </button>

          <div className="pr-10">
            <div className="tick text-[10.5px] text-[var(--color-text-faint)] mb-1">{titleCase(indicator.categorie)} · {titleCase(indicator.sousCategorie)}</div>
            <h2 className="text-[19px] md:text-[21px] font-bold text-[var(--color-text)] leading-tight">{titleCase(indicator.indicateur)}</h2>
            <span
              className="inline-flex items-center gap-1.5 mt-2 tick text-[10.5px] px-2.5 py-1 rounded-full border"
              style={{ color: meta.color, borderColor: meta.color, background: meta.dim }}
            >
              {meta.label}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <Stat label="Poids" value={indicator.poids !== null ? num(indicator.poids, indicator.poids % 1 === 0 ? 0 : 2) : "—"} />
            <Stat label="Objectif YTD" value={indicator.objectifYTD !== null ? num(indicator.objectifYTD, indicator.objectifYTD % 1 === 0 ? 0 : 2) : "—"} />
            <Stat label="Réalisation YTD" value={indicator.realisationYTD !== null ? num(indicator.realisationYTD, indicator.realisationYTD % 1 === 0 ? 0 : 2) : "—"} />
            <Stat label="Score" value={indicator.score !== null ? num(indicator.score, 2) : "—"} highlight={meta.color} />
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <IconClock size={14} className="text-[var(--color-text-faint)]" />
              <span className="tick text-[10.5px] text-[var(--color-text-dim)]">Évolution du taux de réalisation</span>
            </div>

            {status === "loading" && (
              <div className="h-[200px] flex items-center justify-center text-[12.5px] text-[var(--color-text-faint)]">
                Chargement de l'historique…
              </div>
            )}
            {status === "error" && (
              <div className="h-[120px] flex items-center justify-center text-[12.5px] text-[var(--color-text-faint)]">
                Historique indisponible pour le moment.
              </div>
            )}
            {status === "ready" && points.length < 2 && (
              <div className="h-[120px] flex items-center justify-center text-center px-4 text-[12.5px] text-[var(--color-text-faint)]">
                Une seule version disponible pour cet indicateur — l'évolution s'affichera dès qu'une nouvelle
                version du classeur aura été appliquée.
              </div>
            )}
            {status === "ready" && points.length >= 2 && (
              <div className="h-[220px] -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border-soft)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--color-text-faint)", fontSize: 10.5 }} axisLine={{ stroke: "var(--color-border-soft)" }} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v * 100)}%`}
                      tick={{ fill: "var(--color-text-faint)", fontSize: 10.5 }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <ReferenceLine y={1} stroke="var(--color-good)" strokeDasharray="4 4" strokeOpacity={0.5} />
                    <ReferenceLine y={0.8} stroke="var(--color-warn)" strokeDasharray="4 4" strokeOpacity={0.5} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="taux" stroke="var(--color-brand)" strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 5 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--color-border-soft)] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-[var(--color-text-faint)]">
            <LegendDot color="var(--color-bad)" label="< 80% critique" />
            <LegendDot color="var(--color-warn)" label="80 – 99.9% attention" />
            <LegendDot color="var(--color-good)" label="≥ 100% atteint" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-soft)] px-3 py-2.5">
      <div className="tick text-[9.5px] text-[var(--color-text-faint)] mb-1">{label}</div>
      <div className="font-mono font-semibold text-[15px]" style={{ color: highlight ?? "var(--color-text)" }}>
        {value}
      </div>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  );
}
