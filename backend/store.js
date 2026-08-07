/**
 * Persistance sur Supabase (Postgres + Storage) pour les paramètres de
 * synchronisation Google Drive, l'historique des versions du classeur KPI,
 * et les classeurs Excel eux-mêmes (live, en attente, archives).
 *
 * Remplace l'ancienne persistance sur disque local : sur un hébergeur gratuit
 * (Render free) le système de fichiers est éphémère et est effacé à chaque
 * redéploiement/redémarrage. Supabase (projet gratuit, ne expire jamais)
 * garde ces données de façon permanente, indépendamment du serveur qui tourne.
 *
 * SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis en variables
 * d'environnement (jamais commit dans le repo — voir .env.example).
 */
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis (voir .env.example)."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "kpi-files";
const KPIS_NAME = "kpis.xlsx";
const PENDING_NAME = "pending.xlsx";
const HISTORY_PREFIX = "history/";
const SEED_DIR = path.join(__dirname, "seed-data");

const DEFAULT_SETTINGS = {
  driveLink: "",
  fileId: null,
  pollIntervalMs: 60000,
  lastCheckedAt: null,
  lastError: null,
  liveHash: null,
  pendingHash: null,
  pendingDetectedAt: null,
  dismissedHash: null,
};

// --- Amorçage : si le bucket n'a jamais reçu de classeur live (tout premier
// démarrage sur un projet Supabase neuf), on l'amorce depuis seed-data/ (copié
// dans le repo git) pour que l'application ne démarre jamais sans données.
let seeded = false;
async function ensureSeeded() {
  if (seeded) return;
  seeded = true;
  const exists = await fileExists(KPIS_NAME);
  if (exists) return;
  const seedFile = path.join(SEED_DIR, "kpis.xlsx");
  if (!fs.existsSync(seedFile)) return;
  const buffer = fs.readFileSync(seedFile);
  await uploadFile(KPIS_NAME, buffer);
}

// --- Fichiers (bucket Storage) ---

async function fileExists(name) {
  const dir = name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : "";
  const base = name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
  const { data, error } = await supabase.storage.from(BUCKET).list(dir || undefined, {
    search: base,
  });
  if (error) return false;
  return (data || []).some((f) => f.name === base);
}

async function downloadFile(name) {
  const { data, error } = await supabase.storage.from(BUCKET).download(name);
  if (error) return null;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadFile(name, buffer) {
  const { error } = await supabase.storage.from(BUCKET).upload(name, buffer, {
    upsert: true,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (error) throw new Error(`Échec de l'upload Supabase (${name}) : ${error.message}`);
}

async function deleteFile(name) {
  await supabase.storage.from(BUCKET).remove([name]);
}

async function fileStamp(name) {
  const dir = name.includes("/") ? name.slice(0, name.lastIndexOf("/")) : "";
  const base = name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
  const { data, error } = await supabase.storage.from(BUCKET).list(dir || undefined, {
    search: base,
  });
  if (error || !data || !data.length) return null;
  const entry = data.find((f) => f.name === base);
  if (!entry) return null;
  const updatedAt = entry.updated_at || entry.created_at;
  return updatedAt ? new Date(updatedAt).getTime() : null;
}

// --- Paramètres (table app_settings, une seule ligne id=1) ---

async function readSettings() {
  const { data, error } = await supabase.from("app_settings").select("data").eq("id", 1).maybeSingle();
  if (error || !data) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...(data.data || {}) };
}

async function writeSettings(settings) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ id: 1, data: settings, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Échec de l'écriture des paramètres : ${error.message}`);
  return settings;
}

// --- Historique (table kpi_history) ---

async function readHistory() {
  const { data, error } = await supabase
    .from("kpi_history")
    .select("id, applied_at, month, file_name, score_global, sheet_name, nombre_indicateurs")
    .order("applied_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    appliedAt: row.applied_at,
    month: row.month,
    fileName: row.file_name,
    scoreGlobal: row.score_global,
    sheetName: row.sheet_name,
    nombreIndicateurs: row.nombre_indicateurs,
  }));
}

async function addHistoryEntry(entry) {
  const { error } = await supabase.from("kpi_history").insert({
    id: entry.id,
    applied_at: entry.appliedAt,
    month: entry.month,
    file_name: entry.fileName,
    score_global: entry.scoreGlobal,
    sheet_name: entry.sheetName,
    nombre_indicateurs: entry.nombreIndicateurs,
  });
  if (error) throw new Error(`Échec de l'écriture de l'historique : ${error.message}`);
}

// Supprime UNE version archivée : son fichier .xlsx dans le bucket Storage,
// puis sa ligne dans kpi_history. Si le fichier est déjà absent du bucket
// (incohérence préexistante), on supprime quand même la ligne plutôt que de
// laisser une entrée fantôme impossible à retirer depuis l'interface.
async function deleteHistoryEntry(id) {
  const { data, error } = await supabase
    .from("kpi_history")
    .select("file_name")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Échec de la lecture de l'historique : ${error.message}`);
  if (data?.file_name) await deleteFile(data.file_name);
  const { error: delErr } = await supabase.from("kpi_history").delete().eq("id", id);
  if (delErr) throw new Error(`Échec de la suppression de l'historique : ${delErr.message}`);
}

// Supprime TOUTE la section Historique : chaque fichier archivé dans le
// bucket, puis toutes les lignes de kpi_history. N'affecte jamais le fichier
// live ni les paramètres (lien Drive) — uniquement les versions archivées.
async function deleteAllHistory() {
  const { data, error } = await supabase.from("kpi_history").select("id, file_name");
  if (error) throw new Error(`Échec de la lecture de l'historique : ${error.message}`);
  const rows = data || [];
  for (const row of rows) {
    if (row.file_name) await deleteFile(row.file_name);
  }
  if (rows.length) {
    const { error: delErr } = await supabase
      .from("kpi_history")
      .delete()
      .in("id", rows.map((r) => r.id));
    if (delErr) throw new Error(`Échec de la suppression de l'historique : ${delErr.message}`);
  }
}

module.exports = {
  BUCKET,
  KPIS_NAME,
  PENDING_NAME,
  HISTORY_PREFIX,
  ensureSeeded,
  fileExists,
  downloadFile,
  uploadFile,
  deleteFile,
  fileStamp,
  readSettings,
  writeSettings,
  readHistory,
  addHistoryEntry,
  deleteHistoryEntry,
  deleteAllHistory,
};
