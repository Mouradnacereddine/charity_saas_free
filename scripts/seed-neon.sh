#!/bin/bash
# Seed the Neon remote database
# Usage: ./scripts/seed-neon.sh

echo "Pushing schema to Neon..."
cd /home/mourad/Documents/SaaS_Association_Charitable/server

# The DATABASE_URL is set inline for Neon
export DATABASE_URL="postgresql://neondb_owner:npg_Ebn0AYy2DaNl@ep-fragrant-cloud-ah45kgbj-pooler.c-3.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

echo "Running Prisma db push..."
npx prisma db push --accept-data-loss

echo "Running seed..."
npx ts-node src/seed-data.ts

echo "Done!"
