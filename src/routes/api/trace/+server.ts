// Streaming trace endpoint
// Generates the thinking trace with selected spirits

import type { RequestHandler } from './$types';
import { streamMessage, callClaude } from '$lib/services/claude';
import { buildSystemPromptFromSpirits, buildBlockContinuationPrompt } from '$lib/prompts/system';
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
  type DetectionResult,
} from '$lib/utils/detection';
import { loadSpirits, loadedSpiritToMethod } from '$lib/spirits/loader';
import type { DisclosureDepth } from '$lib/spirits/types';
import type { TraceLineInsert } from '$lib/types/database';
import { getSupabaseAdmin } from '$lib/services/supabase-admin';
import { dev } from '$app/environment';

// Session with TTL for cleanup
interface Session {
  query: string;
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

// Blocked cohesion mode (experimental)
const BLOCK_LINES = 6;
const BLOCK_MAX_TOKENS = 512;
const MAX_BLOCKS = 12;
const MIN_LINES = 24;
const MAX_CONTEXT_LINES = 20;

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

function getRecentLines(trace: string, maxLines: number): string {
  if (!trace) return '';
  const lines = trace.split('\n').filter(line => line.trim().length > 0);
  return lines.slice(-maxLines).join('\n');
}

function splitBlockLines(text: string, maxLines: number): string[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, maxLines);
}

function pickSpiritForSymbol(
  symbol: string,
  methods: { id: string; resonantSymbols: string[] }[],
  currentSpiritId: string | null
): string | null {
  const candidates = methods.filter(method => method.resonantSymbols?.includes(symbol));
  if (candidates.length === 0) return null;

  const withoutCurrent = currentSpiritId
    ? candidates.filter(candidate => candidate.id !== currentSpiritId)
    : candidates;

  const pool = withoutCurrent.length > 0 ? withoutCurrent : candidates;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick?.id ?? null;
}

export const POST: RequestHandler = async ({ request, locals, cookies, url }) => {
  const {
    query,
    methodIds,
    sessionId,
  } = await request.json() as {
    query: string;
    methodIds: string[];
    sessionId: string;
  };

  const session = await locals.getSession();
  const userId = session?.user?.id;

  // Dev mode auth bypass via cookie
  const devBypassAuth = dev && cookies.get('dev_bypass_auth') === '1';
  const useBlockMode = url.searchParams.get('cohesion') === 'block';

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

  // Load spirits from Skills.md format
  const spirits = await loadSpirits(methodIds, { depth: 1 });
  if (spirits.length === 0) {
    return new Response(JSON.stringify({ error: 'No valid spirits selected' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Convert to Method format for detection compatibility
  const methods = spirits.map(loadedSpiritToMethod);

  // Build system prompt from spirits
  const initialDepth: DisclosureDepth = 1;
  const systemPrompt = buildSystemPromptFromSpirits(spirits, initialDepth);

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
      console.log('[trace] Created trace:', traceId);
    }
  } else {
    // Dev bypass mode - no persistence, but generate a traceId for UI features
    traceId = crypto.randomUUID();
    persistenceError = 'dev_bypass'; // Flag that this is not actually persisted
    console.log('[trace] Dev bypass mode - skipping persistence, mock traceId:', traceId);
  }

  // Track whether we actually persisted (not just have a traceId)
  const actuallyPersisted = !!userId && !persistenceError;

  // Store session with TTL tracking
  const now = Date.now();
  sessions.set(sessionId, {
    query,
    trace: '',
    injections: [],
    traceId,
    createdAt: now,
    lastActivity: now,
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
          persisted: actuallyPersisted,
          error: persistenceError === 'dev_bypass' ? null : persistenceError,
          spiritIds: methodIds,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(statusEvent)}\n\n`));

        if (useBlockMode) {
          await runBlockCohesion({
            controller,
            encoder,
            query,
            methodIds,
            methods,
            spirits,
            sessionId,
            traceId,
            supabaseAdmin,
            actuallyPersisted,
            startTime,
          });
          return;
        }

        let buffer = '';
        let lineCount = 0;
        let symbolCount = 0;
        let previousMethodHint: string | null = null;
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
            }

            // Flag method shift for pacing only on actual transitions
            pacingContext.methodShifting = !!(methodHint && previousMethodHint && methodHint !== previousMethodHint);
            previousMethodHint = methodHint || previousMethodHint;

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

            // Queue line for batch insert (only if actually persisting)
            if (traceId && actuallyPersisted) {
              lineBatch.push({
                trace_id: traceId,
                sequence: lineCount,
                content: line,
                is_symbol: isSymbol,
                method_hint: methodHint,
                depth: detectionState.depthLevel,
                relative_time_ms: relativeTime,
                metadata: {
                  detectionSource: detectionResult.source,
                  confidence: detectionResult.confidence,
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
              depth: detectionState.depthLevel,
              relative_time_ms: Date.now() - startTime,
            });
          }
        }

        // Flush remaining lines (only if actually persisting)
        if (actuallyPersisted && lineBatch.length > 0 && supabaseAdmin) {
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
          persisted: actuallyPersisted && insertErrors.length === 0,
          lineCount,
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
        const message = error instanceof Error ? error.message : 'Stream failed';
        const errorEvent = { type: 'error', message };
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

async function runBlockCohesion(params: {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  query: string;
  methodIds: string[];
  methods: ReturnType<typeof loadedSpiritToMethod>[];
  spirits: Awaited<ReturnType<typeof loadSpirits>>;
  sessionId: string;
  traceId: string | null;
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin> | null;
  actuallyPersisted: boolean;
  startTime: number;
}): Promise<void> {
  const {
    controller,
    encoder,
    query,
    methodIds,
    methods,
    spirits,
    sessionId,
    traceId,
    supabaseAdmin,
    actuallyPersisted,
    startTime,
  } = params;

  let lineCount = 0;
  let symbolCount = 0;
  let previousMethodHint: string | null = null;
  const methodHintCounts: Record<string, number> = {};
  const lineBatch: TraceLineInsert[] = [];
  const BATCH_SIZE = 5;
  const insertErrors: string[] = [];
  const pacingContext: PacingContext = {
    consecutiveLines: 0,
    isClosing: false,
    methodShifting: false,
  };

  let detectionState: DetectionState = createDetectionState();
  const detectionMetrics: DetectionMetrics = createDetectionMetrics();

  const spiritById = new Map(spirits.map(spirit => [spirit.id, spirit]));
  const methodIndexById = new Map(methodIds.map((id, index) => [id, index]));

  let currentSpiritId = methodIds[0] ?? methods[0]?.id ?? null;
  if (!currentSpiritId) {
    throw new Error('No spirits available for block mode');
  }

  let completed = false;

  for (let blockIndex = 0; blockIndex < MAX_BLOCKS && !completed; blockIndex += 1) {
    const activeSpirit = spiritById.get(currentSpiritId);
    if (!activeSpirit) break;

    const allowClosure = lineCount >= MIN_LINES;
    const sessionData = sessions.get(sessionId);
    const recentLines = getRecentLines(sessionData?.trace ?? '', MAX_CONTEXT_LINES);
    const blockDepth = Math.max(1, Math.min(2, detectionState.depthLevel)) as DisclosureDepth;

    const systemPrompt = buildSystemPromptFromSpirits([activeSpirit], blockDepth);
    const blockPrompt = buildBlockContinuationPrompt({
      originalQuery: query,
      recentLines,
      spiritName: activeSpirit.name,
      linesPerBlock: BLOCK_LINES,
      allowClosure,
    });

    const blockText = await callClaude({
      system: systemPrompt,
      userMessage: blockPrompt,
      maxTokens: BLOCK_MAX_TOKENS,
    });

    const blockLines = splitBlockLines(blockText, BLOCK_LINES);
    if (blockLines.length === 0) break;

    let blockEndedWithSymbol = false;
    let nextSpiritId: string | null = null;

    for (let index = 0; index < blockLines.length; index += 1) {
      const line = blockLines[index];
      const isSymbol = isTransitionalSymbol(line);

      if (isSymbol) {
        symbolCount += 1;
        if (index === blockLines.length - 1) {
          blockEndedWithSymbol = true;
          nextSpiritId = pickSpiritForSymbol(line, methods, currentSpiritId);
          if (!nextSpiritId && methodIds.length > 0) {
            const currentIndex = methodIndexById.get(currentSpiritId) ?? -1;
            if (currentIndex >= 0) {
              nextSpiritId = methodIds[(currentIndex + 1) % methodIds.length];
            }
          }
        }
      }

      // Update pacing context
      if (isSymbol) {
        pacingContext.consecutiveLines = 0;
      } else {
        pacingContext.consecutiveLines += 1;
      }

      if (detectClosing(line)) {
        pacingContext.isClosing = true;
      }

      lineCount += 1;
      const relativeTime = Date.now() - startTime;

      const methodHint = isSymbol ? null : currentSpiritId;
      if (methodHint) {
        methodHintCounts[methodHint] = (methodHintCounts[methodHint] || 0) + 1;
      }

      pacingContext.methodShifting = !!(
        methodHint &&
        previousMethodHint &&
        methodHint !== previousMethodHint
      );
      previousMethodHint = methodHint || previousMethodHint;

      const prevState = detectionState;
      const detectionResult: DetectionResult = isSymbol
        ? { id: null, source: null }
        : { id: currentSpiritId, source: 'structure', confidence: 0.9 };

      detectionState = updateDetectionState(detectionState, line, detectionResult, methods);
      updateDetectionMetrics(detectionMetrics, detectionResult, detectionState, prevState);

      const event = {
        type: isSymbol ? 'symbol' : 'line',
        content: line,
        methodHint,
        lineNumber: lineCount,
        detectionSource: detectionResult.source,
        confidence: detectionResult.confidence,
        depthLevel: detectionState.depthLevel,
      };

      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      const sessionUpdate = sessions.get(sessionId);
      if (sessionUpdate) {
        sessionUpdate.trace += line + '\n';
        sessionUpdate.lastActivity = Date.now();
      }

      if (traceId && actuallyPersisted) {
        lineBatch.push({
          trace_id: traceId,
          sequence: lineCount,
          content: line,
          is_symbol: isSymbol,
          method_hint: methodHint,
          depth: detectionState.depthLevel,
          relative_time_ms: relativeTime,
          metadata: {
            detectionSource: detectionResult.source,
            confidence: detectionResult.confidence,
          },
        });

        if (lineBatch.length >= BATCH_SIZE && supabaseAdmin) {
          const { error: batchError } = await supabaseAdmin.from('trace_lines').insert(lineBatch);
          if (batchError) {
            console.error('Batch insert failed:', batchError);
            insertErrors.push(batchError.message);
          }
          lineBatch.length = 0;
        }
      }

      const delay = calculateDelay(line, pacingContext);
      await sleep(delay);

      if (isSymbol && line.trim() === '∎' && allowClosure) {
        completed = true;
        break;
      }
    }

    if (completed) break;

    if (blockEndedWithSymbol && nextSpiritId) {
      currentSpiritId = nextSpiritId;
    }
  }

  if (actuallyPersisted && lineBatch.length > 0 && supabaseAdmin) {
    const { error: finalBatchError } = await supabaseAdmin.from('trace_lines').insert(lineBatch);
    if (finalBatchError) {
      console.error('Final batch insert failed:', finalBatchError);
      insertErrors.push(finalBatchError.message);
    }
  }

  if (traceId && actuallyPersisted && supabaseAdmin) {
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

  sessions.delete(sessionId);

  const completeEvent = {
    type: 'complete',
    traceId,
    persisted: actuallyPersisted && insertErrors.length === 0,
    lineCount,
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
