import { motion } from "motion/react";
import logo from "../assets/tt-logo.png";
import { titleCase, categoryStyle } from "../lib/format";
import {
  IconTv,
  IconGauge,
  IconCart,
  IconSignalTower,
  IconCoins,
  IconLayers,
  IconHeart,
  IconSettings,
  IconHistory,
  IconMenu,
} from "./icons";

const CATEGORY_ICON = {
  cart: IconCart,
  tower: IconSignalTower,
  coins: IconCoins,
  layers: IconLayers,
  heart: IconHeart,
  gauge: IconGauge,
};

export default function Sidebar({
  categories,
  activeCategory,
  onSelectCategory,
  onSelectTV,
  onSelectSettings,
  onSelectHistory,
  view,
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
}) {
  return (
    <>
      {open && (
        <button
          aria-label="Fermer le menu"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}
      <aside
        className={`sidebar-shell ${collapsed ? "is-collapsed" : ""} fixed lg:sticky top-0 z-40 h-screen shrink-0 flex flex-col border-r border-[var(--color-border-soft)] bg-[var(--color-sidebar)] duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand + collapse toggle */}
        <div className={`flex flex-col items-center gap-2.5 pt-6 pb-5 ${collapsed ? "px-2" : "px-5"}`}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={collapsed ? "Déplier le menu" : "Replier le menu"}
            aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
            className="hidden lg:flex self-end h-8 w-8 rounded-lg items-center justify-center text-[var(--color-text-faint)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer sidebar-toggle"
          >
            <IconMenu size={17} />
          </button>
          <img src={logo} alt="Tunisie Telecom" className={`w-auto shrink-0 transition-all duration-300 ${collapsed ? "h-11" : "h-24"}`} />
          <span className="sidebar-label tick text-[10.5px] text-[var(--color-text-faint)] text-center">
            Centre de pilotage KPI
          </span>
        </div>

        <div className="h-px mx-5 bg-[var(--color-border-soft)]" />

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 flex flex-col gap-5">
          <div>
            <div className="sidebar-section-title tick text-[10px] text-[var(--color-text-faint)] px-3 mb-2">
              Menu principal
            </div>
            <NavItem icon={IconTv} label="Vue TV (tout-en-un)" active={view === "tv"} onClick={onSelectTV} collapsed={collapsed} />
          </div>

          <div>
            <div className="sidebar-section-title tick text-[10px] text-[var(--color-text-faint)] px-3 mb-2">
              Axes de pilotage
            </div>
            <div className="flex flex-col gap-0.5">
              {categories.map((c) => {
                const style = categoryStyle(c.categorie);
                const Ico = CATEGORY_ICON[style.icon] ?? IconGauge;
                const active = view === "category" && activeCategory === c.categorie;
                return (
                  <NavItem
                    key={c.categorie}
                    icon={Ico}
                    label={titleCase(c.categorie)}
                    active={active}
                    color={style.color}
                    onClick={() => onSelectCategory(c.categorie)}
                    collapsed={collapsed}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <div className="sidebar-section-title tick text-[10px] text-[var(--color-text-faint)] px-3 mb-2">
              Données
            </div>
            <div className="flex flex-col gap-0.5">
              <NavItem icon={IconHistory} label="Historique" active={view === "history"} onClick={onSelectHistory} collapsed={collapsed} />
              <NavItem icon={IconSettings} label="Paramètres" active={view === "settings"} onClick={onSelectSettings} collapsed={collapsed} />
            </div>
          </div>
        </nav>

        <div className="mt-auto px-5 py-5 border-t border-[var(--color-border-soft)]">
          <p className="sidebar-label text-[10.5px] leading-relaxed text-[var(--color-text-faint)]">
            Direction Régionale
            <br />
            Ben Arous
          </p>
        </div>
      </aside>
    </>
  );
}

function NavItem({ icon: Ico, label, active, muted, color, onClick, collapsed }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12.5px] font-medium transition-colors cursor-pointer text-left
        ${collapsed ? "justify-center" : ""}
        ${active ? "bg-[var(--color-surface-3)] text-[var(--color-text)]" : "text-[var(--color-text-dim)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"}
        ${muted ? "opacity-60" : ""}`}
    >
      <span
        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: active ? (color ?? "var(--color-brand)") + "22" : "transparent",
          color: active ? color ?? "var(--color-brand-soft)" : "currentColor",
        }}
      >
        <Ico size={16} />
      </span>
      <span className="sidebar-label truncate">{label}</span>
    </motion.button>
  );
}
