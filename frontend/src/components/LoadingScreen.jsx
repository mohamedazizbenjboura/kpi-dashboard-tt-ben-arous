import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import logo from "../assets/tt-logo.png";

const EASE = [0.16, 1, 0.3, 1];

const STATUS_STEPS = ["Connexion au fichier Excel…", "Lecture des indicateurs…", "Préparation du tableau de bord…"];

export default function LoadingScreen({ label }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (label) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STATUS_STEPS.length), 1100);
    return () => clearInterval(id);
  }, [label]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center gap-8 px-6 overflow-hidden bg-[var(--color-bg)]">
      <div className="relative h-28 w-28 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full spin-slow"
          style={{
            background: "conic-gradient(from 0deg, var(--color-blue), var(--color-violet), var(--color-magenta), var(--color-brand), var(--color-gold), var(--color-teal), var(--color-blue))",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px))",
          }}
        />
        <motion.img
          src={logo}
          alt="Tunisie Telecom"
          className="relative h-16 w-auto"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <span className="text-[14px] font-semibold text-[var(--color-text)]">Centre KPI — Ben Arous</span>
        <div className="h-4 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={label ?? STATUS_STEPS[step]}
              className="text-[12px] text-[var(--color-text-faint)]"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              {label ?? STATUS_STEPS[step]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
