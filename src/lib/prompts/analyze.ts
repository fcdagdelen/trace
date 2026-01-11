// Kami-gami selection prompt - choosing which methods will possess the thinking
import { methods, type Method } from '$lib/methods';

const methodSummaries = methods.map(m =>
  `- ${m.id}: ${m.name} (${m.source}) — domains: ${m.domains.join(', ')}`
).join('\n');

export const ANALYZE_SYSTEM_PROMPT = `You are a curator of philosophical methods. Given a question or fragment, you select 3-5 methods that will "possess" the thinking process.

Available methods:
${methodSummaries}

Selection criteria:
1. DOMAIN MATCH: Select methods whose domains resonate with the question's territory
2. PRODUCTIVE TENSION: Include at least one method that creates friction with others (not just compatibility)
3. COVERAGE: Ensure different scales/angles are represented
4. RESONANCE: Trust your sense of which methods "want" to speak to this question

You must respond with ONLY a JSON array of method IDs. No explanation, no commentary.
Example: ["barthes", "benjamin", "deleuze"]

Select 3-5 methods. No more, no less.`;

export function buildAnalyzePrompt(query: string): string {
  return `Question/fragment to analyze:

"${query}"

Respond with ONLY a JSON array of 3-5 method IDs that should possess the thinking on this question.`;
}

// Get random methods for fallback (ensures variety)
function getRandomMethods(count: number = 3): string[] {
  const allIds = methods.map(m => m.id);
  const shuffled = [...allIds].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// Parse the response into method IDs
export function parseMethodSelection(response: string): string[] {
  const validIds = methods.map(m => m.id);

  try {
    // Try to extract JSON array from the response
    const match = response.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string')) {
        const filtered = parsed.filter(id => validIds.includes(id));
        if (filtered.length >= 3) {
          return filtered;
        }
        console.warn('[analyze] Parsed array has insufficient valid methods:', {
          parsed,
          filtered,
          response: response.slice(0, 200),
        });
      }
    }
  } catch (error) {
    console.warn('[analyze] JSON parse failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      response: response.slice(0, 200),
    });
  }

  // Try to extract quoted strings as fallback
  try {
    const idMatches = response.match(/"([a-z-]+)"/g);
    if (idMatches) {
      const extracted = idMatches
        .map(m => m.replace(/"/g, ''))
        .filter(id => validIds.includes(id));
      if (extracted.length >= 3) {
        return extracted.slice(0, 5);
      }
    }
  } catch {
    // Continue to fallback
  }

  // Fallback: log and return random selection for variety
  console.warn('[analyze] Using random fallback selection. Response was:', response.slice(0, 200));
  return getRandomMethods(3);
}
