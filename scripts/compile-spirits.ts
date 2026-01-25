#!/usr/bin/env npx tsx

/**
 * compile-spirits.ts
 *
 * Build-time derivation script for spirit metadata.
 * Analyzes spirit content and generates compiled.json artifacts.
 *
 * Usage: npx tsx scripts/compile-spirits.ts [spirit-id]
 *   If no spirit-id provided, compiles all spirits with index.md files.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SPIRITS_DIR = join(__dirname, '..', 'src', 'lib', 'spirits');

// Types
interface StructuralSignature {
  sentenceLength: 'short' | 'medium' | 'long' | 'varied';
  punctuationDensity: 'sparse' | 'moderate' | 'dense';
  rhetoricalMoves: string[];
}

interface CompiledSpirit {
  derivedAt: string;
  version: string;
  color: string;
  letterSpacing: number;
  structuralSignature: StructuralSignature;
}

interface SpiritMeta {
  id: string;
  name: string;
  source: string;
  resonantSymbols: string[];
  domains: string[];
}

// Color derivation based on spirit domains and mood
const DOMAIN_COLORS: Record<string, string> = {
  experience: '#4a5568',    // slate
  observation: '#2d4a3e',   // forest green
  narrative: '#744210',     // amber brown
  documentary: '#2d4a3e',   // forest green
  truth: '#1a365d',         // deep blue
  failure: '#742a2a',       // deep red
  affect: '#4a3728',        // warm brown
  language: '#553c9a',      // purple
  structure: '#2c5282',     // blue
  love: '#97266d',          // magenta
  recognition: '#4a3728',   // warm brown
  memory: '#2d3748',        // dark gray
  image: '#285e61',         // teal
  fragment: '#744210',      // amber
  flow: '#276749',          // green
  escape: '#5a3d2b',        // dark brown
  clarity: '#4a5568',       // slate
  practice: '#4a5568',      // slate
  pattern: '#2c5282',       // blue
  relationship: '#4a5568',  // slate
  social: '#5a4a42',        // warm gray
  distance: '#4a5568',      // slate
  cycle: '#744210',         // amber
  history: '#2d3748',       // dark gray
  abstract: '#4a5568',      // slate
  myth: '#742a2a',          // deep red
  sacred: '#553c9a',        // purple
  infinite: '#1a365d',      // deep blue
  labyrinth: '#2d3748',     // dark gray
  trace: '#4a5568',         // slate
  absence: '#2d3748',       // dark gray
};

// Letter spacing based on voice characteristics
const SOURCE_SPACING: Record<string, number> = {
  // More formal/dense sources get tighter spacing
  'Tractatus': 0.01,
  'Of Grammatology': 0.015,
  'Anti-Oedipus': 0.02,
  'A Lover\'s Discourse': 0.015,
  'Mnemosyne Atlas': 0.018,
  'Arcades Project': 0.015,
  'Burden of Dreams': 0.02,
  'Steps to an Ecology': 0.018,
  'The Stranger': 0.02,
  'The Muqaddimah': 0.018,
  'Récoltes et Semailles': 0.015,
  'The Marriage of Cadmus': 0.018,
  'Ficciones': 0.02,
  'Into the Universe': 0.02,
};

/**
 * Parse YAML frontmatter from markdown content
 */
function parseYamlFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('No valid YAML frontmatter found');

  const yamlContent = match[1];
  const body = match[2];
  const meta: Record<string, unknown> = {};

  for (const line of yamlContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    if (value.startsWith('[') && value.endsWith(']')) {
      const items = value.slice(1, -1).split(',').map(item => {
        const cleaned = item.trim();
        return cleaned.replace(/^["']|["']$/g, '');
      });
      meta[key] = items;
    } else {
      meta[key] = value.replace(/^["']|["']$/g, '');
    }
  }

  return { meta, body };
}

/**
 * Derive color from spirit domains
 */
function deriveColor(domains: string[]): string {
  // Find first matching domain color
  for (const domain of domains) {
    const color = DOMAIN_COLORS[domain.toLowerCase()];
    if (color) return color;
  }
  return '#4a5568'; // default slate
}

/**
 * Derive letter spacing from source
 */
function deriveLetterSpacing(source: string): number {
  // Check exact match first
  if (SOURCE_SPACING[source]) {
    return SOURCE_SPACING[source];
  }

  // Check partial match
  for (const [key, spacing] of Object.entries(SOURCE_SPACING)) {
    if (source.toLowerCase().includes(key.toLowerCase())) {
      return spacing;
    }
  }

  return 0.02; // default
}

/**
 * Analyze content for structural signature
 */
function deriveStructuralSignature(body: string): StructuralSignature {
  // Extract non-metadata content
  const contentLines = body.split('\n').filter(line =>
    !line.startsWith('#') &&
    !line.startsWith('-') &&
    !line.match(/^\d+\./) &&
    line.trim().length > 0
  );

  const sentences = contentLines.join(' ')
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 0);

  // Analyze sentence length
  const avgWords = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length;
  const wordCounts = sentences.map(s => s.trim().split(/\s+/).length);
  const variance = Math.sqrt(
    wordCounts.reduce((sum, c) => sum + Math.pow(c - avgWords, 2), 0) / wordCounts.length
  );

  let sentenceLength: 'short' | 'medium' | 'long' | 'varied';
  if (variance > 8) {
    sentenceLength = 'varied';
  } else if (avgWords < 12) {
    sentenceLength = 'short';
  } else if (avgWords > 25) {
    sentenceLength = 'long';
  } else {
    sentenceLength = 'medium';
  }

  // Analyze punctuation density
  const fullText = contentLines.join(' ');
  const punctuationCount = (fullText.match(/[,;:—–-]/g) || []).length;
  const wordsCount = fullText.split(/\s+/).length;
  const punctDensity = punctuationCount / wordsCount;

  let punctuationDensity: 'sparse' | 'moderate' | 'dense';
  if (punctDensity < 0.1) {
    punctuationDensity = 'sparse';
  } else if (punctDensity > 0.2) {
    punctuationDensity = 'dense';
  } else {
    punctuationDensity = 'moderate';
  }

  // Detect rhetorical moves
  const rhetoricalMoves: string[] = [];

  // Juxtaposition: placing contrasting elements side by side
  if (/\bnot\s+\w+\s+but\b/i.test(fullText) || /\bneither\s+\w+\s+nor\b/i.test(fullText)) {
    rhetoricalMoves.push('juxtaposition');
  }

  // Deferral: delaying resolution, building tension
  if (/\b(perhaps|maybe|or rather|that is to say)\b/i.test(fullText)) {
    rhetoricalMoves.push('deferral');
  }

  // Return: circling back, repetition with variation
  if (/\b(return|again|once more|back to)\b/i.test(fullText)) {
    rhetoricalMoves.push('return');
  }

  // Accumulation: building through lists or series
  if ((fullText.match(/,/g) || []).length > sentences.length * 2) {
    rhetoricalMoves.push('accumulation');
  }

  // Aphorism: short declarative statements
  if (sentenceLength === 'short' || sentences.some(s => s.trim().split(/\s+/).length < 8)) {
    rhetoricalMoves.push('aphorism');
  }

  // Question: interrogative mode
  if (/\?/.test(fullText)) {
    rhetoricalMoves.push('interrogation');
  }

  // Negative definition: defining by what something is not
  if (/\bnot\s+\w+[,.]/.test(fullText) || /\bno\s+\w+[,.]/.test(fullText)) {
    rhetoricalMoves.push('negative-definition');
  }

  return {
    sentenceLength,
    punctuationDensity,
    rhetoricalMoves: [...new Set(rhetoricalMoves)], // dedupe
  };
}

/**
 * Compile a single spirit
 */
function compileSpirit(spiritDir: string): CompiledSpirit {
  const indexPath = join(spiritDir, 'index.md');

  if (!existsSync(indexPath)) {
    throw new Error(`No index.md found in ${spiritDir}`);
  }

  const content = readFileSync(indexPath, 'utf-8');
  const { meta, body } = parseYamlFrontmatter(content);

  const domains = (meta.domains as string[]) || [];
  const source = (meta.source as string) || '';

  // Generate content hash for versioning
  const contentHash = createHash('sha256')
    .update(content)
    .digest('hex')
    .slice(0, 8);

  const compiled: CompiledSpirit = {
    derivedAt: new Date().toISOString(),
    version: `1.0.0-${contentHash}`,
    color: deriveColor(domains),
    letterSpacing: deriveLetterSpacing(source),
    structuralSignature: deriveStructuralSignature(body),
  };

  return compiled;
}

/**
 * Get all spirit directories with index.md
 */
function getSpiritDirs(): string[] {
  const entries = readdirSync(SPIRITS_DIR, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => existsSync(join(SPIRITS_DIR, name, 'index.md')));
}

/**
 * Main compilation function
 */
function main(): void {
  const args = process.argv.slice(2);
  const targetSpirits = args.length > 0 ? args : getSpiritDirs();

  if (targetSpirits.length === 0) {
    console.log('No spirits found to compile.');
    console.log('Create a spirit directory with index.md at:');
    console.log(`  ${SPIRITS_DIR}/<spirit-id>/index.md`);
    return;
  }

  console.log(`Compiling ${targetSpirits.length} spirit(s)...\n`);

  for (const spiritId of targetSpirits) {
    const spiritDir = join(SPIRITS_DIR, spiritId);

    if (!existsSync(spiritDir)) {
      console.error(`  [SKIP] ${spiritId}: directory not found`);
      continue;
    }

    try {
      const compiled = compileSpirit(spiritDir);
      const outputPath = join(spiritDir, 'compiled.json');

      writeFileSync(outputPath, JSON.stringify(compiled, null, 2) + '\n');

      console.log(`  [OK] ${spiritId}`);
      console.log(`       color: ${compiled.color}`);
      console.log(`       letterSpacing: ${compiled.letterSpacing}`);
      console.log(`       sentenceLength: ${compiled.structuralSignature.sentenceLength}`);
      console.log(`       rhetoricalMoves: ${compiled.structuralSignature.rhetoricalMoves.join(', ')}`);
      console.log();
    } catch (error) {
      console.error(`  [ERR] ${spiritId}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('Done.');
}

main();
