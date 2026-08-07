// En dev local (Vite proxy), "/api" suffit. En production, le frontend
// (Vercel) et le backend (Render) sont sur des origines différentes, donc
// VITE_API_URL doit pointer vers l'URL complète du backend Render (ex.
// "https://tt-kpi-backend.onrender.com/api") — défini dans les variables
// d'environnement du projet Vercel.
const BASE = import.meta.env.VITE_API_URL || "/api";
const ADMIN_KEY_STORAGE = "tt-admin-key";

// Clé admin optionnelle, saisie une fois dans Paramètres et conservée en
// local sur cet appareil. Envoyée uniquement sur les routes qui modifient
// l'état de l'application ; les routes de lecture (dashboard) n'en ont pas
// besoin. Si le serveur ne définit pas ADMIN_KEY (dev local), l'en-tête est
// ignoré côté backend — l'app continue de fonctionner sans rien configurer.
export function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || "";
}

export function setAdminKey(key) {
  if (key) localStorage.setItem(ADMIN_KEY_STORAGE, key);
  else localStorage.removeItem(ADMIN_KEY_STORAGE);
}

function adminHeaders(extra = {}) {
  const key = getAdminKey();
  return key ? { ...extra, "x-admin-key": key } : extra;
}

async function asJson(res) {
  if (!res.ok) {
    let msg = `Erreur ${res.status}`;
    if (res.status === 401) msg = "Clé admin manquante ou invalide (voir Paramètres).";
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
    headers: adminHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ driveLink }),
  }).then(asJson);
}

// --- Synchronisation Google Drive ---
export function fetchSyncStatus() {
  return fetch(`${BASE}/sync/status`).then(asJson);
}

export function checkDriveNow() {
  return fetch(`${BASE}/sync/check-now`, { method: "POST", headers: adminHeaders() }).then(asJson);
}

export function applyPendingVersion() {
  return fetch(`${BASE}/sync/apply`, { method: "POST", headers: adminHeaders() }).then(asJson);
}

export function dismissPendingVersion() {
  return fetch(`${BASE}/sync/dismiss`, { method: "POST", headers: adminHeaders() }).then(asJson);
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
