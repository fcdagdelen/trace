// Spirit service - handles loading and merging of default and custom spirits
// Default spirits come from Skills.md files, custom spirits from database

import { getAllMethods, getMethodIds, type Method } from '$lib/methods';
import type { Spirit } from '$lib/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

// Re-export the Method type for convenience
export type { Method };

// Convert a database Spirit to the Method interface used throughout the app
export function spiritToMethod(spirit: Spirit): Method {
  return {
    id: spirit.slug,
    name: spirit.name,
    source: spirit.source || '',
    color: spirit.color,
    letterSpacing: spirit.letter_spacing,
    resonantSymbols: spirit.resonant_symbols,
    vocabulary: spirit.vocabulary,
    expandedVocabulary: spirit.expanded_vocabulary,
    domains: spirit.domains,
    compatibleWith: spirit.compatible_with,
    tensionsWith: spirit.tensions_with,
    promptContent: spirit.prompt_content,
  };
}

// Get default spirits (async, loads from Skills.md)
export async function getDefaultSpirits(): Promise<Method[]> {
  return getAllMethods();
}

// Get default spirit IDs
export function getDefaultSpiritIds(): string[] {
  return getMethodIds();
}

// Fetch user's custom spirits from database
export async function fetchUserSpirits(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Method[]> {
  const { data, error } = await supabase
    .from('spirits')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    if (!error.message?.includes('does not exist')) {
      console.warn('User spirits fetch:', error.message);
    }
    return [];
  }

  return (data || []).map(spiritToMethod);
}

// Fetch public spirits from database
export async function fetchPublicSpirits(
  supabase: SupabaseClient<Database>
): Promise<Method[]> {
  const { data, error } = await supabase
    .from('spirits')
    .select('*')
    .eq('is_public', true);

  if (error) {
    if (!error.message?.includes('does not exist')) {
      console.warn('Public spirits fetch:', error.message);
    }
    return [];
  }

  return (data || []).map(spiritToMethod);
}

// Fetch all available spirits for a user (defaults + their own + public)
export async function fetchAllSpirits(
  supabase: SupabaseClient<Database>,
  userId?: string
): Promise<Method[]> {
  const defaults = await getDefaultSpirits();

  // Build query for custom spirits
  let query = supabase.from('spirits').select('*');

  if (userId) {
    // User's own + public + system (null user_id)
    query = query.or(`user_id.eq.${userId},is_public.eq.true,user_id.is.null`);
  } else {
    // Just public + system
    query = query.or('is_public.eq.true,user_id.is.null');
  }

  const { data, error } = await query;

  if (error) {
    // Suppress expected errors when spirits table doesn't exist yet
    if (!error.message?.includes('does not exist')) {
      console.warn('Spirits fetch:', error.message);
    }
    return defaults;
  }

  const customSpirits = (data || []).map(spiritToMethod);

  // Merge: custom spirits can override defaults by slug
  const spiritMap = new Map<string, Method>();

  // Add defaults first
  for (const spirit of defaults) {
    spiritMap.set(spirit.id, spirit);
  }

  // Add custom spirits (will override defaults with same slug)
  for (const spirit of customSpirits) {
    spiritMap.set(spirit.id, spirit);
  }

  return Array.from(spiritMap.values());
}

// Get spirits by IDs from a pre-fetched list
export function getSpiritsFromList(ids: string[], spirits: Method[]): Method[] {
  return ids
    .map(id => spirits.find(s => s.id === id))
    .filter((s): s is Method => s !== undefined);
}

// Get spirit by ID from a pre-fetched list
export function getSpiritFromList(id: string, spirits: Method[]): Method | undefined {
  return spirits.find(s => s.id === id);
}
