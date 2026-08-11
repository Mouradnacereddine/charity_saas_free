// ============================================
// PRE-MIGRATION ENUM — exécuter AVANT `prisma db push`
// ============================================
// Renomme proprement la valeur d'enum 'user' → 'volunteer' dans PostgreSQL
// pour éviter la perte de données lors du db push.
// idempotent : si 'user' n'existe plus, ne fait rien.

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
    console.log('🔄 Pré-migration des rôles...');

    // 1. Renommer la valeur d'enum user → volunteer (si elle existe encore)
    try {
      await pool.query(`ALTER TYPE "Role" RENAME VALUE 'user' TO 'volunteer';`);
      console.log('  ✅ Enum Role: user → volunteer renommé');
    } catch (err) {
      if (String(err.message).includes('not exist')) {
        console.log('  ℹ️  Valeur \'user\' déjà renommée ou absente, rien à faire');
      } else if (String(err.message).includes('already exists')) {
        console.log('  ℹ️  Valeur \'volunteer\' existe déjà');
      } else {
        // Certaines erreurs sont attendues (ex: enum non encore modifié)
        console.log(`  ⚠️  ${err.message}`);
      }
    }

    // 2. Ajouter les nouvelles valeurs d'enum si elles n'existent pas
    const enumValues = await pool.query(`SELECT unnest(enum_range(NULL::"Role"))::text AS value`);
    const values = new Set(enumValues.rows.map((r) => r.value));

    for (const v of ['super_admin', 'stock_manager', 'social_worker']) {
      if (!values.has(v)) {
        try {
          await pool.query(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS '${v}';`);
          console.log(`  ✅ Enum Role: '${v}' ajouté`);
        } catch (err) {
          console.log(`  ⚠️  Ajout de '${v}': ${err.message}`);
        }
      } else {
        console.log(`  ℹ️  Enum Role: '${v}' existe déjà`);
      }
    }

    // 3. Ajouter la colonne isFounder si absente
    const columns = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'isFounder'`
    );
    if (columns.rows.length === 0) {
      await pool.query(`ALTER TABLE "User" ADD COLUMN "isFounder" BOOLEAN NOT NULL DEFAULT false;`);
      console.log('  ✅ Colonne isFounder ajoutée');
    } else {
      console.log('  ℹ️  Colonne isFounder existe déjà');
    }

    console.log('✅ Pré-migration terminée — db push peut s\'exécuter en toute sécurité');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
