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

/*
 * TVDashboard — "Centre de Pilotage KPI"
 * ---------------------------------------------------------------------------
 * The layout intentionally follows the supplied TT reference:
 *   • white/light canvas, TT sidebar, colourful TT wave accents
 *   • one-screen TV composition: header + KPI summary + axes + bottom analytics
 *   • no fixed indicator count: axes and indicators are rendered dynamically
 *   • responsive grid: the composition adapts to TV, laptop and browser sizes
 *
 * LOGO:
 * The supplied TT logo is expected at:
 *     C:\Users\aziz\telecom\images.png
 * The component is assumed to live in src/components, so Vite resolves it
 * with new URL("../../images.png", import.meta.url).href.
 */

const LOGO_SRC = "/images.png";

const CATEGORY_ICON = {
  cart: IconCart,
  tower: IconSignalTower,
  coins: IconCoins,
  layers: IconLayers,
  heart: IconHeart,
  gauge: IconGauge,
};

const AXIS_COLOR = [
  { test: (n) => n.includes("commerc"), color: "#2457D6" },
  { test: (n) => n.includes("techn"), color: "#20A64A" },
  { test: (n) => n.includes("strateg"), color: "#8B2BE2" },
  { test: (n) => n.includes("financ"), color: "#F28A12" },
];

function normalizeKey(str) {
  return String(str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function axisColor(categorie) {
  const n = normalizeKey(categorie);
  return AXIS_COLOR.find((c) => c.test(n))?.color ?? "#2457D6";
}

export function isTracked(ind) {
  return ind?.status !== "inconnu";
}

function safeRatio(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(n, 1));
}

export function GaugeRing({ ratio, color, size = 72, strokeWidth = 7 }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ * (1 - safeRatio(ratio));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E8EF" strokeWidth={strokeWidth} />
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
      />
    </svg>
  );
}

export function GaugeTile({ ind, onOpen, index = 0 }) {
  const meta = statusMeta(ind.status);

  return (
    <motion.button
      type="button"
      onClick={() => onOpen?.(ind)}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.012, 0.15) }}
      className="tt-kpi-tile"
      title={`Ouvrir ${titleCase(ind.indicateur)}`}
    >
      <div className="tt-gauge">
        <GaugeRing ratio={ind.tauxRealisation} color={meta.color} size={68} strokeWidth={7} />
        <span style={{ color: meta.color }}>
          {ind.tauxRealisation !== null ? pct(ind.tauxRealisation, 1) : "—"}
        </span>
      </div>

      <div className="tt-kpi-name" title={titleCase(ind.indicateur)}>
        {titleCase(ind.indicateur)}
      </div>

      <div className="tt-kpi-values">
        <span>Objectif <b>{ind.objectifYTD !== null ? num(ind.objectifYTD, ind.objectifYTD % 1 === 0 ? 0 : 1) : "—"}</b></span>
        <span>Réalisation <b>{ind.realisationYTD !== null ? num(ind.realisationYTD, ind.realisationYTD % 1 === 0 ? 0 : 1) : "—"}</b></span>
      </div>
    </motion.button>
  );
}

export function AxisCard({ cat, onOpenIndicator, delay = 0 }) {
  const color = axisColor(cat.categorie);
  const style = categoryStyle(cat.categorie);
  const Ico = CATEGORY_ICON[style.icon] ?? IconGauge;
  const tracked = (cat.sousCategories ?? [])
    .flatMap((sc) => sc.indicateurs ?? [])
    .filter(isTracked);

  return (
    <motion.section
      className="tt-axis-card"
      style={{ "--axis": color }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay }}
    >
      <div className="tt-axis-head">
        <span className="tt-axis-icon"><Ico size={17} /></span>
        <span>{titleCase(cat.categorie)}</span>
      </div>

      <div className="tt-axis-grid">
        {tracked.map((ind, i) => (
          <GaugeTile
            key={`${ind.sousCategorie}-${ind.indicateur}-${i}`}
            ind={ind}
            onOpen={onOpenIndicator}
            index={i}
          />
        ))}

        {tracked.length === 0 && (
          <div className="tt-empty">Aucun indicateur suivi.</div>
        )}
      </div>
    </motion.section>
  );
}

function MiniStat({ icon: Ico, color, label, value }) {
  return (
    <div className="tt-mini-stat">
      <span className="tt-mini-icon" style={{ color, background: `${color}14` }}>
        <Ico size={13} />
      </span>
      <span className="tt-mini-label">{label}</span>
      <b style={{ color }}>{value}</b>
    </div>
  );
}

export function MiniStatRow({ icon: Ico, color, label, value }) {
  return (
    <div className="tv2-ministat-row">
      <span className="tv2-ministat-icon" style={{ color, background: "color-mix(in srgb, currentColor 12%, transparent)" }}><Ico size={14} /></span>
      <span className="tv2-ministat-label">{label}</span>
      <b className="tv2-ministat-value" style={{ color }}>{value}</b>
    </div>
  );
}

export function DistributionDonut({ good, warn, bad, total, size = 108, center = null }) {
  const data = [
    { key: "bad", value: bad, color: "#E31B2E" },
    { key: "warn", value: warn, color: "#F59B13" },
    { key: "good", value: good, color: "#22A447" },
  ].filter((d) => d.value > 0);

  return (
    <div className="tt-donut" style={{ width: size, height: size }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data.length ? data : [{ key: "empty", value: 1, color: "#E5E8EF" }]}
          dataKey="value"
          innerRadius={size * 0.34}
          outerRadius={size * 0.47}
          paddingAngle={3}
          strokeWidth={0}
          startAngle={90}
          endAngle={-270}
        >
          {(data.length ? data : [{ color: "#E5E8EF" }]).map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
      <div className="tt-donut-center">
        <b>{center ?? total}</b>
        {!center && <span>INDICATEURS</span>}
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
    const entries = [...(history ?? [])]
      .reverse()
      .map((e) => ({ month: e.month, scoreGlobal: e.scoreGlobal }));

    if (sheetName && scoreGlobal !== null && scoreGlobal !== undefined) {
      const last = entries[entries.length - 1];
      if (!last || last.scoreGlobal !== scoreGlobal) {
        entries.push({ month: sheetName, scoreGlobal });
      }
    }
    return entries;
  }, [history, sheetName, scoreGlobal]);

  if (history === null) return <div className="tt-chart-message">Chargement…</div>;

  if (data.length < 2) {
    return <div className="tt-chart-message">Pas assez de versions archivées pour tracer une évolution.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <XAxis
          dataKey="month"
          tick={{ fill: "#7D8495", fontSize: 9 }}
          axisLine={{ stroke: "#E6E9EF" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, "dataMax"]}
          tickFormatter={(v) => `${Math.round(v * 100)}%`}
          tick={{ fill: "#7D8495", fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={34}
        />
        <Tooltip
          formatter={(v) => pct(v, 1)}
          contentStyle={{
            background: "#fff",
            border: "1px solid #E4E7EE",
            borderRadius: 9,
            fontSize: 10,
          }}
        />
        <Line
          type="monotone"
          dataKey="scoreGlobal"
          stroke="#2457D6"
          strokeWidth={2.4}
          dot={{ r: 3, fill: "#2457D6", strokeWidth: 0 }}
          activeDot={{ r: 4.5 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function StatusCard({ icon: Ico, label, value, share, color }) {
  return (
    <div className="tt-status-card">
      <span className="tt-status-icon" style={{ color, background: `${color}13` }}>
        <Ico size={15} />
      </span>
      <span className="tt-status-label">{label}</span>
      <strong>{value}</strong>
      <small style={{ color }}>{share}%</small>
    </div>
  );
}

function AlertList({ alerts }) {
  return (
    <div className="tt-alert-list">
      {alerts.length === 0 && (
        <div className="tt-empty">Aucune alerte — tous les indicateurs suivis sont conformes.</div>
      )}
      {alerts.slice(0, 6).map((a, i) => {
        const meta = statusMeta(a.status);
        return (
          <div key={i} className="tt-alert-row">
            <span style={{ color: meta.color }}><IconAlertTriangle size={12} /></span>
            <span className="tt-alert-name" title={titleCase(a.indicateur)}>{titleCase(a.indicateur)}</span>
            <b style={{ color: meta.color }}>
              {a.tauxRealisation !== null ? pct(a.tauxRealisation, 1) : "—"}
            </b>
            <small style={{ color: meta.color }}>
              {a.status === "critique" ? "Sous la cible" : "À améliorer"}
            </small>
          </div>
        );
      })}
    </div>
  );
}

function TTLogo({ compact = false }) {
  return (
    <img
      src={LOGO_SRC}
      alt="Tunisie Telecom"
      className={compact ? "tt-logo tt-logo-compact" : "tt-logo"}
      onError={(e) => {
        // If the public asset is not present, don't leave a broken-image icon.
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

const TV_CSS = `
  .tt-tv-root {
    --tt-blue:#173A9B;
    --tt-blue-2:#2457D6;
    --tt-purple:#7B1FE8;
    --tt-green:#20A64A;
    --tt-orange:#F28A12;
    --tt-red:#E31B2E;
    --tt-yellow:#F59B13;
    --tt-text:#0C1E58;
    --tt-muted:#7D8495;
    --tt-line:#E5E8EF;
    --tt-bg:#F7F9FC;
    width:100%;
    height:100dvh;
    min-height:0;
    overflow:hidden;
    background:#F7F9FC;
    color:var(--tt-text);
    font-family:Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    position:relative;
  }

  .tt-tv-root *, .tt-tv-root *::before, .tt-tv-root *::after { box-sizing:border-box; }

  .tt-wave {
    position:absolute;
    pointer-events:none;
    z-index:0;
    filter:saturate(1.05);
  }
  .tt-wave-top {
    width:390px;
    height:120px;
    right:-18px;
    top:-6px;
    opacity:.9;
    background:
      linear-gradient(145deg, transparent 17%, #7B1FE8 18% 30%, #2457D6 31% 44%, #19AFC5 45% 59%, transparent 60%);
    transform:skewX(-26deg) rotate(-5deg);
    border-radius:50%;
  }
  .tt-wave-bottom {
    width:330px;
    height:150px;
    left:-80px;
    bottom:-28px;
    opacity:.95;
    background:
      linear-gradient(155deg, transparent 22%, #15B5D2 23% 38%, #2457D6 39% 51%, #7B1FE8 52% 66%, transparent 67%);
    transform:skewX(-24deg) rotate(-7deg);
    border-radius:50%;
  }

  .tt-layout {
    position:relative;
    z-index:1;
    width:100%;
    height:100%;
    display:grid;
    grid-template-columns:clamp(160px, 13vw, 218px) minmax(0,1fr);
  }

  .tt-sidebar {
    height:100%;
    background:rgba(255,255,255,.96);
    border-right:1px solid #E8EBF2;
    padding:clamp(12px,1.1vw,18px) clamp(10px,1vw,17px);
    display:flex;
    flex-direction:column;
    min-width:0;
  }

  .tt-sidebar-top { position:relative; }
  .tt-menu-button {
    position:absolute;
    right:4px;
    top:2px;
    width:18px;
    display:grid;
    gap:4px;
  }
  .tt-menu-button i { display:block; height:1.5px; border-radius:2px; background:#2457D6; }

  .tt-brand {
    height:clamp(90px,11vh,130px);
    display:flex;
    align-items:center;
    justify-content:center;
    border-bottom:1px solid #F0F1F5;
    margin-bottom:clamp(10px,1.4vh,18px);
  }
  .tt-logo { width:min(92%,155px); max-height:108px; object-fit:contain; }
  .tt-logo-compact { width:30px; max-height:25px; vertical-align:middle; }

  .tt-menu-title {
    font-size:clamp(8px,.58vw,10px);
    font-weight:800;
    color:#172B69;
    margin:0 0 7px 4px;
    text-transform:uppercase;
  }

  .tt-nav { display:flex; flex-direction:column; gap:3px; }
  .tt-nav-item {
    min-height:clamp(30px,4vh,43px);
    border-radius:9px;
    display:flex;
    align-items:center;
    gap:9px;
    padding:5px 9px;
    color:#19306D;
    font-size:clamp(9px,.7vw,12px);
    font-weight:650;
    border:none;
    background:transparent;
    width:100%;
    text-align:left;
    font-family:inherit;
    cursor:pointer;
  }
  button.tt-nav-item:hover { background:#F3F5FC; }
  .tt-nav-item.active {
    background:linear-gradient(90deg,#EAF0FF,#DDE5FF);
    color:#1740BF;
    box-shadow:inset 3px 0 #2457D6;
  }
  .tt-nav-icon { width:19px; display:grid; place-items:center; flex:0 0 19px; }
  .tt-subnav {
    padding:3px 0 6px 30px;
    display:flex;
    flex-direction:column;
    gap:7px;
    font-size:clamp(8px,.62vw,10px);
    color:#284278;
  }
  .tt-subnav-item {
    display:flex;
    align-items:center;
    gap:7px;
    border:none;
    background:transparent;
    padding:0;
    color:inherit;
    font:inherit;
    text-align:left;
    cursor:pointer;
  }
  .tt-subnav-item:hover { color:#0E2E8F; }
  .tt-dot { width:7px; height:7px; border-radius:50%; display:inline-block; }
  .tt-innovate {
    margin-top:auto;
    min-height:clamp(75px,12vh,125px);
    display:flex;
    align-items:flex-end;
    justify-content:center;
    text-align:center;
    padding:10px 0 3px;
    color:#0E55CC;
    font-size:clamp(9px,.78vw,13px);
    font-weight:850;
    letter-spacing:.02em;
  }

  .tt-main {
    min-width:0;
    min-height:0;
    height:100%;
    display:grid;
    grid-template-rows:auto auto minmax(0,1fr) minmax(0,0.9fr);
    gap:clamp(6px,.7vh,10px);
    padding:clamp(8px,1vh,15px) clamp(10px,1.1vw,18px) clamp(8px,1vh,14px);
  }

  .tt-header {
    display:flex;
    align-items:center;
    justify-content:space-between;
    min-height:48px;
    position:relative;
  }
  .tt-header h1 {
    margin:0;
    color:#071A61;
    font-size:clamp(16px,1.65vw,27px);
    line-height:1;
    font-weight:900;
    letter-spacing:-.025em;
  }
  .tt-header p {
    margin:5px 0 0;
    color:#58627A;
    font-size:clamp(8px,.68vw,11px);
    font-weight:500;
  }
  .tt-date {
    display:flex;
    align-items:center;
    gap:8px;
    padding:7px 11px;
    border:1px solid #E4E8F0;
    background:#fff;
    border-radius:10px;
    box-shadow:0 2px 8px rgba(30,50,100,.04);
    font-size:clamp(8px,.62vw,10px);
    color:#27345C;
  }
  .tt-date b { display:block; color:#1C2D64; margin-top:2px; }

  .tt-summary {
    display:grid;
    grid-template-columns:minmax(190px,1.2fr) repeat(3,minmax(90px,.72fr)) minmax(245px,1.35fr);
    gap:clamp(5px,.45vw,8px);
    min-height:0;
  }

  .tt-score {
    border-radius:15px;
    color:white;
    padding:clamp(9px,.8vw,14px);
    background:linear-gradient(135deg,#6521E9 0%,#2457D6 55%,#0FA7E2 100%);
    box-shadow:0 8px 18px rgba(54,55,200,.14);
    display:flex;
    flex-direction:column;
    justify-content:center;
    min-width:0;
  }
  .tt-eyebrow {
    font-size:clamp(8px,.58vw,10px);
    text-transform:uppercase;
    font-weight:800;
    opacity:.85;
    letter-spacing:.03em;
  }
  .tt-score-value {
    font-size:clamp(28px,3vw,50px);
    font-weight:900;
    line-height:1;
    margin:4px 0;
    letter-spacing:-.04em;
  }
  .tt-score-delta { font-size:clamp(8px,.66vw,11px); font-weight:750; display:flex; align-items:center; gap:4px; }

  .tt-status-card {
    background:#fff;
    border:1px solid #E4E7EE;
    border-radius:13px;
    padding:8px 9px;
    display:grid;
    grid-template-columns:auto 1fr;
    grid-template-rows:auto 1fr auto;
    column-gap:6px;
    min-width:0;
    box-shadow:0 2px 8px rgba(30,50,100,.025);
  }
  .tt-status-icon { width:26px; height:26px; border-radius:50%; display:grid; place-items:center; grid-row:1 / 3; }
  .tt-status-label { font-size:clamp(7px,.54vw,9px); font-weight:800; text-transform:uppercase; color:#566079; line-height:1.1; }
  .tt-status-card strong { font-size:clamp(17px,1.35vw,25px); line-height:1; align-self:end; color:#101F55; }
  .tt-status-card small { font-size:clamp(7px,.56vw,9px); font-weight:800; grid-column:2; }

  .tt-conform {
    background:#fff;
    border:1px solid #E4E7EE;
    border-radius:13px;
    padding:5px 8px;
    display:grid;
    grid-template-columns:repeat(4,1fr);
    min-width:0;
    box-shadow:0 2px 8px rgba(30,50,100,.025);
  }
  .tt-mini-stat {
    min-width:0;
    display:grid;
    grid-template-columns:auto 1fr;
    align-items:center;
    column-gap:5px;
    padding:4px 7px;
    border-right:1px solid #E7EAF0;
  }
  .tt-mini-stat:last-child { border-right:0; }
  .tt-mini-icon { width:25px; height:25px; border-radius:50%; display:grid; place-items:center; }
  .tt-mini-label { font-size:clamp(6px,.48vw,8px); color:#58627A; font-weight:750; line-height:1.1; text-transform:uppercase; }
  .tt-mini-stat b { grid-column:2; font-size:clamp(15px,1.1vw,20px); line-height:1; color:#101F55; }

  .tt-axes {
    min-height:0;
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(min(100%,245px),1fr));
    gap:clamp(6px,.55vw,10px);
  }

  .tt-axis-card {
    --axis:#2457D6;
    background:rgba(255,255,255,.97);
    border:1px solid #E2E6EE;
    border-radius:13px;
    min-width:0;
    min-height:0;
    overflow:hidden;
    display:flex;
    flex-direction:column;
    box-shadow:0 2px 8px rgba(30,50,100,.025);
  }
  .tt-axis-head {
    height:clamp(30px,4.1vh,42px);
    flex:0 0 auto;
    display:flex;
    align-items:center;
    gap:9px;
    padding:0 clamp(9px,.7vw,13px);
    color:var(--axis);
    font-size:clamp(9px,.78vw,13px);
    font-weight:900;
    text-transform:uppercase;
    border-bottom:1px solid color-mix(in srgb, var(--axis) 12%, white);
  }
  .tt-axis-icon {
    width:27px;
    height:27px;
    border-radius:8px;
    display:grid;
    place-items:center;
    background:color-mix(in srgb, var(--axis) 10%, white);
    color:var(--axis);
  }
  .tt-axis-grid {
    min-height:0;
    flex:1;
    padding:clamp(5px,.45vw,8px);
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(105px,1fr));
    grid-auto-rows:minmax(0,1fr);
    gap:clamp(4px,.35vw,6px);
    overflow:hidden;
  }

  .tt-kpi-tile {
    min-width:0;
    min-height:0;
    border:1px solid #EDF0F4;
    background:linear-gradient(180deg,#fff,#FCFDFE);
    border-radius:9px;
    padding:clamp(4px,.35vw,7px);
    display:grid;
    grid-template-rows:auto auto auto;
    justify-items:center;
    align-content:center;
    gap:2px;
    cursor:pointer;
    transition:transform .16s ease, box-shadow .16s ease, border-color .16s ease;
    color:#13255F;
  }
  .tt-kpi-tile:hover { transform:translateY(-1px); border-color:#C8D2EB; box-shadow:0 4px 12px rgba(28,57,120,.08); }
  .tt-gauge { width:clamp(45px,4.4vh,72px); height:clamp(45px,4.4vh,72px); position:relative; display:grid; place-items:center; }
  .tt-gauge svg { position:absolute; inset:0; width:100%; height:100%; }
  .tt-gauge span { position:relative; z-index:1; font-size:clamp(9px,1.05vh,14px); font-weight:900; }
  .tt-kpi-name {
    max-width:100%;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:clamp(6.5px,.55vw,9px);
    line-height:1.05;
    font-weight:850;
    color:#172A65;
  }
  .tt-kpi-values {
    width:100%;
    display:flex;
    justify-content:space-between;
    gap:5px;
    color:#667089;
    font-size:clamp(5.5px,.45vw,7.5px);
    white-space:nowrap;
  }
  .tt-kpi-values span { overflow:hidden; text-overflow:ellipsis; }
  .tt-kpi-values b { color:#13255F; margin-left:2px; }

  .tt-bottom {
    min-height:0;
    display:grid;
    grid-template-columns:1.05fr 1.35fr 1.05fr 1.2fr;
    gap:clamp(6px,.55vw,10px);
  }
  .tt-bottom-card {
    min-width:0;
    min-height:0;
    background:#fff;
    border:1px solid #E2E6EE;
    border-radius:13px;
    padding:clamp(7px,.6vw,10px);
    display:flex;
    flex-direction:column;
    overflow:hidden;
  }
  .tt-section-title {
    font-size:clamp(7px,.58vw,10px);
    font-weight:900;
    color:#24346A;
    text-transform:uppercase;
    margin-bottom:4px;
  }

  .tt-regional {
    min-height:0;
    flex:1;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:clamp(8px,1vw,18px);
  }
  .tt-donut { position:relative; flex:0 0 auto; display:grid; place-items:center; }
  .tt-donut > div:first-child { position:absolute; inset:0; }
  .tt-donut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
  .tt-donut-center b { color:#16275E; font-size:clamp(13px,1.2vw,20px); }
  .tt-donut-center span { color:#7D8495; font-size:clamp(5px,.42vw,7px); font-weight:800; }
  .tt-regional-list { min-width:0; display:flex; flex-direction:column; gap:2px; }
  .tt-regional-list .tt-mini-stat { border:0; padding:2px 0; grid-template-columns:auto 1fr; }
  .tt-regional-list .tt-mini-stat b { font-size:clamp(11px,.85vw,15px); }
  .tt-regional-list .tt-mini-label { font-size:clamp(5.5px,.45vw,7.5px); }

  .tt-chart { min-height:0; flex:1; margin-top:2px; }
  .tt-chart-message { height:100%; display:grid; place-items:center; color:#8A91A2; font-size:clamp(7px,.55vw,9px); text-align:center; }

  .tt-alert-list { min-height:0; overflow:hidden; display:flex; flex-direction:column; justify-content:center; gap:clamp(3px,.55vh,7px); }
  .tt-alert-row {
    min-width:0;
    display:grid;
    grid-template-columns:auto minmax(0,1fr) auto auto;
    align-items:center;
    gap:6px;
    padding:clamp(3px,.35vh,5px) 4px;
    border-bottom:1px solid #F0F1F5;
  }
  .tt-alert-row:last-child { border-bottom:0; }
  .tt-alert-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#1B2B62; font-size:clamp(7px,.55vw,9px); font-weight:750; }
  .tt-alert-row b { font-size:clamp(8px,.62vw,10px); }
  .tt-alert-row small { font-size:clamp(5.5px,.43vw,7px); white-space:nowrap; }

  .tt-distrib { min-height:0; flex:1; display:flex; align-items:center; justify-content:center; gap:clamp(8px,1vw,18px); }
  .tt-legend { min-width:0; display:flex; flex-direction:column; gap:clamp(5px,1vh,9px); }
  .tt-legend-row {
    display:grid;
    grid-template-columns:8px minmax(60px,1fr) auto;
    align-items:center;
    gap:5px;
    color:#515C76;
    font-size:clamp(6px,.48vw,8px);
    white-space:nowrap;
  }
  .tt-legend-row b { color:#16275E; }
  .tt-legend-dot { width:7px; height:7px; border-radius:50%; }

  .tt-footer {
    position:absolute;
    left:clamp(180px,14vw,235px);
    right:clamp(12px,2vw,28px);
    bottom:3px;
    min-height:21px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
    color:#6C7487;
    font-size:clamp(6px,.48vw,8px);
    z-index:3;
  }
  .tt-footer-legend { display:flex; align-items:center; justify-content:center; gap:clamp(8px,1.2vw,22px); flex:1; }
  .tt-footer-legend > span { display:flex; align-items:center; gap:4px; white-space:nowrap; }
  .tt-footer-legend em { padding-left:clamp(8px,1vw,18px); border-left:1px solid #DDE2EC; font-style:normal; white-space:nowrap; }
  .tt-footer-brand { display:flex; align-items:center; gap:5px; color:#173A9B; font-size:clamp(7px,.6vw,10px); font-weight:800; white-space:nowrap; }

  .tt-axes-count { color:#7C8495; font-size:clamp(6px,.45vw,8px); margin-left:auto; font-weight:600; text-transform:none; }

  @media (max-width: 1050px) {
    .tt-summary { grid-template-columns:1.2fr repeat(3,.65fr); }
    .tt-conform { grid-column:1 / -1; min-height:48px; }
    .tt-main { grid-template-rows:auto auto minmax(0,1fr) minmax(0,.82fr); }
  }
  @media (max-width: 760px) {
    .tt-layout { grid-template-columns:0 minmax(0,1fr); }
    .tt-sidebar { display:none; }
    .tt-main { padding:6px; }
    .tt-summary { grid-template-columns:1.25fr repeat(3,.7fr); }
    .tt-header p { display:none; }
    .tt-bottom { grid-template-columns:repeat(2,1fr); }
    .tt-footer { left:8px; }
    .tt-footer-legend em, .tt-footer-brand { display:none; }
  }
  @media (max-height: 620px) {
    .tt-sidebar { padding-top:7px; }
    .tt-brand { height:65px; margin-bottom:6px; }
    .tt-logo { max-height:58px; }
    .tt-nav-item { min-height:25px; }
    .tt-main { grid-template-rows:38px auto minmax(0,1fr) minmax(0,.72fr); gap:5px; padding:5px 8px; }
    .tt-axis-head { height:27px; }
    .tt-bottom-card { padding:5px; }
  }
`;

export default function TVDashboard({
  sheet,
  categories = [],
  scoreGlobal,
  period,
  onOpenIndicator,
  activeCategory = null,
  onSelectTV,
  onSelectCategory,
  onSelectHistory,
  onSelectSettings,
}) {
  const trackedAll = (sheet?.indicateurs ?? []).filter(isTracked);
  const total = trackedAll.length;
  const good = trackedAll.filter((i) => i.status === "atteint").length;
  const warn = trackedAll.filter((i) => i.status === "attention").length;
  const bad = trackedAll.filter((i) => i.status === "critique").length;

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

  const alerts = useMemo(() => buildAlerts(sheet), [sheet]);
  const scoreVal = scoreGlobal ?? 0;

  const share = (n) => total ? ((n / total) * 100).toFixed(2) : "0.00";
  const today = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const now = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return (
    <div className="tt-tv-root">
      <style>{TV_CSS}</style>
      <div className="tt-wave tt-wave-top" />
      <div className="tt-wave tt-wave-bottom" />

      <div className="tt-layout">
        <aside className="tt-sidebar">
          <div className="tt-sidebar-top">
            <div className="tt-brand"><TTLogo /></div>
            <span className="tt-menu-button" aria-hidden="true"><i /><i /><i /></span>
          </div>

          <div className="tt-menu-title">Menu principal</div>
          <nav className="tt-nav">
            <button type="button" className="tt-nav-item active" onClick={onSelectTV}>
              <span className="tt-nav-icon"><IconGauge size={17} /></span>
              <span>Vue TV<br /><small>(Tout-en-un)</small></span>
            </button>

            <button type="button" className="tt-nav-item" onClick={onSelectTV}>
              <span className="tt-nav-icon"><IconLayers size={17} /></span>
              <span>Tableau de bord</span>
            </button>

            <div className="tt-nav-item">
              <span className="tt-nav-icon"><IconHeart size={17} /></span>
              <span>Axes de pilotage</span>
              <span style={{ marginLeft:"auto" }}>⌄</span>
            </div>

            <div className="tt-subnav">
              {categories.map((cat) => {
                const c = axisColor(cat.categorie);
                return (
                  <button
                    type="button"
                    key={cat.categorie}
                    className="tt-subnav-item"
                    onClick={() => onSelectCategory?.(cat.categorie)}
                    style={activeCategory === cat.categorie ? { color: c, fontWeight: 800 } : undefined}
                  >
                    <i className="tt-dot" style={{ background:c }} />
                    {titleCase(cat.categorie)}
                  </button>
                );
              })}
            </div>

            <div className="tt-menu-title" style={{ marginTop: 10 }}>Données</div>
            <button type="button" className="tt-nav-item" onClick={onSelectHistory}>
              <span className="tt-nav-icon"><IconTrendDown size={17} /></span>
              <span>Historique</span>
            </button>
            <button type="button" className="tt-nav-item" onClick={onSelectSettings}>
              <span className="tt-nav-icon"><IconGauge size={17} /></span>
              <span>Paramètres</span>
            </button>
          </nav>

          <div className="tt-innovate">
            CONNECTER<br />INNOVER<br />SERVIR
          </div>
        </aside>

        <main className="tt-main">
          <header className="tt-header">
            <div>
              <h1>CENTRE DE PILOTAGE KPI</h1>
              <p>VUE TV - TOUTES LES PERFORMANCES EN UN COUP D’ŒIL</p>
            </div>
            <div className="tt-date">
              <span>▣</span>
              <div><small>{today}</small><b>{now}</b></div>
            </div>
          </header>

          <section className="tt-summary">
            <div className="tt-score">
              <span className="tt-eyebrow">Score global</span>
              <span className="tt-score-value">{pct(scoreVal, 2)}</span>
              {delta !== null && (
                <span className="tt-score-delta">
                  {delta >= 0 ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />}
                  {delta >= 0 ? "+" : ""}{(delta * 100).toFixed(1)}% vs mois dernier
                </span>
              )}
            </div>

            <StatusCard icon={IconTrendDown} label="Sous 80%" value={bad} share={share(bad)} color="#E31B2E" />
            <StatusCard icon={IconGauge} label="80% - 99.9%" value={warn} share={share(warn)} color="#F59B13" />
            <StatusCard icon={IconCheckCircle} label="100% et plus" value={good} share={share(good)} color="#20A64A" />

            <div className="tt-conform">
              <MiniStat icon={IconCheckCircle} color="#20A64A" label="Indicateurs conformes" value={good} />
              <MiniStat icon={IconAlertTriangle} color="#F59B13" label="Indicateurs en vigilance" value={warn} />
              <MiniStat icon={IconTrendDown} color="#E31B2E" label="Indicateurs critiques" value={bad} />
              <MiniStat icon={IconLayers} color="#2457D6" label="Total indicateurs" value={total} />
            </div>
          </section>

          <section className="tt-axes">
            {categories.map((cat, i) => (
              <AxisCard
                key={cat.categorie}
                cat={cat}
                onOpenIndicator={onOpenIndicator}
                delay={i * 0.025}
              />
            ))}

            {categories.length === 0 && (
              <div className="tt-bottom-card" style={{ gridColumn:"1/-1", display:"grid", placeItems:"center" }}>
                <div className="tt-empty">Aucun axe structuré détecté dans ce classeur pour le moment.</div>
              </div>
            )}
          </section>

          <section className="tt-bottom">
            <div className="tt-bottom-card">
              <div className="tt-section-title" style={{ color:"#173A9B" }}>Score régional</div>
              <div className="tt-regional">
                <DistributionDonut
                  good={good}
                  warn={warn}
                  bad={bad}
                  total={total}
                  size={96}
                  center={pct(scoreVal, 2)}
                />
                <div className="tt-regional-list">
                  <MiniStat icon={IconCheckCircle} color="#20A64A" label="Indicateurs conformes" value={good} />
                  <MiniStat icon={IconAlertTriangle} color="#F59B13" label="Indicateurs en vigilance" value={warn} />
                  <MiniStat icon={IconTrendDown} color="#E31B2E" label="Indicateurs critiques" value={bad} />
                  <MiniStat icon={IconLayers} color="#2457D6" label="Total indicateurs" value={total} />
                </div>
              </div>
            </div>

            <div className="tt-bottom-card">
              <div className="tt-section-title">Évolution du score global</div>
              <div className="tt-chart">
                <EvolutionChart scoreGlobal={scoreGlobal} sheetName={period} />
              </div>
            </div>

            <div className="tt-bottom-card">
              <div className="tt-section-title" style={{ color:"#E31B2E" }}>Dernières alertes</div>
              <AlertList alerts={alerts} />
            </div>

            <div className="tt-bottom-card">
              <div className="tt-section-title">Répartition des indicateurs</div>
              <div className="tt-distrib">
                <DistributionDonut good={good} warn={warn} bad={bad} total={total} size={96} />
                <div className="tt-legend">
                  <div className="tt-legend-row">
                    <span className="tt-legend-dot" style={{ background:"#E31B2E" }} />
                    <span>Sous 80%</span>
                    <b>{bad} ({share(bad)}%)</b>
                  </div>
                  <div className="tt-legend-row">
                    <span className="tt-legend-dot" style={{ background:"#F59B13" }} />
                    <span>80% - 99.9%</span>
                    <b>{warn} ({share(warn)}%)</b>
                  </div>
                  <div className="tt-legend-row">
                    <span className="tt-legend-dot" style={{ background:"#20A64A" }} />
                    <span>100% et plus</span>
                    <b>{good} ({share(good)}%)</b>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <footer className="tt-footer">
        <div className="tt-footer-legend">
          <span><i className="tt-legend-dot" style={{ background:"#E31B2E" }} />Sous 80%</span>
          <span><i className="tt-legend-dot" style={{ background:"#F59B13" }} />80% - 99.9%</span>
          <span><i className="tt-legend-dot" style={{ background:"#20A64A" }} />100% et plus</span>
          <em>Cliquer sur un indicateur pour voir l’historique détaillé</em>
        </div>
        <div className="tt-footer-brand">Tunisie Telecom <TTLogo compact /></div>
      </footer>
    </div>
  );
}
