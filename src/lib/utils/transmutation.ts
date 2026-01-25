// Spirit Transmutation - dialectical merging of two spirits into a hybrid
// The tension between them becomes central to the new voice

import type { Method } from '$lib/methods';

export interface TransmutationInput {
  spiritA: Method;
  spiritB: Method;
  name: string;
  slug: string;
}

export interface TransmutationResult {
  slug: string;
  name: string;
  source: string;
  color: string;
  letterSpacing: number;
  resonantSymbols: string[];
  vocabulary: string[];
  expandedVocabulary: string[];
  domains: string[];
  compatibleWith: string[];
  tensionsWith: string[];
  interjectionMode: 'interrupt' | 'harmonize' | 'gesture';
  promptContent: string;
}

// Blend two hex colors
export function blendColors(colorA: string, colorB: string, ratio = 0.5): string {
  const parseHex = (hex: string) => {
    const clean = hex.replace('#', '');
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  };

  const a = parseHex(colorA);
  const b = parseHex(colorB);

  const blend = (v1: number, v2: number) =>
    Math.round(v1 * (1 - ratio) + v2 * ratio);

  const r = blend(a.r, b.r);
  const g = blend(a.g, b.g);
  const blue = blend(a.b, b.b);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

// Union arrays with deduplication
function unionArrays<T>(a: T[], b: T[]): T[] {
  return [...new Set([...a, ...b])];
}

// Build the deterministic parts of the transmutation
export function buildTransmutationBase(input: TransmutationInput): Omit<TransmutationResult, 'promptContent'> {
  const { spiritA, spiritB, name, slug } = input;

  // Source attribution
  const source = `${spiritA.name} + ${spiritB.name}`;

  // Blend colors (equal parts)
  const color = blendColors(spiritA.color, spiritB.color);

  // Average letter spacing
  const letterSpacing = (spiritA.letterSpacing + spiritB.letterSpacing) / 2;

  // Union vocabularies
  const vocabulary = unionArrays(spiritA.vocabulary, spiritB.vocabulary);
  const expandedVocabulary = unionArrays(
    spiritA.expandedVocabulary || [],
    spiritB.expandedVocabulary || []
  );
  const resonantSymbols = unionArrays(spiritA.resonantSymbols, spiritB.resonantSymbols);

  // Union domains
  const domains = unionArrays(spiritA.domains, spiritB.domains);

  // Compatibility: union of both, excluding the source spirits
  const compatibleWith = unionArrays(spiritA.compatibleWith, spiritB.compatibleWith)
    .filter(id => id !== spiritA.id && id !== spiritB.id);

  // Tensions: the other spirit's tensions (transmutation resolves internal tension)
  const tensionsWith = unionArrays(spiritA.tensionsWith, spiritB.tensionsWith)
    .filter(id => id !== spiritA.id && id !== spiritB.id);

  // Hybrids tend toward harmonizing (they've already resolved their internal tension)
  const interjectionMode = 'harmonize' as const;

  return {
    slug,
    name,
    source,
    color,
    letterSpacing,
    resonantSymbols,
    vocabulary,
    expandedVocabulary,
    domains,
    compatibleWith,
    tensionsWith,
    interjectionMode,
  };
}

// Build the prompt for Claude to synthesize the hybrid prompt
export function buildSynthesisPrompt(spiritA: Method, spiritB: Method, hybridName: string): string {
  return `You are synthesizing a new philosophical voice from two source spirits. The hybrid inherits from both but is defined primarily by the TENSION between them—what was irreconcilable becomes the new spirit's distinctive perspective.

## Source Spirit A: ${spiritA.name}
${spiritA.source ? `Source: ${spiritA.source}` : ''}
Domains: ${spiritA.domains.join(', ')}
Vocabulary: ${spiritA.vocabulary.slice(0, 15).join(', ')}

Prompt content:
${spiritA.promptContent}

---

## Source Spirit B: ${spiritB.name}
${spiritB.source ? `Source: ${spiritB.source}` : ''}
Domains: ${spiritB.domains.join(', ')}
Vocabulary: ${spiritB.vocabulary.slice(0, 15).join(', ')}

Prompt content:
${spiritB.promptContent}

---

## Your Task

Create a prompt for the hybrid spirit "${hybridName}" that:

1. **Identifies the core tension** between ${spiritA.name} and ${spiritB.name}—what would they argue about? What cannot be easily resolved between their worldviews?

2. **Makes that tension productive**—the hybrid doesn't choose sides but holds both perspectives in dynamic relation, using the friction as a generative force.

3. **Synthesizes a new voice** that is neither A nor B but emerges from their dialectical encounter. It should feel like a genuine third position, not a compromise.

4. **Inherits key moves** from both sources—specific analytical gestures, vocabulary tendencies, ways of approaching problems.

Write ONLY the prompt content (no preamble, no explanation). The prompt should be 200-400 words, written in second person ("You are..."), and guide the spirit's analytical behavior. Include specific instructions for how this hybrid voice thinks and speaks.`;
}

// Parse Claude's response to extract just the prompt
export function parseSynthesizedPrompt(response: string): string {
  // Claude should return just the prompt, but clean up any wrapper text
  const cleaned = response
    .replace(/^(Here is|Here's|The prompt|Prompt:?)\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();

  return cleaned;
}
