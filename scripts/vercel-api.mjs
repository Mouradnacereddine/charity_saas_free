#!/usr/bin/env node
/**
 * Set Vercel environment variables via the Vercel REST API.
 * Uses Vercel CLI token from ~/.vercel/auth.json
 */
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const VERCEL_PROJECT = 'charity-saas-free';
const VERCEL_TEAM = 'team_hblwAU8nYhkOJnHLT5AV9vsb';

// Read Vercel CLI auth token
const authPath = join(homedir(), '.vercel', 'auth.json');
const auth = JSON.parse(readFileSync(authPath, 'utf-8'));
const token = auth.token;

// Read Neon env vars
const envFile = '/tmp/neon-env.json';
const envVars = JSON.parse(readFileSync(envFile, 'utf-8'));

async function setVercelEnv(key, value) {
  const url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/env?teamId=${VERCEL_TEAM}`;

  for (const target of ['production', 'preview', 'development']) {
    try {
      // First try to get existing env to update
      const getUrl = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT}/env/${key}?teamId=${VERCEL_TEAM}`;
      const getRes = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (getRes.ok) {
        const existing = await getRes.json();
        // Delete existing first
        await fetch(`${getUrl}?teamId=${VERCEL_TEAM}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}

    // Create new
    const body = {
      key,
      value,
      type: 'encrypted',
      target: [target],
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      console.log(`  ✅ ${key} → ${target}`);
    } else {
      const err = await res.text();
      if (!err.includes('already exists')) {
        console.log(`  ⚠️  ${key} → ${target}: ${err.substring(0, 100)}`);
      }
    }
  }
}

async function main() {
  console.log('Setting Vercel environment variables...\n');

  for (const [key, value] of Object.entries(envVars)) {
    await setVercelEnv(key, value);
  }

  console.log('\n✅ All env vars configured!');
  console.log('Trigger deployment: vercel --prod');
}

main().catch(console.error);
