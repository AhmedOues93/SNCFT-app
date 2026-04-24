# SNCFT Banlieue Sud Navigator

Application mobile **Expo React Native + TypeScript** pour consulter les horaires statiques SNCFT Banlieue Sud, avec recherche de prochain train et estimation de marche.

## Fonctionnalités

- Recherche d'itinéraire par:
  - station de départ
  - station d'arrivée
  - date/heure
  - marche (**Hiver / Été / Ramadan**)
- Chargement des fichiers CSV statiques depuis `data/csv/`
- Parsing CSV puis regroupement des arrêts par `trainNumber`
- Validation des trajets selon les 4 directions supportées:
  - Tunis → Borj Cedria
  - Borj Cedria → Tunis
  - Tunis → Erriadh
  - Erriadh → Tunis
- Résultats: prochain train + 2 alternatives
- Calcul heure départ, heure arrivée, durée
- GPS (`expo-location`) avec bouton **Utiliser ma position**
- Estimation marche via formule de Haversine + vitesse 5 km/h
- Fallback de saisie manuelle du temps de marche
- Écrans:
  - Recherche
  - Résultats
  - Horaires
  - Stations
  - À propos

> Horaires basés sur les données statiques SNCFT. Retards et suppressions non inclus.

## Structure projet

- `app/` : navigation et écrans (Expo Router)
- `components/` : composants UI
- `lib/` : logique métier (CSV, temps, géolocalisation)
- `data/csv/` : données horaires statiques
- `assets/images/` : logo/images SNCFT

## Démarrage local

1. Installer les dépendances:

```bash
npm install
```

2. Lancer l'app:

```bash
npm run start
```

3. Ouvrir:
- Expo Go (QR code)
- Android emulator
- iOS simulator

## Tester avec Expo Go

1. Installer Expo Go sur votre téléphone.
2. Lancer `npm run start`.
3. Scanner le QR code affiché dans le terminal Expo.
4. Vérifier les écrans Recherche, Résultats, Horaires, Stations, À propos.

## Remplacer les CSV plus tard

Remplacez les fichiers suivants avec vos données officielles SNCFT:

- `data/csv/banlieue-sud-hiver.csv`
- `data/csv/banlieue-sud-ete.csv`
- `data/csv/banlieue-sud-ramadan.csv`

Format attendu (avec header):

```csv
trainNumber,direction,station,time
```

Exigences:
- `direction` doit être exactement une des 4 directions supportées.
- `time` au format `HH:mm` (24h)
- Chaque arrêt d'un train doit avoir le même `trainNumber` et `direction`.

## Images SNCFT

Le code attend ces fichiers:

- `assets/images/sncft-logo.png`
- `assets/images/train-hero.jpg`
- `assets/images/train-secondary.jpg`

Vous pouvez remplacer ces fichiers sans modifier le code.

## Build APK (EAS Preview)

Le projet inclut `eas.json` avec profil `preview` Android en APK.

1. Installer EAS CLI:

```bash
npm install -g eas-cli
```

2. Connexion:

```bash
eas login
```

3. Lancer build APK preview:

```bash
eas build -p android --profile preview
```

## Vérification TypeScript

Après installation des dépendances:

```bash
npm run typecheck
```
