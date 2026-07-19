#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "⚠️  Ce script va SUPPRIMER toutes les données sur NEON (production)."
echo "Es-tu sûr ? Tape 'oui' pour confirmer :"
read -r confirmation

if [ "$confirmation" != "oui" ]; then
  echo "Annulé."
  exit 1
fi

NEON_URL="postgresql://neondb_owner:npg_Ebn0AYy2DaNl@ep-fragrant-cloud-ah45kgbj-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"

echo "🗑️  Suppression du schéma public..."
psql "$NEON_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "🏗️  Reconstruction des tables..."
npx prisma db push

echo "✅ Neon est propre et prêt !"
