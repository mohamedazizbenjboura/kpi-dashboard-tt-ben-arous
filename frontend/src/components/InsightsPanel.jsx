import { motion } from "motion/react";
import { IconLightbulb, IconCheckCircle, IconAlertTriangle } from "./icons";

const TONE_COLOR = {
  good: "var(--color-good)",
  warn: "var(--color-warn)",
  bad: "var(--color-bad)",
};

export default function InsightsPanel({ items }) {
  return (
    <div className="card p-5 flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 rounded-lg flex items-center justify-center brand-spectrum text-white">
          <IconLightbulb size={15} />
        </span>
        <span className="tick text-[11px] text-[var(--color-text-dim)]">Synthèse automatique</span>
      </div>

      <div className="flex flex-col gap-2.5">
        {items.length === 0 && (
          <p className="text-[12.5px] text-[var(--color-text-faint)]">Pas assez de données pour générer une synthèse.</p>
        )}
        {items.map((it, i) => {
          const color = TONE_COLOR[it.tone] ?? "var(--color-text-dim)";
          const Ico = it.tone === "bad" ? IconAlertTriangle : IconCheckCircle;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex items-start gap-2.5 rounded-xl bg-[var(--color-surface-2)] px-3 py-2.5"
            >
              <span className="mt-0.5 shrink-0" style={{ color }}>
                <Ico size={14} />
              </span>
              <p className="text-[12.5px] leading-snug text-[var(--color-text-dim)]">{it.text}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
