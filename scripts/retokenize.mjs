#!/usr/bin/env node
// scripts/retokenize.mjs
// Retokenisation Phase 3 — transforme les classes Tailwind en dur
// vers les tokens du design system (palette chaude amber/terracotta).
//
// CONCEPTION (pour vous permettre de l'auditer) :
// - Substitution de classes ENTIERES (text-gray-500, bg-red-50...).
//   JAMAIS de remplacement sur mot court (jamais sur "red", "blue", etc.).
// - Substitutions idempotentes : passer deux fois ne casse rien.
// - Substitutions GLOBALES prudentes uniquement :
//     gray -> text-foreground / muted-foreground / border
//     primary-* -> primary
//     red/orange -> destructive (warning state)
//     green/emerald -> success
//     amber/yellow -> warning
//     white -> card
// - Hors-scope (laisse en place pour traitement manuel) :
//     ternaires avec state visuel (bg-emerald-100/text-emerald-800 etc.)
//     appels de couleur StatCard color='bg-X-500' (Cible 3 - refactor)
//     appels de helper (bg-success/10) qui n'existent pas encore comme
//     classes Tailwind -- il faut d'abord ajouter les alias dans
//     src/index.css (Cible 1).
//
// CARTES DE SUBSTITUTION (les plus sures, ~70% des occurrences) :
//   text-gray-{900,800}  -> text-foreground
//   text-gray-{700}      -> text-foreground
//   text-gray-{600,500,400,300,200} -> text-muted-foreground
//   bg-gray-{100,50}     -> bg-muted
//   bg-gray-{200}        -> bg-secondary
//   border-gray-{300,200,100,50} -> border-border
//   bg-white              -> bg-card
//   text-white            -> text-primary-foreground (preserve contrast on accent bg)
//
//   text-primary-{600,700,500,800} -> text-primary
//   bg-primary-{500,600,700}      -> bg-primary
//   border-primary-{500,600,700}  -> border-primary
//   bg-primary-{50}               -> bg-primary/10 (NEW ALIAS)
//   text-primary-{50}             -> text-primary
//
//   text-red-{700,600,500}  -> text-destructive
//   bg-red-{500,600}        -> bg-destructive
//   bg-red-{50}             -> bg-destructive/10
//   border-red-{200,300,400} -> border-destructive/30
//
//   text-emerald-{700,600} -> text-success-700
//   text-emerald-{500,800} -> text-success-500
//   bg-emerald-{50,100}     -> bg-success/10
//   border-emerald-{200}    -> border-success/30
//
//   text-green-{700,600}    -> text-success-700
//   text-green-{500,800}    -> text-success-500
//   bg-green-{50,100}       -> bg-success/10
//   border-green-{200,300}  -> border-success/30
//
//   text-amber-{700,800}    -> text-warning-700
//   text-amber-{500,600}    -> text-warning-500
//   bg-amber-{50}           -> bg-warning/10
//
//   text-yellow-{600,700,800} -> text-warning-600
//   bg-yellow-{100,50}      -> bg-warning/10
//   border-yellow-{300}     -> border-warning/30
//
// CAS HORS PORTEE (laisses en l'etat pour traitement cible ulterieur) :
//   - bg-blue/purple/orange/pink (StatCard color='bg-X-500')
//     -> necessite refactor du composant StatCard (Phase 4 du plan).
//   - bg-indigo-* (UsersPage badges)
//   - bg-purple-*, text-purple-* (Stats Banque/Cash)
//   - text-gray-* placeholders (laisse volontairement si incarne un etat)
//
// =====================================================================

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PAGES_DIR = new URL('../src/pages', import.meta.url).pathname;

// Mapping PRINCIPAL — sub de token en dur -> token semantique.
// Chaque cle est EXACTE, pas de regex permissive sur mot court.
const SUBSTITUTIONS = [
  // ── Texte gris → foreground ───────────────────────────
  [/\btext-gray-900\b/g, 'text-foreground'],
  [/\btext-gray-800\b/g, 'text-foreground'],
  [/\btext-gray-700\b/g, 'text-foreground'],
  [/\btext-gray-600\b/g, 'text-muted-foreground'],
  [/\btext-gray-500\b/g, 'text-muted-foreground'],
  [/\btext-gray-400\b/g, 'text-muted-foreground'],
  [/\btext-gray-300\b/g, 'text-muted-foreground'],
  [/\btext-gray-200\b/g, 'text-muted-foreground'],
  [/\btext-gray-100\b/g, 'text-muted-foreground'],

  // ── Fond gris → tokens bg ─────────────────────────────
  [/\bbg-gray-100\b/g, 'bg-muted'],
  [/\bbg-gray-50\b/g, 'bg-muted'],
  [/\bbg-gray-200\b/g, 'bg-secondary'],
  [/\bbg-white\b/g, 'bg-card'],

  // ── Bordure gris → border ─────────────────────────────
  [/\bborder-gray-300\b/g, 'border-border'],
  [/\bborder-gray-200\b/g, 'border-border'],
  [/\bborder-gray-100\b/g, 'border-border'],
  [/\bborder-gray-50\b/g, 'border-border'],
  [/\bborder-gray-400\b/g, 'border-border'],

  // ── Primary bleu (ancien) → primary token (nouveau: terracotta) ──
  // Preserve focus ring on primary-500
  [/\bring-primary-500\b/g, 'ring-ring'],
  [/\btext-primary-600\b/g, 'text-primary'],
  [/\btext-primary-700\b/g, 'text-primary'],
  [/\btext-primary-500\b/g, 'text-primary'],
  [/\btext-primary-800\b/g, 'text-primary'],
  [/\bbg-primary-600\b/g, 'bg-primary'],
  [/\bbg-primary-700\b/g, 'bg-primary'],
  [/\bbg-primary-500\b/g, 'bg-primary'],
  [/\bborder-primary-600\b/g, 'border-primary'],
  [/\bborder-primary-500\b/g, 'border-primary'],
  [/\bborder-primary-700\b/g, 'border-primary'],

  // ── Rouge → destructive (state danger) ─────────────────
  [/\btext-red-800\b/g, 'text-destructive'],
  [/\btext-red-700\b/g, 'text-destructive'],
  [/\btext-red-600\b/g, 'text-destructive'],
  [/\btext-red-500\b/g, 'text-destructive'],
  [/\bbg-red-500\b/g, 'bg-destructive'],
  [/\bbg-red-600\b/g, 'bg-destructive'],
  [/\bbg-red-50\b/g, 'bg-destructive/10'],
  [/\bbg-red-100\b/g, 'bg-destructive/10'],
  [/\bborder-red-200\b/g, 'border-destructive/30'],
  [/\bborder-red-300\b/g, 'border-destructive/30'],
  [/\bborder-red-400\b/g, 'border-destructive/30'],
  [/\btext-danger-500\b/g, 'text-destructive'],
  [/\bbg-danger-500\b/g, 'bg-destructive'],
  [/\bbg-danger-600\b/g, 'bg-destructive'],

  // ── Vert & Emeraude → success (state succes) ────────────
  [/\btext-emerald-800\b/g, 'text-success-700'],
  [/\btext-emerald-700\b/g, 'text-success-700'],
  [/\btext-emerald-600\b/g, 'text-success-600'],
  [/\btext-emerald-500\b/g, 'text-success-500'],
  [/\bbg-emerald-500\b/g, 'bg-success'],
  [/\bbg-emerald-600\b/g, 'bg-success'],
  [/\bbg-emerald-50\b/g, 'bg-success/10'],
  [/\bbg-emerald-100\b/g, 'bg-success/10'],
  [/\bborder-emerald-200\b/g, 'border-success/30'],
  [/\btext-green-800\b/g, 'text-success-700'],
  [/\btext-green-700\b/g, 'text-success-700'],
  [/\btext-green-600\b/g, 'text-success-600'],
  [/\btext-green-500\b/g, 'text-success-500'],
  [/\bbg-green-500\b/g, 'bg-success'],
  [/\bbg-green-600\b/g, 'bg-success'],
  [/\bbg-green-50\b/g, 'bg-success/10'],
  [/\bbg-green-100\b/g, 'bg-success/10'],
  [/\bbg-green-300\b/g, 'bg-success/30'],
  [/\bborder-green-200\b/g, 'border-success/30'],
  [/\bborder-green-300\b/g, 'border-success/30'],

  // ── Ambre & Jaune → warning ─────────────────────────────
  [/\btext-amber-800\b/g, 'text-warning-700'],
  [/\btext-amber-700\b/g, 'text-warning-700'],
  [/\btext-amber-600\b/g, 'text-warning-600'],
  [/\btext-amber-500\b/g, 'text-warning-500'],
  [/\bbg-amber-500\b/g, 'bg-warning'],
  [/\bbg-amber-400\b/g, 'bg-warning'],
  [/\bbg-amber-50\b/g, 'bg-warning/10'],
  [/\bbg-amber-100\b/g, 'bg-warning/10'],
  [/\bborder-amber-100\b/g, 'border-warning/30'],
  [/\bborder-amber-200\b/g, 'border-warning/30'],
  [/\bborder-amber-400\b/g, 'border-warning/30'],
  [/\btext-yellow-800\b/g, 'text-warning-700'],
  [/\btext-yellow-700\b/g, 'text-warning-700'],
  [/\btext-yellow-600\b/g, 'text-warning-600'],
  [/\bbg-yellow-500\b/g, 'bg-warning'],
  [/\bbg-yellow-50\b/g, 'bg-warning/10'],
  [/\bbg-yellow-100\b/g, 'bg-warning/10'],
  [/\bborder-yellow-300\b/g, 'border-warning/30'],

  // ── text-white conserve intentionnellement sur les fonds colores ──
  // (ne pas toucher sur bg-primary, bg-destructive, etc.)
];

// ┌──────────────────────────────────────────────────────────────────────┐
// │  ALIAS A AJOUTER dans src/index.css :root AVANT d'executer         │
// │  ce script (sinon les classes /10 /20 /30 ne fonctionneront pas).    │
// │                                                                      │
// │  --color-primary-50              -> oklch(0.97 0.04 35)              │
// │  --color-success-50              -> oklch(0.96 0.025 160)            │
// │  --color-success-100             -> oklch(0.93 0.05 160)             │
// │  --color-success-700             -> oklch(0.50 0.12 160)             │
// │  --color-warning-50              -> oklch(0.97 0.04 70)              │
// │  --color-warning-100             -> oklch(0.94 0.07 65)              │
// │  --color-warning-700             -> oklch(0.55 0.14 60)              │
// │  --color-destructive-50          -> oklch(0.96 0.04 27)              │
// │  --color-destructive-100         -> oklch(0.92 0.07 27)              │
// │  --color-destructive-30          -> oklch(0.65 0.18 27 / 30%)        │
// │  --color-success-30              -> oklch(0.65 0.10 80 / 30%)        │
// │  --color-warning-30              -> oklch(0.78 0.13 65 / 30%)        │
// └──────────────────────────────────────────────────────────────────────┘

// Parcours des fichiers de /src/pages
const files = readdirSync(PAGES_DIR).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));

let totalSubstitutions = 0;
const stats = new Map();

for (const file of files) {
  const filepath = join(PAGES_DIR, file);
  let content = readFileSync(filepath, 'utf8');
  const before = content;
  let fileSubstitutions = 0;

  for (const [pattern, replacement] of SUBSTITUTIONS) {
    const matches = content.match(pattern);
    if (!matches) continue;
    fileSubstitutions += matches.length;
    content = content.replace(pattern, replacement);
  }

  if (fileSubstitutions > 0) {
    writeFileSync(filepath, content, 'utf8');
    stats.set(file, fileSubstitutions);
    totalSubstitutions += fileSubstitutions;
    console.log(`✓ ${file.padEnd(35)} ${fileSubstitutions} substitutions`);
  } else {
    console.log(`  ${file.padEnd(35)} (aucune)`);
  }
}

console.log('');
console.log('─'.repeat(60));
console.log(`Total : ${totalSubstitutions} substitutions dans ${stats.size} fichiers.`);
console.log('─'.repeat(60));
console.log('');
console.log('IMPORTANT — TERNAIRES RESTANTS (traités au cas par cas) :');
console.log('  • bg-emerald-100/text-emerald-800 = balance positive');
console.log('  • color="bg-blue-500"/"bg-orange-500" = StatCard dynamic');
console.log('  • bg-blue-50/100/500 sur avatars/badges "info" decoratifs');
console.log('  • ternaires active tab dans BeneficiariesPage, FinancePage...');
console.log('');
console.log('Ces cas necessitent un traitement cible (Phase 4 du plan).');
