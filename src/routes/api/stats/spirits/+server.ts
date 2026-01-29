import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';

export interface SpiritStat {
  spiritId: string;
  traceCount: number;
  lineCount: number;
  dominantCount: number;
}

// Mock data for dev mode
const MOCK_SPIRIT_STATS: SpiritStat[] = [
  { spiritId: 'herzog', traceCount: 12, lineCount: 340, dominantCount: 5 },
  { spiritId: 'benjamin', traceCount: 10, lineCount: 280, dominantCount: 4 },
  { spiritId: 'bateson', traceCount: 8, lineCount: 210, dominantCount: 3 },
  { spiritId: 'borges', traceCount: 7, lineCount: 190, dominantCount: 2 },
  { spiritId: 'wittgenstein', traceCount: 6, lineCount: 160, dominantCount: 2 },
];

export const GET: RequestHandler = async ({ locals, cookies }) => {
  // Dev bypass mode - return mock data
  const devBypass = dev && cookies.get('dev_bypass_auth') === '1';

  if (devBypass) {
    return json({
      spirits: MOCK_SPIRIT_STATS,
      totalTraces: 15,
    });
  }

  const session = await locals.getSession();

  if (!session?.user?.id) {
    throw error(401, 'Unauthorized');
  }

  const userId = session.user.id;

  // Get all traces for user with their spirit data
  const { data: traces, error: tracesError } = await locals.supabase
    .from('traces')
    .select('id, method_ids, dominant_method')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (tracesError) {
    throw error(500, tracesError.message);
  }

  if (!traces || traces.length === 0) {
    return json({ spirits: [], totalTraces: 0 });
  }

  // Aggregate spirit statistics
  const spiritStats = new Map<string, SpiritStat>();

  for (const trace of traces) {
    // Count trace appearances for each spirit
    const methodIds = trace.method_ids ?? [];
    for (const spiritId of methodIds) {
      if (!spiritStats.has(spiritId)) {
        spiritStats.set(spiritId, {
          spiritId,
          traceCount: 0,
          lineCount: 0,
          dominantCount: 0,
        });
      }
      spiritStats.get(spiritId)!.traceCount++;
    }

    // Count dominant appearances
    if (trace.dominant_method && spiritStats.has(trace.dominant_method)) {
      spiritStats.get(trace.dominant_method)!.dominantCount++;
    }
  }

  // Get line counts for more accurate frequency
  const traceIds = traces.map(t => t.id);

  const { data: lineCounts, error: linesError } = await locals.supabase
    .from('trace_lines')
    .select('method_hint')
    .in('trace_id', traceIds)
    .not('method_hint', 'is', null);

  if (!linesError && lineCounts) {
    for (const line of lineCounts) {
      if (line.method_hint && spiritStats.has(line.method_hint)) {
        spiritStats.get(line.method_hint)!.lineCount++;
      }
    }
  }

  // Sort by dominance count first, then trace count, then line count
  const sortedSpirits = Array.from(spiritStats.values())
    .sort((a, b) => {
      if (b.dominantCount !== a.dominantCount) return b.dominantCount - a.dominantCount;
      if (b.traceCount !== a.traceCount) return b.traceCount - a.traceCount;
      return b.lineCount - a.lineCount;
    });

  return json({
    spirits: sortedSpirits,
    totalTraces: traces.length,
  });
};
