<script lang="ts">
  import InputArea from '$lib/components/InputArea.svelte';
  import TraceView from '$lib/components/TraceView.svelte';
  import InjectionModal from '$lib/components/InjectionModal.svelte';
  import LegendHud from '$lib/components/LegendHud.svelte';
  import { traceStore } from '$lib/stores/trace';
  import { sessionStore } from '$lib/stores/session';
  import { getDepthDirection } from '$lib/utils/symbols';
  import { exportToPdf } from '$lib/utils/export';
  import { createSupabaseBrowserClient } from '$lib/services/supabase';
  import { goto } from '$app/navigation';
  import type { Method } from '$lib/methods';

  const supabase = createSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    goto('/auth');
  }

  // State
  let showInjectionModal = $state(false);
  let userQuery = $state('');
  let currentDepth = $state(0);

  // Derived state
  const isActive = $derived($traceStore.isStreaming || $traceStore.lines.length > 0);

  // Start a new trace
  function handleSubmit(query: string) {
    userQuery = query;

    // Create session and start trace immediately (UI updates sync)
    const session = sessionStore.create(query);
    traceStore.start(session.id, []);

    // Then do async work
    startTrace(query, session.id);
  }

  async function startTrace(query: string, sessionId: string) {
    try {
      // First, get method selection (kami-gami)
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!analyzeResponse.ok) {
        throw new Error('Failed to analyze query');
      }

      const { methodIds, methods } = await analyzeResponse.json() as {
        methodIds: string[];
        methods: Method[];
      };

      // Open SSE connection
      const response = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          methodIds,
          sessionId,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to start trace');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          if (!event.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(event.slice(6));

            if (data.type === 'complete') {
              traceStore.complete();
            } else if (data.type === 'error') {
              traceStore.setError(data.message);
            } else if (data.type === 'line' || data.type === 'symbol') {
              // Update depth based on symbol direction
              if (data.type === 'symbol') {
                const direction = getDepthDirection(data.content);
                currentDepth = Math.max(0, Math.min(4, currentDepth + direction));
              }

              traceStore.addLine({
                id: crypto.randomUUID(),
                content: data.content,
                isSymbol: data.type === 'symbol',
                methodHint: data.methodHint,
                timestamp: Date.now(),
                depth: currentDepth,
              });
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (error) {
      console.error('Trace error:', error);
      traceStore.setError(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Handle pause
  function handlePause() {
    if ($traceStore.isStreaming && !$traceStore.isPaused) {
      traceStore.pause();
      showInjectionModal = true;
    }
  }

  // Handle injection
  async function handleInject(content: string) {
    const session = $sessionStore;
    if (!session) return;

    sessionStore.addInjection(content);
    showInjectionModal = false;

    // Send injection to server
    await fetch('/api/trace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        injection: content,
      }),
    });

    // Resume the trace
    traceStore.resume();
  }

  // Handle cancel injection
  function handleCancelInjection() {
    showInjectionModal = false;
    traceStore.resume();
  }

  // Reset and start new
  function handleReset() {
    traceStore.reset();
    sessionStore.clear();
    userQuery = '';
    currentDepth = 0;
  }

  // Export trace as styled PDF
  function handleExport() {
    const lines = $traceStore.lines;
    if (lines.length === 0) return;

    exportToPdf({
      query: userQuery,
      lines,
    });
  }
</script>

<svelte:head>
  <title>trace</title>
  <meta name="description" content="watch thought unfold" />
</svelte:head>

<div class="terminal">
  <header class="header">
    <span class="title">trace</span>
    <div class="header-actions">
      <a href="/history" class="header-btn">history</a>
      {#if isActive}
        <button class="header-btn" onclick={handleExport} disabled={$traceStore.isStreaming}>export</button>
        <button class="header-btn" onclick={handleReset}>clear</button>
      {/if}
      <button class="header-btn logout" onclick={handleLogout}>exit</button>
    </div>
  </header>

  <main class="main">
    {#if !isActive}
      <!-- Initial input -->
      <div class="input-wrapper">
        <InputArea onSubmit={handleSubmit} disabled={$traceStore.isStreaming} />
      </div>
    {:else}
      <!-- Show user query as part of trace -->
      <div class="user-input">
        <span class="prompt">›</span>
        <span class="query">{userQuery}</span>
      </div>

      <!-- Trace output -->
      <TraceView onPause={handlePause} />
    {/if}

    {#if $traceStore.error}
      <div class="error">{$traceStore.error}</div>
    {/if}
  </main>
</div>

{#if showInjectionModal}
  <InjectionModal
    onInject={handleInject}
    onCancel={handleCancelInjection}
  />
{/if}

<LegendHud />

<style>
  .terminal {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    background: var(--bg-color, #0d0d0d);
  }

  .header {
    padding-block: 0.75rem;
    padding-inline: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-block-end: 1px solid var(--border-color, #222);
  }

  .title {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #555);
    text-transform: lowercase;
    letter-spacing: 0.1em;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  .header-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #444);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    transition: color 150ms;
    text-decoration: none;
  }

  .header-btn:hover:not(:disabled) {
    color: var(--text-color, #e8e6e3);
  }

  .header-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .header-btn.logout {
    margin-left: 1rem;
    padding-left: 1rem;
    border-left: 1px solid var(--border-color, #222);
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;

    /* Centered column with responsive width */
    width: min(85ch, 80vw);
    max-width: 100%;
    margin-inline: auto;
    padding: 2rem;
    padding-block-end: 6rem;
  }

  .input-wrapper {
    padding-top: 2rem;
  }

  .user-input {
    display: flex;
    gap: 0.75rem;
    margin-block-end: 1.5rem;
    padding-block-end: 1rem;
    border-block-end: 1px solid var(--border-color, #222);
  }

  .user-input .prompt {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg, 1.25rem);
    color: var(--accent-color, #6b8afd);
    opacity: 0.8;
  }

  .user-input .query {
    font-family: var(--font-mono);
    font-size: var(--font-size-base, 1.125rem);
    color: var(--text-color, #e8e6e3);
    line-height: var(--line-height, 1.7);
    white-space: pre-wrap;
  }

  .error {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: #e57373;
    padding-block: 1rem;
  }
</style>
