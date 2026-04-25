# SNCFT Digital Platform

Plateforme complète SNCFT:
- **Mobile app Expo** pour voyageurs
- **Dashboard Admin web** pour imports/édition/publication
- **Supabase backend** pour stockage et diffusion des données publiées

## 1) Mobile App (Expo SDK 54)

L'application mobile est dans la racine du projet.

### Variables d'environnement mobile

Créer `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<votre-projet>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<votre-anon-key>
```

> Ne jamais utiliser la `service_role` key dans l'app mobile.

### Fonctionnement des données

1. Source principale: Supabase (`lines`, `stations`, `line_stations`, `schedules`, `fares`)
2. Fallback automatique: CSV local `data/csv/*`
3. L'écran Recherche affiche la source active (Supabase ou CSV secours)

### Fonctionnalités mobile

- Recherche: départ/arrivée, date+heure, saison, direction aller/retour, swap, validations
- Résultats: prochain train + 2 alternatives, attente, marche, arrêts intermédiaires, tarif si disponible
- Favoris: AsyncStorage
- Horaires: filtres station/direction/saison + regroupement par direction

## 2) Supabase Backend

Le schéma SQL est fourni ici:

- `supabase/schema.sql`

Tables couvertes:

- `lines`
- `stations`
- `line_stations`
- `schedules`
- `fares`
- `imports`
- `admin_users`
- `audit_logs`

Le script inclut:
- contraintes métiers (direction, season, publication)
- index utiles
- RLS policies (public lecture sur données publiées, admin sur gestion)

## 3) Admin Dashboard

Le dashboard est dans:

- `admin-dashboard/`

### Variables d'environnement dashboard

Créer `admin-dashboard/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<votre-projet>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<votre-anon-key>
```

### Fonctions dashboard

- Connexion admin (pas de signup public)
- Imports CSV/XML avec preview + erreurs de validation
- Gestion horaires/tarifs
- Publication/dépublication
- Consultation audit logs
- Gestion utilisateurs admin (super_admin)

### Lancer le dashboard

```bash
cd admin-dashboard
npm install
npm run dev
```

## 4) Tester Supabase + fallback

### Tester Supabase

1. Remplir variables `.env`.
2. Lancer app mobile `npm run start`.
3. Vérifier dans Recherche: `Source des données: Supabase`.

### Tester fallback CSV

1. Supprimer temporairement les variables `.env`.
2. Relancer l'app.
3. Vérifier: `CSV local (secours)`.

## 5) Typecheck

```bash
npm run typecheck
```

Dashboard:

```bash
cd admin-dashboard
npm run typecheck
```

## 6) Prototype GPS Live

Couche optionnelle, sans remplacer les horaires statiques:

- Écran caché mobile: `/driver`
  - saisie numéro train
  - bouton **Démarrer le suivi**
  - envoi GPS vers Supabase toutes les 10 secondes
  - bouton **Arrêter le suivi**
- Tables Supabase live:
  - `train_positions`
  - `live_train_status`
- Résultats passagers:
  - statut live
  - prochaine station estimée
  - retard estimé (prototype)
  - dernière mise à jour
- Dashboard admin:
  - page **Suivi live**

> Important: indication expérimentale non officielle SNCFT.

## 7) Import CSV du dépôt (Lignes A, D, E)

Fichiers attendus:

- `data/schedules/line_A_banlieue_sud_hiver_2025_schedules.csv`
- `data/schedules/schedules_line_D_goubaa.csv`
- `data/schedules/schedules_line_E_bougatfa.csv`
- `data/fares/fares_line_A_banlieue_sud.csv`
- `data/fares/fares_line_D_goubaa.csv`
- `data/fares/fares_line_E_bougatfa.csv`

Commande d'import/validation:

```bash
npm run import:repo-csv
```

La commande:
1. valide les 6 fichiers
2. affiche un rapport (rows / trains / stations)
3. crée/met à jour `lines`, `stations`, `line_stations`, `schedules`, `fares`
4. marque les données importées comme publiées

> Si les variables Supabase ne sont pas présentes, la commande fait la validation + rapport uniquement.
