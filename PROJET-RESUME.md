# Tunisie Telecom — Dashboard KPIs DRT B. Arous

Résumé du projet : ce qui a été fait, comment c'est construit, et l'état actuel.

## 1. Contexte / source

- **Sujet de stage 1.docx** : cahier des charges du stage (contexte, objectifs).
- **KPIS-drt-b-arous-Juillet (1).xlsx** : fichier Excel source contenant les indicateurs
  de performance (KPIs) de la direction régionale de télécommunication de Ben Arous —
  catégories, sous-catégories, indicateurs, poids, objectifs, réalisation, taux de
  réalisation et score, feuille par feuille (mois par mois, ex. `mai26`).
- **images.png** : logo officiel Tunisie Telecom, intégré à l'identité visuelle du
  dashboard.

Les deux fichiers ont été lus intégralement (toutes les feuilles, toutes les lignes,
toutes les colonnes) pour concevoir un modèle de données qui colle exactement à la
structure réelle du fichier, sans supposer un nombre fixe d'indicateurs ou de
catégories.

## 2. Ce qui a été construit

Une application web complète **`kpi-dashboard/`** avec :

### Backend (`kpi-dashboard/backend/`)
- **Node.js + Express**, API REST simple :
  - `GET /api/health` — statut, présence du fichier, date de dernière modification.
  - `GET /api/meta` — résumé par feuille (nom, nombre d'indicateurs, score global).
  - `GET /api/data` — données complètes de toutes les feuilles.
  - `GET /api/data/:sheet` — données d'une feuille précise.
  - `POST /api/upload` — remplacement du fichier Excel source depuis l'interface.
- **`parser.js`** : parseur Excel **dynamique**, basé sur la librairie `xlsx`.
  - Détecte automatiquement la ligne d'en-tête et les colonnes (poids, objectif
    annuel, objectif YTD, réalisation YTD, taux de réalisation, score) par
    correspondance de mots-clés normalisés (accents/majuscules ignorés).
  - Reconstruit la hiérarchie catégorie → sous-catégorie → indicateur en tenant
    compte des cellules fusionnées.
  - Calcule un statut (`atteint` / `attention` / `critique`) par indicateur et par
    catégorie à partir du taux de réalisation.
  - Isole la ligne de synthèse "Score Région" (score global de la feuille) grâce à
    une règle robuste (poids vide + score renseigné), donc **insensible** à
    d'éventuelles fautes de frappe dans le libellé.
  - Si la structure du fichier évolue (ajout/suppression d'indicateurs ou de
    colonnes), **aucune modification de code n'est nécessaire**.
- Le fichier Excel est relu à chaque requête : toute mise à jour (upload, édition
  manuelle) est reflétée immédiatement, sans redémarrage du serveur.
- Sert aussi le frontend compilé (`frontend/dist`) pour un déploiement en un seul
  lien.

### Frontend (`kpi-dashboard/frontend/`)
- **React 19 + Vite + Tailwind CSS v4**, animations avec **motion** (Framer Motion),
  graphiques avec **recharts**.
- Thème visuel dérivé de l'identité **Tunisie Telecom** (couleurs de marque, logo
  officiel intégré), avec micro-animations sur les chiffres, les jauges et les
  transitions de vue.
- Composants principaux :
  - `GlobalDial` — jauge circulaire du score global.
  - `CategoryTile` / `CategoryBreakdown` / `CategoryDetail` — vue par catégorie
    et détail des indicateurs.
  - `StatCard`, `AnimatedNumber`, `SignalBars` — indicateurs chiffrés animés.
  - `UploadButton` — remplacement du fichier Excel depuis l'UI.
  - `LoadingScreen`, `ErrorState` — états de chargement / erreur.

### Données (`kpi-dashboard/data/`)
- `kpis.xlsx` — copie du fichier Excel source, utilisée en direct par le backend
  (c'est ce fichier qui est lu à chaque requête API).

## 3. Corrections effectuées

- **Faute de frappe "Socre" → "Score"** corrigée à la source :
  - `KPIS-drt-b-arous-Juillet (1).xlsx` (fichier original), feuille `mai26`,
    cellule A27 : "Socre Région" → **"Score Région"**.
  - `kpi-dashboard/data/kpis.xlsx` (copie utilisée par l'application), même
    correction appliquée.
  - Le commentaire du parseur (`parser.js`) mentionnant l'ancienne coquille a été
    mis à jour pour rester cohérent avec la source corrigée. La logique de
    détection de la ligne de synthèse n'a pas eu besoin d'être changée : elle ne
    s'est jamais basée sur le texte exact du libellé, donc elle continue de
    fonctionner correctement après la correction.
  - Vérification finale : plus aucune occurrence de "socre" dans les deux
    fichiers Excel.

## 4. État actuel

- Application fonctionnelle en local : backend Express (API) + frontend React
  (Vite dev server, ou build statique servi par le backend).
- Design terminé : thème Tunisie Telecom, logo intégré, animations en place.
- Données à jour et sans coquille dans les fichiers Excel source et copie de
  travail.

## 5. Pour relancer le projet

```bash
# Backend
cd kpi-dashboard/backend
npm install
npm start          # http://localhost:4000

# Frontend (développement)
cd kpi-dashboard/frontend
npm install
npm run dev         # serveur Vite avec hot-reload

# Frontend (build de production, servi par le backend)
cd kpi-dashboard/frontend
npm run build        # génère frontend/dist, servi automatiquement par le backend
```

---
*Document généré automatiquement pour garder une trace de ce qui a été fait sur ce
projet.*
