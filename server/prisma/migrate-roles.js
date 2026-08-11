// ============================================
// MIGRATION DES RÔLES — RBAC 2026 (JS)
// ============================================
// Exécute les transformations de rôles pour les données existantes :
// 1. Le premier admin (par createdAt) de chaque association → super_admin + isFounder
// 2. Les autres admins restent admin
// 3. Les 'user' → 'volunteer' (si l'enum a déjà été renommé par pre-migrate-enum)
// 4. Les inviteTokens avec role 'user' → 'volunteer'
//
// À exécuter APRÈS `prisma db push` :
//   node prisma/migrate-roles.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || '';

  if (!connectionString) {
    console.error('❌ DATABASE_URL non configurée');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    console.log('🚀 Migration des rôles...');

    // 1. Promouvoir le premier admin de chaque association en super_admin + fondateur
    // Utilise une CTE : pour chaque association, le premier admin par createdAt
    const promoted = await pool.query(`
      UPDATE "User" u
      SET "role" = 'super_admin', "isFounder" = true
      WHERE u.id IN (
        SELECT DISTINCT ON (u2."associationId") u2.id
        FROM "User" u2
        WHERE u2."role" = 'admin'
        ORDER BY u2."associationId", u2."createdAt" ASC
      )
      AND u."role" = 'admin'
      RETURNING id;
    `);
    console.log(`  ✅ ${promoted.rowCount} admin(s) promu(s) super_admin (fondateur)`);

    // 2. Renommer user → volunteer (si des lignes portent encore l'ancien rôle)
    // PostgreSQL gère le renommage d'enum nativement : les valeurs 'user' deviennent 'volunteer'
    // Cette étape ne s'exécute que si 'user' existe encore dans l'enum (cas très particulier)
    // Enveloppé en try/catch car si l'enum a été renommé, la valeur 'user' n'existe plus et
    // la requête échoue avec "invalid input value for enum" — c'est attendu et sans danger.
    try {
      const renamed = await pool.query(`
        UPDATE "User" SET "role" = 'volunteer' WHERE "role" = 'user' RETURNING id;
      `);
      if (renamed.rowCount > 0) {
        console.log(`  🔄 ${renamed.rowCount} utilisateur(s) 'user' → 'volunteer'`);
      }
    } catch (err) {
      console.log(`  ℹ️  Étape 'user'→'volunteer' ignorée (enum déjà renommé) : ${err.message}`);
    }

    // 3. Renommer les inviteTokens user → volunteer (même logique résiliente)
    try {
      const renamedTokens = await pool.query(`
        UPDATE "InviteToken" SET "role" = 'volunteer' WHERE "role" = 'user' RETURNING id;
      `);
      if (renamedTokens.rowCount > 0) {
        console.log(`  🔄 ${renamedTokens.rowCount} inviteToken(s) 'user' → 'volunteer'`);
      }
    } catch (err) {
      console.log(`  ℹ️  Étape inviteTokens 'user'→'volunteer' ignorée (enum déjà renommé) : ${err.message}`);
    }

    console.log('✅ Migration des rôles terminée !');
  } catch (err) {
    console.error('❌ Erreur lors de la migration :', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
