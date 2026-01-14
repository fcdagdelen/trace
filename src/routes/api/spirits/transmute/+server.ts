// Spirit Transmutation API
// POST - Merge two spirits into a dialectical hybrid

import type { RequestHandler } from './$types';
import type { SpiritInsert } from '$lib/types/database';
import { callClaude } from '$lib/services/claude';
import { getDefaultSpirits, getSpiritFromList, fetchAllSpirits } from '$lib/services/spirits';
import {
  buildTransmutationBase,
  buildSynthesisPrompt,
  parseSynthesizedPrompt,
} from '$lib/utils/transmutation';

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.spiritA || !body.spiritB || !body.name || !body.slug) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: spiritA, spiritB, name, slug',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return new Response(JSON.stringify({
        error: 'Slug must be lowercase alphanumeric with hyphens only',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Can't transmute a spirit with itself
    if (body.spiritA === body.spiritB) {
      return new Response(JSON.stringify({
        error: 'Cannot transmute a spirit with itself',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch all available spirits to find the source spirits
    const allSpirits = await fetchAllSpirits(locals.supabase, userId);

    const spiritA = getSpiritFromList(body.spiritA, allSpirits);
    const spiritB = getSpiritFromList(body.spiritB, allSpirits);

    if (!spiritA) {
      return new Response(JSON.stringify({
        error: `Spirit not found: ${body.spiritA}`,
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!spiritB) {
      return new Response(JSON.stringify({
        error: `Spirit not found: ${body.spiritB}`,
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build the deterministic parts
    const base = buildTransmutationBase({
      spiritA,
      spiritB,
      name: body.name,
      slug: body.slug,
    });

    // Use Claude to synthesize the prompt
    const synthesisPrompt = buildSynthesisPrompt(spiritA, spiritB, body.name);

    const synthesizedResponse = await callClaude({
      system: 'You are an expert at synthesizing philosophical voices. You create clear, distinctive prompts that guide analytical thinking. Output only the requested prompt, no explanations.',
      userMessage: synthesisPrompt,
      maxTokens: 1024,
    });

    const promptContent = parseSynthesizedPrompt(synthesizedResponse);

    if (!promptContent || promptContent.length < 50) {
      return new Response(JSON.stringify({
        error: 'Failed to synthesize spirit prompt',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create the hybrid spirit in the database
    const spirit: SpiritInsert = {
      user_id: userId,
      slug: base.slug,
      name: base.name,
      source: base.source,
      color: base.color,
      letter_spacing: base.letterSpacing,
      resonant_symbols: base.resonantSymbols,
      vocabulary: base.vocabulary,
      expanded_vocabulary: base.expandedVocabulary,
      domains: base.domains,
      compatible_with: base.compatibleWith,
      tensions_with: base.tensionsWith,
      interjection_mode: base.interjectionMode,
      prompt_content: promptContent,
      is_public: false,
      is_premium: false,
    };

    const { data, error } = await locals.supabase
      .from('spirits')
      .insert(spirit)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return new Response(JSON.stringify({
          error: 'A spirit with this slug already exists',
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.error('Failed to create transmuted spirit:', error);
      return new Response(JSON.stringify({ error: 'Failed to create spirit' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      spirit: data,
      synthesis: {
        sourceA: spiritA.name,
        sourceB: spiritB.name,
        promptContent,
      },
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
