// Kami-gami selection endpoint
// Analyzes the query and selects which methods will possess the trace

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { callClaude } from '$lib/services/claude';
import { ANALYZE_SYSTEM_PROMPT, buildAnalyzePrompt, parseMethodSelection } from '$lib/prompts/analyze';
import { getMethods } from '$lib/methods';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return json({ error: 'Query is required' }, { status: 400 });
    }

    // Call Claude to select methods
    const response = await callClaude({
      system: ANALYZE_SYSTEM_PROMPT,
      userMessage: buildAnalyzePrompt(query),
      maxTokens: 256,
    });

    // Parse the selection
    const methodIds = parseMethodSelection(response);
    const selectedMethods = getMethods(methodIds);

    return json({
      methodIds,
      methods: selectedMethods,
    });
  } catch (error) {
    console.error('Analyze error:', error);
    return json(
      { error: 'Failed to analyze query' },
      { status: 500 }
    );
  }
};
