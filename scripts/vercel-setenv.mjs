#!/usr/bin/env node
/**
 * Set Vercel production environment variables.
 *
 * Usage :
 *   DATABASE_URL="postgresql://..." \
 *   JWT_SECRET="..." JWT_REFRESH_SECRET="..." \
 *   node scripts/vercel-setenv.mjs
 *
 * Les valeurs ne sont pas écrites dans ce fichier : ce script est suivi par git,
 * et une valeur présente ici est une valeur publiée. Les secrets sont lus dans
 * l'environnement de l'appelant (ou dans server/.env, non suivi).
 */
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PROJECT = 'charity-saas-free';
const TEAM = 'team_hblwAU8nYhkOJnHLT5AV9vsb';
const auth = JSON.parse(readFileSync(join(homedir(), '.vercel', 'auth.json'), 'utf-8'));
const TOKEN = auth.token;

/**
 * Charge server/.env dans process.env sans écraser ce qui est déjà défini.
 * Fichier absent ou illisible : on continue, l'appelant a pu tout exporter.
 */
function chargerEnvLocal() {
  let contenu;
  try {
    contenu = readFileSync(join(import.meta.dirname, '..', 'server', '.env'), 'utf-8');
  } catch {
    return;
  }
  for (const ligne of contenu.split('\n')) {
    const m = ligne.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    let valeur = m[2].trim();
    if ((valeur.startsWith('"') && valeur.endsWith('"')) || (valeur.startsWith("'") && valeur.endsWith("'"))) {
      valeur = valeur.slice(1, -1);
    }
    process.env[m[1]] = valeur;
  }
}

chargerEnvLocal();

// Valeurs non secrètes : elles peuvent rester en clair.
const ENV = {
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://charity-saas-free.vercel.app',
  PORT: process.env.PORT || '3001',
};

// Secrets : uniquement depuis l'environnement, jamais depuis ce fichier.
const REQUIS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
for (const cle of REQUIS) {
  if (!process.env[cle]) {
    console.error(`❌ ${cle} manquant. Exportez-la ou renseignez server/.env.`);
    process.exit(1);
  }
  ENV[cle] = process.env[cle];
}

async function setEnv(key, value) {
  const base = `https://api.vercel.com/v10/projects/${PROJECT}/env?teamId=${TEAM}`;
  const getUrl = `${base}&key=${key}`;
  try {
    const r = await fetch(getUrl, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (r.ok) {
      const d = await r.json();
      for (const e of (d.envs || [])) {
        await fetch(`https://api.vercel.com/v10/projects/${PROJECT}/env/${e.id}?teamId=${TEAM}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${TOKEN}` },
        });
      }
    }
  } catch {}

  const res = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, type: 'encrypted', target: ['production'] }),
  });

  if (res.ok) {
    console.log(`  ✅ ${key}`);
  } else {
    const t = await res.text();
    if (!t.includes('already exists')) console.log(`  ⚠️  ${key}: ${t.substring(0, 120)}`);
  }
}

async function main() {
  console.log('Configuring Vercel production environment...\n');
  for (const [k, v] of Object.entries(ENV)) {
    await setEnv(k, v);
  }
  console.log('\n✅ Done!');
}

main().catch(console.error);
