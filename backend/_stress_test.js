const XLSX = require("xlsx");
const { parseSheet } = require("./parser");

function test(label, rows) {
  console.log("\n=== TEST:", label, "===");
  const result = parseSheet("test", rows);
  if (!result.structured) {
    console.log("  -> NOT STRUCTURED (rawRowCount:", result.rawRowCount, ")");
    return;
  }
  console.log("  columnsDetected:", JSON.stringify(result.columnsDetected));
  console.log("  hierarchyDepth:", result.hierarchyDepth);
  console.log("  nombreIndicateurs:", result.nombreIndicateurs);
  console.log("  scoreGlobal:", result.scoreGlobal);
  console.log("  categories:", result.categories.map(c => c.categorie).join(", "));
  result.indicateurs.forEach(i => console.log("    -", JSON.stringify(i)));
}

// TEST 1: header uses "OBJECTIF 2027" (future year, not in hardcoded matcher list)
test("Future year column OBJECTIF 2027", [
  ["Objectifs", "", "", "poids", "OBJECTIF 2027", "OBJECTIF YTD", "Réalisation YTD", "Taux de réalisation", "score"],
  ["commercial", "PARC Mobile", "PARC MOBILE", 0.5, 100000, 90000, 85000, 0.94, 0.47],
  ["Score Région", "", "", "", "", "", "", "", 0.47],
]);

// TEST 2: brand new axis "Digital" / "RH" added
test("New axis 'Digital' added", [
  ["Objectifs", "", "", "poids", "OBJECTIF 2026", "OBJECTIF YTD", "Réalisation YTD", "Taux de réalisation", "score"],
  ["commercial", "PARC Mobile", "PARC MOBILE", 0.5, 100000, 90000, 85000, 0.94, 0.47],
  ["Digital", "App mobile", "Taux adoption appli", 0.5, 1, 0.8, 0.9, 1.125, 0.5625],
  ["Score Région", "", "", "", "", "", "", "", 1.0325],
]);

// TEST 3: columns reordered — score first, poids last
test("Reordered columns (score before poids)", [
  ["Objectifs", "", "", "score", "OBJECTIF 2026", "OBJECTIF YTD", "Réalisation YTD", "Taux de réalisation", "poids"],
  ["commercial", "PARC Mobile", "PARC MOBILE", 0.47, 100000, 90000, 85000, 0.94, 0.5],
]);

// TEST 4: 4-level hierarchy (super-cat, cat, sub-cat, indicator)
test("4-level hierarchy", [
  ["Pole", "Categorie", "SousCategorie", "Indicateur", "poids", "OBJECTIF 2026", "OBJECTIF YTD", "Réalisation YTD", "Taux de réalisation", "score"],
  ["Reseau", "commercial", "PARC Mobile", "PARC MOBILE", 0.5, 100000, 90000, 85000, 0.94, 0.47],
  ["Reseau", "commercial", "PARC Fixe", "THD RETAIL", 0.5, 12000, 4855, 4146, 0.85, 0.425],
]);

// TEST 5: missing "score" column entirely (only poids present)
test("Missing score column", [
  ["Objectifs", "", "", "poids", "OBJECTIF 2026", "OBJECTIF YTD", "Réalisation YTD", "Taux de réalisation"],
  ["commercial", "PARC Mobile", "PARC MOBILE", 0.5, 100000, 90000, 85000, 0.94],
]);

// TEST 6: extra unrelated column "Commentaire" inserted after score
test("Extra unrelated column after metrics", [
  ["Objectifs", "", "", "poids", "OBJECTIF 2026", "OBJECTIF YTD", "Réalisation YTD", "Taux de réalisation", "score", "Commentaire"],
  ["commercial", "PARC Mobile", "PARC MOBILE", 0.5, 100000, 90000, 85000, 0.94, 0.47, "RAS"],
]);

// TEST 7: header row not at row 0 (2 junk rows above)
test("Header row shifted down (junk rows above)", [
  ["Rapport mensuel KPI", "", "", "", "", "", "", "", ""],
  ["Genere le 01/08/2026", "", "", "", "", "", "", "", ""],
  ["Objectifs", "", "", "poids", "OBJECTIF 2026", "OBJECTIF YTD", "Réalisation YTD", "Taux de réalisation", "score"],
  ["commercial", "PARC Mobile", "PARC MOBILE", 0.5, 100000, 90000, 85000, 0.94, 0.47],
]);

// TEST 8: header row beyond scan limit (11 junk rows above -> findHeaderRow only scans first 10)
const junkRows = Array.from({length: 11}, (_, i) => [`junk${i}`, "", "", "", "", "", "", "", ""]);
test("Header row beyond 10-row scan limit", [
  ...junkRows,
  ["Objectifs", "", "", "poids", "OBJECTIF 2026", "OBJECTIF YTD", "Réalisation YTD", "Taux de réalisation", "score"],
  ["commercial", "PARC Mobile", "PARC MOBILE", 0.5, 100000, 90000, 85000, 0.94, 0.47],
]);

// TEST 9: weight given as percentage text "50%" instead of 0.5
test("Weight as text percentage string", [
  ["Objectifs", "", "", "poids", "OBJECTIF 2026", "OBJECTIF YTD", "Réalisation YTD", "Taux de réalisation", "score"],
  ["commercial", "PARC Mobile", "PARC MOBILE", "50%", 100000, 90000, 85000, "94%", 0.47],
]);
