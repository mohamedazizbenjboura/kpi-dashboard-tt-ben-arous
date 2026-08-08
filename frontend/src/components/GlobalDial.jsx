import { statusMeta, pct } from "../lib/format";

const R = 92;
const CX = 110;
const CY = 110;
const CIRC = 2 * Math.PI * R;
// Barème validé par l'encadrant : < 80% rouge (critique), 80–99.9% orange
// (attention), >= 100% vert (atteint). Reste synchronisé avec parser.js.
const OBJECTIVE = 1;

function scoreToStatus(ratio) {
  if (ratio >= 1) return "atteint";
  if (ratio >= 0.8) return "attention";
  return "critique";
}

// Full-circle progress ring with the TT gradient — center readout, plus a
// small objective / écart summary underneath (mirrors the reference card).
export default function GlobalDial({ score, period }) {
  const ratio = score ?? 0;
  const status = scoreToStatus(ratio);
  const meta = statusMeta(status);
  const offset = CIRC * (1 - Math.min(ratio, 1));
  const gap = ratio - OBJECTIVE;

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full">
      <svg viewBox="0 0 220 220" className="w-full max-w-[240px]">
        <defs>
          <linearGradient id="ttDialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-blue)" />
            <stop offset="30%" stopColor="var(--color-violet)" />
            <stop offset="55%" stopColor="var(--color-magenta)" />
            <stop offset="75%" stopColor="var(--color-brand)" />
            <stop offset="100%" stopColor="var(--color-gold)" />
          </linearGradient>
        </defs>

        <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--color-surface-3)" strokeWidth={16} />
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="url(#ttDialGradient)"
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.16,1,.3,1)" }}
        />

        <text x={CX} y={CY - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="38" fontWeight="700" fill="var(--color-text)">
          {(ratio * 100).toFixed(1)}%
        </text>
        <text x={CX} y={CY + 22} textAnchor="middle" fontFamily="var(--font-display)" fontSize="11" letterSpacing="1.5" fill="var(--color-text-faint)">
          SCORE GLOBAL
        </text>
      </svg>

      <div className="-mt-1 flex flex-col items-center gap-2.5">
        <span
          className="tick text-[10.5px] px-2.5 py-1 rounded-full border"
          style={{ color: meta.color, borderColor: meta.color, background: meta.dim }}
        >
          {meta.label}
        </span>
        {period ? <span className="text-[11px] text-[var(--color-text-faint)]">Période · {period}</span> : null}

        <div className="flex items-center gap-4 mt-1.5 pt-3 border-t border-[var(--color-border-soft)] w-full justify-center">
          <div className="text-center">
            <div className="text-[10px] tick text-[var(--color-text-faint)] mb-0.5">Objectif</div>
            <div className="font-mono font-semibold text-[14px] text-[var(--color-text)]">{pct(OBJECTIVE, 0)}</div>
          </div>
          <div className="w-px h-8 bg-[var(--color-border-soft)]" />
          <div className="text-center">
            <div className="text-[10px] tick text-[var(--color-text-faint)] mb-0.5">Écart</div>
            <div className="font-mono font-semibold text-[14px]" style={{ color: gap >= 0 ? "var(--color-good)" : "var(--color-bad)" }}>
              {gap >= 0 ? "+" : ""}
              {(gap * 100).toFixed(1)} pt
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
