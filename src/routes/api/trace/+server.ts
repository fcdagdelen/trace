// Streaming trace endpoint
// Generates the thinking trace with selected methods

import type { RequestHandler } from './$types';
import { streamMessage } from '$lib/services/claude';
import { buildSystemPrompt } from '$lib/prompts/system';
import { getMethods, type Method } from '$lib/methods';
import { isTransitionalSymbol } from '$lib/utils/symbols';
import { calculateDelay, detectClosing, type PacingContext } from '$lib/utils/pacing';
import type { TraceLineInsert } from '$lib/types/database';

// Session with TTL for cleanup
interface Session {
  query: string;
  methods: Method[];
  trace: string;
  injections: string[];
  traceId: string | null;
  createdAt: number;
  lastActivity: number;
}

// In-memory session store with TTL-based cleanup
const sessions = new Map<string, Session>();

// Session TTL: 30 minutes of inactivity
const SESSION_TTL_MS = 30 * 60 * 1000;
// Cleanup interval: every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// Cleanup stale sessions
function cleanupStaleSessions(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastActivity > SESSION_TTL_MS) {
      sessions.delete(sessionId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[session-cleanup] Removed ${cleaned} stale sessions. Active: ${sessions.size}`);
  }
}

// Start cleanup interval (runs once per process)
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
function ensureCleanupInterval(): void {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupStaleSessions, CLEANUP_INTERVAL_MS);
    // Don't prevent process exit
    if (cleanupInterval.unref) {
      cleanupInterval.unref();
    }
  }
}

// Touch session to update last activity
function touchSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.lastActivity = Date.now();
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const { query, methodIds, sessionId } = await request.json();
  const session = await locals.getSession();
  const userId = session?.user?.id;

  if (!query || !methodIds || !sessionId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const methods = getMethods(methodIds);
  if (methods.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid methods selected' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create trace record in Supabase
  let traceId: string | null = null;
  const startTime = Date.now();

  if (userId) {
    const { data: traceData, error: traceError } = await locals.supabase
      .from('traces')
      .insert({
        user_id: userId,
        query,
        method_ids: methodIds,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (traceError) {
      console.error('Failed to create trace:', traceError);
    } else {
      traceId = traceData.id;
    }
  }

  // Store session with TTL tracking
  const now = Date.now();
  sessions.set(sessionId, {
    query,
    methods,
    trace: '',
    injections: [],
    traceId,
    createdAt: now,
    lastActivity: now,
  });

  // Ensure cleanup interval is running
  ensureCleanupInterval();

  const systemPrompt = buildSystemPrompt(methods);

  // Create SSE stream
  const encoder = new TextEncoder();
  const supabase = locals.supabase;
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let buffer = '';
        let lineCount = 0;
        let symbolCount = 0;
        let currentDepth = 0;
        const methodHintCounts: Record<string, number> = {};
        const lineBatch: TraceLineInsert[] = [];
        const BATCH_SIZE = 5;
        const pacingContext: PacingContext = {
          consecutiveLines: 0,
          isClosing: false,
          methodShifting: false,
        };

        const generator = streamMessage({
          system: systemPrompt,
          userMessage: query,
          maxTokens: 4096,
        });

        for await (const chunk of generator) {
          buffer += chunk;

          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            lineCount++;
            const relativeTime = Date.now() - startTime;

            // Detect if this is a symbol
            const isSymbol = isTransitionalSymbol(line);
            if (isSymbol) symbolCount++;

            // Update pacing context
            if (isSymbol) {
              pacingContext.consecutiveLines = 0;
            } else {
              pacingContext.consecutiveLines++;
            }

            // Detect closing
            if (detectClosing(line)) {
              pacingContext.isClosing = true;
            }

            // Detect method hints based on vocabulary
            const methodHint = detectMethodHint(line, methods);
            if (methodHint) {
              methodHintCounts[methodHint] = (methodHintCounts[methodHint] || 0) + 1;
            }

            // Build SSE event
            const event = {
              type: isSymbol ? 'symbol' : 'line',
              content: line,
              methodHint,
              lineNumber: lineCount,
            };

            // Send the event
            const sseData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseData));

            // Update session trace and touch for activity
            const sessionData = sessions.get(sessionId);
            if (sessionData) {
              sessionData.trace += line + '\n';
              sessionData.lastActivity = Date.now();
            }

            // Queue line for batch insert
            if (traceId) {
              lineBatch.push({
                trace_id: traceId,
                sequence: lineCount,
                content: line,
                is_symbol: isSymbol,
                method_hint: methodHint,
                depth: currentDepth,
                relative_time_ms: relativeTime,
              });

              // Flush batch if full
              if (lineBatch.length >= BATCH_SIZE) {
                await supabase.from('trace_lines').insert(lineBatch);
                lineBatch.length = 0;
              }
            }

            // Apply pacing delay
            const delay = calculateDelay(line, pacingContext);
            await sleep(delay);
          }
        }

        // Send any remaining buffer
        if (buffer.trim()) {
          lineCount++;
          const event = {
            type: 'line',
            content: buffer,
            methodHint: null,
            lineNumber: lineCount,
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

          // Add to batch
          if (traceId) {
            lineBatch.push({
              trace_id: traceId,
              sequence: lineCount,
              content: buffer,
              is_symbol: false,
              method_hint: null,
              depth: currentDepth,
              relative_time_ms: Date.now() - startTime,
            });
          }
        }

        // Flush remaining lines
        if (traceId && lineBatch.length > 0) {
          await supabase.from('trace_lines').insert(lineBatch);
        }

        // Update trace with completion data
        if (traceId) {
          const endTime = Date.now();
          const dominantMethod = Object.entries(methodHintCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

          await supabase
            .from('traces')
            .update({
              completed_at: new Date().toISOString(),
              total_duration_ms: endTime - startTime,
              line_count: lineCount,
              symbol_count: symbolCount,
              dominant_method: dominantMethod,
            })
            .eq('id', traceId);
        }

        // Clean up completed session
        sessions.delete(sessionId);

        // Send completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete' })}\n\n`));
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        // Clean up failed session
        sessions.delete(sessionId);
        const errorEvent = { type: 'error', message: 'Stream failed' };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
};

// Detect which method might be active based on vocabulary
// Requires 2+ vocabulary matches to reduce false positives, or 1 match for longer/rarer terms
function detectMethodHint(line: string, methods: Method[]): string | null {
  const lower = line.toLowerCase();

  let bestMatch: { id: string; score: number } | null = null;

  for (const method of methods) {
    let score = 0;

    for (const word of method.vocabulary) {
      const wordLower = word.toLowerCase();
      if (lower.includes(wordLower)) {
        // Weight longer words more heavily (more specific)
        const wordScore = wordLower.length >= 8 ? 2 : 1;
        score += wordScore;
      }
    }

    // Require minimum score of 2 (either 2 short words or 1 long/specific word)
    if (score >= 2 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: method.id, score };
    }
  }

  return bestMatch?.id ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Injection endpoint for mid-stream input
export const PATCH: RequestHandler = async ({ request }) => {
  const { sessionId, injection } = await request.json();

  const session = sessions.get(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  session.injections.push(injection);
  session.lastActivity = Date.now();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
