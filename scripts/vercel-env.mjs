#!/usr/bin/env node
/**
 * Set Vercel environment variables for production.
 * Reads from /tmp/neon-env.json (set Server-Side Protect / Write tool).
 */
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const envFile = '/tmp/neon-env.json';
const env = JSON.parse(readFileSync(envFile, 'utf-8'));

console.log('Setting Vercel production environment variables...');
console.log('');

for (const [key, value] of Object.entries(env)) {
  try {
    execSync(`echo "${value}" | vercel env add ${key} production --target production --yes`, {
      stdio: 'pipe',
      timeout: 10000,
    });
    console.log(`  ✅ ${key} set`);
  } catch (err) {
    // May already exist — try update instead
    try {
      execSync(`echo "${value}" | vercel env rm ${key} production --yes 2>/dev/null; echo "${value}" | vercel env add ${key} production --target production --yes`, {
        stdio: 'pipe',
        timeout: 15000,
      });
      console.log(`  ✅ ${key} updated`);
    } catch (err2) {
      console.error(`  ❌ ${key}: ${err2.message.substring(0, 100)}`);
    }
  }
}

console.log('');
console.log('Done. Trigger deployment with: vercel --prod');
