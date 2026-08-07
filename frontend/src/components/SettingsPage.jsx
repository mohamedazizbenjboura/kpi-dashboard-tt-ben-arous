import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { fetchSettings, saveSettings, fetchSyncStatus, checkDriveNow } from "../lib/api";
import { relativeTime } from "../lib/format";
import { IconCloudLink, IconCheckCircle, IconAlertTriangle, IconRefresh } from "./icons";

export default function SettingsPage({ onSaved }) {
  const [driveLink, setDriveLink] = useState("");
  const [savedLink, setSavedLink] = useState("");
  const [status, setStatus] = useState(null);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | done | error
  const [saveError, setSaveError] = useState("");
  const [checking, setChecking] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function refresh() {
    const [settings, syncStatus] = await Promise.all([fetchSettings(), fetchSyncStatus()]);
    setDriveLink(settings.driveLink || "");
    setSavedLink(settings.driveLink || "");
    setStatus(syncStatus);
    setLoaded(true);
  }

  useEffect(() => {
    refresh();
    const id = setInterval(() => fetchSyncStatus().then(setStatus).catch(() => {}), 10000);
    return () => clearInterval(id);
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaveState("saving");
    setSaveError("");
    try {
      await saveSettings(driveLink.trim());
      setSavedLink(driveLink.trim());
      setSaveState("done");
      onSaved?.();
      await refresh();
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setSaveState("error");
      setSaveError(err.message);
    }
  }

  async function handleCheckNow() {
    setChecking(true);
    try {
      const s = await checkDriveNow();
      setStatus(s);
      onSaved?.();
    } finally {
      setChecking(false);
    }
  }

  const dirty = driveLink.trim() !== savedLink;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div className="card p-6 md:p-7">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="h-8 w-8 rounded-xl flex items-center justify-center bg-[var(--color-brand-dim)] text-[var(--color-brand)]">
            <IconCloudLink size={16} />
          </span>
          <h2 className="text-[15px] font-semibold text-[var(--color-text)]">Source Google Drive</h2>
        </div>
        <p className="text-[12.5px] text-[var(--color-text-faint)] mb-5 leading-relaxed">
          Collez le lien de partage du fichier Excel sur Google Drive (partagé en « Tous les utilisateurs
          disposant du lien »). Le site vérifie régulièrement s'il a changé ; les changements ne deviennent
          visibles qu'après validation.
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="tick text-[10.5px] text-[var(--color-text-faint)]">Lien du fichier Excel</span>
            <input
              value={driveLink}
              onChange={(e) => setDriveLink(e.target.value)}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] outline-none focus:border-[var(--color-brand)] transition-colors font-mono"
            />
          </label>

          {saveState === "error" && (
            <p className="text-[12px] text-[var(--color-bad)] flex items-center gap-1.5">
              <IconAlertTriangle size={13} /> {saveError}
            </p>
          )}

          <div className="flex items-center gap-2.5 mt-1">
            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={!dirty || saveState === "saving"}
              className="flex items-center gap-1.5 text-[12.5px] font-medium px-4 py-2.5 rounded-xl bg-[var(--color-brand)] text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity"
            >
              {saveState === "done" ? <IconCheckCircle size={14} /> : null}
              {saveState === "saving" ? "Enregistrement…" : saveState === "done" ? "Enregistré" : "Enregistrer le lien"}
            </motion.button>

            <button
              type="button"
              onClick={handleCheckNow}
              disabled={!savedLink || checking}
              className="flex items-center gap-1.5 text-[12.5px] font-medium px-3.5 py-2.5 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <IconRefresh size={14} className={checking ? "animate-spin" : ""} />
              Vérifier maintenant
            </button>
          </div>
        </form>
      </div>

      {loaded && (
        <div className="card p-6 md:p-7">
          <span className="tick text-[10.5px] text-[var(--color-text-faint)] mb-3 block">État de la synchronisation</span>
          <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-[12.5px]">
            <dt className="text-[var(--color-text-faint)]">Dernière vérification</dt>
            <dd className="text-[var(--color-text)] font-mono text-right">
              {status?.lastCheckedAt ? `${relativeTime(status.lastCheckedAt)}` : "—"}
            </dd>

            <dt className="text-[var(--color-text-faint)]">Fichier actif</dt>
            <dd className="text-[var(--color-text)] text-right">
              {status?.live?.sheetName
                ? `${status.live.sheetName} · ${status.live.nombreIndicateurs} indicateurs`
                : "—"}
            </dd>

            <dt className="text-[var(--color-text-faint)]">Nouvelle version</dt>
            <dd className="text-right">
              {status?.pending ? (
                <span className="text-[var(--color-warn)] font-medium">En attente d'application</span>
              ) : (
                <span className="text-[var(--color-text-faint)]">Aucune</span>
              )}
            </dd>

            {status?.lastError && (
              <>
                <dt className="text-[var(--color-bad)]">Erreur</dt>
                <dd className="text-[var(--color-bad)] text-right">{status.lastError}</dd>
              </>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
