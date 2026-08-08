import { useEffect, useState } from "react";
import { formatTimestamp, relativeTime } from "../lib/format";
import { IconSearch, IconSun, IconMoon } from "./icons";

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const date = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className="hidden sm:flex flex-col items-end leading-tight pl-2">
      <span className="font-mono text-[15px] font-semibold text-[var(--color-text)] tabular-nums">{time}</span>
      <span className="text-[10.5px] text-[var(--color-text-faint)] capitalize">{date}</span>
    </div>
  );
}

export default function TopBar({
  title,
  subtitle,
  search,
  onSearchChange,
  lastFetched,
  pulse,
  theme,
  onToggleTheme,
  onOpenSidebar,
  hideControls = false,
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border-soft)] bg-[var(--color-bg)]/85 backdrop-blur-md">
      <div className="px-4 md:px-7 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden h-9 w-9 rounded-lg border border-[var(--color-border-soft)] flex items-center justify-center text-[var(--color-text-dim)] shrink-0"
            aria-label="Ouvrir le menu"
          >
            ☰
          </button>
          <div className="min-w-0">
            <h1 className="text-[19px] md:text-[21px] font-bold tracking-tight text-[var(--color-text)] truncate" style={{ fontFamily: "var(--font-display)" }}>
              {title}
            </h1>
            <p className="text-[12px] text-[var(--color-text-faint)] truncate">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 md:gap-3 flex-wrap">
          {!hideControls && (
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2 w-64">
              <IconSearch size={15} className="text-[var(--color-text-faint)] shrink-0" />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Rechercher un KPI, indicateur…"
                className="bg-transparent outline-none text-[12.5px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] w-full"
              />
            </div>
          )}

          {!hideControls && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="h-9 w-9 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-dim)] hover:text-[var(--color-text)] hover:border-[var(--color-border)] transition-colors cursor-pointer"
              title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              aria-label="Changer de thème"
            >
              {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
            </button>
          )}

          {hideControls && <LiveClock />}

          <div className="hidden lg:flex flex-col items-end leading-tight pl-2">
            <span className="flex items-center gap-1.5 text-[10.5px] text-[var(--color-text-faint)]">
              <span
                className={`h-1.5 w-1.5 rounded-full bg-[var(--color-good)] ${pulse ? "" : "pulse-dot"}`}
                style={pulse ? { boxShadow: "0 0 6px var(--color-good)" } : undefined}
              />
              En ligne
            </span>
            <span className="text-[10.5px] text-[var(--color-text-faint)]" title={formatTimestamp(lastFetched)}>
              Actualisé {relativeTime(lastFetched)}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
