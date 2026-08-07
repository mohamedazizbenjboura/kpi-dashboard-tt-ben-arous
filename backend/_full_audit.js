const { loadWorkbook, parseSheet, normalize } = require("./parser");
const XLSX = require("xlsx");
const path = require("path");

const files = [
  path.join(__dirname, "..", "..", "KPIS-drt-b-arous-Juillet (1).xlsx"),
  path.join(__dirname, "..", "..", "KPIS-drt-b-arous-Juillet26.xlsx"),
  path.join(__dirname, "..", "data", "kpis.xlsx"),
];

for (const f of files) {
  console.log("\n\n========================================");
  console.log("FILE:", f);
  console.log("========================================");
  let wb;
  try {
    wb = XLSX.readFile(f, { cellDates: true });
  } catch (e) {
    console.log("  !! Cannot open file:", e.message);
    continue;
  }
  console.log("Sheet names:", wb.SheetNames.join(", "));

  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    console.log("\n  --- SHEET:", name, "| raw rows:", rows.length, "---");
    if (rows.length === 0) { console.log("    (empty sheet)"); continue; }
    console.log("    Row0 (raw header candidate):", JSON.stringify(rows[0]));
    if (rows[1]) console.log("    Row1:", JSON.stringify(rows[1]));

    const result = parseSheet(name, rows);
    console.log("    structured:", result.structured);
    if (!result.structured) {
      console.log("    !! NOT STRUCTURED - rawRowCount:", result.rawRowCount);
      continue;
    }
    console.log("    headerRowIndex:", result.headerRowIndex);
    console.log("    columnsDetected:", JSON.stringify(result.columnsDetected));
    console.log("    hierarchyDepth:", result.hierarchyDepth);
    console.log("    nombreIndicateurs:", result.nombreIndicateurs);
    console.log("    scoreGlobal:", result.scoreGlobal, "| poidsTotal:", result.poidsTotal, "| scoreCalcule:", result.scoreCalcule);
    console.log("    categories:", result.categories.map(c => `${c.categorie} (poids=${c.poidsTotal}, score=${c.scoreTotal}, taux=${c.tauxMoyenPondere}, status=${c.status})`).join(" | "));

    // Flag indicators with null/odd values
    const suspicious = result.indicateurs.filter(i => i.poids === null || i.score === null || i.tauxRealisation === null);
    if (suspicious.length) {
      console.log(`    ⚠ ${suspicious.length} indicateur(s) with null poids/score/taux:`);
      suspicious.forEach(i => console.log("      -", JSON.stringify(i)));
    }

    // Sum check
    const weightSum = result.categories.reduce((s, c) => s + (c.poidsTotal || 0), 0);
    console.log("    total weight across categories:", weightSum, weightSum > 1.001 || weightSum < 0.999 ? "⚠ NOT ~1.0" : "OK ~1.0");
  }
}

console.log("\n\nDONE.");
