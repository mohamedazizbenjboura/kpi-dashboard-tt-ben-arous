# Tunisie Telecom — KPI Dashboard (DRT Ben Arous)

> Living reference doc. Read this before touching the code — it captures not just
> what the project does, but **exactly how the parser, sync, and archive logic
> behave**, including a full audit on 2026-08-06 and a follow-up verification +
> fix pass the same day (both summarized below). Everything marked ✅ below has
> been re-verified live: real files re-parsed, stress tests re-run, and the
> running app clicked through in an actual browser.

---

## 1. What this project is

A stagiaire (Aziz) project (`Sujet de stage 1.docx`) for Tunisie Telecom, Direction
Régionale Ben Arous. The brief, verbatim intent:

- The company tracks commercial/technical/financial KPIs in an **Excel file whose
  structure is not fixed** — indicators, objectives, and their count can change
  from one period to the next.
- Deliverable: a **self-adapting web app** that reads that Excel file automatically,
  computes scores, and renders interactive dashboards — accessible from any device
  via a plain browser link, no install.
- Explicit requirement: **architecture must allow adding/removing/modifying
  indicators without major code changes.**
- Explicit requirement (added 2026-08-06): the same month's data can be updated
  **multiple times** (week to week, even day to day) via the linked Google Drive
  file — every applied version must be kept, distinguishable, and browsable, and
  the chart of score-over-time must be plotted against the **real period the data
  covers** (read from the sheet), not the date it happened to be uploaded/applied.

This "must handle any Excel file" requirement is the whole reason `parser.js` is
written as keyword-matching / structural-detection rather than fixed column
indices. Keep that in mind when evaluating whether something is "flexible enough."

---

## 2. Repo layout

```
C:\Users\aziz\telecom\
├── Sujet de stage 1.docx              # Internship brief (source of requirements)
├── KPIS-drt-b-arous-Juillet (1).xlsx  # Local sample source file (sheet: mai26) — NOT live source
├── KPIS-drt-b-arous-Juillet26.xlsx    # Local sample source file (sheet: juillet26) — NOT live source
├── images.png                         # TT logo asset source
├── _extract.py, _extracted_*.txt      # One-off extraction scripts/dumps used during dev, not part of the app
├── test_xlsx.js, _inspect_*.js, _fix_socre.js, _gen_juillet.js, *.log  # Throwaway dev/debug scripts in the telecom root — not imported by the app
├── _tools/                            # Standalone logo-cleanup scripts (clean_logo.js, extract_mark.js) + preview PNGs — unrelated to runtime app
└── kpi-dashboard/                     # THE ACTUAL APPLICATION
    ├── PROJET-RESUME.md               # Original French project summary (partially OUTDATED — see §7)
    ├── README.md                      # This file
    ├── backend/
    │   ├── server.js                  # Express API (see §4)
    │   ├── parser.js                  # Dynamic Excel parser — the core logic (see §5)
    │   ├── sync.js                    # Google Drive polling / pending / apply / history / period resolution (see §6)
    │   ├── store.js                   # JSON persistence for settings.json + history.json
    │   ├── driveSync.js               # Google Sheets/Drive downloader — native xlsx export first, cookie-following fallback (see §6.4)
    │   ├── package.json               # express, cors, xlsx
    │   ├── _full_audit.js, _stress_test.js  # Diagnostic scripts (see §9) — safe to delete, not used by the app
    │   └── *.log, pid.txt             # Runtime logs from whatever process manager is used to keep the server alive (see §12)
    ├── frontend/
    │   ├── src/
    │   │   ├── App.jsx                # Top-level state, sheet selection, view routing, archive-view mode
    │   │   ├── lib/
    │   │   │   ├── api.js             # fetch wrappers for every backend route, incl. fetchHistoryEntry()
    │   │   │   ├── format.js          # pct/num formatters, status→color/label, category→color/icon mapping
    │   │   │   └── insights.js        # Pure functions: buildInsights() / buildAlerts() from parsed sheet data
    │   │   └── components/            # ~20 presentational components (see §8), incl. HistoryPage.jsx (see §6)
    │   └── package.json               # React 19, Vite 8, Tailwind v4, motion (Framer Motion), recharts
    └── data/
        ├── kpis.xlsx                  # THE LIVE FILE — this is what the API actually reads on every request
        ├── settings.json              # Google Drive link, fileId, poll interval, hashes, last error
        ├── history.json               # Array of applied-version metadata: real period (month), applied timestamp, score, sheet, id
        ├── history/                   # Archived .xlsx copies, one per applied sync (kpis_YYYY-MM_<timestamp>.xlsx) — full data, not just the summary
        ├── pending.xlsx               # Present only when a new Drive version has been detected but not yet applied
        └── uploads/                   # Empty — leftover dir from a deprecated manual-upload feature (see §7)
```

---

## 3. How data actually gets into the app (IMPORTANT — read before assuming "upload")

There is **no file-upload button in the running app**. `UploadButton.jsx` was
deprecated (renamed to `_deprecated_UploadButton.jsx.bak`) and `server.js` has
**no `/api/upload` route**, despite `PROJET-RESUME.md` still describing one.

The real, current mechanism is **Google Drive link sync**, confirmed live in the
Paramètres page:

1. User pastes a Google Drive share link (Anyone-with-the-link) for the Excel/
   Google Sheet into **Paramètres → Source Google Drive → Lien du fichier Excel**,
   clicks **Enregistrer le lien**. This calls `POST /api/settings`, which extracts
   the Drive file ID (`driveSync.js: extractFileId`) and stores it in
   `data/settings.json`.
2. Every `pollIntervalMs` (default 60 000 ms) — or on-demand via **Vérifier
   maintenant** (`POST /api/sync/check-now`) — the backend downloads the file from
   Drive, SHA-256 hashes it, and compares to the currently-live hash. ✅ Live
   Google Sheet export path confirmed working 2026-08-06 (see §6.4);
   `lastError: null` on a real check-now call.
3. If different: the new file is saved as `data/pending.xlsx` and a **"Nouvelle
   version détectée"** banner (`PendingBanner.jsx`) appears in the UI (polled every
   20 s via `/api/sync/status`).
4. Nothing changes on screen until the user clicks **Appliquer**
   (`POST /api/sync/apply`), which:
   - archives the *current* `data/kpis.xlsx` into `data/history/kpis_<YYYY-MM>_<timestamp>.xlsx`,
   - promotes `pending.xlsx` → `data/kpis.xlsx`,
   - appends an entry to `data/history.json` with the **real period** resolved
     from the archived sheet's name (`month`, e.g. `"Mai 2026"`) *and*, separately,
     the exact **application timestamp** (`appliedAt`) — see §6 for full detail.
5. `GET /api/data` and friends re-read `data/kpis.xlsx` from disk on **every
   request** (`server.js: getFreshData()`) — no server restart needed, no caching.

**"Ignorer" (`POST /api/sync/dismiss`)** clears the pending file and records its
hash as `dismissedHash` so the same version won't be re-flagged as pending on the
next poll.

**Multiple applies within the same real-world month are fully supported and kept
distinct.** Confirmed live in `data/history.json`: four separate applies on
2026-08-06 (10:54, 10:56, 10:56, 10:58) against a `mai26` sheet all produced four
separate history entries — `"month": "Mai 2026"` each time, but four different
`appliedAt` timestamps and four slightly different `scoreGlobal` values
(90.26% / 90.29% / 90.31% / 90.29%) reflecting real edits made to the source sheet
between applies. Nothing is deduplicated or collapsed by month.

---

## 4. Backend API (`server.js`, port 4000 by default)

| Method | Route | Behavior |
|---|---|---|
| GET | `/api/health` | `{ ok, fileExists, lastModified }` for `data/kpis.xlsx` |
| GET | `/api/meta` | Per-sheet summary: name, structured?, indicator count, global score |
| GET | `/api/data` | Full parsed workbook (all sheets) — re-parsed from disk every call |
| GET | `/api/data/:sheet` | One sheet by exact name |
| GET | `/api/settings` | `{ driveLink, pollIntervalMs }` |
| POST | `/api/settings` | Body `{ driveLink }` — validates it resolves to a Drive file ID |
| GET | `/api/sync/status` | `{ driveLink, lastCheckedAt, lastError, checking, pending, live }` |
| POST | `/api/sync/check-now` | Force an immediate Drive check |
| POST | `/api/sync/apply` | Promote pending → live, archive old version, write history entry (see §3 step 4, §6) |
| POST | `/api/sync/dismiss` | Discard the currently pending version |
| GET | `/api/history` | Array of applied-version records: `{ id, appliedAt, month, fileName, scoreGlobal, sheetName, nombreIndicateurs }` |
| GET | `/api/history/:id/data` | ✅ Full parsed dashboard data for **one specific archived version** — reads from `data/history/<fileName>`, never touches the live file. Returns `{ entry, sheet, fileName, loadedAt }`. This is what powers "click a month in Historique → see that month's dashboard." |
| * | (static) | Serves `frontend/dist` if it exists, SPA-fallback to `index.html` for non-`/api` routes |

No auth on any route. No rate limiting. CORS is wide open (`app.use(cors())` with
no options).

---

## 5. `parser.js` — exact behavior (read this before assuming it "just works")

### 5.1 Header detection (`findHeaderRow`)
Scans **only the first 10 rows** of a sheet. A row qualifies as the header iff it
contains a cell that normalizes to exactly `"poids"` **and** a cell that
normalizes to exactly `"score"`. First such row wins. If none found in the first
10 rows → sheet is `structured: false` and silently excluded from the dashboard
(no error shown to the user beyond it not appearing).

`normalize()` = NFD-decompose, strip accents, lowercase, trim. So "Poids",
"POIDS", "Poidss" (no), "Poids " all match "poids"; accents are ignored.

### 5.2 Column detection (`detectColumns` + `METRIC_MATCHERS`)
Every header cell is tested against these matchers, **in this exact order**, first
match per key wins:

| key | match rule |
|---|---|
| `poids` | cell normalizes to exactly `"poids"` |
| `objectifAnnuel` | contains `"objectif"`, does NOT contain `"ytd"`, and contains either a 4-digit year (any year, via regex — not a hardcoded list) or the word `"annuel"` |
| `objectifYTD` | contains `"objectif"` **and** `"ytd"` |
| `realisationYTD` | contains `"realisation"` **and NOT** `"taux"` |
| `tauxRealisation` | contains `"taux"` |
| `score` | exactly `"score"`, OR contains `"score"` and NOT `"region"` and NOT `"global"` |

✅ **FIXED 2026-08-06 (was a confirmed bug):** `objectifAnnuel` used to hardcode
the years 2024/2025/2026, so a header like `"OBJECTIF 2027"` was silently dropped
(the whole column came back `null` with no error). It's now a general 4-digit-year
regex (`/\d{4}/`) — any future year works with zero code changes. Re-verified with
a synthetic `"OBJECTIF 2027"` header: column is now detected correctly and
populates every indicator's `objectifAnnuel`.

⚠️ Note while fixing this: the naive first attempt (`"objectif" && !"ytd"`, no
year requirement at all) **broke real-file parsing** — `mai26`'s row-1 cell
`"Objectifs"` (a plain section label, no year, sitting directly above the
hierarchy columns) matched, was misidentified as the annual-objective *column*,
and zeroed out `hierarchyCols` (structured → false). The final fix keeps a
year-or-"annuel" requirement specifically to avoid this false positive. Re-tested
against the real `mai26`/`juillet26` sheets after the fix: both parse identically
to before (25 indicators, same scores).

**Hierarchy columns** = every column index strictly before the lowest-indexed
detected metric column. So hierarchy depth is implicit and determined entirely by
where the first recognized metric column sits — reordering metric columns
earlier in the sheet shrinks (or can zero out) the hierarchy column set.
Confirmed via stress test: putting `score` as the first column (before the
hierarchy text columns) makes `hierarchyCols` empty → sheet becomes
`structured: false`.

If `poids` or `score` columns aren't found, or `hierarchyCols.length === 0`, the
whole sheet is discarded as unstructured (confirmed via "missing score column"
stress test).

### 5.3 Row walking / hierarchy reconstruction
- Merged cells: handled via **forward-fill** (`lastFill`) — a hierarchy cell that's
  blank inherits the last non-blank value seen in that column, mimicking Excel's
  merged-cell visual behavior.
- A row is treated as genuinely empty (skipped) only if its **raw** (pre-forward-fill)
  hierarchy cells are all blank **and** `poids` and `score` are both null — this
  correctly avoids the trap of a truly-blank row appearing "filled" just because of
  forward-fill.
- **Global score row detection is NOT text-based.** It does not look for the string
  "Score Région" — it flags a row as the sheet's summary row purely by signal:
  `poids === null && objectifAnnuel === null && objectifYTD === null &&
  realisationYTD === null && tauxRealisation === null && score !== null`. This is
  intentionally robust to typos (the original "Socre Région" typo — see §7 —
  never actually broke detection because of this).
- Category = first hierarchy column value (forward-filled). Indicator name =
  **last** hierarchy column value if `hierarchyDepth > 2`, else the sub-category
  value. Sub-category:
  - `hierarchyDepth <= 2`: unchanged historical behavior — second column value
    (or category, if blank).
  - `hierarchyDepth >= 3`: ✅ **FIXED 2026-08-06 (was a confirmed bug)** — ALL
    intermediate levels (index 1 .. length-2) are now joined with `" › "` into
    the sub-category label, instead of only ever keeping index 1 and silently
    dropping anything deeper. Previously, a 4-level hierarchy (Pôle → Catégorie
    → Sous-catégorie → Indicateur) produced `sousCategorie: "commercial"` for
    an indicator whose real sub-category was `"PARC Mobile"` — that level just
    vanished. Re-tested: a synthetic 4-level sheet now correctly produces
    `sousCategorie: "commercial › PARC Mobile"`. 3-level hierarchies (the
    current real files) are unaffected — verified identical output before/after.
- Numbers parsed via `toNumber()`. ✅ **FIXED 2026-08-06 (was a confirmed bug):**
  a value stored as literal text with a trailing `%` (e.g. `"50%"`) used to parse
  to `50`, not `0.5` — 100x too large, which would have silently corrupted every
  downstream weighted sum, status threshold, and chart percentage if a future
  source file ever exported that way. `toNumber()` now detects a trailing `%` on
  string values and divides by 100. Re-tested with a synthetic `"50%"` / `"94%"`
  weight+taux pair: now correctly parses to `0.5` / `0.94`. Numeric percent-
  formatted Excel cells (the normal case — `sheet_to_json({raw:true})` reads the
  underlying fraction, not the display string) are unaffected either way.

### 5.4 Status thresholds (`statusFromTaux`)
```
taux === null      → "inconnu"
taux >= 0.9         → "atteint"
0.7 <= taux < 0.9    → "attention"
taux < 0.7           → "critique"
```
Same thresholds are duplicated independently in `GlobalDial.jsx`
(`scoreToStatus`) for the overall score ring — if you ever change one, change
both.

### 5.5 Category rollups
Per category: `poidsTotal` = sum of indicator `poids`; `scoreTotal` = sum of
indicator `score`; `tauxMoyenPondere` = `scoreTotal / poidsTotal` (null if
`poidsTotal` is 0). Sheet-level `scoreGlobal` = the detected global-score row's
value **if present**, else falls back to the sum of all indicator scores.

### 5.6 Verified against real files (2026-08-06, re-verified after all fixes above)

| File | Sheets | Structured? | Indicators | Score global |
|---|---|---|---|---|
| `KPIS-drt-b-arous-Juillet (1).xlsx` | Sheet1, mai26 | Sheet1: no · mai26: yes | 25 | 0.9029 |
| `KPIS-drt-b-arous-Juillet26.xlsx` | juillet26 | yes | 25 | 0.9915 |
| `data/kpis.xlsx` (live) | Sheet1, mai26 | Sheet1: no · mai26: yes | 25 | 0.9029 |

Identical to the pre-fix numbers — the parser fixes only change behavior for
patterns not present in the current real files (future years, 4+ level
hierarchies, text-percent weights), confirming zero regression.

`Sheet1` in both source files is unstructured leftover data (no header row with
both "poids" and "score") — correctly ignored by the parser, correctly absent
from the UI.

Both real files independently show **total category weight ≈ 0.99, not 1.00** —
this is a rounding artifact in the *source* Excel data itself, not a parser bug;
the parser sums exactly what's there.

Both files also have a few indicators with `poids: 0` and fully-null metrics
(e.g. "TRD", "tx de fiabilité", "vente cables") — these render with status
`"inconnu"` / label "Non suivi" in the UI, which is handled gracefully
(`statusMeta` default case), not a crash risk.

### 5.7 Full stress-test matrix (`_stress_test.js`, re-run 2026-08-06 after fixes)

| Scenario | Result |
|---|---|
| Future year column `"OBJECTIF 2027"` | ✅ Detected, populates every indicator |
| Brand-new axis `"Digital"` added | ✅ New category appears, generic icon/color fallback, correctly rolled up into `scoreGlobal` |
| Columns reordered (score before poids) | ✅ Still detected correctly by keyword, regardless of position |
| 4-level hierarchy | ✅ Middle level preserved in `sousCategorie` (e.g. `"commercial › PARC Mobile"`) |
| Missing `score` column entirely | ✅ Correctly falls back to `structured: false` (no crash, no garbage data) |
| Extra unrelated column after metrics (e.g. `"Commentaire"`) | ✅ Ignored, no effect on parsing |
| Header row shifted down (junk rows above) | ✅ Found within the 10-row scan window |
| Header row beyond the 10-row scan limit | ✅ Correctly falls back to `structured: false` (documented limit, not a bug — see §11) |
| Weight/taux as literal percent text (`"50%"`) | ✅ Now parses to `0.5`, not `50` |

---

## 6. Archive / Historique — how the month is derived, and how "click a month → see that month" works

This section covers the exact behavior requested and verified 2026-08-06: the
score-evolution chart and the archive list must plot/label each version by the
**real period the data covers** (read from the sheet), never by the date it was
uploaded — while still showing the upload date separately — and clicking any
archived entry must load that exact version's full dashboard, read-only.

### 6.1 Two separate concepts, never conflated
Every entry in `data/history.json` carries **both**, independently:
- **`month`** — the real period the KPI data covers (e.g. `"Mai 2026"`), resolved
  from the **source sheet's name**, not from any date on disk.
- **`appliedAt`** — the exact timestamp the version was applied/synced (e.g.
  `2026-08-06T09:58:30.354Z`, displayed as `"Appliqué le 06/08/2026 10:58"`).

These can legitimately diverge — a May sheet applied in August is expected and
correctly shown as `month: "Mai 2026"`, `appliedAt: 6 August`. That is the whole
point of the fix.

### 6.2 Month resolution (`sync.js: periodFromSheetName` / `resolvePeriodLabel`)
- `periodFromSheetName(sheetName, fallbackDate)` normalizes the sheet name
  (accent/case-insensitive) and looks for a French month token — first anchored
  at the start of the string (covers `"mai26"`, `"juillet26"`), then anywhere in
  the string (covers a prefixed name like `"kpis_mai_2026"`). Longer tokens are
  matched before shorter ones (`"juillet"` before `"juil"`/`"juin"`) to avoid
  false partial matches. The year is read from 2–4 digits immediately following
  the month token; if absent, falls back to the year of `appliedAt`.
- `resolvePeriodLabel(sheetName, appliedDate)` = `periodFromSheetName(...)` if a
  month was recognized, else falls back to the month of `appliedDate` (safety net
  only — never triggers for sheet names like `"mai26"`/`"juillet26"`).
- Applied in `sync.js: applyPending()` at the moment a version is archived: the
  archived file is re-parsed, its best sheet's name is passed through
  `resolvePeriodLabel`, and the result becomes the history entry's `month` —
  computed **once, at apply time**, and stored — not recomputed on every read.

### 6.3 Verified live (2026-08-06, browser + API, after server restart with the current build)
- `GET /api/history` returns, for the 5 real applied versions on this machine:
  `"Mai 2026"` (×4, at 10:58/10:56/10:56/10:54) and `"Juillet 2026"` (×1, at
  10:49) — **not** `"Août 2026"` for any of them, despite all 5 being applied in
  August.
- Opened the running app in an actual browser (not just curl/API calls) and
  clicked into Historique: the score-evolution chart's x-axis reads **Juillet
  2026 → Mai 2026 → Mai 2026 → Mai 2026 → Mai 2026** left to right (chronological,
  oldest first), each list row still shows its own `"Appliqué le ..."` timestamp
  and indicator count.
- Clicked the "Juillet 2026" row: the whole dashboard swapped to an
  **"ARCHIVE — JUILLET 2026"** read-only view (distinct top-bar title, a
  dismissible banner stating the applied date and "lecture seule, sans impact sur
  les données en direct", and a "← Retour au tableau de bord en direct" button)
  showing that version's actual 25 indicators and 99.2% score — confirmed
  different from the live Mai data shown before the click.

### 6.4 Archive click-to-load data path
`GET /api/history/:id/data` (see §4) looks up the history entry by `id`, re-parses
**the archived `.xlsx` copy** in `data/history/` (never the live `kpis.xlsx`),
and returns the full sheet payload plus the history entry. Frontend:
`api.js: fetchHistoryEntry(id)` → `App.jsx: openArchivedVersion(entry)` sets an
`archiveView` state that the whole render tree reads instead of the live sheet
(`sheet = archiveView ? archiveView.sheet : ...`) — every existing component
(`GlobalDial`, `CategoryBreakdown`, `IndicatorTable`, etc.) renders unmodified
against archived data, so the "click a month, see that month" experience is
pixel-identical to the live dashboard, just labeled and read-only.

### 6.5 Google Drive listening / "keep the port always listening" (`driveSync.js`)
- Polls every `pollIntervalMs` (default 60 s) automatically from server startup
  (`sync.js: startPolling()`), plus on-demand via "Vérifier maintenant."
- ✅ Verified live 2026-08-06: `POST /api/sync/check-now` against the real linked
  Google Sheet returned `lastError: null` and correctly reported the live sheet
  unchanged.
- `driveSync.js` tries the **native Google Sheets xlsx export** endpoint first
  (`docs.google.com/spreadsheets/d/<id>/export?format=xlsx`) — this is the correct
  path for a Google Sheet shared via the "edit" link (as opposed to a binary
  `.xlsx` actually uploaded to Drive), and avoids the interstitial HTML page that
  previously caused intermittent `"socket hang up"` errors recorded in
  `settings.json`. Falls back to the generic Drive `uc?export=download` flow
  (with cookie-following past the "can't scan this file" warning) only if the
  Sheets export doesn't return usable binary content. A 15 s timeout on every
  HTTP call turns a silent hang into a clean, visible `lastError` instead.
- If you still see `lastError` populated in Paramètres after this fix, it now
  means a genuine network/permission issue (e.g. sharing changed to
  restricted) — check the message text, it's a real underlying `Error.message`,
  not a generic failure.

### 6.6 One remaining known gap — the **live** (non-archive) dashboard's default sheet
`App.jsx: pickDefaultSheet()` still picks whichever *structured* sheet in the
live workbook has the most indicators — there is still no manual month/sheet
picker for the **live** view (as opposed to the Archive, which is now fully
correct). If a live workbook ever contains two month-tabs tied on indicator
count, the live dashboard's default view could show either one, with no
warning beyond the small "Période · <sheetName>" caption and the "Fichier actif"
line in Paramètres. This does **not** affect the Historique/Archive section at
all (§6.1–6.4 are unaffected by this) — it only affects which sheet the live
"Tableau de bord" view opens to by default. Left open; see §11 for the
recommended fix if you want it addressed.

---

## 7. Known drift between docs and reality

- `PROJET-RESUME.md` documents a `POST /api/upload` endpoint and an
  `UploadButton` component as part of the live app. **Neither exists anymore** —
  superseded by the Google Drive sync flow in §3. `UploadButton.jsx` is renamed
  `_deprecated_UploadButton.jsx.bak`; there's also a
  `_deprecated_IntroVideo.jsx.bak` (unused intro-video component).
- `PROJET-RESUME.md`'s "Socre → Score" typo-fix section is real and still
  accurate — verified no "socre" substring remains in either source `.xlsx`.
- `data/uploads/` directory still exists on disk but is empty and unused by any
  current route.

---

## 8. Frontend component map

- **`App.jsx`** — owns all top-level state (phase, sheets, selected sheet/category,
  view routing, theme, search, sync status, archive-view state), polls
  `/api/data` + `/api/meta` every 15 s and `/api/sync/status` every 20 s.
  `openArchivedVersion(entry)` / `exitArchive()` toggle the read-only archive
  mode described in §6.4.
- **`lib/format.js`** — `pct`/`num` formatters (fr-FR locale); `statusMeta(status)`
  → color/label per `atteint|attention|critique|inconnu`; `categoryStyle(categorie)`
  → color/icon, matched by normalized keyword (`commerc`, `techn`, `financ`,
  `strateg`/`stratég`, `client`/`experience`) with a graceful **gold/gauge
  fallback for any unrecognized axis name** — confirmed a brand-new axis like
  "Digital" or "RH" renders fine, just with the generic default color/icon instead
  of a bespoke one.
- **`lib/insights.js`** — `buildInsights()` (up to 5 auto-generated French bullet
  sentences: global-vs-objective gap, best/worst axis, critical-indicator count)
  and `buildAlerts()` (indicators with status `attention`/`critique`, sorted worst
  first, capped at 6) — both are pure functions over the parsed sheet, no
  hardcoded category names.
- **View components**: `GlobalDial` (score ring), `StatCard` ×(1 + N categories),
  `AxisRings`/`AxisDonut` (per-category charts), `CategoryBreakdown` (horizontal
  bar), `CategoryDetail` (drill-down table per axis), `IndicatorTable` (flat
  searchable table, capped to 12 on overview), `InsightsPanel`/`AlertsPanel`,
  `Sidebar`/`TopBar`, `SettingsPage`/`PendingBanner` (sync UI), `HistoryPage`
  (score-over-time line chart + clickable archive list, from `/api/history` and
  `/api/history/:id/data` — see §6), `LoadingScreen`/`ErrorState`.
- All chart/list components **iterate `categories`/`indicateurs` dynamically** —
  no component assumes a fixed count or fixed names of axes. Confirmed by reading
  every component: none hardcode "commercial"/"Technique"/"stratégique"/"Financier".
- Theme: dark/light toggle stored in `localStorage["tt-theme"]`, applied via
  `data-theme` attribute + CSS variables (`--color-*`) — components never
  hardcode hex colors.

---

## 9. Diagnostic scripts (`backend/_full_audit.js`, `backend/_stress_test.js`)

Two throwaway Node scripts, **not used by the running app**, safe to delete
anytime, but valuable to re-run after touching `parser.js`:

- **`_full_audit.js`** — runs the real `parseSheet`/`loadWorkbook` against all
  three real `.xlsx` files on disk and prints structured/unstructured status,
  detected columns, category rollups, and flags any indicator with a null
  poids/score/taux.
- **`_stress_test.js`** — feeds synthetic in-memory sheets through `parseSheet`
  to probe edge cases: future year columns, brand-new axes, reordered columns,
  4-level hierarchies, missing score column, extra unrelated columns, header row
  shifted/beyond scan limit, percent-as-text weights (the full matrix in §5.7).

```
cd kpi-dashboard/backend
node _stress_test.js
node _full_audit.js
```

Both were re-run 2026-08-06 after every parser change described in §5, with
output compared against the pre-change baseline to confirm zero regression on
the real files.

---

## 10. Running it locally

```bash
# Backend — http://localhost:4000
cd kpi-dashboard/backend
npm install
npm start

# Frontend dev server (hot reload) — proxies /api to backend per Vite config
cd kpi-dashboard/frontend
npm install
npm run dev

# OR: production build, served by the backend itself on the same port
cd kpi-dashboard/frontend
npm run build     # → frontend/dist, auto-served by server.js if present
```

⚠️ **The production build is NOT auto-rebuilt.** If you edit anything under
`frontend/src/`, you must re-run `npm run build` before the running backend will
serve the change — `server.js` just serves whatever is currently in
`frontend/dist` as static files. This exact staleness (a build from hours before
a source fix landed) was the proximate cause of the "Août 2026" bug appearing to
still be present after it was actually already fixed in source — see §12.

Backend deps: `express@^4.19.2`, `cors@^2.8.5`, `xlsx@^0.18.5`.
Frontend deps: `react@^19.2.8`, `vite@^8.2.0`, `tailwindcss@^4.3.3`,
`motion@^12.43.0` (Framer Motion), `recharts@^3.10.1`.

---

## 11. Priority fix list — current status (2026-08-06, end of day)

1. ✅ **DONE** — Month/period shown in Historique & Archive now correctly reflects
   the real period read from the sheet name, independent of upload date (§6).
   Archive click-to-load works, verified in a real browser (§6.3).
2. ✅ **DONE** — `objectifAnnuel` matcher no longer hardcodes years; any future
   year works (§5.2).
3. ✅ **DONE** — Hierarchies deeper than 3 levels no longer silently collapse
   intermediate levels (§5.3).
4. ✅ **DONE** — Percent-as-literal-text weights no longer parse 100x too large
   (§5.3).
5. **OPEN** — The **live** (non-archive) dashboard's default sheet still has no
   date-awareness (§6.6) — only relevant if the live workbook ever contains two
   equally-sized structured month-tabs at once. Does not affect the Archive
   section. Suggested fix if/when this matters: give `pickDefaultSheet()` the
   same `periodFromSheetName()` logic already used for history, and prefer the
   most recent recognized month over "most indicators."
6. **OPEN (cosmetic)** — `PROJET-RESUME.md` still describes a `POST /api/upload`
   endpoint that doesn't exist (§7); doc-only, no functional impact.
7. **OPEN (operational)** — No process manager / auto-restart is currently wired
   up for the backend (§12) — if the machine reboots or the `node` process dies,
   the site goes down until manually restarted, and the Drive-sync polling stops
   with it (breaking "keep listening for minor changes" if it happens silently).

---

## 12. Operational notes — keeping the server always up (2026-08-06)

During verification, the backend was found **not running at all** (no process
listening on port 4000), which was the actual root cause behind the app
appearing to still show the "Août 2026" bug after it had already been fixed in
source — the browser was rendering a stale build served by a server that, by the
time it was checked, wasn't even running.

- `pid.txt` / `run.log` / `err.log` in `backend/` suggest a process manager
  (PM2, nodemon, or a custom script) was used at some point to keep `node
  server.js` alive, but nothing is currently confirmed auto-restarting it.
- Until a proper process manager is set up, after any reboot or crash you need to
  manually: `cd kpi-dashboard/backend && node server.js` (and rebuild the
  frontend first if you touched `frontend/src/` — see §10).
- **Recommended next step** (not yet implemented): wire up PM2
  (`pm2 start server.js --name kpi-dashboard && pm2 save && pm2 startup`) or a
  Windows Scheduled Task set to run at startup and restart on failure, so both
  the API and the Google Drive polling loop (§6.5) survive reboots without
  manual intervention.
