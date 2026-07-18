#!/usr/bin/env node
/**
 * Set Vercel production environment variables.
 */
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PROJECT = 'charity-saas-free';
const TEAM = 'team_hblwAU8nYhkOJnHLT5AV9vsb';
const auth = JSON.parse(readFileSync(join(homedir(), '.vercel', 'auth.json'), 'utf-8'));
const TOKEN = auth.token;

// Environment variables to set on Vercel
const ENV = {
  DATABASE_URL: 'postgresql://neondb_owner:npg_Ebn0AYy2DaNl@ep-fragrant-cloud-ah45kgbj-pooler.c-3.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require',
  JWT_SECRET: 'prod-secret-2026',
  JWT_REFRESH_SECRET: 'prod-refresh-secret-2026',
  FRONTEND_URL: 'https://charity-saas-free.vercel.app',
  PORT: '3001',
};

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
