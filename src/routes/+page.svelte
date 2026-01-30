<script lang="ts">
  import { onMount } from 'svelte';
  import InputArea from '$lib/components/InputArea.svelte';
  import TraceView from '$lib/components/TraceView.svelte';
  import InjectionModal from '$lib/components/InjectionModal.svelte';
  import LegendHud from '$lib/components/LegendHud.svelte';
  import SymbolLegendModal from '$lib/components/SymbolLegendModal.svelte';
  import SpiritSelector from '$lib/components/SpiritSelector.svelte';
  import SanctuaryScreen from '$lib/components/SanctuaryScreen.svelte';
  import ExportDropdown from '$lib/components/ExportDropdown.svelte';
  import { getDefaultSpirits } from '$lib/services/spirits';
  import { traceStore } from '$lib/stores/trace';
  import { sessionStore } from '$lib/stores/session';
  import { persistenceStore } from '$lib/stores/persistence';
  import { feedbackStore } from '$lib/stores/feedback';
  import { isPaidUser } from '$lib/stores/user';
  import { getDepthDirection } from '$lib/utils/symbols';
  import { exportToPdf, exportToMarkdown, copyToClipboard } from '$lib/utils/export';
  import { formatLargeInput } from '$lib/utils/truncate';
  import { createSupabaseBrowserClient } from '$lib/services/supabase';
  import { goto } from '$app/navigation';
  import type { Method } from '$lib/methods';
  import {
    savePartialTrace,
    loadPartialTrace,
    clearPartialTrace,
    markTraceComplete,
    getRecoveryAge,
    type RecoveryData,
  } from '$lib/utils/recovery';
  import { version } from '$app/environment';

  const supabase = createSupabaseBrowserClient();

  // Format version as Research Release (RR-major.minor.patch)
  // Major = year offset from 2025, Minor = month, Patch = day
  const formattedVersion = (() => {
    const ts = parseInt(version);
    if (!isNaN(ts) && ts > 1700000000000) {
      const d = new Date(ts);
      const major = d.getFullYear() - 2025;
      const minor = d.getMonth() + 1;
      const patch = d.getDate();
      return `RR-${major}.${minor}.${patch}`;
    }
    return `RR-${version.slice(0, 6)}`;
  })();

  async function handleLogout() {
    await supabase.auth.signOut();
    goto('/auth');
  }

  // State
  let showInjectionModal = $state(false);
  let showSymbolLegend = $state(false);
  let showSpiritSelector = $state(false);
  let userQuery = $state('');
  let pendingQuery = $state('');
  let currentDepth = $state(0);
  let exportError = $state<string | null>(null);
  let isExporting = $state(false);
  let isCopying = $state(false);
  let copySuccess = $state(false);
  let recoveryData = $state<RecoveryData | null>(null);
  let currentMethodIds = $state<string[]>([]);
  let currentTraceId = $state<string | null>(null);

  // Sanctuary/home state
  let showSanctuary = $state(true);

  // Available spirits (defaults for now, will fetch user's custom ones later)
  let availableSpirits = $state<Method[]>([]);

  // Check for recoverable trace on mount
  onMount(async () => {
    // Load spirits
    availableSpirits = await getDefaultSpirits();

    // Check for recoverable trace
    const saved = loadPartialTrace();
    if (saved && saved.lines.length > 0) {
      recoveryData = saved;
    }
  });

  // Save partial trace periodically during streaming
  $effect(() => {
    if ($traceStore.isStreaming && $traceStore.lines.length > 0) {
      const sessionId = $sessionStore?.id ?? '';
      savePartialTrace({
        query: userQuery,
        lines: $traceStore.lines,
        methodIds: currentMethodIds,
        sessionId,
        isComplete: false,
      });
    }
  });

  // Recover a saved trace
  function handleRecover() {
    if (!recoveryData) return;

    userQuery = recoveryData.query;

    // Create a new session
    const session = sessionStore.create(recoveryData.query);

    // Restore lines to store (mark as not streaming - just viewing)
    traceStore.reset();
    for (const line of recoveryData.lines) {
      traceStore.addLine(line);
    }

    // Clear recovery data
    recoveryData = null;
    clearPartialTrace();
  }

  // Dismiss recovery prompt
  function handleDismissRecovery() {
    recoveryData = null;
    clearPartialTrace();
  }

  // Derived state
  const isActive = $derived($traceStore.isStreaming || $traceStore.lines.length > 0);
  const formattedQuery = $derived(formatLargeInput(userQuery));

  // Exit sanctuary when trace becomes active
  $effect(() => {
    if (isActive) {
      showSanctuary = false;
    }
  });

  // Handle beginning a trace from sanctuary
  function handleBeginTrace() {
    showSanctuary = false;
  }

  // Handle keyboard shortcut for beginning trace from sanctuary
  function handleSanctuaryKeydown(event: KeyboardEvent) {
    if (showSanctuary && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleBeginTrace();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleSanctuaryKeydown);
    return () => window.removeEventListener('keydown', handleSanctuaryKeydown);
  });

  // Handle query submission
  // Free users: auto-select spirits directly
  // Paid users: show spirit selector modal
  function handleSubmit(query: string) {
    if ($isPaidUser) {
      // Paid users get the spirit selector
      pendingQuery = query;
      showSpiritSelector = true;
    } else {
      // Free users skip to auto-select
      userQuery = query;
      const session = sessionStore.create(query);
      traceStore.start(session.id, []);
      startTrace(query, session.id);
    }
  }

  // Handle manual spirit selection
  function handleSpiritSelect(selectedIds: string[]) {
    showSpiritSelector = false;
    userQuery = pendingQuery;

    // Create session and start trace
    const session = sessionStore.create(pendingQuery);
    traceStore.start(session.id, []);

    // Start trace with pre-selected spirits
    startTrace(pendingQuery, session.id, selectedIds);
  }

  // Handle auto-select (let Claude choose)
  function handleAutoSelect() {
    showSpiritSelector = false;
    userQuery = pendingQuery;

    // Create session and start trace
    const session = sessionStore.create(pendingQuery);
    traceStore.start(session.id, []);

    // Start trace without pre-selected spirits (Claude will choose)
    startTrace(pendingQuery, session.id);
  }

  // Cancel spirit selection
  function handleCancelSelection() {
    showSpiritSelector = false;
    pendingQuery = '';
  }

  async function startTrace(query: string, sessionId: string, preSelectedIds?: string[]) {
    try {
      let methodIds: string[];
      let methods: Method[];

      if (preSelectedIds && preSelectedIds.length > 0) {
        // Use pre-selected spirits
        methodIds = preSelectedIds;
        methods = availableSpirits.filter(s => preSelectedIds.includes(s.id));
      } else {
        // Let Claude select (kami-gami)
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (!analyzeResponse.ok) {
          throw new Error('Failed to analyze query');
        }

        const result = await analyzeResponse.json() as {
          methodIds: string[];
          methods: Method[];
        };
        methodIds = result.methodIds;
        methods = result.methods;
      }

      // Track method IDs for recovery
      currentMethodIds = methodIds;

      // Open SSE connection
      const cohesionMode =
        typeof window !== 'undefined' &&
        new URL(window.location.href).searchParams.get('cohesion') === 'block';
      const traceUrl = cohesionMode ? '/api/trace?cohesion=block' : '/api/trace';

      const response = await fetch(traceUrl, {
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

            if (data.type === 'status') {
              // Initial persistence status from server
              persistenceStore.start(data.traceId, data.error);
              currentTraceId = data.traceId;
            } else if (data.type === 'complete') {
              traceStore.complete();
              markTraceComplete();
              clearPartialTrace();
              persistenceStore.complete(data.persisted, data.lineCount, data.errors);
            } else if (data.type === 'error') {
              traceStore.setError(data.message);
              persistenceStore.fail(data.message);
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
      persistenceStore.fail(error instanceof Error ? error.message : 'Unknown error');
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

  // Export trace as styled PDF
  async function handleExportPdf() {
    const lines = $traceStore.lines;
    if (lines.length === 0 || isExporting) return;

    exportError = null;
    isExporting = true;

    try {
      const result = await exportToPdf({
        query: userQuery,
        lines,
      });

      if (!result.success) {
        exportError = result.error ?? 'Export failed';
        setTimeout(() => {
          exportError = null;
        }, 5000);
      }
    } finally {
      isExporting = false;
    }
  }

  // Export trace as markdown file
  function handleExportMarkdown() {
    const lines = $traceStore.lines;
    if (lines.length === 0) return;

    const result = exportToMarkdown({
      query: userQuery,
      lines,
    });

    if (!result.success) {
      exportError = result.error ?? 'Export failed';
      setTimeout(() => {
        exportError = null;
      }, 5000);
    }
  }

  // Copy trace to clipboard
  async function handleCopy() {
    const lines = $traceStore.lines;
    if (lines.length === 0 || isCopying) return;

    isCopying = true;
    copySuccess = false;

    try {
      const result = await copyToClipboard({
        query: userQuery,
        lines,
      });

      if (result.success) {
        copySuccess = true;
        setTimeout(() => {
          copySuccess = false;
        }, 2000);
      } else {
        exportError = result.error ?? 'Copy failed';
        setTimeout(() => {
          exportError = null;
        }, 5000);
      }
    } finally {
      isCopying = false;
    }
  }

  // Retry saving failed trace
  async function retrySave() {
    if (!currentTraceId || $persistenceStore.status === 'saving') return;

    // Re-attempt save via API
    persistenceStore.start(currentTraceId, null);
    try {
      const response = await fetch(`/api/traces/${currentTraceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retry: true }),
      });

      if (response.ok) {
        persistenceStore.complete(true, $traceStore.lines.length);
      } else {
        persistenceStore.fail('Retry failed');
      }
    } catch (error) {
      persistenceStore.fail(error instanceof Error ? error.message : 'Retry failed');
    }
  }

  // Reset trace state
  function handleReset() {
    traceStore.reset();
    sessionStore.clear();
    persistenceStore.reset();
    feedbackStore.reset();
    userQuery = '';
    currentDepth = 0;
    currentMethodIds = [];
    currentTraceId = null;
    showSanctuary = true;
    clearPartialTrace();
  }
</script>

<svelte:head>
  <title>trace</title>
  <meta name="description" content="watch thought unfold" />
</svelte:head>

<div class="terminal">
  <header class="header">
    <button class="header-brand" onclick={handleReset}>
      <span class="brand-glyph">◯</span>
      <span class="title">trace</span>
      <span class="version">{formattedVersion}</span>
    </button>
    <div class="header-actions">
      {#if $persistenceStore.status === 'saving'}
        <span class="persistence-indicator saving">
          <span class="indicator-dot"></span>
          saving
        </span>
      {:else if $persistenceStore.status === 'saved'}
        <span class="persistence-indicator saved">
          <span class="indicator-dot"></span>
          saved
        </span>
      {:else if $persistenceStore.status === 'failed' || $persistenceStore.status === 'partial'}
        <button
          class="persistence-indicator failed"
          onclick={retrySave}
          title="Click to retry"
        >
          <span class="indicator-dot"></span>
          {$persistenceStore.status === 'partial' ? 'partial' : 'unsaved'}
          <span class="retry-icon">↻</span>
        </button>
      {/if}
      <button class="header-btn icon-btn" onclick={() => showSymbolLegend = true} title="Symbol legend">
        <span class="btn-icon">⁂</span>
      </button>
      {#if $isPaidUser}
        <a href="/spirits/transmute" class="header-btn">transmute</a>
      {/if}
      <a href="/history" class="header-btn">history</a>
      {#if isActive}
        <ExportDropdown
          disabled={$traceStore.isStreaming}
          onExportPdf={handleExportPdf}
          onExportMarkdown={handleExportMarkdown}
          onCopy={handleCopy}
          {isExporting}
          {isCopying}
          {copySuccess}
        />
        <button class="header-btn" onclick={handleReset}>clear</button>
      {/if}
      <button class="header-btn logout" onclick={handleLogout} title="Sign out">exit</button>
    </div>
  </header>

  <main class="main">
    {#if recoveryData && !isActive}
      <!-- Recovery prompt -->
      <div class="recovery-banner">
        <div class="recovery-content">
          <span class="recovery-icon">◊</span>
          <div class="recovery-text">
            <span class="recovery-title">Interrupted trace found</span>
            <span class="recovery-meta">{recoveryData.lines.length} lines · {getRecoveryAge()}</span>
          </div>
        </div>
        <div class="recovery-actions">
          <button class="recovery-btn primary" onclick={handleRecover}>restore</button>
          <button class="recovery-btn" onclick={handleDismissRecovery}>dismiss</button>
        </div>
      </div>
    {/if}

    {#if showSpiritSelector}
      <!-- Spirit selection -->
      <div class="selector-wrapper">
        <div class="pending-query">
          <span class="prompt">›</span>
          <span class="query-preview">{pendingQuery}</span>
        </div>
        <SpiritSelector
          spirits={availableSpirits}
          onSelect={handleSpiritSelect}
          onAutoSelect={handleAutoSelect}
        />
        <button class="back-btn" onclick={handleCancelSelection}>← back</button>
      </div>
    {:else if showSanctuary && !isActive && !recoveryData}
      <!-- Sanctuary / Home screen -->
      <SanctuaryScreen onBeginTrace={handleBeginTrace} />
    {:else if !isActive}
      <!-- Initial input -->
      <div class="input-wrapper">
        <InputArea onSubmit={handleSubmit} disabled={$traceStore.isStreaming} />
      </div>
    {:else}
      <!-- Show user query as part of trace -->
      <div class="user-input">
        <span class="prompt">›</span>
        <span class="query" class:truncated={formattedQuery.isTruncated}>{formattedQuery.preview}{#if formattedQuery.indicator}<span class="char-count">{formattedQuery.indicator}</span>{/if}</span>
      </div>

      <!-- Trace output -->
      <TraceView onPause={handlePause} traceId={currentTraceId} />
    {/if}

    {#if $traceStore.error}
      <div class="error">{$traceStore.error}</div>
    {/if}

    {#if exportError}
      <div class="export-error">{exportError}</div>
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

{#if showSymbolLegend}
  <SymbolLegendModal onClose={() => showSymbolLegend = false} />
{/if}

<style>
  .terminal {
    display: flex;
    flex-direction: column;
    height: 100vh;
    height: 100dvh;
    background: var(--bg-color);
    animation: terminalFadeIn 0.6s var(--ease-out) forwards;
  }

  @keyframes terminalFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  /* ═══════════════════════════════════════════════════════════
     HEADER
     ═══════════════════════════════════════════════════════════ */

  .header {
    padding-block: var(--space-sm);
    padding-inline: var(--space-lg);
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-block-end: 1px solid var(--border-color);
    background: linear-gradient(
      180deg,
      var(--bg-elevated) 0%,
      var(--bg-color) 100%
    );
    position: relative;
    z-index: 10;
  }

  .header::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--border-strong) 50%,
      transparent 100%
    );
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: var(--space-2xs) var(--space-xs);
    margin: calc(-1 * var(--space-2xs)) calc(-1 * var(--space-xs));
    border-radius: var(--radius-sm);
    transition: background var(--duration-fast) var(--ease-out);
  }

  .header-brand:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .brand-glyph {
    font-size: var(--font-size-md);
    color: var(--accent-color);
    opacity: 0.6;
    animation: brandPulse 4s ease-in-out infinite;
  }

  @keyframes brandPulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
  }

  .title {
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: 300;
    color: var(--text-secondary);
    letter-spacing: var(--tracking-wider);
    text-transform: lowercase;
  }

  .version {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--muted-dim);
    margin-left: var(--space-2xs);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .header-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: var(--space-2xs) var(--space-xs);
    border-radius: var(--radius-sm);
    transition:
      color var(--duration-fast) var(--ease-out),
      background var(--duration-fast) var(--ease-out);
    text-decoration: none;
    position: relative;
  }

  .header-btn:hover:not(:disabled) {
    color: var(--text-color);
    background: rgba(255, 255, 255, 0.04);
  }

  .header-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .header-btn.icon-btn {
    font-size: var(--font-size-md);
    padding: var(--space-2xs);
    line-height: 1;
  }

  .header-btn.icon-btn .btn-icon {
    opacity: 0.7;
    transition: opacity var(--duration-fast);
  }

  .header-btn.icon-btn:hover .btn-icon {
    opacity: 1;
  }

  .header-btn.logout {
    margin-left: var(--space-sm);
    padding-left: var(--space-sm);
    border-left: 1px solid var(--border-color);
  }

  /* Persistence indicator */
  .persistence-indicator {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    padding: var(--space-2xs) var(--space-xs);
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.02);
  }

  .indicator-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .persistence-indicator.saving {
    color: var(--muted-color);
  }

  .persistence-indicator.saving .indicator-dot {
    animation: pulse 1s ease-in-out infinite;
  }

  .persistence-indicator.saved {
    color: var(--success-color);
  }

  .persistence-indicator.saved .indicator-dot {
    box-shadow: 0 0 6px var(--success-color);
  }

  .persistence-indicator.failed {
    color: var(--error-color);
    cursor: pointer;
    border: 1px solid transparent;
    transition:
      background var(--duration-fast) var(--ease-out),
      border-color var(--duration-fast) var(--ease-out);
  }

  .persistence-indicator.failed:hover {
    background: rgba(229, 115, 115, 0.1);
    border-color: var(--error-color);
  }

  .persistence-indicator.failed .indicator-dot {
    box-shadow: 0 0 6px var(--error-color);
  }

  .retry-icon {
    margin-left: var(--space-2xs);
    opacity: 0;
    transition: opacity var(--duration-fast);
  }

  .persistence-indicator.failed:hover .retry-icon {
    opacity: 1;
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN CONTENT
     ═══════════════════════════════════════════════════════════ */

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    width: min(85ch, 88vw);
    max-width: 100%;
    margin-inline: auto;
    padding: var(--space-xl);
    padding-block-end: var(--space-3xl);
  }

  .input-wrapper {
    padding-top: var(--space-xl);
    animation: fadeInUp 0.5s var(--ease-out) forwards;
    animation-delay: 0.1s;
    opacity: 0;
  }

  .selector-wrapper {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    padding-top: var(--space-md);
    animation: fadeInUp 0.4s var(--ease-out) forwards;
  }

  .pending-query {
    display: flex;
    gap: var(--space-sm);
    padding-block-end: var(--space-md);
    border-block-end: 1px solid var(--border-color);
  }

  .pending-query .prompt {
    font-family: var(--font-display);
    font-size: var(--font-size-xl);
    font-weight: 300;
    color: var(--accent-color);
    opacity: 0.7;
  }

  .pending-query .query-preview {
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--text-color);
    line-height: var(--line-height);
    opacity: 0.85;
  }

  .back-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: var(--space-xs) 0;
    text-align: left;
    transition: color var(--duration-fast);
    align-self: flex-start;
  }

  .back-btn:hover {
    color: var(--text-color);
  }

  /* User input display */
  .user-input {
    display: flex;
    gap: var(--space-sm);
    margin-block-end: var(--space-lg);
    padding-block-end: var(--space-md);
    border-block-end: 1px solid var(--border-color);
    position: relative;
  }

  .user-input::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      var(--accent-color) 0%,
      transparent 60%
    );
    opacity: 0.3;
  }

  .user-input .prompt {
    font-family: var(--font-display);
    font-size: var(--font-size-xl);
    font-weight: 300;
    color: var(--accent-color);
    opacity: 0.7;
    line-height: 1.4;
  }

  .user-input .query {
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--text-color);
    line-height: var(--line-height);
    white-space: pre-wrap;
  }

  .user-input .query.truncated {
    white-space: normal;
  }

  .user-input .char-count {
    display: inline-block;
    margin-left: var(--space-xs);
    padding: 0.1em var(--space-xs);
    font-size: var(--font-size-xs);
    color: var(--muted-color);
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    vertical-align: middle;
  }

  /* Error states */
  .error {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--error-color);
    padding-block: var(--space-md);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  .error::before {
    content: '⚠';
    opacity: 0.7;
  }

  .export-error {
    position: fixed;
    bottom: var(--space-xl);
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--error-color);
    background: var(--bg-color);
    border: 1px solid var(--error-color);
    padding: var(--space-sm) var(--space-lg);
    border-radius: var(--radius-md);
    z-index: 100;
    animation: fadeInUp 0.2s var(--ease-out) forwards;
    box-shadow: var(--shadow-lg);
  }

  /* Recovery banner */
  .recovery-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    margin-block-end: var(--space-lg);
    background: linear-gradient(
      135deg,
      rgba(138, 164, 255, 0.05) 0%,
      rgba(138, 164, 255, 0.02) 100%
    );
    border: 1px solid rgba(138, 164, 255, 0.3);
    border-radius: var(--radius-md);
    animation: fadeInDown 0.3s var(--ease-out) forwards;
  }

  .recovery-content {
    display: flex;
    align-items: center;
    gap: var(--space-md);
  }

  .recovery-icon {
    font-size: var(--font-size-xl);
    color: var(--accent-color);
    opacity: 0.7;
    animation: float 3s ease-in-out infinite;
  }

  .recovery-text {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  .recovery-title {
    font-family: var(--font-display);
    font-size: var(--font-size-base);
    font-weight: 400;
    color: var(--text-color);
    letter-spacing: var(--tracking-wide);
  }

  .recovery-meta {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--muted-color);
  }

  .recovery-actions {
    display: flex;
    gap: var(--space-sm);
  }

  .recovery-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    background: transparent;
    border: 1px solid var(--border-color);
    padding: var(--space-xs) var(--space-md);
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition:
      color var(--duration-fast),
      border-color var(--duration-fast),
      background var(--duration-fast);
  }

  .recovery-btn:hover {
    color: var(--text-color);
    border-color: var(--muted-color);
  }

  .recovery-btn.primary {
    color: var(--accent-color);
    border-color: var(--accent-color);
  }

  .recovery-btn.primary:hover {
    background: var(--accent-glow);
  }

  /* ═══════════════════════════════════════════════════════════
     RESPONSIVE
     ═══════════════════════════════════════════════════════════ */

  @media (max-width: 768px) {
    .header {
      padding-inline: var(--space-md);
      flex-wrap: nowrap;
      gap: var(--space-xs);
    }

    .version {
      display: none;
    }

    .header-actions {
      gap: var(--space-xs);
      flex-wrap: nowrap;
      justify-content: flex-end;
      overflow-x: auto;
      scrollbar-width: none;
      max-width: 65vw;
    }

    .header-actions::-webkit-scrollbar {
      display: none;
    }

    .header-btn {
      font-size: var(--font-size-xs);
      padding: var(--space-2xs) var(--space-2xs);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .header-btn.logout {
      margin-left: var(--space-xs);
      padding-left: var(--space-xs);
    }

    .main {
      padding: var(--space-md);
      padding-block-end: var(--space-2xl);
    }

    .recovery-banner {
      flex-direction: column;
      align-items: flex-start;
    }

    .recovery-actions {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
