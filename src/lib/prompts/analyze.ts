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

// Parse the response into method IDs
export function parseMethodSelection(response: string): string[] {
  try {
    // Try to extract JSON array from the response
    const match = response.match(/\[[\s\S]*?\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string')) {
        // Validate that all IDs exist
        const validIds = methods.map(m => m.id);
        return parsed.filter(id => validIds.includes(id));
      }
    }
  } catch {
    // If parsing fails, try to extract quoted strings
    const idMatches = response.match(/"([a-z-]+)"/g);
    if (idMatches) {
      const validIds = methods.map(m => m.id);
      return idMatches
        .map(m => m.replace(/"/g, ''))
        .filter(id => validIds.includes(id));
    }
  }

  // Fallback: return a default selection
  return ['barthes', 'benjamin', 'deleuze'];
}
