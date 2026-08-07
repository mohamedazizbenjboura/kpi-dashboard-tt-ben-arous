import { motion } from "motion/react";
import AnimatedNumber from "./AnimatedNumber";
import { IconTrendUp, IconTrendDown } from "./icons";

// Rounded gradient-icon KPI card — top summary row of the dashboard.
export default function StatCard({ label, value, digits = 1, suffix = "%", icon: Ico, color = "var(--color-brand)", delta, objective, index = 0 }) {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const positive = hasDelta && delta >= 0;

  return (
    <motion.div
      className="card card-hover p-4 md:p-5 flex flex-col gap-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * index, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between">
        <span
          className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}22`, color }}
        >
          {Ico ? <Ico size={18} /> : null}
        </span>
        {hasDelta && (
          <span
            className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              color: positive ? "var(--color-good)" : "var(--color-bad)",
              background: positive ? "var(--color-good-dim)" : "var(--color-bad-dim)",
            }}
          >
            {positive ? <IconTrendUp size={12} /> : <IconTrendDown size={12} />}
            {positive ? "+" : ""}
            {(delta * 100).toFixed(1)}
          </span>
        )}
      </div>

      <div>
        <div className="tick text-[10px] text-[var(--color-text-faint)] mb-1">{label}</div>
        <div className="text-[24px] md:text-[26px] font-bold font-mono leading-none text-[var(--color-text)]">
          <AnimatedNumber value={value} digits={digits} suffix={suffix} />
        </div>
      </div>

      {typeof objective === "number" && (
        <div className="text-[11px] text-[var(--color-text-faint)]">Objectif {(objective * 100).toFixed(0)}%</div>
      )}
    </motion.div>
  );
}
