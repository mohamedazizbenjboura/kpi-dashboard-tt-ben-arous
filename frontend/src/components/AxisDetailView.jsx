import { motion } from "motion/react";
import { pct, titleCase, statusMeta, categoryStyle } from "../lib/format";
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
} from "./icons";
import { GaugeTile, MiniStatRow, DistributionDonut, axisColor, isTracked } from "./TVDashboard";

const CATEGORY_ICON = {
  cart: IconCart,
  tower: IconSignalTower,
  coins: IconCoins,
  layers: IconLayers,
  heart: IconHeart,
  gauge: IconGauge,
};

// Vue "détail d'axe" — même langage visuel que la vue TV (score, barème,
// jauges circulaires, répartition, alertes) mais recentrée sur un seul axe
// de pilotage, ouverte depuis le clic sur son icône dans la barre latérale.
// Pensée pour tenir sur un seul écran, sans défilement, comme la vue TV.
export default function AxisDetailView({ category, onOpenIndicator }) {
  if (!category) {
    return (
      <div className="tv2-page flex-1 flex items-center justify-center">
        <p className="text-[13px] text-[var(--color-text-faint)]">Axe introuvable.</p>
      </div>
    );
  }

  const color = axisColor(category.categorie);
  const Ico = CATEGORY_ICON[categoryStyle(category.categorie).icon] ?? IconGauge;

  const groups = (category.sousCategories ?? [])
    .map((sc) => ({ ...sc, tracked: (sc.indicateurs ?? []).filter(isTracked) }))
    .filter((sc) => sc.tracked.length > 0);

  const tracked = groups.flatMap((sc) => sc.tracked);
  const total = tracked.length;
  const good = tracked.filter((i) => i.status === "atteint").length;
  const warn = tracked.filter((i) => i.status === "attention").length;
  const bad = tracked.filter((i) => i.status === "critique").length;
  const avg = category.tauxMoyenPondere ?? null;
  const watchlist = tracked.filter((i) => i.status !== "atteint");

  const groupCols = Math.max(1, Math.min(groups.length || 1, 4));

  return (
    <div className="tv2-page">
      {/* ---- Ligne 1 : score de l'axe, barème, statut ---- */}
      <div
        className="tv2-hero"
        style={{ gridTemplateColumns: "260px repeat(3, minmax(112px, 1fr)) minmax(320px, 1.7fr)" }}
      >
        <div
          className="tv2-score-card"
          style={{ background: `linear-gradient(135deg, ${color} 0%, var(--color-violet) 120%)` }}
        >
          <span className="tick text-[10px] text-white/75 flex items-center gap-1.5">
            <Ico size={13} /> {titleCase(category.categorie)}
          </span>
          <span className="tv2-score-value">{avg !== null ? pct(avg, 2) : "—"}</span>
          <span className="tv2-score-delta">Score moyen pondéré de l'axe</span>
        </div>

        <div className="tv2-mini-card" style={{ "--mini-color": "var(--color-bad)" }}>
          <span className="tv2-mini-icon">
            <IconTrendDown size={16} />
          </span>
          <span className="tv2-mini-label">Sous 80%</span>
          <span className="tv2-mini-value">{bad}</span>
          <span className="tv2-mini-share">{total > 0 ? ((bad / total) * 100).toFixed(2) : "0.00"}%</span>
        </div>
        <div className="tv2-mini-card" style={{ "--mini-color": "var(--color-warn)" }}>
          <span className="tv2-mini-icon">
            <IconGauge size={16} />
          </span>
          <span className="tv2-mini-label">80% - 99.9%</span>
          <span className="tv2-mini-value">{warn}</span>
          <span className="tv2-mini-share">{total > 0 ? ((warn / total) * 100).toFixed(2) : "0.00"}%</span>
        </div>
        <div className="tv2-mini-card" style={{ "--mini-color": "var(--color-good)" }}>
          <span className="tv2-mini-icon">
            <IconCheckCircle size={16} />
          </span>
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

      {/* ---- Ligne 2 : sous-catégories de l'axe, tous les indicateurs suivis ---- */}
      <div className="tv2-axes-row" style={{ gridTemplateColumns: `repeat(${groupCols}, 1fr)` }}>
        {groups.map((sc, gi) => {
          const cols = sc.tracked.length <= 2 ? 1 : sc.tracked.length <= 4 ? 2 : 3;
          const size = cols === 1 ? 108 : cols === 2 ? 90 : 70;
          return (
            <motion.section
              key={sc.sousCategorie}
              className="tv2-axis-card"
              style={{ "--axis-color": color }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: gi * 0.05 }}
            >
              <div className="tv2-axis-head">
                <span className="tv2-axis-icon" style={{ background: `${color}1c`, color }}>
                  <Ico size={15} />
                </span>
                <span className="tv2-axis-title" style={{ color }}>
                  {titleCase(sc.sousCategorie)}
                </span>
              </div>
              <div className={`tv2-axis-grid tv2-cols-${cols}`}>
                {sc.tracked.map((ind, i) => (
                  <GaugeTile
                    key={`${sc.sousCategorie}-${ind.indicateur}-${i}`}
                    ind={ind}
                    size={size}
                    onOpen={onOpenIndicator}
                    index={i}
                  />
                ))}
              </div>
            </motion.section>
          );
        })}
        {groups.length === 0 && (
          <div className="card p-6 text-center text-[13px] text-[var(--color-text-faint)]">
            Aucun indicateur suivi pour cet axe.
          </div>
        )}
      </div>

      {/* ---- Ligne 3 : répartition de l'axe + indicateurs à surveiller ---- */}
      <div className="tv2-bottom-row" style={{ flexBasis: 190, gridTemplateColumns: "1fr 1.4fr" }}>
        <div className="tv2-bottom-card">
          <span className="tick text-[10.5px]" style={{ color }}>
            Répartition — {titleCase(category.categorie)}
          </span>
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

        <div className="tv2-bottom-card">
          <span className="tick text-[10.5px]" style={{ color: "var(--color-bad)" }}>
            Indicateurs à surveiller
          </span>
          <div className="tv2-alerts-list">
            {watchlist.length === 0 && (
              <div className="text-[11px] text-[var(--color-text-faint)] py-3">
                Tous les indicateurs de cet axe sont conformes.
              </div>
            )}
            {watchlist.map((a, i) => {
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
      </div>
    </div>
  );
}
