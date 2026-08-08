// Hand-drawn inline icon set — no external icon library dependency.
// Every icon is a plain stroked SVG so it inherits `color` from its wrapper.

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Icon({ children, size = 18, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      {children}
    </svg>
  );
}

export const IconDashboard = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7.5" height="9" rx="1.6" />
    <rect x="13" y="3.5" width="7.5" height="5.5" rx="1.6" />
    <rect x="13" y="11" width="7.5" height="9.5" rx="1.6" />
    <rect x="3.5" y="14.5" width="7.5" height="6" rx="1.6" />
  </Icon>
);

export const IconGauge = (p) => (
  <Icon {...p}>
    <path d="M4 15a8 8 0 1 1 16 0" />
    <path d="M12 15l4-5.2" />
    <path d="M12 15h.01" />
  </Icon>
);

export const IconCart = (p) => (
  <Icon {...p}>
    <circle cx="9.5" cy="19.5" r="1.4" />
    <circle cx="17.5" cy="19.5" r="1.4" />
    <path d="M2.5 3h2.4l2.1 11.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L20.8 7H6" />
  </Icon>
);

export const IconSignalTower = (p) => (
  <Icon {...p}>
    <path d="M12 22V10" />
    <path d="M8.5 22h7" />
    <path d="M12 2l3.5 8h-7z" />
    <path d="M5 8a10 10 0 0 1 0-.1" />
    <path d="M4.2 10.5A8 8 0 0 1 3 6.2" />
    <path d="M19.8 10.5A8 8 0 0 0 21 6.2" />
  </Icon>
);

export const IconCoins = (p) => (
  <Icon {...p}>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v5c0 1.66 2.69 3 6 3s6-1.34 6-3V7" />
    <path d="M3 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" />
    <path d="M15 9.3c2.9.3 5 1.5 5 2.9s-2.1 2.6-5 2.9" />
    <path d="M15 14.3c2.9.3 5 1.5 5 2.9s-2.1 2.6-5 2.9" />
  </Icon>
);

export const IconHeart = (p) => (
  <Icon {...p}>
    <path d="M12 20s-7.5-4.6-9.7-9.1C.7 7.4 2.2 4 5.6 3.4 8 3 10.3 4.2 12 6.5 13.7 4.2 16 3 18.4 3.4c3.4.6 4.9 4 3.3 7.5C19.5 15.4 12 20 12 20z" />
  </Icon>
);

export const IconMap = (p) => (
  <Icon {...p}>
    <path d="M9 4.8 3.5 6.7v12.5L9 17.3l6 2.9 5.5-1.9V5.8L15 7.7" />
    <path d="M9 4.8v12.5" />
    <path d="M15 7.7v12.9" />
  </Icon>
);

export const IconChart = (p) => (
  <Icon {...p}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M20 20V8" />
    <path d="M2 20h20" />
  </Icon>
);

export const IconBell = (p) => (
  <Icon {...p}>
    <path d="M18 8a6 6 0 1 0-12 0c0 6.5-2.5 8-2.5 8h17S18 14.5 18 8" />
    <path d="M10.3 20a1.9 1.9 0 0 0 3.4 0" />
  </Icon>
);

export const IconSearch = (p) => (
  <Icon {...p}>
    <circle cx="10.8" cy="10.8" r="6.8" />
    <path d="m20 20-4.4-4.4" />
  </Icon>
);

export const IconRefresh = (p) => (
  <Icon {...p}>
    <path d="M3.5 12a8.5 8.5 0 0 1 14.6-5.9L20.5 8.5" />
    <path d="M20.5 5v3.5H17" />
    <path d="M20.5 12a8.5 8.5 0 0 1-14.6 5.9L3.5 15.5" />
    <path d="M3.5 19v-3.5H7" />
  </Icon>
);

export const IconUpload = (p) => (
  <Icon {...p}>
    <path d="M12 16V4" />
    <path d="m6.5 9.5 5.5-5.5 5.5 5.5" />
    <path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
  </Icon>
);

export const IconSparkle = (p) => (
  <Icon {...p}>
    <path d="M12 3.5 13.6 9l5.4 1.5-5.4 1.5L12 17.5 10.4 12 5 10.5 10.4 9z" />
    <path d="M19 3v3" />
    <path d="M17.5 4.5h3" />
  </Icon>
);

export const IconAlertTriangle = (p) => (
  <Icon {...p}>
    <path d="M10.6 3.9 2.4 18.2A1.6 1.6 0 0 0 3.8 20.6h16.4a1.6 1.6 0 0 0 1.4-2.4L13.4 3.9a1.6 1.6 0 0 0-2.8 0z" />
    <path d="M12 9.5v4.2" />
    <path d="M12 17h.01" />
  </Icon>
);

export const IconCheckCircle = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </Icon>
);

export const IconTrendUp = (p) => (
  <Icon {...p}>
    <path d="m3 16 6-6 4 4 8-9" />
    <path d="M15 5h6v6" />
  </Icon>
);

export const IconTrendDown = (p) => (
  <Icon {...p}>
    <path d="m3 8 6 6 4-4 8 9" />
    <path d="M15 19h6v-6" />
  </Icon>
);

export const IconLayers = (p) => (
  <Icon {...p}>
    <path d="m12 3 9 4.7-9 4.7-9-4.7z" />
    <path d="m3 12.3 9 4.7 9-4.7" />
    <path d="m3 16.6 9 4.7 9-4.7" />
  </Icon>
);

export const IconWifi = (p) => (
  <Icon {...p}>
    <path d="M2.5 9.5a15 15 0 0 1 19 0" />
    <path d="M6 13.2a10 10 0 0 1 12 0" />
    <path d="M9.5 16.8a5 5 0 0 1 5 0" />
    <path d="M12 20h.01" />
  </Icon>
);

export const IconShield = (p) => (
  <Icon {...p}>
    <path d="M12 3 4.5 5.5v6c0 5 3.3 8.2 7.5 9.5 4.2-1.3 7.5-4.5 7.5-9.5v-6z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </Icon>
);

export const IconClock = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const IconChevronRight = (p) => (
  <Icon {...p}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
);

export const IconSun = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </Icon>
);

export const IconMoon = (p) => (
  <Icon {...p}>
    <path d="M20.5 14.8A8.5 8.5 0 1 1 9.7 4a7 7 0 0 0 10.8 10.8z" />
  </Icon>
);

export const IconMaximize = (p) => (
  <Icon {...p}>
    <path d="M9 3.5H4.5V8" />
    <path d="M15 3.5h4.5V8" />
    <path d="M9 20.5H4.5V16" />
    <path d="M15 20.5h4.5V16" />
  </Icon>
);

export const IconUser = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8.2" r="3.7" />
    <path d="M4.5 20c1.4-3.8 4.3-5.8 7.5-5.8s6.1 2 7.5 5.8" />
  </Icon>
);

export const IconLogout = (p) => (
  <Icon {...p}>
    <path d="M9 3.5H6a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h3" />
    <path d="M16 16.5 21 12l-5-4.5" />
    <path d="M21 12H9" />
  </Icon>
);

export const IconBuilding = (p) => (
  <Icon {...p}>
    <rect x="4" y="3" width="11" height="18" rx="1" />
    <path d="M15 8h5v13h-5" />
    <path d="M7.5 7h1M11 7h1M7.5 11h1M11 11h1M7.5 15h1M11 15h1" />
  </Icon>
);

export const IconLightbulb = (p) => (
  <Icon {...p}>
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
  </Icon>
);

export const IconSettings = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10.5a1.7 1.7 0 0 0 1-1.55V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10.5a1.7 1.7 0 0 0 1.55 1H19.5a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1z" />
  </Icon>
);

export const IconHistory = (p) => (
  <Icon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <path d="M3 4v4.5h4.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const IconCloudLink = (p) => (
  <Icon {...p}>
    <path d="M7 18a4.5 4.5 0 0 1-.5-8.97A5.5 5.5 0 0 1 17.2 9.5 4 4 0 0 1 17 18H7z" />
    <path d="m10.5 14.5 3-3" />
    <path d="M13.5 11.5h1.3a1.7 1.7 0 0 1 0 3.4" />
    <path d="M10.5 14.5H9.2a1.7 1.7 0 1 1 0-3.4" />
  </Icon>
);

export const IconX = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconLock = (p) => (
  <Icon {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="1.8" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <path d="M12 14.3v2.4" />
  </Icon>
);

export const IconTrash = (p) => (
  <Icon {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V4.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3V7" />
    <path d="M6.5 7l.7 12a1.8 1.8 0 0 0 1.8 1.7h6a1.8 1.8 0 0 0 1.8-1.7L18.5 7" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </Icon>
);

export const IconTv = (p) => (
  <Icon {...p}>
    <rect x="2.5" y="5" width="19" height="13" rx="2" />
    <path d="M8 21h8" />
    <path d="M12 18v3" />
  </Icon>
);

export const IconMenu = (p) => (
  <Icon {...p}>
    <path d="M3.5 6.5h17" />
    <path d="M3.5 12h17" />
    <path d="M3.5 17.5h17" />
  </Icon>
);

export const IconCalendar = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.2" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
    <path d="M3.5 10h17" />
  </Icon>
);

export const IconDownload = (p) => (
  <Icon {...p}>
    <path d="M12 3.5v11" />
    <path d="m6.5 10 5.5 5.5 5.5-5.5" />
    <path d="M4 16.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2.5" />
  </Icon>
);
