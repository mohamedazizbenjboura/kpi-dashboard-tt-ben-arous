import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { applyPendingVersion, dismissPendingVersion } from "../lib/api";
import { pct, relativeTime } from "../lib/format";
import { IconCloudLink, IconCheckCircle, IconX } from "./icons";

export default function PendingBanner({ pending, onApplied }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!pending) return null;
  const summary = pending.summary;

  async function handleApply() {
    setBusy(true);
    setError("");
    try {
      await applyPendingVersion();
      onApplied?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDismiss() {
    setBusy(true);
    setError("");
    try {
      await dismissPendingVersion();
      onApplied?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4"
        style={{ borderColor: "var(--color-warn)" }}
      >
        <span className="h-9 w-9 rounded-xl flex items-center justify-center bg-[var(--color-warn-dim)] text-[var(--color-warn)] shrink-0">
          <IconCloudLink size={17} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-[var(--color-text)]">
            Nouvelle version détectée sur Google Drive
          </p>
          <p className="text-[11.5px] text-[var(--color-text-faint)]">
            Déposée {relativeTime(pending.detectedAt)}
            {summary?.scoreGlobal !== null && summary?.scoreGlobal !== undefined
              ? ` · Score global ${pct(summary.scoreGlobal, 1)}`
              : ""}
            {summary?.nombreIndicateurs ? ` · ${summary.nombreIndicateurs} indicateurs` : ""}
          </p>
          {error && <p className="text-[11.5px] text-[var(--color-bad)] mt-1">{error}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-2 rounded-xl border border-[var(--color-border-soft)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] disabled:opacity-50 cursor-pointer transition-colors"
          >
            <IconX size={13} />
            Ignorer
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={handleApply}
            disabled={busy}
            className="flex items-center gap-1.5 text-[12px] font-medium px-3.5 py-2 rounded-xl bg-[var(--color-warn)] text-[#231703] disabled:opacity-60 cursor-pointer transition-opacity"
          >
            <IconCheckCircle size={13} />
            {busy ? "Application…" : "Appliquer"}
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
