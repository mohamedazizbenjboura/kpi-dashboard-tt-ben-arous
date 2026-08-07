// Small "signal strength" glyph — echoes the telecom subject matter and
// doubles as a compact status indicator (1-4 bars lit depending on ratio).
export default function SignalBars({ ratio = 0, color = "var(--color-text-dim)", size = 16 }) {
  const heights = [0.35, 0.55, 0.75, 1];
  const lit = ratio >= 0.9 ? 4 : ratio >= 0.7 ? 3 : ratio >= 0.4 ? 2 : ratio > 0 ? 1 : 0;
  const w = size;
  const h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 20" aria-hidden="true">
      {heights.map((hf, i) => {
        const barW = 3.2;
        const gap = 1.4;
        const x = i * (barW + gap) + 1;
        const barH = 16 * hf;
        const y = 17 - barH;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barW}
            height={barH}
            rx={0.6}
            fill={i < lit ? color : "var(--color-surface-3)"}
          />
        );
      })}
    </svg>
  );
}
