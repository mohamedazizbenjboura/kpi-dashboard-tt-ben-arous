import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { fetchData, fetchMeta, fetchSyncStatus, fetchHistoryEntry } from "./lib/api";
import { formatTimestamp, categoryStyle } from "./lib/format";
import { buildInsights, buildAlerts } from "./lib/insights";
import LoadingScreen from "./components/LoadingScreen";
import ErrorState from "./components/ErrorState";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import GlobalDial from "./components/GlobalDial";
import StatCard from "./components/StatCard";
import AxisRings from "./components/AxisRings";
import AxisDonut from "./components/AxisDonut";
import CategoryBreakdown from "./components/CategoryBreakdown";
import CategoryDetail from "./components/CategoryDetail";
import InsightsPanel from "./components/InsightsPanel";
import AlertsPanel from "./components/AlertsPanel";
import IndicatorTable from "./components/IndicatorTable";
import OverviewStats from "./components/OverviewStats";
import SettingsPage from "./components/SettingsPage";
import HistoryPage from "./components/HistoryPage";
import PendingBanner from "./components/PendingBanner";
import {
  IconGauge,
  IconCart,
  IconSignalTower,
  IconCoins,
  IconLayers,
  IconHeart,
} from "./components/icons";

const POLL_MS = 15000;
const SYNC_POLL_MS = 20000;
const CATEGORY_ICON = {
  cart: IconCart,
  tower: IconSignalTower,
  coins: IconCoins,
  layers: IconLayers,
  heart: IconHeart,
  gauge: IconGauge,
};

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
  const [sheetName, setSheetName] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [view, setView] = useState("overview"); // overview | category | settings | history
  const [search, setSearch] = useState("");
  const [syncStatus, setSyncStatus] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [pulse, setPulse] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [archiveView, setArchiveView] = useState(null); // { entry, sheet, fileName, loadedAt } | null
  const [archiveOpeningId, setArchiveOpeningId] = useState(null);
  const [archiveError, setArchiveError] = useState("");
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "dark";
    return localStorage.getItem("tt-theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("tt-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  const load = useCallback(async (isInitial) => {
    try {
      const [metaRes, dataRes] = await Promise.all([fetchMeta(), fetchData()]);
      setMeta(metaRes);
      setSheets(dataRes.sheets);
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
      setView("overview");
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

  if (phase === "loading") return <LoadingScreen />;
  if (phase === "error") return <ErrorState message={errorMsg} onRetry={() => load(true)} />;

  const sheet = archiveView ? archiveView.sheet : sheets.find((s) => s.sheetName === sheetName) ?? pickDefaultSheet(sheets);

  if (!sheet) {
    return (
      <ErrorState
        message="Le classeur ne contient aucune feuille dans un format reconnu."
        onRetry={() => load(true)}
      />
    );
  }

  const categories = sheet.categories ?? [];
  const activeCategory = categories.find((c) => c.categorie === selectedCategory) ?? null;

  const totalIndicateurs = sheet.nombreIndicateurs ?? 0;
  const atteints = sheet.indicateurs?.filter((i) => i.status === "atteint").length ?? 0;
  const attention = sheet.indicateurs?.filter((i) => i.status === "attention").length ?? 0;
  const critiques = sheet.indicateurs?.filter((i) => i.status === "critique").length ?? 0;

  const insights = buildInsights(sheet);
  const alerts = buildAlerts(sheet);

  function goOverview() {
    setView("overview");
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

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      <Sidebar
        categories={categories}
        activeCategory={selectedCategory}
        view={view}
        onSelectCategory={goCategory}
        onSelectOverview={goOverview}
        onSelectSettings={goSettings}
        onSelectHistory={goHistory}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          title={
            archiveView
              ? `ARCHIVE — ${archiveView.entry.month.toUpperCase()}`
              : view === "overview"
              ? "TABLEAU DE BORD KPI"
              : view === "category"
              ? "DÉTAIL DE L'AXE"
              : view === "settings"
              ? "PARAMÈTRES"
              : "HISTORIQUE"
          }
          subtitle={
            archiveView
              ? `Appliqué le ${formatTimestamp(new Date(archiveView.entry.appliedAt).getTime())} — lecture seule`
              : view === "overview"
              ? "Vue d'ensemble de la performance — Direction Régionale Ben Arous"
              : "Direction Régionale Ben Arous"
          }
          search={search}
          onSearchChange={setSearch}
          lastFetched={lastFetched}
          pulse={pulse}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-7 py-6 flex flex-col gap-5">
          {(view === "overview" || view === "category") && archiveView && (
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

          {(view === "overview" || view === "category") && (
            <PendingBanner pending={archiveView ? null : syncStatus?.pending} onApplied={handlePendingResolved} />
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
              />
            </>
          )}

          {(view === "overview" || view === "category") && (
            <>
          {/* Key numbers — the first thing anyone reads in a meeting */}
          <OverviewStats total={totalIndicateurs} atteints={atteints} attention={attention} critiques={critiques} />

          {/* Top score row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
              label="Score global"
              value={(sheet.scoreGlobal ?? 0) * 100}
              icon={IconGauge}
              color="var(--color-brand)"
              delta={(sheet.scoreGlobal ?? 0) - 0.9}
              objective={0.9}
              index={0}
            />
            {categories.map((c, i) => {
              const style = categoryStyle(c.categorie);
              const Ico = CATEGORY_ICON[style.icon] ?? IconGauge;
              return (
                <StatCard
                  key={c.categorie}
                  label={c.categorie}
                  value={(c.tauxMoyenPondere ?? 0) * 100}
                  icon={Ico}
                  color={style.color}
                  delta={(c.tauxMoyenPondere ?? 0) - 0.9}
                  objective={0.9}
                  index={i + 1}
                />
              );
            })}
          </div>

          {view === "overview" ? (
            <>
              {/* Global performance + axis chart + insights/alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_320px] gap-5 items-stretch">
                <div className="card p-6 flex items-center justify-center">
                  <GlobalDial score={sheet.scoreGlobal} period={sheet.sheetName} />
                </div>
                <CategoryBreakdown categories={categories} selected={selectedCategory} onSelect={goCategory} />
                <div className="flex flex-col gap-5">
                  <InsightsPanel items={insights} />
                  <AlertsPanel alerts={alerts} />
                </div>
              </div>

              {/* Axis rings + distribution donut */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
                <AxisRings categories={categories} onSelect={goCategory} selected={selectedCategory} />
                <AxisDonut categories={categories} />
              </div>

              {/* Flat indicator table */}
              <IndicatorTable indicateurs={sheet.indicateurs ?? []} search={search} limit={12} />
            </>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory?.categorie ?? "empty"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <CategoryDetail category={activeCategory} />
              </motion.div>
            </AnimatePresence>
          )}
            </>
          )}
        </main>

        <footer className="border-t border-[var(--color-border-soft)] mt-2">
          <div className="max-w-[1400px] mx-auto px-4 md:px-7 py-5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--color-text-faint)]">
            <span>
              Source : <span className="font-mono text-[var(--color-text-dim)]">{meta?.fileName ?? "kpis.xlsx"}</span>
              {" · "}modifié {formatTimestamp(meta?.lastModified)}
            </span>
            <span>© {new Date().getFullYear()} Tunisie Telecom — Centre de pilotage KPI</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
