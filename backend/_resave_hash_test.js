const XLSX = require("xlsx");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

const SRC = path.join(__dirname, "..", "..", "KPIS-drt-b-arous-Juillet26.xlsx");
const original = fs.readFileSync(SRC);
console.log("Original file hash:", sha256(original));

// Simulate: someone opens the file (e.g. via Google Sheets export, or Excel
// open+save) without changing a single cell value, then it gets re-uploaded /
// re-exported to Drive. Read it with the SAME lib the backend uses, then
// write it back out unchanged.
const wb = XLSX.readFile(SRC, { cellDates: true });
const outPath = path.join(__dirname, "_resave_test_output.xlsx");
XLSX.writeFile(wb, outPath);
const resaved = fs.readFileSync(outPath);
console.log("Re-saved (same data, no cell edits) file hash:", sha256(resaved));
console.log("Hashes identical?", sha256(original) === sha256(resaved));
console.log("Original size:", original.length, "| Re-saved size:", resaved.length);

// Also verify: does the actual parsed KPI DATA come out identical despite the
// hash differing? (i.e. is this a harmless false-positive or does re-saving
// also corrupt data)
const { loadWorkbook } = require("./parser");
const dataOriginal = loadWorkbook(SRC);
const dataResaved = loadWorkbook(outPath);
const s1 = JSON.stringify(dataOriginal.sheets.map(s => ({ n: s.sheetName, sc: s.scoreGlobal, i: s.nombreIndicateurs })));
const s2 = JSON.stringify(dataResaved.sheets.map(s => ({ n: s.sheetName, sc: s.scoreGlobal, i: s.nombreIndicateurs })));
console.log("Parsed KPI data identical between original and re-saved?", s1 === s2);
console.log("  original:", s1);
console.log("  resaved :", s2);

fs.unlinkSync(outPath);
