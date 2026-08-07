import { motion } from "motion/react";

// Compact, high-contrast summary strip — the numbers a manager needs to
// open a meeting with, at a glance, before diving into any chart.
export default function OverviewStats({ total, atteints, attention, critiques }) {
  const items = [
    { label: "Indicateurs suivis", value: total, color: "var(--color-text)" },
    { label: "Objectifs atteints", value: atteints, color: "var(--color-good)" },
    { label: "Sous surveillance", value: attention, color: "var(--color-warn)" },
    { label: "Critiques", value: critiques, color: "var(--color-bad)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="card px-5 md:px-7 py-4 flex flex-wrap items-stretch gap-x-8 gap-y-3"
    >
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-8">
          {i > 0 && <span className="hidden sm:block w-px self-stretch bg-[var(--color-border-soft)]" aria-hidden="true" />}
          <div>
            <div className="font-mono font-bold text-[26px] md:text-[28px] leading-none" style={{ color: it.color }}>
              {it.value}
            </div>
            <div className="tick text-[10px] text-[var(--color-text-faint)] mt-1.5 whitespace-nowrap">{it.label}</div>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
