// Les taux/scores du fichier source sont stockés en fraction (0.953 = 95.3 %).
export function pct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function num(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function titleCase(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function statusMeta(status) {
  switch (status) {
    case "atteint":
      return { label: "Objectif atteint", color: "var(--color-good)", dim: "var(--color-good-dim)" };
    case "attention":
      return { label: "Sous surveillance", color: "var(--color-warn)", dim: "var(--color-warn-dim)" };
    case "critique":
      return { label: "Critique", color: "var(--color-bad)", dim: "var(--color-bad-dim)" };
    default:
      return { label: "Non suivi", color: "var(--color-text-faint)", dim: "var(--color-surface-3)" };
  }
}

// Stable color + icon key per axis, keyed by normalized (accent/case-insensitive)
// category label so it survives minor spelling drift in the source workbook.
const CATEGORY_STYLE = [
  { test: (n) => n.includes("commerc"), color: "var(--color-blue)", icon: "cart" },
  { test: (n) => n.includes("techn"), color: "var(--color-teal)", icon: "tower" },
  { test: (n) => n.includes("financ"), color: "var(--color-good)", icon: "coins" },
  { test: (n) => n.includes("strateg") || n.includes("stratég"), color: "var(--color-violet)", icon: "layers" },
  { test: (n) => n.includes("client") || n.includes("experience") || n.includes("expérience"), color: "var(--color-magenta)", icon: "heart" },
];

function normalizeKey(str) {
  return String(str ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function categoryStyle(categorie) {
  const n = normalizeKey(categorie);
  const found = CATEGORY_STYLE.find((c) => c.test(n));
  return found ?? { color: "var(--color-gold)", icon: "gauge" };
}

export function formatTimestamp(ms) {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(ms) {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `il y a ${hrs} h`;
  const days = Math.round(hrs / 24);
  return `il y a ${days} j`;
}
