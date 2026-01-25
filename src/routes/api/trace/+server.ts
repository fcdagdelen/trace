// Streaming trace endpoint
// Generates the thinking trace with selected methods
// Supports A/B testing between JSON and skills.md spirit formats

import type { RequestHandler } from './$types';
import { streamMessage } from '$lib/services/claude';
import { buildSystemPrompt, buildHybridSystemPrompt } from '$lib/prompts/system';
import { getMethods, type Method } from '$lib/methods';
import { isTransitionalSymbol } from '$lib/utils/symbols';
import { calculateDelay, detectClosing, type PacingContext } from '$lib/utils/pacing';
import {
  detectActiveSpirit,
  createDetectionState,
  updateDetectionState,
  createDetectionMetrics,
  updateDetectionMetrics,
  type DetectionState,
  type DetectionMetrics,
} from '$lib/utils/detection';
import { loadSpirits, hasSkillsFormat, loadedSpiritToMethod } from '$lib/spirits/loader';
import type { LoadedSpirit, DisclosureDepth } from '$lib/spirits/types';
import type { TraceLineInsert } from '$lib/types/database';
import { getSupabaseAdmin } from '$lib/services/supabase-admin';
import { dev } from '$app/environment';

// Spirit format for A/B testing
type SpiritFormat = 'json' | 'skills' | 'auto';

// Session with TTL for cleanup
interface Session {
  query: string;
  methods: Method[];
  trace: string;
  injections: string[];
  traceId: string | null;
  createdAt: number;
  lastActivity: number;
  spiritFormat: SpiritFormat;
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

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
  const {
    query,
    methodIds,
    sessionId,
    spiritFormat = 'auto'
  } = await request.json() as {
    query: string;
    methodIds: string[];
    sessionId: string;
    spiritFormat?: SpiritFormat;
  };

  const session = await locals.getSession();
  const userId = session?.user?.id;

  // Dev mode auth bypass via cookie
  const devBypassAuth = dev && cookies.get('dev_bypass_auth') === '1';

  if (!query || !methodIds || !sessionId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Require authentication for trace persistence (unless dev bypass)
  if (!userId && !devBypassAuth) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Load methods from legacy JSON format
  const jsonMethods = getMethods(methodIds);
  if (jsonMethods.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid methods selected' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Determine which spirits should use skills format
  const skillsSpiritIds = spiritFormat === 'json'
    ? [] // Force all JSON
    : methodIds.filter(id => spiritFormat === 'skills' || hasSkillsFormat(id));

  // Load skills-format spirits
  let skillsSpirits: LoadedSpirit[] = [];
  if (skillsSpiritIds.length > 0) {
    skillsSpirits = await loadSpirits(skillsSpiritIds, { format: 'skills', depth: 1 });
  }

  // Convert skills spirits to Method format for detection compatibility
  const skillsMethods = skillsSpirits.map(loadedSpiritToMethod);

  // Merge: use skills methods for those we loaded, JSON for the rest
  const methods: Method[] = jsonMethods.map(m => {
    const skillsVersion = skillsMethods.find(s => s.id === m.id);
    return skillsVersion || m;
  });

  // Build system prompt based on format
  let systemPrompt: string;
  const initialDepth: DisclosureDepth = 1;

  if (skillsSpirits.length > 0) {
    // Hybrid mode: mix of skills and JSON
    systemPrompt = buildHybridSystemPrompt(jsonMethods, skillsSpirits, initialDepth);
  } else {
    // Pure JSON mode
    systemPrompt = buildSystemPrompt(jsonMethods);
  }

  // Create trace record in Supabase using admin client (bypasses RLS)
  // Skip persistence in dev bypass mode without a real user
  let traceId: string | null = null;
  let persistenceError: string | null = null;
  const startTime = Date.now();

  // Only initialize admin client if we have a user (need persistence)
  const supabaseAdmin = userId ? getSupabaseAdmin() : null;

  if (userId && supabaseAdmin) {
    // Generate UUID client-side to avoid .select() which can trigger schema cache issues
    const generatedTraceId = crypto.randomUUID();

    const { error: traceError } = await supabaseAdmin
      .from('traces')
      .insert({
        id: generatedTraceId,
        user_id: userId,
        query,
        method_ids: methodIds,
        started_at: new Date().toISOString(),
      });

    if (traceError) {
      console.error('Failed to create trace:', JSON.stringify(traceError, null, 2));
      persistenceError = traceError.message;
    } else {
      traceId = generatedTraceId;
      console.log('[trace] Created trace:', traceId, 'format:', spiritFormat);
    }
  } else {
    // Dev bypass mode - no persistence
    console.log('[trace] Dev bypass mode - skipping persistence');
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
    spiritFormat,
  });

  // Ensure cleanup interval is running
  ensureCleanupInterval();

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial status event with persistence info
        const statusEvent = {
          type: 'status',
          traceId,
          persisted: !!traceId,
          error: persistenceError,
          spiritFormat,
          skillsSpirits: skillsSpiritIds,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusEvent)}\n\n`));

        let buffer = '';
        let lineCount = 0;
        let symbolCount = 0;
        let currentDepth = 0;
        const methodHintCounts: Record<string, number> = {};
        const lineBatch: TraceLineInsert[] = [];
        const BATCH_SIZE = 5;
        const insertErrors: string[] = [];
        const pacingContext: PacingContext = {
          consecutiveLines: 0,
          isClosing: false,
          methodShifting: false,
        };

        // Multi-signal spirit detection state and metrics
        let detectionState: DetectionState = createDetectionState();
        const detectionMetrics: DetectionMetrics = createDetectionMetrics();

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
            if (isSymbol) {
              symbolCount++;
              // Set recent symbol for next line's detection
              detectionState = { ...detectionState, recentSymbol: line.trim() };
            }

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

            // Multi-signal spirit detection
            const prevState = detectionState;
            const detectionResult = detectActiveSpirit(line, methods, detectionState);
            const methodHint = detectionResult.id;

            // Update detection state for next iteration
            detectionState = updateDetectionState(detectionState, line, detectionResult, methods);

            // Update metrics
            updateDetectionMetrics(detectionMetrics, detectionResult, detectionState, prevState);

            // Track for dominant method calculation
            if (methodHint) {
              methodHintCounts[methodHint] = (methodHintCounts[methodHint] || 0) + 1;
              // Flag method shift for pacing
              pacingContext.methodShifting = true;
            } else {
              pacingContext.methodShifting = false;
            }

            // Build SSE event
            const event = {
              type: isSymbol ? 'symbol' : 'line',
              content: line,
              methodHint,
              lineNumber: lineCount,
              detectionSource: detectionResult.source,
              confidence: detectionResult.confidence,
              depthLevel: detectionState.depthLevel,
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
                metadata: {
                  detectionSource: detectionResult.source,
                  confidence: detectionResult.confidence,
                  depthLevel: detectionState.depthLevel,
                },
              });

              // Flush batch if full
              if (lineBatch.length >= BATCH_SIZE && supabaseAdmin) {
                const { error: batchError } = await supabaseAdmin.from('trace_lines').insert(lineBatch);
                if (batchError) {
                  console.error('Batch insert failed:', batchError);
                  insertErrors.push(batchError.message);
                }
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
        if (traceId && lineBatch.length > 0 && supabaseAdmin) {
          const { error: finalBatchError } = await supabaseAdmin.from('trace_lines').insert(lineBatch);
          if (finalBatchError) {
            console.error('Final batch insert failed:', finalBatchError);
            insertErrors.push(finalBatchError.message);
          }
        }

        // Update trace with completion data
        if (traceId && supabaseAdmin) {
          const endTime = Date.now();
          const dominantMethod = Object.entries(methodHintCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

          const { error: updateError } = await supabaseAdmin
            .from('traces')
            .update({
              completed_at: new Date().toISOString(),
              total_duration_ms: endTime - startTime,
              line_count: lineCount,
              symbol_count: symbolCount,
              dominant_method: dominantMethod,
            })
            .eq('id', traceId);

          if (updateError) {
            console.error('Trace update failed:', updateError);
            insertErrors.push(updateError.message);
          }
        }

        // Clean up completed session
        sessions.delete(sessionId);

        // Send completion event with persistence status and metrics
        const completeEvent = {
          type: 'complete',
          traceId,
          persisted: !!traceId && insertErrors.length === 0,
          lineCount,
          spiritFormat,
          errors: insertErrors.length > 0 ? insertErrors : undefined,
          metrics: {
            symbolDetections: detectionMetrics.symbolDetections,
            structureDetections: detectionMetrics.structureDetections,
            rotationDetections: detectionMetrics.rotationDetections,
            depthEscalations: detectionMetrics.depthEscalations,
          },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeEvent)}\n\n`));
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
