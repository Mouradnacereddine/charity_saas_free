# Déploiement du SaaS Association Charitable

## Architecture

Le projet est un **monorepo** contenant deux applications distinctes :

```
/                     ← Frontend (Vite + React + TypeScript)
/server/              ← Backend (Express + Prisma + PostgreSQL)
```

- **Frontend** : Compatible avec un déploiement Vercel / Netlify / Cloudflare Pages
- **Backend** : Nécessite une plateforme avec support Node.js long-running (Render, Railway, Fly.io, etc.)

---

## Déploiement du Frontend sur Vercel

1. Allez sur [vercel.com](https://vercel.com) et importez le repo `charity_saas_free` depuis GitHub
2. Vercel détecte automatiquement Vite. Si ce n'est pas le cas :
   - **Root Directory** : laissez à `./` (la racine du repo)
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
3. Configurez les variables d'environnement suivantes :

| Variable | Valeur | Exemple |
|---|---|---|
| `VITE_API_URL` | URL du backend déployé | `https://api.charity-sass.com/api` |

4. Le fichier `vercel.json` à la racine gère déjà les rewrites SPA (toutes les routes → `index.html`)

---

## Déploiement du Backend (Express + Prisma)

### Option recommandée : Render.com

1. Créez un nouveau **Web Service** sur [render.com](https://render.com)
2. Connectez votre repo GitHub `charity_saas_free`
3. Configurez :
   - **Root Directory** : `server`
   - **Build Command** : `npm install && npx prisma generate && npm run build`
   - **Start Command** : `npx prisma db push --accept-data-loss && npm start`
4. Variables d'environnement à configurer :

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret pour les tokens d'accès | (générer une chaîne aléatoire de 32+ caractères) |
| `JWT_REFRESH_SECRET` | Secret pour les tokens de refresh | (générer une chaîne aléatoire de 32+ caractères) |
| `FRONTEND_URL` | URL du frontend Vercel | `https://charity-sass.vercel.app` |
| `PORT` | Port du serveur | `3001` |

### Provisionnement de la base PostgreSQL

Vous pouvez utiliser :
- [Render PostgreSQL](https://render.com/docs/databases) (recommandé)
- [Neon](https://neon.tech) (gratuit, serverless)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

Après la création de la base, exécutez le seed via le shell Render :
```bash
cd server
npm run db:seed
```

### Compte admin par défaut (après seed)

- **Email** : `admin@example.com`
- **Mot de passe** : `password123`

⚠️ **Changez ce mot de passe immédiatement après la première connexion** dans un environnement de production.

---

## Tests automatisés

Le projet inclut 2 suites de tests :

```bash
# Tests unitaires (frontend)
npm run test

# Tests d'intégration (backend)
cd server && npx ts-node src/integration-test.ts
```

---

## Notes de sécurité

- Le mot de passe de la base PostgreSQL locale a été défini comme `devpwd` (développement uniquement)
- Les secrets JWT dans `.env` sont marqués comme `dev-secret` — changez-les en production
- Activez HTTPS pour le backend en production
- Configurez les CORS pour n'accepter que votre domaine frontend
