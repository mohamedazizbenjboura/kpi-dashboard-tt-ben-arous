// En dev local (Vite proxy), "/api" suffit. En production, le frontend
// (Vercel) et le backend (Render) sont sur des origines différentes, donc
// VITE_API_URL doit pointer vers l'URL complète du backend Render (ex.
// "https://tt-kpi-backend.onrender.com/api") — défini dans les variables
// d'environnement du projet Vercel.
const BASE = import.meta.env.VITE_API_URL || "/api";

async function asJson(res) {
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch {
      /* ignore */
    }
    const err = new Error(msg);
    // Le status HTTP est conservé sur l'erreur pour que l'appelant puisse
    // distinguer un 404 "aucun fichier chargé pour l'instant" (état normal
    // au premier déploiement, avant qu'un lien Drive soit configuré) d'une
    // vraie panne (backend injoignable, 500, etc.).
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function fetchHealth() {
  return fetch(`${BASE}/health`).then(asJson);
}

export function fetchMeta() {
  return fetch(`${BASE}/meta`).then(asJson);
}

export function fetchData() {
  return fetch(`${BASE}/data`).then(asJson);
}

// --- Paramètres (lien Google Drive) ---
export function fetchSettings() {
  return fetch(`${BASE}/settings`).then(asJson);
}

export function saveSettings(driveLink) {
  return fetch(`${BASE}/settings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ driveLink }),
  }).then(asJson);
}

// Retire le lien Drive + le fichier live (le tableau de bord repasse à
// l'état vide du tout premier déploiement). L'historique n'est pas touché.
export function clearDriveLink() {
  return fetch(`${BASE}/settings`, { method: "DELETE" }).then(asJson);
}

// --- Synchronisation Google Drive ---
export function fetchSyncStatus() {
  return fetch(`${BASE}/sync/status`).then(asJson);
}

export function checkDriveNow() {
  return fetch(`${BASE}/sync/check-now`, { method: "POST" }).then(asJson);
}

export function applyPendingVersion() {
  return fetch(`${BASE}/sync/apply`, { method: "POST" }).then(asJson);
}

export function dismissPendingVersion() {
  return fetch(`${BASE}/sync/dismiss`, { method: "POST" }).then(asJson);
}

// --- Historique des versions mensuelles ---
export function fetchHistory() {
  return fetch(`${BASE}/history`).then(asJson);
}

// Données complètes d'une version archivée précise (clic sur un mois dans
// l'historique) : { entry, sheet, fileName, loadedAt }.
export function fetchHistoryEntry(id) {
  return fetch(`${BASE}/history/${id}/data`).then(asJson);
}

// URL de téléchargement du classeur .xlsx brut d'une version archivée —
// utilisée directement comme href d'un lien <a download>, pas via fetch.
export function historyDownloadUrl(id) {
  return `${BASE}/history/${id}/download`;
}

export function deleteHistoryEntry(id) {
  return fetch(`${BASE}/history/${id}`, { method: "DELETE" }).then(asJson);
}

export function deleteAllHistory() {
  return fetch(`${BASE}/history`, { method: "DELETE" }).then(asJson);
}
