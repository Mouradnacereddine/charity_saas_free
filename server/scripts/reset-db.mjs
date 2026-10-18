#!/usr/bin/env node
/**
 * Vide entièrement la base pointée par DATABASE_URL (ou --url).
 *
 * Écrit après avoir constaté que les scripts SQL du dépôt
 * (scripts/reset-neon.sql, scripts/reset-neon-delete.sql,
 * prisma/purge-all-but-association.sql) listent les tables à la main et
 * en oublient — DonorBeneficiary, AuditLog et StockTake n'étaient purgés
 * par aucun des trois. Ici les tables sont découvertes depuis
 * information_schema, donc une nouvelle table Prisma est prise en compte
 * sans modifier ce fichier.
 *
 * Usage :
 *   DATABASE_URL="postgresql://..." node scripts/reset-db.mjs --yes
 *   node scripts/reset-db.mjs --url "postgresql://..." --yes
 *
 * Sans --yes, le script ne fait qu'afficher la cible et les compteurs.
 *
 * ATTENTION : irréversible. Après exécution il ne reste ni association ni
 * utilisateur ; repasser par POST /api/auth/register pour recréer un
 * compte super_admin.
 */
import { Client } from 'pg';

/**
 * Résout la cible. Volontairement SANS devinette de fichier .env : ce
 * dépôt porte deux bases très différentes (server/.env -> Postgres local,
 * .env.local racine -> Neon de production) et un TRUNCATE irréversible ne
 * doit jamais partir sur une cible déduite. On exige donc --url ou
 * DATABASE_URL.
 */
function resolveUrl() {
  const argIdx = process.argv.indexOf('--url');
  if (argIdx !== -1 && process.argv[argIdx + 1]) return process.argv[argIdx + 1];
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  return null;
}

/** Masque le mot de passe avant tout affichage. */
function mask(url) {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '<URL illisible>';
  }
}

const url = resolveUrl();
if (!url) {
  console.error('Aucune URL de base : passez --url ou définissez DATABASE_URL.');
  process.exit(2);
}

const confirmed = process.argv.includes('--yes');
const client = new Client({ connectionString: url, connectionTimeoutMillis: 15000 });

try {
  await client.connect();

  const { rows: tables } = await client.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name`,
  );

  if (tables.length === 0) {
    console.log('Aucune table dans le schéma public — rien à faire.');
    await client.end();
    process.exit(0);
  }

  const names = tables.map((t) => t.table_name);
  console.log(`Cible   : ${mask(url)}`);
  console.log(`Tables  : ${names.length}`);

  const counts = [];
  for (const name of names) {
    const { rows } = await client.query(`select count(*)::int as n from "${name}"`);
    counts.push([name, rows[0].n]);
  }
  const total = counts.reduce((a, [, n]) => a + n, 0);
  for (const [name, n] of counts.filter(([, n]) => n > 0)) console.log(`  ${String(n).padStart(6)}  ${name}`);
  console.log(`Total   : ${total} lignes`);

  if (!confirmed) {
    console.log('\nSimulation seule. Relancez avec --yes pour supprimer définitivement.');
    await client.end();
    process.exit(0);
  }

  // Un seul TRUNCATE pour toutes les tables : les clés étrangères croisées
  // sont alors résolues par CASCADE, sans ordre de suppression à maintenir.
  const list = names.map((n) => `"${n}"`).join(', ');
  await client.query(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);

  const { rows: after } = await client.query(
    `select coalesce(sum(c), 0)::int as total from (
       select (xpath('/row/c/text()', query_to_xml(
         format('select count(*) as c from %I', table_name), false, true, '')))[1]::text::int as c
       from information_schema.tables where table_schema='public' and table_type='BASE TABLE'
     ) t`,
  );
  console.log(`\nOK — base vidée. Lignes restantes : ${after[0].total}`);
} catch (error) {
  console.error('ÉCHEC :', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}