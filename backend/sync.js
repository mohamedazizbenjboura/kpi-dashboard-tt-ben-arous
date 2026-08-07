/**
 * Orchestration de la synchronisation Google Drive :
 * - vérifie périodiquement si le fichier Excel pointé par le lien Drive
 *   a changé (comparaison de hash, pas de dépendance à l'API Drive) ;
 * - si oui, télécharge une copie "en attente" (pending.xlsx, sur Supabase
 *   Storage) sans jamais toucher au fichier live tant que l'utilisateur n'a
 *   pas cliqué "Appliquer" ;
 * - à l'application : archive l'ancien fichier live dans le bucket
 *   (history/<mois>_<timestamp>.xlsx, nommé automatiquement) et promeut le
 *   fichier en attente comme nouveau fichier live.
 *
 * Tout est stocké sur Supabase (Postgres + Storage), jamais sur le disque
 * local du serveur : sur Render (free tier) le disque est effacé à chaque
 * redéploiement/redémarrage, donc rien de durable ne peut y vivre.
 */
const { extractFileId, downloadDriveFile, hashBuffer } = require("./driveSync");
const { loadWorkbookFromBuffer } = require("./parser");
const store = require("./store");

let pollTimer = null;
let checking = false;

function monthLabel(date = new Date()) {
  const label = date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// --- Période RÉELLE des données (mois du fichier/de la feuille source), à ne pas
// confondre avec la date d'application (upload/sync), gérée séparément par monthLabel().
const FR_MONTH_TOKENS = [
  ["janvier", 1], ["janv", 1], ["jan", 1],
  ["fevrier", 2], ["fevr", 2], ["fev", 2],
  ["mars", 3], ["mar", 3],
  ["avril", 4], ["avr", 4],
  ["mai", 5],
  ["juin", 6],
  ["juillet", 7], ["juil", 7],
  ["aout", 8], ["aou", 8],
  ["septembre", 9], ["sept", 9], ["sep", 9],
  ["octobre", 10], ["oct", 10],
  ["novembre", 11], ["nov", 11],
  ["decembre", 12], ["dec", 12],
].sort((a, b) => b[0].length - a[0].length);

const FR_MONTH_NAMES = [
  "", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function normalizeToken(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function periodFromSheetName(sheetName, fallbackDate) {
  const norm = normalizeToken(sheetName);
  if (!norm) return null;

  const tryMatchAt = (start) => {
    for (const [token, monthNum] of FR_MONTH_TOKENS) {
      if (norm.startsWith(token, start)) {
        const rest = norm.slice(start + token.length);
        const yearMatch = rest.match(/^\D{0,3}(\d{2,4})/);
        let year;
        if (yearMatch) {
          const digits = yearMatch[1];
          year = digits.length <= 2 ? 2000 + parseInt(digits, 10) : parseInt(digits, 10);
        } else {
          year = (fallbackDate || new Date()).getFullYear();
        }
        return `${FR_MONTH_NAMES[monthNum]} ${year}`;
      }
    }
    return null;
  };

  const atStart = tryMatchAt(0);
  if (atStart) return atStart;

  for (let i = 1; i < norm.length; i++) {
    const match = tryMatchAt(i);
    if (match) return match;
  }

  return null;
}

function resolvePeriodLabel(sheetName, appliedDate) {
  return periodFromSheetName(sheetName, appliedDate) || monthLabel(appliedDate);
}

// Petit résumé (pas la donnée complète) pour l'affichage dans la bannière
// "nouvelle version détectée" et dans l'historique.
function summarizeBuffer(buffer, label) {
  if (!buffer) return null;
  try {
    const data = loadWorkbookFromBuffer(buffer, label);
    const best = data.sheets
      .filter((s) => s.structured)
      .reduce((b, s) => (s.nombreIndicateurs > (b?.nombreIndicateurs ?? -1) ? s : b), null);
    return {
      sheetName: best?.sheetName ?? null,
      scoreGlobal: best?.scoreGlobal ?? null,
      nombreIndicateurs: best?.nombreIndicateurs ?? 0,
      nombreFeuilles: data.sheets.length,
    };
  } catch {
    return null;
  }
}

async function checkNow() {
  if (checking) return getStatus();
  const settings = await store.readSettings();
  const fileId = extractFileId(settings.driveLink);

  if (!fileId) {
    await store.writeSettings({
      ...settings,
      lastError: settings.driveLink ? "Lien Google Drive invalide." : null,
      lastCheckedAt: settings.driveLink ? Date.now() : settings.lastCheckedAt,
    });
    return getStatus();
  }

  checking = true;
  try {
    const buffer = await downloadDriveFile(fileId);
    const newHash = hashBuffer(buffer);
    const liveBuffer = await store.downloadFile(store.KPIS_NAME);
    const liveHash = liveBuffer ? hashBuffer(liveBuffer) : null;
    const fresh = await store.readSettings(); // relire au cas où les paramètres ont changé pendant le téléchargement

    if (newHash === liveHash) {
      // Identique à ce qui est déjà en ligne : on nettoie un éventuel "pending" obsolète.
      if (await store.fileExists(store.PENDING_NAME)) await store.deleteFile(store.PENDING_NAME);
      await store.writeSettings({
        ...fresh,
        fileId,
        liveHash,
        lastCheckedAt: Date.now(),
        lastError: null,
        pendingHash: null,
        pendingDetectedAt: null,
      });
    } else if (newHash === fresh.pendingHash || newHash === fresh.dismissedHash) {
      // Déjà connu (en attente, ou déjà ignoré) : on met juste à jour l'heure de vérification.
      await store.writeSettings({ ...fresh, fileId, lastCheckedAt: Date.now(), lastError: null });
    } else {
      await store.uploadFile(store.PENDING_NAME, buffer);
      await store.writeSettings({
        ...fresh,
        fileId,
        lastCheckedAt: Date.now(),
        lastError: null,
        pendingHash: newHash,
        pendingDetectedAt: Date.now(),
        dismissedHash: null,
      });
    }
  } catch (err) {
    const fresh = await store.readSettings();
    await store.writeSettings({ ...fresh, lastCheckedAt: Date.now(), lastError: err.message });
  } finally {
    checking = false;
  }
  return getStatus();
}

async function getStatus() {
  const settings = await store.readSettings();
  const pendingExists = settings.pendingHash && (await store.fileExists(store.PENDING_NAME));
  const pendingBuffer = pendingExists ? await store.downloadFile(store.PENDING_NAME) : null;
  const liveBuffer = await store.downloadFile(store.KPIS_NAME);
  return {
    driveLink: settings.driveLink,
    pollIntervalMs: settings.pollIntervalMs,
    lastCheckedAt: settings.lastCheckedAt,
    lastError: settings.lastError,
    checking,
    pending: pendingBuffer
      ? { detectedAt: settings.pendingDetectedAt, summary: summarizeBuffer(pendingBuffer, store.PENDING_NAME) }
      : null,
    live: summarizeBuffer(liveBuffer, store.KPIS_NAME),
  };
}

async function applyPending() {
  const settings = await store.readSettings();
  const pendingBuffer = await store.downloadFile(store.PENDING_NAME);
  if (!pendingBuffer) {
    throw new Error("Aucune nouvelle version en attente à appliquer.");
  }
  const liveBuffer = await store.downloadFile(store.KPIS_NAME);
  if (!liveBuffer) {
    throw new Error("Aucun fichier actif à archiver.");
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const archivedName = `${store.HISTORY_PREFIX}kpis_${now.toISOString().slice(0, 7)}_${stamp}.xlsx`;

  // 1. Archiver le fichier live actuel avant de le remplacer.
  await store.uploadFile(archivedName, liveBuffer);
  const archivedSummary = summarizeBuffer(liveBuffer, archivedName);

  // 2. Promouvoir le fichier en attente comme nouveau fichier live.
  await store.uploadFile(store.KPIS_NAME, pendingBuffer);
  await store.deleteFile(store.PENDING_NAME);

  // 3. Enregistrer l'entrée d'historique pour la version qui vient d'être retirée.
  //    "month" est la PÉRIODE RÉELLE des données (déduite du nom de la feuille
  //    source, ex. "mai26" -> "Mai 2026"), PAS le mois où l'application a eu
  //    lieu. "appliedAt" reste l'horodatage exact de l'action (upload/sync).
  const month = resolvePeriodLabel(archivedSummary?.sheetName, now);
  await store.addHistoryEntry({
    id: stamp,
    appliedAt: now.toISOString(),
    month,
    fileName: archivedName,
    scoreGlobal: archivedSummary?.scoreGlobal ?? null,
    sheetName: archivedSummary?.sheetName ?? null,
    nombreIndicateurs: archivedSummary?.nombreIndicateurs ?? null,
  });

  // 4. Mettre à jour les paramètres (nouveau hash live, plus rien en attente).
  const newLiveHash = hashBuffer(pendingBuffer);
  await store.writeSettings({
    ...settings,
    liveHash: newLiveHash,
    pendingHash: null,
    pendingDetectedAt: null,
    dismissedHash: null,
  });

  return getStatus();
}

async function dismissPending() {
  const settings = await store.readSettings();
  if (await store.fileExists(store.PENDING_NAME)) await store.deleteFile(store.PENDING_NAME);
  await store.writeSettings({
    ...settings,
    dismissedHash: settings.pendingHash,
    pendingHash: null,
    pendingDetectedAt: null,
  });
  return getStatus();
}

async function startPolling() {
  await store.ensureSeeded();

  // Initialise le hash "live" au démarrage pour pouvoir détecter un écart dès le premier passage.
  const settings = await store.readSettings();
  const liveBuffer = await store.downloadFile(store.KPIS_NAME);
  const liveHash = liveBuffer ? hashBuffer(liveBuffer) : null;
  if (liveHash !== settings.liveHash) await store.writeSettings({ ...settings, liveHash });

  const tick = async () => {
    const current = await store.readSettings();
    if (current.driveLink) {
      await checkNow().catch(() => {});
    }
    const fresh = await store.readSettings();
    const interval = fresh.pollIntervalMs || 60000;
    pollTimer = setTimeout(tick, interval);
  };
  pollTimer = setTimeout(tick, 3000);
}

function stopPolling() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
}

module.exports = {
  checkNow,
  applyPending,
  dismissPending,
  getStatus,
  startPolling,
  stopPolling,
  periodFromSheetName,
  resolvePeriodLabel,
};
