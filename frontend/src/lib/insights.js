// Pure, data-derived helpers — every bullet below is computed straight from
// the parsed workbook, nothing is invented or hard-coded.
import { pct, titleCase } from "./format";

const GLOBAL_OBJECTIVE = 0.9;

export function buildInsights(sheet) {
  const categories = (sheet?.categories ?? []).filter((c) => c.tauxMoyenPondere !== null);
  if (!categories.length) return [];

  const sorted = [...categories].sort((a, b) => (b.tauxMoyenPondere ?? 0) - (a.tauxMoyenPondere ?? 0));
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const items = [];

  if (sheet.scoreGlobal !== null && sheet.scoreGlobal !== undefined) {
    const gap = sheet.scoreGlobal - GLOBAL_OBJECTIVE;
    items.push({
      tone: gap >= 0 ? "good" : "warn",
      text:
        gap >= 0
          ? `Le score région dépasse l'objectif de ${pct(Math.abs(gap), 1)}.`
          : `Le score région est en dessous de l'objectif de ${pct(Math.abs(gap), 1)}.`,
    });
  }

  if (best) {
    items.push({
      tone: "good",
      text: `L'axe ${titleCase(best.categorie)} est le plus performant, à ${pct(best.tauxMoyenPondere, 1)}.`,
    });
  }

  if (worst && worst.categorie !== best?.categorie) {
    items.push({
      tone: worst.status === "critique" ? "bad" : "warn",
      text: `L'axe ${titleCase(worst.categorie)} affiche le taux le plus faible, à ${pct(worst.tauxMoyenPondere, 1)}.`,
    });
  }

  const criticalCount = (sheet.indicateurs ?? []).filter((i) => i.status === "critique").length;
  if (criticalCount > 0) {
    items.push({
      tone: "bad",
      text: `${criticalCount} indicateur${criticalCount > 1 ? "s" : ""} en statut critique nécessite${criticalCount > 1 ? "nt" : ""} une action immédiate.`,
    });
  } else {
    items.push({ tone: "good", text: "Aucun indicateur en statut critique ce mois-ci." });
  }

  return items.slice(0, 5);
}

export function buildAlerts(sheet) {
  const indicateurs = sheet?.indicateurs ?? [];
  return indicateurs
    .filter((i) => i.status === "critique" || i.status === "attention")
    .sort((a, b) => (a.tauxRealisation ?? 0) - (b.tauxRealisation ?? 0))
    .slice(0, 6);
}
