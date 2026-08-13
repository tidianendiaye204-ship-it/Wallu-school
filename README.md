# Wallu School

Application de gestion financière scolaire — paiements élèves par classe
avec report automatique de solde, paiements du personnel, reçus (unitaires
et en masse) envoyables par WhatsApp, dépenses, journal de caisse et bilan.
Installable comme application (PWA) sur téléphone ou ordinateur.

## 1. Installation

```bash
npm install
```

## 2. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécute dans l'ordre :
   - `supabase/01-schema.sql`
   - `supabase/02-migration-inscriptions.sql`
3. Copie `.env.local.example` en `.env.local` et renseigne :
   - `NEXT_PUBLIC_SUPABASE_URL` (Project Settings → API)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API)

## 3. Lancer en local

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

⚠️ **Important** : `components/WalluSchoolApp.tsx` utilise encore des
données de démonstration en mémoire (`SEED_CLASSES`, `SEED_STUDENTS`...).
Les fonctions de `lib/api.ts` sont prêtes à l'emploi mais pas encore
branchées à l'interface — suis le tableau de correspondance dans
`lib/api.ts` (commentaires) pour remplacer chaque `useState(SEED_*)`
par un appel Supabase. C'est l'étape suivante à faire ensemble.

## 4. Installer l'app comme PWA

Une fois déployée (voir plus bas), sur un téléphone Android : ouvrir le
site dans Chrome → menu ⋮ → "Ajouter à l'écran d'accueil". Sur iPhone :
ouvrir dans Safari → bouton Partager → "Sur l'écran d'accueil".
L'app s'installe avec son icône et s'ouvre en plein écran, sans barre
d'adresse — comme n'importe quelle application native.

Ce qui est déjà en place pour ça :
- `public/manifest.json` — nom, icônes, couleurs
- `public/icons/` — icônes 192px, 512px, et version "maskable" (Android)
- `public/sw.js` — service worker, garde le shell de l'app accessible
  même en cas de coupure réseau courte
- `components/RegisterServiceWorker.tsx` — activation automatique

**Limite à connaître** : le service worker fourni met en cache l'interface,
mais n'enregistre pas les paiements faits hors-ligne pour les
resynchroniser ensuite (pas de file d'attente offline). Si la connexion
coupe pendant l'enregistrement d'un paiement, il faut réessayer une fois
la connexion revenue. Une vraie synchronisation hors-ligne est possible
mais demande une étape supplémentaire (IndexedDB + file d'attente) —
à prévoir si les écoles ciblées ont une connexion peu fiable.

## 5. Déploiement (Vercel)

```bash
git init
git add .
git commit -m "Wallu School — projet initial"
```

Pousse sur ton repo GitHub habituel, puis importe-le sur
[vercel.com](https://vercel.com). Ajoute les deux variables d'environnement
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) dans les
réglages du projet Vercel avant le premier déploiement.

## Structure du projet

```
wallu-school/
├── app/
│   ├── layout.tsx        # métadonnées PWA, thème, service worker
│   ├── page.tsx          # page d'accueil
│   └── globals.css
├── components/
│   ├── WalluSchoolApp.tsx    # toute l'interface (inscription, classes, paiements, caisse...)
│   └── RegisterServiceWorker.tsx
├── lib/
│   ├── supabaseClient.ts
│   └── api.ts             # toutes les fonctions de données
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
└── supabase/
    ├── 01-schema.sql
    └── 02-migration-inscriptions.sql
```
