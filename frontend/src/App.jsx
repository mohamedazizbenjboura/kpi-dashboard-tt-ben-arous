import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchData, fetchMeta, fetchSyncStatus, fetchHistoryEntry } from "./lib/api";
import { formatTimestamp } from "./lib/format";
import { AnimatePresence } from "motion/react";
import LoadingScreen from "./components/LoadingScreen";
import ErrorState from "./components/ErrorState";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import TVDashboard from "./components/TVDashboard";
import AxisDetailView from "./components/AxisDetailView";
import IndicatorHistoryModal from "./components/IndicatorHistoryModal";
import SettingsPage from "./components/SettingsPage";
import HistoryPage from "./components/HistoryPage";
import PendingBanner from "./components/PendingBanner";

const POLL_MS = 15000;
const SYNC_POLL_MS = 20000;

function pickDefaultSheet(sheets) {
  const structured = sheets.filter((s) => s.structured);
  if (!structured.length) return null;
  return structured.reduce((best, s) => (s.nombreIndicateurs > (best?.nombreIndicateurs ?? -1) ? s : best), null);
}

export default function App() {
  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const [sheets, setSheets] = useState([]);
  const [meta, setMeta] = useState(null);
  // Vrai quand le backend répond mais qu'aucun classeur Excel n'a encore été
  // chargé (404 sur /api/meta et /api/data) — état normal au tout premier
  // déploiement, avant qu'un lien Google Drive soit configuré dans Paramètres.
  // Ce n'est PAS une erreur : le tableau de bord doit rester utilisable
  // (navigation, Paramètres) et s'afficher à zéro plutôt que planter.
  const [noData, setNoData] = useState(false);
  const [sheetName, setSheetName] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  // La vue TV (tout-en-un, une seule page) est l'écran d'accueil par défaut :
  // c'est celle destinée à être affichée telle quelle sur un téléviseur connecté.
  const [view, setView] = useState("tv"); // tv | category | settings | history
  const [search, setSearch] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Sidebar repliable façon Claude : un clic sur les trois lignes fait
  // disparaître les libellés (seul le logo persiste), état mémorisé.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("tt-sidebar-collapsed") === "1";
  });
  const [archiveView, setArchiveView] = useState(null); // { entry, sheet, fileName, loadedAt } | null
  const [archiveOpeningId, setArchiveOpeningId] = useState(null);
  const [archiveError, setArchiveError] = useState("");
  // Thème clair par défaut : un fond noir a été explicitement signalé comme
  // à éviter (remarque de l'encadrant) — le thème sombre reste disponible via
  // le bouton de bascule pour qui le préfère.
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem("tt-theme") || "light";
  });

  useEffect(() => {
    // La vue TV est toujours forcée en thème clair, quel que soit le réglage
    // mémorisé (fond noir explicitement écarté par l'encadrant pour cet
    // affichage) : le thème sombre reste un choix possible sur les autres
    // vues, mais ne doit jamais s'appliquer à la vue TV, même si l'utilisateur
    // l'a activé précédemment ailleurs dans l'application.
    document.documentElement.setAttribute("data-theme", view === "tv" || view === "category" ? "light" : theme);
    localStorage.setItem("tt-theme", theme);
  }, [theme, view]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  function toggleSidebarCollapsed() {
    setSidebarCollapsed((c) => {
      const next = !c;
      localStorage.setItem("tt-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  const load = useCallback(async (isInitial) => {
    try {
      const [metaRes, dataRes] = await Promise.all([fetchMeta(), fetchData()]);
      setMeta(metaRes);
      setSheets(dataRes.sheets);
      setNoData(false);
      setLastFetched(Date.now());
      setSheetName((prev) => {
        if (prev && dataRes.sheets.some((s) => s.sheetName === prev && s.structured)) return prev;
        return pickDefaultSheet(dataRes.sheets)?.sheetName ?? prev;
      });
      setPhase("ready");
      if (!isInitial) {
        setPulse(true);
        setTimeout(() => setPulse(false), 900);
      }
    } catch (err) {
      if (err.status === 404) {
        // Aucun classeur chargé côté backend pour l'instant : c'est l'état
        // normal d'un premier déploiement, ou tant qu'aucun lien Drive n'a
        // été enregistré dans Paramètres. On affiche un tableau de bord vide
        // plutôt qu'un écran d'erreur qui bloquerait l'accès à Paramètres.
        setMeta(null);
        setSheets([]);
        setNoData(true);
        setLastFetched(Date.now());
        setPhase("ready");
        return;
      }
      if (isInitial) {
        setErrorMsg(err.message);
        setPhase("error");
      }
    }
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const refreshSyncStatus = useCallback(() => {
    fetchSyncStatus().then(setSyncStatus).catch(() => {});
  }, []);

  useEffect(() => {
    refreshSyncStatus();
    const id = setInterval(refreshSyncStatus, SYNC_POLL_MS);
    return () => clearInterval(id);
  }, [refreshSyncStatus]);

  function handlePendingResolved() {
    refreshSyncStatus();
    load(false);
  }

  // Ouvre une version archivée (clic sur un mois dans l'historique) : le
  // tableau de bord se recompose entièrement à partir des données de CE
  // fichier archivé (data/history/<fichier>.xlsx), jamais du fichier live,
  // jusqu'à ce que l'utilisateur clique explicitement sur "Retour au direct".
  async function openArchivedVersion(entry) {
    setArchiveOpeningId(entry.id);
    setArchiveError("");
    try {
      const res = await fetchHistoryEntry(entry.id);
      setArchiveView(res);
      setSelectedCategory(null);
      setView("tv");
      setSidebarOpen(false);
    } catch (err) {
      setArchiveError(err.message || "Impossible de charger cette version archivée.");
    } finally {
      setArchiveOpeningId(null);
    }
  }

  function exitArchive() {
    setArchiveView(null);
    setArchiveError("");
  }

  // Si la version archivée actuellement consultée est supprimée depuis
  // l'Historique, on ne peut plus l'afficher : on repasse au direct.
  function handleHistoryEntryDeleted(id) {
    if (archiveView?.entry?.id === id) exitArchive();
  }

  function handleHistoryAllDeleted() {
    exitArchive();
  }

  if (phase === "loading") return <LoadingScreen />;
  if (phase === "error") return <ErrorState message={errorMsg} onRetry={() => load(true)} />;

  const rawSheet = archiveView ? archiveView.sheet : sheets.find((s) => s.sheetName === sheetName) ?? pickDefaultSheet(sheets);

  // Un classeur chargé mais dans un format non reconnu reste une vraie erreur
  // (rien à afficher, l'utilisateur doit corriger le fichier). L'absence TOTALE
  // de fichier (noData, 404 backend) n'en est PAS une : on retombe sur un
  // classeur vide pour que le tableau de bord s'affiche normalement, à zéro.
  if (!rawSheet && !noData) {
    return (
      <ErrorState
        message="Le classeur ne contient aucune feuille dans un format reconnu."
        onRetry={() => load(true)}
      />
    );
  }

  const emptySheet = {
    sheetName: null,
    structured: false,
    categories: [],
    indicateurs: [],
    scoreGlobal: null,
    nombreIndicateurs: 0,
  };
  const sheet = rawSheet ?? emptySheet;
  const showEmptyState = noData && !archiveView;

  const categories = sheet.categories ?? [];
  const activeCategory = categories.find((c) => c.categorie === selectedCategory) ?? null;

  const totalIndicateurs = sheet.nombreIndicateurs ?? 0;
  const atteints = sheet.indicateurs?.filter((i) => i.status === "atteint").length ?? 0;
  const attention = sheet.indicateurs?.filter((i) => i.status === "attention").length ?? 0;
  const critiques = sheet.indicateurs?.filter((i) => i.status === "critique").length ?? 0;

  function goTV() {
    setView("tv");
    setSelectedCategory(null);
    setSidebarOpen(false);
  }

  function goCategory(cat) {
    setSelectedCategory(cat);
    setView("category");
    setSidebarOpen(false);
  }

  function goSettings() {
    exitArchive();
    setView("settings");
    setSidebarOpen(false);
  }

  function goHistory() {
    setView("history");
    setSidebarOpen(false);
  }

  const isTV = view === "category";

  if (view === "tv") {
    // Le nouveau TVDashboard est un écran autonome (sa propre barre latérale,
    // son propre en-tête/horloge, sa propre mise en page 100dvh) : on ne
    // l'englobe plus dans la coquille Sidebar/TopBar partagée, sinon la
    // navigation et l'en-tête seraient dupliqués à l'écran.
    return (
      <>
        <TVDashboard
          sheet={sheet}
          categories={categories}
          scoreGlobal={sheet.scoreGlobal}
          period={sheet.sheetName}
          onOpenIndicator={setSelectedIndicator}
          onSelectTV={goTV}
          onSelectCategory={goCategory}
          onSelectHistory={goHistory}
          onSelectSettings={goSettings}
        />
        <AnimatePresence>
          {selectedIndicator && (
            <IndicatorHistoryModal
              key={`${selectedIndicator.categorie}-${selectedIndicator.indicateur}`}
              indicator={selectedIndicator}
              currentPeriod={sheet.sheetName}
              onClose={() => setSelectedIndicator(null)}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className={`flex bg-[var(--color-bg)] ${isTV ? "h-screen overflow-hidden" : "min-h-screen"}`}>
      <Sidebar
        categories={categories}
        activeCategory={selectedCategory}
        view={view}
        onSelectCategory={goCategory}
        onSelectTV={goTV}
        onSelectSettings={goSettings}
        onSelectHistory={goHistory}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebarCollapsed}
      />

      <div className={`flex-1 min-w-0 flex flex-col ${isTV ? "h-screen overflow-hidden" : ""}`}>
        <TopBar
          title={
            archiveView
              ? `ARCHIVE — ${archiveView.entry.month.toUpperCase()}`
              : view === "tv"
              ? "CENTRE DE PILOTAGE KPI"
              : view === "category"
              ? (activeCategory ? activeCategory.categorie.toUpperCase() : "DÉTAIL DE L'AXE")
              : view === "settings"
              ? "PARAMÈTRES"
              : "HISTORIQUE"
          }
          subtitle={
            archiveView
              ? `Appliqué le ${formatTimestamp(new Date(archiveView.entry.appliedAt).getTime())} — lecture seule`
              : view === "tv"
              ? "VUE TV - TOUTES LES PERFORMANCES EN UN COUP D'ŒIL"
              : view === "category"
              ? "VUE TV - DÉTAIL DE L'AXE DE PILOTAGE"
              : "Direction Régionale Ben Arous"
          }
          search={search}
          onSearchChange={setSearch}
          lastFetched={lastFetched}
          pulse={pulse}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSidebar={() => setSidebarOpen(true)}
          hideControls={isTV}
        />

        <main
          className={
            isTV
              ? "flex-1 min-h-0 overflow-hidden w-full max-w-[2000px] mx-auto px-4 md:px-6 py-3 flex flex-col gap-3"
              : "flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-7 py-6 flex flex-col gap-5"
          }
        >
          {isTV && archiveView && (
            <div
              className="card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4"
              style={{ borderColor: "var(--color-brand)" }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--color-text)]">
                  Version archivée — {archiveView.entry.month}
                </p>
                <p className="text-[11.5px] text-[var(--color-text-faint)]">
                  Appliqué le {formatTimestamp(new Date(archiveView.entry.appliedAt).getTime())}
                  {archiveView.entry.nombreIndicateurs ? ` · ${archiveView.entry.nombreIndicateurs} indicateurs` : ""}
                  {" · lecture seule, sans impact sur les données en direct"}
                </p>
              </div>
              <button
                type="button"
                onClick={exitArchive}
                className="shrink-0 text-[12px] font-medium px-3.5 py-2 rounded-xl border border-[var(--color-border-soft)] text-[var(--color-text-dim)] hover:text-[var(--color-text)] cursor-pointer transition-colors"
              >
                ← Retour au tableau de bord en direct
              </button>
            </div>
          )}

          {isTV && (
            <PendingBanner pending={archiveView ? null : syncStatus?.pending} onApplied={handlePendingResolved} />
          )}

          {isTV && showEmptyState && (
            <div className="card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--color-text)]">Aucune donnée chargée pour l'instant</p>
                <p className="text-[11.5px] text-[var(--color-text-faint)]">
                  Le tableau de bord est vide car aucun lien Google Drive n'a encore été configuré. Ajoutez le
                  lien du classeur Excel dans Paramètres pour afficher les KPIs.
                </p>
              </div>
              <button
                type="button"
                onClick={goSettings}
                className="shrink-0 text-[12px] font-medium px-3.5 py-2 rounded-xl bg-[var(--color-brand)] text-white cursor-pointer transition-opacity"
              >
                Aller aux Paramètres
              </button>
            </div>
          )}

          {view === "settings" && (
            <>
              <PendingBanner pending={syncStatus?.pending} onApplied={handlePendingResolved} />
              <SettingsPage onSaved={refreshSyncStatus} />
            </>
          )}

          {view === "history" && (
            <>
              {archiveError && (
                <div className="card p-4 text-[12.5px]" style={{ borderColor: "var(--color-crit, #e5484d)", color: "var(--color-crit, #e5484d)" }}>
                  {archiveError}
                </div>
              )}
              <HistoryPage
                onOpenVersion={openArchivedVersion}
                activeVersionId={archiveView?.entry?.id ?? null}
                openingId={archiveOpeningId}
                onEntryDeleted={handleHistoryEntryDeleted}
                onAllDeleted={handleHistoryAllDeleted}
              />
            </>
          )}

          {view === "category" && (
            <AxisDetailView category={activeCategory} onOpenIndicator={setSelectedIndicator} />
          )}
        </main>

        {!isTV && (
          <footer className="border-t border-[var(--color-border-soft)] mt-2">
            <div className="max-w-[1400px] mx-auto px-4 md:px-7 py-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-text-faint)]">
              <span>
                Source : <span className="font-mono text-[var(--color-text-dim)]">{meta?.fileName ?? "kpis.xlsx"}</span>
                {" · "}modifié {formatTimestamp(meta?.lastModified)}
              </span>
              <span>© {new Date().getFullYear()} Tunisie Telecom — Centre de pilotage KPI</span>
            </div>
          </footer>
        )}
      </div>

      <AnimatePresence>
        {selectedIndicator && (
          <IndicatorHistoryModal
            key={`${selectedIndicator.categorie}-${selectedIndicator.indicateur}`}
            indicator={selectedIndicator}
            currentPeriod={sheet.sheetName}
            onClose={() => setSelectedIndicator(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
