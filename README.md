# 🧠 WordRush

Jeu multijoueur en temps réel inspiré de *Fight List*, pensé pour jouer entre amis. Sans mot de passe, sans email : on choisit un pseudo et on joue.

## Principe du jeu

- Une partie comporte plusieurs manches (5 par défaut).
- Chaque manche affiche une catégorie (pays, animaux, films, sports, marques, métiers, objets du quotidien) pendant **40 secondes**.
- Les joueurs tapent un maximum de mots correspondant à la catégorie.
- Les réponses sont validées avec tolérance aux fautes de frappe (distance de Levenshtein).
- Chaque bonne réponse vaut **1, 2 ou 3 points** selon sa difficulté.
- À la fin de chaque manche : récap des mots trouvés par chacun.
- À la fin de la partie : classement final, le plus haut score gagne.

## Stack technique

- **Frontend** : Next.js 14 (Pages Router) + React, CSS pur (dark mode).
- **Backend** : API routes Next.js (validation simple, logique serveur minimale).
- **Temps réel & données** : Firebase Firestore (listeners `onSnapshot`).
- **Profils** : pas d'authentification classique — juste un pseudo, stocké dans Firestore et dans le `localStorage` du navigateur pour la session.
- **Déploiement** : Vercel (aucun serveur externe).

> Note d'architecture : pour un MVP entre amis sans authentification, la majorité des écritures temps réel (rejoindre un salon, soumettre un mot, changer de manche) se fait directement depuis le client vers Firestore via le SDK, protégé par des règles de sécurité ouvertes (`firestore.rules`). Une route API Next.js est fournie (`/api/check-username`) pour la logique de validation côté serveur, conformément à la stack demandée.

## Structure du projet

```
wordrush/
├── components/
│   ├── Avatar.js          # Avatar simple (initiale + couleur générée)
│   └── Timer.js            # Compte à rebours de manche
├── lib/
│   ├── avatar.js            # Génération couleur/avatar + code de salon
│   ├── categories.js        # Catégories + réponses + difficulté
│   ├── firebaseClient.js    # Init Firebase côté client
│   ├── firestoreHelpers.js  # Toute la logique salons/joueurs/manches/scores
│   └── fuzzy.js              # Normalisation + Levenshtein + scoring
├── pages/
│   ├── index.js              # Connexion / sélection de profil
│   ├── rooms.js               # Liste des salons publics + créer/rejoindre
│   ├── profile.js             # Statistiques du joueur
│   ├── room/[code].js          # Lobby + jeu + résultats + classement final
│   └── api/check-username.js   # Route API de validation de pseudo
├── styles/globals.css
├── firestore.rules
├── package.json
└── .env.local.example
```

## Modèle de données Firestore

```
profiles/{username}
  username, color, wins, losses, gamesPlayed, totalScore, createdAt

rooms/{code}
  code, hostUsername, status: lobby|playing|round_result|finished,
  roundCount, currentRoundIndex, categoryIds, resultsRecorded

rooms/{code}/players/{username}
  username, color, score, joinedAt

rooms/{code}/rounds/{roundIndex}
  categoryId, status: playing|ended, startedAt, endsAtMs,
  players: { [username]: { words: [...], score } }
```

## Installation locale

### 1. Créer un projet Firebase

1. Aller sur [console.firebase.google.com](https://console.firebase.google.com) → **Créer un projet**.
2. Dans **Build > Firestore Database**, créer une base de données (mode production).
3. Dans **Paramètres du projet > Vos applications**, ajouter une application **Web** et copier la config.
4. Dans **Firestore > Règles**, coller le contenu de `firestore.rules` puis publier.

### 2. Configurer le projet

```bash
cd wordrush
cp .env.local.example .env.local
```

Remplir `.env.local` avec les valeurs copiées depuis Firebase :

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### 3. Installer et lancer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Pour tester le multijoueur en local, ouvrir plusieurs fenêtres/navigateurs avec des pseudos différents.

## Déploiement sur Vercel

1. Créer un dépôt Git (GitHub/GitLab) avec ce projet, ou utiliser `vercel` en CLI directement.
2. Sur [vercel.com](https://vercel.com) → **Add New Project** → importer le dépôt.
3. Dans les **Environment Variables** du projet Vercel, ajouter les mêmes variables que `.env.local`.
4. Déployer. Vercel détecte automatiquement Next.js.

Ou via la CLI :

```bash
npm i -g vercel
vercel
# puis suivre les instructions, ajouter les variables d'environnement quand demandé
vercel --prod
```

## Ajouter des catégories

Toutes les catégories et leurs réponses (avec difficulté `easy`/`medium`/`hard` et alias optionnels) sont centralisées dans `lib/categories.js`. Il suffit d'ajouter un nouvel objet dans le tableau `CATEGORIES` pour enrichir le jeu.

## Limites connues (MVP)

- Pas d'authentification : un pseudo peut être repris par n'importe qui (usage entre amis de confiance).
- Le déroulement des manches (timer, transition) est piloté par le navigateur de l'hôte ; si l'hôte quitte en pleine manche, la partie peut se figer (un autre joueur peut recharger la page hôte en relançant `npm run dev` ou en redéployant pour des tests, mais en usage normal il suffit qu'un client garde la page ouverte).
- Règles Firestore ouvertes en lecture/écriture : à restreindre si le jeu est exposé publiquement à grande échelle.
