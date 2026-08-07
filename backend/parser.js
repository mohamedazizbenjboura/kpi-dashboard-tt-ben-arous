/**
 * Parseur dynamique de fichiers Excel de KPIs.
 * Ne fait AUCUNE hypothèse rigide sur le nombre ou le nom des indicateurs :
 * il détecte la ligne d'en-tête, déduit les colonnes de hiérarchie
 * (catégorie / sous-catégorie / indicateur) et les colonnes de métriques
 * (poids, objectifs, réalisation, taux, score) par correspondance de mots-clés.
 * Si la structure du fichier Excel évolue (ajout/suppression d'indicateurs,
 * de colonnes, de catégories), aucune modification de code n'est nécessaire.
 */
const XLSX = require("xlsx");

function normalize(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const METRIC_MATCHERS = [
  { key: "poids", test: (n) => n === "poids" },
  // Volontairement SANS liste d'années en dur (l'ancien code cassait silencieusement
  // dès qu'un futur classeur exportait "OBJECTIF 2027", ou toute année non prévue) :
  // on accepte n'importe quelle année à 4 chiffres via une regex, ou le mot "annuel".
  // On garde une exigence d'année/mot-clé (pas juste "objectif" seul) car certains
  // fichiers ont un simple libellé de section "Objectifs" au-dessus de la hiérarchie
  // (ex. mai26, cellule A1) qui n'est PAS une colonne de métrique — sans ce garde-fou,
  // ce libellé serait pris pour la colonne "objectif annuel" et écraserait les
  // colonnes de hiérarchie (hierarchyCols redeviendrait vide -> sheet non structurée).
  { key: "objectifAnnuel", test: (n) => n.includes("objectif") && !n.includes("ytd") && (/\d{4}/.test(n) || n.includes("annuel")) },
  { key: "objectifYTD", test: (n) => n.includes("objectif") && n.includes("ytd") },
  // IMPORTANT : "realisation" est un sous-ensemble textuel de "taux de réalisation"
  // (normalisé : "taux de realisation"). Sans l'exclusion de "taux" ici, cette règle
  // matcherait AUSSI la colonne "Taux de réalisation" si elle apparaît avant la
  // colonne "Réalisation YTD" dans le fichier (l'ordre actuel des fichiers sources
  // masque le problème par coincidence, mais un futur classeur avec les colonnes
  // dans un autre ordre casserait silencieusement le parsing sans ce garde-fou).
  { key: "realisationYTD", test: (n) => n.includes("realisation") && !n.includes("taux") },
  { key: "tauxRealisation", test: (n) => n.includes("taux") },
  { key: "score", test: (n) => n === "score" || (n.includes("score") && !n.includes("region") && !n.includes("global")) },
];

function findHeaderRow(rows) {
  const maxScan = Math.min(rows.length, 10);
  for (let i = 0; i < maxScan; i++) {
    const row = rows[i] || [];
    const normCells = row.map(normalize);
    const hasPoids = normCells.some((c) => c === "poids");
    const hasScore = normCells.some((c) => c === "score");
    if (hasPoids && hasScore) return i;
  }
  return -1;
}

function detectColumns(headerRow) {
  const normCells = headerRow.map(normalize);
  const metricCols = {};
  let firstMetricIdx = normCells.length;

  normCells.forEach((cell, idx) => {
    for (const matcher of METRIC_MATCHERS) {
      if (matcher.test(cell) && metricCols[matcher.key] === undefined) {
        metricCols[matcher.key] = idx;
        if (idx < firstMetricIdx) firstMetricIdx = idx;
      }
    }
  });

  // Hierarchy columns = every column before the first detected metric column.
  const hierarchyCols = [];
  for (let i = 0; i < firstMetricIdx; i++) hierarchyCols.push(i);

  return { metricCols, hierarchyCols };
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const str = String(v).trim();
  const isPercentText = /%\s*$/.test(str);
  const n = parseFloat(str.replace("%", "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return isPercentText ? n / 100 : n;
}

function statusFromTaux(taux) {
  if (taux === null) return "inconnu";
  if (taux >= 0.9) return "atteint";
  if (taux >= 0.7) return "attention";
  return "critique";
}

/**
 * Parse une feuille (array-of-arrays) et retourne une structure hiérarchique
 * catégorie -> sous-catégorie -> indicateurs, plus un score global.
 */
function parseSheet(sheetName, rows) {
  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1) {
    return { sheetName, structured: false, rawRowCount: rows.length };
  }

  const headerRow = rows[headerIdx];
  const { metricCols, hierarchyCols } = detectColumns(headerRow);

  if (metricCols.poids === undefined || metricCols.score === undefined || hierarchyCols.length === 0) {
    return { sheetName, structured: false, rawRowCount: rows.length };
  }

  const lastFill = new Array(hierarchyCols.length).fill("");
  const categoriesMap = new Map();
  let globalScoreRow = null;
  let computedScoreSum = 0;
  let computedWeightSum = 0;
  const flatIndicators = [];

  for (let r = headerIdx + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const hierValues = hierarchyCols.map((c, i) => {
      const raw = row[c];
      if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
        lastFill[i] = String(raw).trim();
      }
      return lastFill[i];
    });

    const poids = toNumber(row[metricCols.poids]);
    const objectifAnnuel = metricCols.objectifAnnuel !== undefined ? toNumber(row[metricCols.objectifAnnuel]) : null;
    const objectifYTD = metricCols.objectifYTD !== undefined ? toNumber(row[metricCols.objectifYTD]) : null;
    const realisationYTD = metricCols.realisationYTD !== undefined ? toNumber(row[metricCols.realisationYTD]) : null;
    const tauxRealisation = metricCols.tauxRealisation !== undefined ? toNumber(row[metricCols.tauxRealisation]) : null;
    const score = toNumber(row[metricCols.score]);

    // Une ligne peut sembler « remplie » après report des cellules fusionnées
    // (lastFill) alors qu'elle est en réalité totalement vide dans le fichier
    // source (ex. ligne de fin de tableau sous une cellule fusionnée). On se
    // base donc sur les valeurs BRUTES de la ligne, pas sur le report, pour
    // détecter une ligne vide.
    const rawHierarchyEmpty = hierarchyCols.every((c) => {
      const raw = row[c];
      return raw === undefined || raw === null || String(raw).trim() === "";
    });
    const isEmptyRow = rawHierarchyEmpty && poids === null && score === null;
    if (isEmptyRow) continue;

    // Detect the "global score" summary row (e.g. "Score Région").
    const rowLabel = normalize(hierValues.join(" "));
    const onlyScoreFilled =
      poids === null &&
      objectifAnnuel === null &&
      objectifYTD === null &&
      realisationYTD === null &&
      tauxRealisation === null &&
      score !== null;

    // NB : on ne teste pas le libellé ("score"/"région") pour repérer cette ligne
    // de synthèse. Une ligne d'indicateur réelle a toujours un poids numérique
    // (même 0) dans ce jeu de données : l'absence de poids combinée à un score
    // renseigné est donc un signal fiable, y compris si une future coquille
    // apparaît dans le libellé source.
    if (onlyScoreFilled) {
      globalScoreRow = { label: hierValues.filter(Boolean).join(" ") || "Score global", score };
      continue;
    }

    const category = hierValues[0] || "Non classé";
    // hierarchyCols.length <= 2 : pas de niveau "indicateur" distinct de la
    // sous-catégorie (comportement historique inchangé, index 1 sert aux deux).
    // hierarchyCols.length >= 3 : le DERNIER niveau est l'indicateur, et TOUS les
    // niveaux intermédiaires (index 1 .. length-2) sont joints dans la sous-catégorie
    // au lieu de ne garder que l'index 1 — c'est ce qui faisait disparaître un niveau
    // intermédiaire entier avec une hiérarchie à 4+ niveaux (confirmé lors de l'audit
    // du 2026-08-06 : "PARC Mobile" disparaissait du regroupement).
    const subCategory =
      hierarchyCols.length <= 2
        ? hierValues[1] || category
        : hierValues.slice(1, hierarchyCols.length - 1).filter(Boolean).join(" › ") || category;
    const indicatorName =
      hierarchyCols.length > 2 ? hierValues[hierarchyCols.length - 1] : subCategory;

    const indicator = {
      indicateur: indicatorName || `Ligne ${r + 1}`,
      poids,
      objectifAnnuel,
      objectifYTD,
      realisationYTD,
      tauxRealisation,
      score,
      status: statusFromTaux(tauxRealisation),
    };

    if (poids !== null) computedWeightSum += poids;
    if (score !== null) computedScoreSum += score;

    if (!categoriesMap.has(category)) {
      categoriesMap.set(category, { categorie: category, sousCategories: new Map() });
    }
    const cat = categoriesMap.get(category);
    if (!cat.sousCategories.has(subCategory)) {
      cat.sousCategories.set(subCategory, { sousCategorie: subCategory, indicateurs: [] });
    }
    cat.sousCategories.get(subCategory).indicateurs.push(indicator);
    flatIndicators.push({ categorie: category, sousCategorie: subCategory, ...indicator });
  }

  const categories = Array.from(categoriesMap.values()).map((cat) => {
    const sousCategories = Array.from(cat.sousCategories.values());
    const poidsTotal = sousCategories
      .flatMap((sc) => sc.indicateurs)
      .reduce((sum, i) => sum + (i.poids || 0), 0);
    const scoreTotal = sousCategories
      .flatMap((sc) => sc.indicateurs)
      .reduce((sum, i) => sum + (i.score || 0), 0);
    const tauxMoyenPondere = poidsTotal > 0 ? scoreTotal / poidsTotal : null;
    return {
      categorie: cat.categorie,
      sousCategories,
      poidsTotal: round4(poidsTotal),
      scoreTotal: round4(scoreTotal),
      tauxMoyenPondere: tauxMoyenPondere !== null ? round4(tauxMoyenPondere) : null,
      status: statusFromTaux(tauxMoyenPondere),
    };
  });

  const scoreGlobal = globalScoreRow ? globalScoreRow.score : round4(computedScoreSum);

  return {
    sheetName,
    structured: true,
    headerRowIndex: headerIdx,
    columnsDetected: Object.keys(metricCols),
    hierarchyDepth: hierarchyCols.length,
    categories,
    indicateurs: flatIndicators,
    scoreGlobal: round4(scoreGlobal),
    poidsTotal: round4(computedWeightSum),
    scoreCalcule: round4(computedScoreSum),
    nombreIndicateurs: flatIndicators.length,
  };
}

function round4(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return n;
  return Math.round(n * 10000) / 10000;
}

/**
 * Charge le classeur Excel depuis un chemin disque (dev local uniquement)
 * et retourne toutes les feuilles parsées.
 */
function loadWorkbook(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  return workbookToResult(wb, filePath);
}

/**
 * Charge le classeur Excel depuis un Buffer en mémoire (cas de production :
 * fichier téléchargé depuis Supabase Storage, jamais écrit sur disque) et
 * retourne toutes les feuilles parsées.
 */
function loadWorkbookFromBuffer(buffer, label) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  return workbookToResult(wb, label);
}

function workbookToResult(wb, label) {
  const sheets = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    return parseSheet(name, rows);
  });
  return { sheets, fileName: label, loadedAt: new Date().toISOString() };
}

module.exports = { loadWorkbook, loadWorkbookFromBuffer, parseSheet, normalize };
