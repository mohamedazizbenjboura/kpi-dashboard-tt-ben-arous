/**
 * Téléchargement d'un fichier Google Drive public ("Anyone with the link
 * can view") sans clé API ni OAuth : on suit le lien de partage, on résout
 * la page interstitielle "Google Drive ne peut pas analyser ce fichier..."
 * si elle apparaît (cas des fichiers un peu gros), et on renvoie le binaire.
 */
const https = require("https");
const crypto = require("crypto");

// Accepte tous les formats de lien Drive courants, ou un ID brut.
function extractFileId(link) {
  if (!link) return null;
  const trimmed = String(link).trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed) && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }

  const patterns = [
    /\/d\/([a-zA-Z0-9_-]{15,})/, // https://drive.google.com/file/d/ID/view
    /[?&]id=([a-zA-Z0-9_-]{15,})/, // https://drive.google.com/open?id=ID or uc?id=ID
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

function httpGet(url, cookieHeader, redirectsLeft = 6) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
      timeout: 15000, // évite un "socket hang up" silencieux : on échoue proprement après 15s.
    };
    const req = https
      .get(url, opts, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error("Trop de redirections lors du téléchargement depuis Google."));
            return;
          }
          const nextCookie = res.headers["set-cookie"]
            ? res.headers["set-cookie"].map((c) => c.split(";")[0]).join("; ")
            : cookieHeader;
          resolve(httpGet(res.headers.location, nextCookie, redirectsLeft - 1));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({ buffer: Buffer.concat(chunks), headers: res.headers, statusCode: res.statusCode });
        });
        res.on("error", reject);
      })
      .on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Délai dépassé (15s) lors du téléchargement depuis Google."));
    });
  });
}

async function downloadDriveFile(fileId) {
  // 1) Essai prioritaire : export natif Google Sheets (cas du lien fourni,
  //    "docs.google.com/spreadsheets/d/ID/edit") -> renvoie directement le
  //    binaire .xlsx, sans page interstitielle "Google Drive ne peut pas
  //    analyser ce fichier". C'est la cause probable des "socket hang up"
  //    observés : l'ancien code passait toujours par le point d'entrée Drive
  //    générique (pensé pour un fichier binaire uploadé), inadapté à une
  //    feuille Google Sheets native.
  try {
    const sheetsUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=xlsx`;
    const sheetsResult = await httpGet(sheetsUrl);
    const sheetsContentType = sheetsResult.headers["content-type"] || "";
    if (
      sheetsResult.statusCode === 200 &&
      !sheetsContentType.includes("text/html") &&
      sheetsResult.buffer &&
      sheetsResult.buffer.length > 0
    ) {
      return sheetsResult.buffer;
    }
  } catch {
    // Pas un Google Sheets natif (ou export indisponible) : on retombe sur le
    // téléchargement Drive générique ci-dessous.
  }

  // 2) Repli : fichier binaire .xlsx effectivement uploadé sur Drive.
  const base = `https://drive.google.com/uc?export=download&id=${fileId}`;
  let result = await httpGet(base);
  let buffer = result.buffer;
  const contentType = result.headers["content-type"] || "";

  if (contentType.includes("text/html")) {
    const html = buffer.toString("utf8");
    const confirmMatch =
      html.match(/confirm=([0-9A-Za-z_-]+)/) || html.match(/name="confirm"\s+value="([0-9A-Za-z_-]+)"/);
    const uuidMatch = html.match(/name="uuid"\s+value="([0-9A-Za-z_-]+)"/);
    const setCookie = result.headers["set-cookie"];
    const cookieHeader = setCookie ? setCookie.map((c) => c.split(";")[0]).join("; ") : undefined;

    if (confirmMatch) {
      let confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
      if (uuidMatch) confirmUrl += `&uuid=${uuidMatch[1]}`;
      result = await httpGet(confirmUrl, cookieHeader);
      buffer = result.buffer;
    } else {
      throw new Error(
        "Impossible de télécharger le fichier depuis Google Drive (lien invalide, fichier privé, ou accès restreint)."
      );
    }
  }

  if (!buffer || buffer.length === 0) {
    throw new Error("Fichier vide reçu depuis Google Drive.");
  }
  return buffer;
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

module.exports = { extractFileId, downloadDriveFile, hashBuffer };
