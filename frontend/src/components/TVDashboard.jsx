import { motion } from "motion/react";
import { pct, num, statusMeta, titleCase, categoryStyle } from "../lib/format";
import {
  IconGauge,
  IconCart,
  IconSignalTower,
  IconCoins,
  IconLayers,
  IconHeart,
  IconCheckCircle,
  IconAlertTriangle,
} from "./icons";

const CATEGORY_ICON = {
  cart: IconCart,
  tower: IconSignalTower,
  coins: IconCoins,
  layers: IconLayers,
  heart: IconHeart,
  gauge: IconGauge,
};

// Small arc gauge used inside every indicator tile — 0-100%+ scale, but the
// stroke itself is clamped to a full circle at 100% so an over-achieved
// indicator (>100%) doesn't overflow visually; the number below still shows
// the real value.
function MiniGauge({ ratio, color, size = 56 }) {
  const r = (size - 9) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(ratio ?? 0, 0), 1));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-3)" strokeWidth={6} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.16,1,.3,1)" }}
      />
    </svg>
  );
}

function IndicatorTile({ ind, onOpen, index }) {
  const meta = statusMeta(ind.status);
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(ind)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.015, 0.4) }}
      className="tv-tile text-left cursor-pointer"
      style={{ "--tile-color": meta.color }}
    >
      <MiniGauge ratio={ind.tauxRealisation} color={meta.color} />
      <div className="min-w-0 flex-1">
        <div className="tv-tile-name" title={titleCase(ind.indicateur)}>
          {titleCase(ind.indicateur)}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="tv-tile-sub">
            Obj {ind.objectifYTD !== null ? num(ind.objectifYTD, ind.objectifYTD % 1 === 0 ? 0 : 1) : "—"} · Réal{" "}
            {ind.realisationYTD !== null ? num(ind.realisationYTD, ind.realisationYTD % 1 === 0 ? 0 : 1) : "—"}
          </span>
        </div>
        <div className="tv-tile-score" style={{ color: meta.color }}>
          {ind.tauxRealisation !== null ? pct(ind.tauxRealisation, 1) : "—"}
        </div>
      </div>
    </motion.button>
  );
}

function AxisSection({ cat, onOpenIndicator, delay }) {
  const style = categoryStyle(cat.categorie);
  const Ico = CATEGORY_ICON[style.icon] ?? IconGauge;
  const meta = statusMeta(cat.status);
  const allIndicateurs = cat.sousCategories.flatMap((sc) => sc.indicateurs.map((i) => ({ ...i, categorie: cat.categorie, sousCategorie: sc.sousCategorie })));

  return (
    <motion.section
      className="tv-axis"
      style={{ "--axis-color": style.color }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <div className="tv-axis-header">
        <span className="tv-axis-icon" style={{ background: `${style.color}1c`, color: style.color }}>
          <Ico size={16} />
        </span>
        <span className="tv-axis-title">{titleCase(cat.categorie)}</span>
        <span className="tv-axis-count">{allIndicateurs.length} indic.</span>
        <span className="tv-axis-score" style={{ color: meta.color }}>
          {cat.tauxMoyenPondere !== null ? pct(cat.tauxMoyenPondere, 1) : "—"}
        </span>
      </div>
      <div className="tv-axis-grid">
        {allIndicateurs.map((ind, i) => (
          <IndicatorTile key={`${ind.sousCategorie}-${ind.indicateur}-${i}`} ind={ind} onOpen={onOpenIndicator} index={i} />
        ))}
        {allIndicateurs.length === 0 && (
          <div className="text-[12px] text-[var(--color-text-faint)] py-3">Aucun indicateur sur cet axe.</div>
        )}
      </div>
    </motion.section>
  );
}

// Vue "TV" — pensée pour être affichée telle quelle sur un téléviseur connecté :
// une seule page, tout le classeur (tous les axes, tous les indicateurs) y
// tient, avec le barème de couleur (rouge < 80% / orange 80-99.9% / vert >=
// 100%) rappelé en légende. Cliquer un indicateur ouvre son historique en pop-up.
// Cette vue est volontairement forcée en thème clair (data-theme="light") :
// le fond noir a été explicitement écarté par l'encadrant pour l'affichage TV.
export default function TVDashboard({ sheet, categories, scoreGlobal, period, total, atteints, attention, critiques, onOpenIndicator }) {
  const globalMeta = statusMeta(scoreGlobal !== null && scoreGlobal >= 1 ? "atteint" : scoreGlobal >= 0.8 ? "attention" : "critique");
  const globalRatio = scoreGlobal ?? 0;

  return (
    <div className="tv-page" data-theme="light">
      <div className="tv-strip">
        <span className="tick text-[11px] text-[var(--color-text-dim)] whitespace-nowrap">Direction Régionale Ben Arous</span>
        <span className="tv-strip-bar" />
        {period && (
          <span className="tick text-[11px] text-[var(--color-text-faint)] whitespace-nowrap">Période · {period}</span>
        )}
      </div>

      <div className="tv-hero">
        <div className="tv-hero-score card">
          <div className="tv-hero-score-ring">
            <svg viewBox="0 0 160 160" className="w-full h-full">
              <defs>
                <linearGradient id="tvScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-blue)" />
                  <stop offset="35%" stopColor="var(--color-violet)" />
                  <stop offset="60%" stopColor="var(--color-magenta)" />
                  <stop offset="80%" stopColor="var(--color-brand)" />
                  <stop offset="100%" stopColor="var(--color-gold)" />
                </linearGradient>
              </defs>
              <circle cx="80" cy="80" r="68" fill="none" stroke="var(--color-surface-3)" strokeWidth="13" />
              <circle
                cx="80"
                cy="80"
                r="68"
                fill="none"
                stroke="url(#tvScoreGradient)"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 68}
                strokeDashoffset={2 * Math.PI * 68 * (1 - Math.min(globalRatio, 1))}
                transform="rotate(-90 80 80)"
                style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.16,1,.3,1)" }}
              />
              <text x="80" y="76" textAnchor="middle" fontFamily="var(--font-display)" fontSize="31" fontWeight="700" fill="var(--color-text)">
                {(globalRatio * 100).toFixed(1)}%
              </text>
              <text x="80" y="97" textAnchor="middle" fontFamily="var(--font-display)" fontSize="9" letterSpacing="1.4" fill="var(--color-text-faint)">
                SCORE RÉGIONAL
              </text>
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span
              className="tick text-[10.5px] px-2.5 py-1 rounded-full border"
              style={{ color: globalMeta.color, borderColor: globalMeta.color, background: globalMeta.dim }}
            >
              {globalMeta.label}
            </span>
          </div>
        </div>

        <div className="tv-hero-stats card">
          <StatRow icon={IconCheckCircle} color="var(--color-good)" label="Indicateurs conformes" value={atteints} total={total} />
          <StatRow icon={IconAlertTriangle} color="var(--color-warn)" label="En vigilance" value={attention} total={total} />
          <StatRow icon={IconAlertTriangle} color="var(--color-bad)" label="Critiques" value={critiques} total={total} />
          <div className="tv-stat-row tv-stat-total">
            <span className="tv-stat-label">Total indicateurs</span>
            <span className="tv-stat-value">{total}</span>
          </div>
        </div>

        <div className="tv-hero-legend card">
          <span className="tick text-[10px] text-[var(--color-text-faint)] mb-1 block">Barème</span>
          <LegendRow color="var(--color-bad)" label="Sous 80%" />
          <LegendRow color="var(--color-warn)" label="80% à 99,9%" />
          <LegendRow color="var(--color-good)" label="100% et plus" />
        </div>
      </div>

      <div className="tv-axes">
        {categories.map((cat, i) => (
          <AxisSection key={cat.categorie} cat={cat} onOpenIndicator={onOpenIndicator} delay={i * 0.05} />
        ))}
        {categories.length === 0 && (
          <div className="card p-6 text-center text-[13px] text-[var(--color-text-faint)]">
            Aucun axe structuré détecté dans ce classeur pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({ icon: Ico, color, label, value, total }) {
  const share = total > 0 ? Math.round(((value ?? 0) / total) * 100) : 0;
  return (
    <div className="tv-stat-row">
      <span className="tv-stat-icon" style={{ background: `${color}1c`, color }}>
        <Ico size={15} />
      </span>
      <span className="tv-stat-label">{label}</span>
      <span className="tv-stat-value" style={{ color }}>
        {value ?? 0}
      </span>
      <span className="tv-stat-share">{share}%</span>
    </div>
  );
}

function LegendRow({ color, label }) {
  return (
    <div className="tv-legend-row">
      <span className="tv-legend-swatch" style={{ background: color, "--sw-color": color }} />
      {label}
    </div>
  );
}
