import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart, Pie, Cell } from "recharts";
import { pct, num, titleCase, statusMeta, categoryStyle } from "../lib/format";
import { buildAlerts } from "../lib/insights";
import { fetchHistory } from "../lib/api";
import {
  IconGauge,
  IconCart,
  IconSignalTower,
  IconCoins,
  IconLayers,
  IconHeart,
  IconCheckCircle,
  IconAlertTriangle,
  IconTrendDown,
  IconTrendUp,
} from "./icons";

const CATEGORY_ICON = {
  cart: IconCart,
  tower: IconSignalTower,
  coins: IconCoins,
  layers: IconLayers,
  heart: IconHeart,
  gauge: IconGauge,
};

// Palette d'axe spécifique à la vue TV (distincte de categoryStyle() utilisée
// ailleurs dans l'appli) : bleu / vert / violet / or, pour coller à la charte
// demandée pour l'affichage téléviseur.
const AXIS_COLOR = [
  { test: (n) => n.includes("commerc"), color: "var(--color-blue)" },
  { test: (n) => n.includes("techn"), color: "var(--color-teal)" },
  { test: (n) => n.includes("strateg") || n.includes("stratég"), color: "var(--color-violet)" },
  { test: (n) => n.includes("financ"), color: "var(--color-gold)" },
];
function normalizeKey(str) {
  return String(str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
export function axisColor(categorie) {
  const n = normalizeKey(categorie);
  return AXIS_COLOR.find((c) => c.test(n))?.color ?? "var(--color-brand)";
}

// Un indicateur "suivi" a un poids/taux renseigné (poids=0 & métriques vides
// = ligne non pilotée dans le classeur source, volontairement absente de la
// vue TV, comme du décompte "Total indicateurs").
export function isTracked(ind) {
  return ind.status !== "inconnu";
}

export function GaugeRing({ ratio, color, size, strokeWidth }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.min(Math.max(ratio ?? 0, 0), 1));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={off}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.16,1,.3,1)" }}
      />
    </svg>
  );
}

export function GaugeTile({ ind, size, onOpen, index }) {
  const meta = statusMeta(ind.status);
  return (
    <motion.button
      type="button"
      onClick={() => onOpen?.(ind)}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      className="tv2-tile cursor-pointer"
    >
      <div className="tv2-tile-ring" style={{ width: size, height: size }}>
        <GaugeRing ratio={ind.tauxRealisation} color={meta.color} size={size} strokeWidth={Math.max(6, size * 0.11)} />
        <span className="tv2-tile-pct" style={{ color: meta.color, fontSize: size * 0.22 }}>
          {ind.tauxRealisation !== null ? pct(ind.tauxRealisation, 1) : "—"}
        </span>
      </div>
      <div className="tv2-tile-name" title={titleCase(ind.indicateur)}>
        {titleCase(ind.indicateur)}
      </div>
      <div className="tv2-tile-stats">
        <div className="tv2-tile-stat">
          <span>Objectif</span>
          <b>{ind.objectifYTD !== null ? num(ind.objectifYTD, ind.objectifYTD % 1 === 0 ? 0 : 1) : "—"}</b>
        </div>
        <div className="tv2-tile-stat">
          <span>Réalisation</span>
          <b>{ind.realisationYTD !== null ? num(ind.realisationYTD, ind.realisationYTD % 1 === 0 ? 0 : 1) : "—"}</b>
        </div>
      </div>
    </motion.button>
  );
}

export function AxisCard({ cat, onOpenIndicator, delay }) {
  const color = axisColor(cat.categorie);
  const Ico = CATEGORY_ICON[categoryStyle(cat.categorie).icon] ?? IconGauge;
  const tracked = cat.sousCategories.flatMap((sc) => sc.indicateurs).filter(isTracked);
  const cols = tracked.length <= 2 ? 1 : tracked.length <= 4 ? 2 : 3;
  const size = cols === 1 ? 88 : cols === 2 ? 74 : 58;

  return (
    <motion.section
      className="tv2-axis-card"
      style={{ "--axis-color": color }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="tv2-axis-head">
        <span className="tv2-axis-icon" style={{ background: `${color}1c`, color }}>
          <Ico size={15} />
        </span>
        <span className="tv2-axis-title" style={{ color }}>
          {titleCase(cat.categorie)}
        </span>
      </div>
      <div className={`tv2-axis-grid tv2-cols-${cols}`}>
        {tracked.map((ind, i) => (
          <GaugeTile key={`${ind.sousCategorie}-${ind.indicateur}-${i}`} ind={ind} size={size} onOpen={onOpenIndicator} index={i} />
        ))}
        {tracked.length === 0 && <div className="text-[11px] text-[var(--color-text-faint)] py-4">Aucun indicateur suivi.</div>}
      </div>
    </motion.section>
  );
}

export function MiniStatRow({ icon: Ico, color, label, value }) {
  return (
    <div className="tv2-ministat-row">
      <span className="tv2-ministat-icon" style={{ background: `${color}1c`, color }}>
        <Ico size={13} />
      </span>
      <span className="tv2-ministat-label">{label}</span>
      <span className="tv2-ministat-value" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

export function DistributionDonut({ good, warn, bad, total, size = 118, label = "INDICATEURS", children }) {
  const data = [
    { key: "bad", value: bad, color: "var(--color-bad)" },
    { key: "warn", value: warn, color: "var(--color-warn)" },
    { key: "good", value: good, color: "var(--color-good)" },
  ].filter((d) => d.value > 0);
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie data={data.length ? data : [{ key: "empty", value: 1, color: "var(--color-surface-3)" }]} dataKey="value" innerRadius={size * 0.34} outerRadius={size * 0.49} paddingAngle={3} strokeWidth={0} startAngle={90} endAngle={-270}>
          {(data.length ? data : [{ color: "var(--color-surface-3)" }]).map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {children ?? (
          <>
            <span className="font-mono font-bold text-[var(--color-text)]" style={{ fontSize: size * 0.19 }}>
              {total}
            </span>
            <span className="tick text-[8px] text-[var(--color-text-faint)]">{label}</span>
          </>
        )}
      </div>
    </div>
  );
}

function EvolutionChart({ scoreGlobal, sheetName }) {
  const [history, setHistory] = useState(null);
  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  const data = useMemo(() => {
    const entries = [...(history ?? [])].reverse().map((e) => ({ month: e.month, scoreGlobal: e.scoreGlobal }));
    // Ajoute le point "live" (feuille actuellement affichée) s'il n'apparaît pas déjà.
    if (sheetName && scoreGlobal !== null && scoreGlobal !== undefined) {
      const last = entries[entries.length - 1];
      if (!last || last.scoreGlobal !== scoreGlobal) {
        entries.push({ month: sheetName, scoreGlobal });
      }
    }
    return entries;
  }, [history, sheetName, scoreGlobal]);

  if (history === null) {
    return <div className="flex-1 flex items-center justify-center text-[11px] text-[var(--color-text-faint)]">Chargement…</div>;
  }

  if (data.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center text-[11px] text-[var(--color-text-faint)] text-center px-4">
        Pas assez de versions archivées pour tracer une évolution.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: -18 }}>
        <XAxis dataKey="month" tick={{ fill: "var(--color-text-faint)", fontSize: 9.5 }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
        <YAxis
          domain={[0, "dataMax"]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          tick={{ fill: "var(--color-text-faint)", fontSize: 9.5, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          formatter={(v) => pct(v, 1)}
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-soft)",
            borderRadius: 10,
            fontSize: 11,
          }}
        />
        <Line
          type="monotone"
          dataKey="scoreGlobal"
          stroke="var(--color-blue)"
          strokeWidth={2.2}
          dot={{ r: 3, fill: "var(--color-blue)", strokeWidth: 0 }}
          activeDot={{ r: 4.5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Vue "TV" — pensée pour être affichée telle quelle sur un téléviseur connecté :
// une seule page, sans défilement, tout le classeur (tous les axes, tous les
// indicateurs suivis) y tient — score global, barème, répartition par axe,
// score régional, évolution, alertes. Cliquer un indicateur ouvre son
// historique en pop-up. Cette vue est volontairement forcée en thème clair.
export default function TVDashboard({ sheet, categories, scoreGlobal, period, onOpenIndicator }) {
  const trackedAll = (sheet.indicateurs ?? []).filter(isTracked);
  const total = trackedAll.length;
  const good = trackedAll.filter((i) => i.status === "atteint").length; // >= 100%
  const warn = trackedAll.filter((i) => i.status === "attention").length; // 80–99.9%
  const bad = trackedAll.filter((i) => i.status === "critique").length; // < 80%

  const [history, setHistory] = useState(null);
  useEffect(() => {
    fetchHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  const delta = useMemo(() => {
    if (!history || history.length < 2) return null;
    const chrono = [...history].reverse();
    const last = chrono[chrono.length - 1];
    const prev = chrono[chrono.length - 2];
    if (last?.scoreGlobal == null || prev?.scoreGlobal == null) return null;
    return last.scoreGlobal - prev.scoreGlobal;
  }, [history]);

  const alerts = buildAlerts(sheet);
  const scoreVal = scoreGlobal ?? 0;

  return (
    <div className="tv2-page">
      {/* ---- Ligne 1 : score global, barème, statut des indicateurs ---- */}
      <div className="tv2-hero">
        <div className="tv2-score-card">
          <span className="tick text-[10px] text-white/75">Score global</span>
          <span className="tv2-score-value">{pct(scoreVal, 2)}</span>
          {delta !== null && (
            <span className="tv2-score-delta">
              {delta >= 0 ? <IconTrendUp size={13} /> : <IconTrendDown size={13} />}
              {delta >= 0 ? "+" : ""}
              {(delta * 100).toFixed(1)}% vs mois dernier
            </span>
          )}
        </div>

        <div className="tv2-mini-card" style={{ "--mini-color": "var(--color-bad)" }}>
          <span className="tv2-mini-icon"><IconTrendDown size={16} /></span>
          <span className="tv2-mini-label">Sous 80%</span>
          <span className="tv2-mini-value">{bad}</span>
          <span className="tv2-mini-share">{total > 0 ? ((bad / total) * 100).toFixed(2) : "0.00"}%</span>
        </div>
        <div className="tv2-mini-card" style={{ "--mini-color": "var(--color-warn)" }}>
          <span className="tv2-mini-icon"><IconGauge size={16} /></span>
          <span className="tv2-mini-label">80% - 99.9%</span>
          <span className="tv2-mini-value">{warn}</span>
          <span className="tv2-mini-share">{total > 0 ? ((warn / total) * 100).toFixed(2) : "0.00"}%</span>
        </div>
        <div className="tv2-mini-card" style={{ "--mini-color": "var(--color-good)" }}>
          <span className="tv2-mini-icon"><IconCheckCircle size={16} /></span>
          <span className="tv2-mini-label">100% et plus</span>
          <span className="tv2-mini-value">{good}</span>
          <span className="tv2-mini-share">{total > 0 ? ((good / total) * 100).toFixed(2) : "0.00"}%</span>
        </div>

        <div className="tv2-conform-card">
          <MiniStatRow icon={IconCheckCircle} color="var(--color-good)" label="Indicateurs conformes" value={good} />
          <MiniStatRow icon={IconAlertTriangle} color="var(--color-warn)" label="Indicateurs en vigilance" value={warn} />
          <MiniStatRow icon={IconTrendDown} color="var(--color-bad)" label="Indicateurs critiques" value={bad} />
          <MiniStatRow icon={IconLayers} color="var(--color-blue)" label="Total indicateurs" value={total} />
        </div>
      </div>

      {/* ---- Ligne 2 : les 4 axes, tous les indicateurs suivis ---- */}
      <div className="tv2-axes-row">
        {categories.map((cat, i) => (
          <AxisCard key={cat.categorie} cat={cat} onOpenIndicator={onOpenIndicator} delay={i * 0.04} />
        ))}
        {categories.length === 0 && (
          <div className="card p-6 text-center text-[13px] text-[var(--color-text-faint)]">
            Aucun axe structuré détecté dans ce classeur pour le moment.
          </div>
        )}
      </div>

      {/* ---- Ligne 3 : score régional, évolution, alertes, répartition ---- */}
      <div className="tv2-bottom-row">
        <div className="tv2-bottom-card">
          <span className="tick text-[10.5px]" style={{ color: "var(--color-violet)" }}>
            Score régional
          </span>
          <div className="tv2-regional-body">
            <DistributionDonut good={good} warn={warn} bad={bad} total={total} size={104}>
              <span className="font-mono font-bold text-[16px] text-[var(--color-text)]">{pct(scoreVal, 2)}</span>
            </DistributionDonut>
            <div className="tv2-regional-list">
              <MiniStatRow icon={IconCheckCircle} color="var(--color-good)" label="Indicateurs conformes" value={good} />
              <MiniStatRow icon={IconAlertTriangle} color="var(--color-warn)" label="Indicateurs en vigilance" value={warn} />
              <MiniStatRow icon={IconTrendDown} color="var(--color-bad)" label="Indicateurs critiques" value={bad} />
              <MiniStatRow icon={IconLayers} color="var(--color-blue)" label="Total indicateurs" value={total} />
            </div>
          </div>
        </div>

        <div className="tv2-bottom-card">
          <span className="tick text-[10.5px] text-[var(--color-text-dim)]">Évolution du score global</span>
          <div className="flex-1 min-h-0 mt-1">
            <EvolutionChart scoreGlobal={scoreGlobal} sheetName={period} />
          </div>
        </div>

        <div className="tv2-bottom-card">
          <span className="tick text-[10.5px]" style={{ color: "var(--color-bad)" }}>
            Dernières alertes
          </span>
          <div className="tv2-alerts-list">
            {alerts.length === 0 && <div className="text-[11px] text-[var(--color-text-faint)] py-3">Aucune alerte — tous les indicateurs suivis sont conformes.</div>}
            {alerts.map((a, i) => {
              const meta = statusMeta(a.status);
              return (
                <div key={i} className="tv2-alert-row">
                  <span style={{ color: meta.color }}>
                    <IconAlertTriangle size={13} />
                  </span>
                  <span className="tv2-alert-name" title={titleCase(a.indicateur)}>
                    {titleCase(a.indicateur)}
                  </span>
                  <span className="tv2-alert-pct" style={{ color: meta.color }}>
                    {a.tauxRealisation !== null ? pct(a.tauxRealisation, 1) : "—"}
                  </span>
                  <span className="tv2-alert-tag" style={{ color: meta.color }}>
                    {a.status === "critique" ? "Sous la cible" : "À améliorer"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="tv2-bottom-card">
          <span className="tick text-[10.5px] text-[var(--color-text-dim)]">Répartition des indicateurs</span>
          <div className="tv2-distrib-body">
            <DistributionDonut good={good} warn={warn} bad={bad} total={total} size={104} />
            <div className="tv2-distrib-legend">
              <div className="tv2-legend-row">
                <span className="tv2-legend-dot" style={{ background: "var(--color-bad)" }} />
                Sous 80%
                <b>
                  {bad} ({total > 0 ? ((bad / total) * 100).toFixed(2) : "0.00"}%)
                </b>
              </div>
              <div className="tv2-legend-row">
                <span className="tv2-legend-dot" style={{ background: "var(--color-warn)" }} />
                80% - 99.9%
                <b>
                  {warn} ({total > 0 ? ((warn / total) * 100).toFixed(2) : "0.00"}%)
                </b>
              </div>
              <div className="tv2-legend-row">
                <span className="tv2-legend-dot" style={{ background: "var(--color-good)" }} />
                100% et plus
                <b>
                  {good} ({total > 0 ? ((good / total) * 100).toFixed(2) : "0.00"}%)
                </b>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
