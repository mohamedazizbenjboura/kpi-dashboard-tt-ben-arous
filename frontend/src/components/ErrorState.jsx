import { motion } from "motion/react";
import { IconAlertTriangle } from "./icons";

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--color-bg)]">
      <motion.div
        className="card max-w-md w-full p-7 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <span
          className="inline-flex items-center justify-center h-12 w-12 rounded-2xl mb-4"
          style={{ color: "var(--color-bad)", background: "var(--color-bad-dim)" }}
        >
          <IconAlertTriangle size={22} />
        </span>
        <h1 className="text-lg font-semibold mb-2 text-[var(--color-text)]">Impossible de lire les indicateurs</h1>
        <p className="text-sm text-[var(--color-text-dim)] mb-6">
          {message || "Le fichier Excel source est introuvable ou n'a pas pu être analysé."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="text-[12.5px] font-medium px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand-soft)] transition-colors cursor-pointer"
        >
          Réessayer
        </button>
      </motion.div>
    </div>
  );
}
