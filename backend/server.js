const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { loadWorkbookFromBuffer } = require("./parser");
const { extractFileId } = require("./driveSync");
const store = require("./store");
const sync = require("./sync");

const PORT = process.env.PORT || 4000;

const app = express();

// Render (like most PaaS hosts) puts the app behind a reverse proxy, which
// sets X-Forwarded-For. Without this, express-rate-limit can't safely derive
// each client's real IP and throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR on
// every request. `1` = trust exactly one hop (Render's own proxy).
app.set("trust proxy", 1);

// --- Sécurité de base ---
// En-têtes HTTP durcis (CSP désactivée : le frontend est servi séparément,
// depuis Vercel, donc ce serveur n'a plus besoin d'autoriser ses propres
// styles/scripts inline).
app.use(helmet({ contentSecurityPolicy: false }));

// CORS restreint : seules les origines listées dans ALLOWED_ORIGINS (séparées
// par des virgules — ex. l'URL Vercel du frontend) peuvent appeler l'API
// depuis un navigateur. Sans ALLOWED_ORIGINS défini, aucune origine tierce
// n'est autorisée (fermé par défaut, plutôt que grand ouvert).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      // Pas d'en-tête Origin (requêtes serveur-à-serveur, curl, health checks) : autorisé.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origine non autorisée par la politique CORS."));
    },
  })
);

// Rate limiting sur toute l'API : généreux pour le polling normal du
// dashboard (data/meta toutes les 15s, sync/status toutes les 20s, même
// derrière un NAT de bureau partagé par plusieurs personnes), mais bloque
// le scraping/abus.
app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Trop de requêtes, réessayez dans quelques minutes." },
  })
);

app.use(express.json());

// Petit helper : toute route async passée ici voit ses rejets transmis à
// Express (sinon une exception dans un handler `async` plante le process
// sans réponse HTTP propre).
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Le fichier live est retéléchargé depuis Supabase Storage à chaque requête :
// toute modification de l'Excel (sync appliquée, édition manuelle re-uploadée)
// est reflétée immédiatement dans l'application, sans redémarrage du serveur.
async function getFreshData() {
  const buffer = await store.downloadFile(store.KPIS_NAME);
  if (!buffer) return null;
  return loadWorkbookFromBuffer(buffer, store.KPIS_NAME);
}

app.get(
  "/api/health",
  wrap(async (req, res) => {
    const stamp = await store.fileStamp(store.KPIS_NAME);
    res.json({ ok: true, fileExists: stamp !== null, lastModified: stamp });
  })
);

app.get(
  "/api/meta",
  wrap(async (req, res) => {
    const data = await getFreshData();
    if (!data) return res.status(404).json({ error: "Aucun fichier Excel chargé." });
    const stamp = await store.fileStamp(store.KPIS_NAME);
    res.json({
      fileName: "kpis.xlsx",
      lastModified: stamp,
      sheets: data.sheets.map((s) => ({
        sheetName: s.sheetName,
        structured: s.structured,
        nombreIndicateurs: s.nombreIndicateurs || 0,
        scoreGlobal: s.scoreGlobal ?? null,
      })),
    });
  })
);

app.get(
  "/api/data",
  wrap(async (req, res) => {
    const data = await getFreshData();
    if (!data) return res.status(404).json({ error: "Aucun fichier Excel chargé." });
    res.json(data);
  })
);

app.get(
  "/api/data/:sheet",
  wrap(async (req, res) => {
    const data = await getFreshData();
    if (!data) return res.status(404).json({ error: "Aucun fichier Excel chargé." });
    const sheet = data.sheets.find((s) => s.sheetName === req.params.sheet);
    if (!sheet) return res.status(404).json({ error: "Feuille introuvable." });
    res.json(sheet);
  })
);

// --- Paramètres (lien Google Drive écouté en direct) ---
app.get(
  "/api/settings",
  wrap(async (req, res) => {
    const settings = await store.readSettings();
    res.json({ driveLink: settings.driveLink, pollIntervalMs: settings.pollIntervalMs });
  })
);

app.post(
  "/api/settings",
  wrap(async (req, res) => {
    const { driveLink } = req.body || {};
    if (typeof driveLink !== "string") return res.status(400).json({ error: "Lien invalide." });

    const trimmed = driveLink.trim();
    const fileId = extractFileId(trimmed);
    if (trimmed && !fileId) {
      return res
        .status(400)
        .json({ error: "Impossible d'extraire l'identifiant du fichier depuis ce lien Google Drive." });
    }

    const settings = await store.readSettings();
    await store.writeSettings({
      ...settings,
      driveLink: trimmed,
      fileId,
      pendingHash: null,
      pendingDetectedAt: null,
      dismissedHash: null,
      lastError: null,
    });
    if (await store.fileExists(store.PENDING_NAME)) await store.deleteFile(store.PENDING_NAME);
    res.json({ ok: true });
  })
);

// Retire le lien Google Drive ET le fichier live : le tableau de bord
// retombe exactement dans l'état « premier déploiement » (vide, page
// Paramètres accessible, aucune erreur) via le même chemin 404 que
// getFreshData() gère déjà côté frontend. L'historique déjà archivé n'est
// JAMAIS touché par cette route — uniquement le fichier live + les paramètres.
app.delete(
  "/api/settings",
  wrap(async (req, res) => {
    if (await store.fileExists(store.KPIS_NAME)) await store.deleteFile(store.KPIS_NAME);
    if (await store.fileExists(store.PENDING_NAME)) await store.deleteFile(store.PENDING_NAME);
    const settings = await store.readSettings();
    await store.writeSettings({
      ...settings,
      driveLink: "",
      fileId: null,
      liveHash: null,
      pendingHash: null,
      pendingDetectedAt: null,
      dismissedHash: null,
      lastError: null,
    });
    res.json({ ok: true });
  })
);

// --- Synchronisation Google Drive (détection + application des changements) ---
app.get(
  "/api/sync/status",
  wrap(async (req, res) => {
    res.json(await sync.getStatus());
  })
);

app.post(
  "/api/sync/check-now",
  wrap(async (req, res) => {
    try {
      res.json(await sync.checkNow());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  })
);

app.post(
  "/api/sync/apply",
  wrap(async (req, res) => {
    try {
      res.json(await sync.applyPending());
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  })
);

app.post(
  "/api/sync/dismiss",
  wrap(async (req, res) => {
    res.json(await sync.dismissPending());
  })
);

// --- Historique des versions mensuelles ---
app.get(
  "/api/history",
  wrap(async (req, res) => {
    res.json(await store.readHistory());
  })
);

// Données complètes d'UNE version archivée précise (clic sur un mois dans
// l'historique) : même forme que /api/data/:sheet, mais lue depuis le fichier
// archivé correspondant sur Supabase Storage (history/<fileName>), jamais
// depuis le fichier live. Permet d'afficher le dashboard exactement tel qu'il
// était pour ce mois.
app.get(
  "/api/history/:id/data",
  wrap(async (req, res) => {
    const history = await store.readHistory();
    const entry = history.find((h) => h.id === req.params.id);
    if (!entry) return res.status(404).json({ error: "Version archivée introuvable." });

    const buffer = await store.downloadFile(entry.fileName);
    if (!buffer) {
      return res.status(404).json({ error: "Fichier archivé introuvable dans le stockage." });
    }

    try {
      const data = loadWorkbookFromBuffer(buffer, entry.fileName);
      const sheet =
        data.sheets.find((s) => s.sheetName === entry.sheetName) ??
        data.sheets
          .filter((s) => s.structured)
          .reduce((best, s) => (s.nombreIndicateurs > (best?.nombreIndicateurs ?? -1) ? s : best), null);

      if (!sheet) return res.status(404).json({ error: "Aucune feuille exploitable dans cette version archivée." });

      res.json({ entry, sheet, fileName: entry.fileName, loadedAt: data.loadedAt });
    } catch (err) {
      res.status(500).json({ error: `Impossible de lire la version archivée : ${err.message}` });
    }
  })
);

// Télécharge le classeur .xlsx BRUT d'une version archivée (octets tels
// qu'appliqués à l'époque, pas une reconstruction) pour que l'utilisateur
// puisse le garder sur sa machine.
app.get(
  "/api/history/:id/download",
  wrap(async (req, res) => {
    const history = await store.readHistory();
    const entry = history.find((h) => h.id === req.params.id);
    if (!entry) return res.status(404).json({ error: "Version archivée introuvable." });

    const buffer = await store.downloadFile(entry.fileName);
    if (!buffer) return res.status(404).json({ error: "Fichier archivé introuvable dans le stockage." });

    const safeMonth = (entry.month || "version").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="kpis_${safeMonth}_${entry.id}.xlsx"`);
    res.send(buffer);
  })
);

// Supprime UNE version archivée (fichier + entrée). Le fichier live et les
// autres versions archivées ne sont pas affectés.
app.delete(
  "/api/history/:id",
  wrap(async (req, res) => {
    const history = await store.readHistory();
    const entry = history.find((h) => h.id === req.params.id);
    if (!entry) return res.status(404).json({ error: "Version archivée introuvable." });
    await store.deleteHistoryEntry(req.params.id);
    res.json({ ok: true });
  })
);

// Vide entièrement l'Historique (toutes les versions archivées). Le fichier
// live et le lien Google Drive configuré dans Paramètres ne sont pas touchés.
app.delete(
  "/api/history",
  wrap(async (req, res) => {
    await store.deleteAllHistory();
    res.json({ ok: true });
  })
);

// Nothing to serve statically anymore: the frontend is deployed separately on
// Vercel. Keep a tiny root route so hitting the API URL directly isn't a 404.
app.get("/", (req, res) => {
  res.json({ ok: true, service: "tt-kpi-backend" });
});

// Générique : erreurs non interceptées plus haut (y compris rejets async via `wrap`).
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: err.message || "Erreur interne du serveur." });
});

app.listen(PORT, () => {
  console.log(`Tunisie Telecom KPI Dashboard API - en écoute sur le port ${PORT}`);
  sync.startPolling();
});
