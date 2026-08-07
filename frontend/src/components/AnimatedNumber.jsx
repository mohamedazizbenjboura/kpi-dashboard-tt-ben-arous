import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useMotionValueEvent, animate } from "motion/react";

// Counts up to `value` whenever it changes — used for the top-line stats so
// every data refresh reads as a live instrument rather than a static label.
export default function AnimatedNumber({ value, digits = 0, suffix = "" }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState((value ?? 0).toFixed(digits));
  const prev = useRef(0);

  useMotionValueEvent(mv, "change", (latest) => {
    setDisplay(latest.toFixed(digits));
  });

  useEffect(() => {
    const controls = animate(mv, value ?? 0, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
    });
    prev.current = value ?? 0;
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <motion.span className="font-tabular">
      {display}
      {suffix}
    </motion.span>
  );
}
