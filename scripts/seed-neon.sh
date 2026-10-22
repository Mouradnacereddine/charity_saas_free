#!/bin/bash
# Seed the Neon remote database
# Usage: DATABASE_URL="postgresql://..." ./scripts/seed-neon.sh
set -euo pipefail

cd "$(dirname "$0")/../server"

# La chaîne de connexion n'est JAMAIS écrite ici : elle vient de l'environnement.
# Le dépôt est public — un identifiant commité est un identifiant compromis.
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL manquant." >&2
  echo "Exportez-la d'abord, p. ex. : DATABASE_URL=\"postgresql://...\" $0" >&2
  exit 1
fi

echo "Pushing schema to Neon..."
npx prisma db push --accept-data-loss

echo "Running seed..."
npx ts-node src/seed-data.ts

echo "Done!"
