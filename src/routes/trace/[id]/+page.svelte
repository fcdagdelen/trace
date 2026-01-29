<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import TraceLine from '$lib/components/TraceLine.svelte';
  import TransitionSymbol from '$lib/components/TransitionSymbol.svelte';
  import LegendHud from '$lib/components/LegendHud.svelte';
  import { exportToPdf } from '$lib/utils/export';
  import { formatLargeInput } from '$lib/utils/truncate';
  import { getMethodAsync, type Method } from '$lib/methods';
  import type { Trace, TraceLine as TraceLineType, TraceInjection } from '$lib/types/database';

  let trace = $state<Trace | null>(null);
  let lines = $state<TraceLineType[]>([]);
  let injections = $state<TraceInjection[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let isExporting = $state(false);

  // Playback state
  let isReplaying = $state(false);
  let isPaused = $state(false);
  let replayIndex = $state(0);
  let displayedLines = $state<TraceLineType[]>([]);

  // Speed options: value is the multiplier for delay
  const SPEED_OPTIONS = [
    { label: '0.5x', value: 2 },
    { label: '1x', value: 1 },
    { label: '2x', value: 0.5 },
    { label: '4x', value: 0.25 },
  ];
  let speedMultiplier = $state(1);

  // Format query for display (truncate if large)
  const formattedQuery = $derived(formatLargeInput(trace?.query || ''));

  // Methods map for display
  let methodsMap = $state<Map<string, Method>>(new Map());

  // Load methods for display when lines change
  async function loadMethodsForLines() {
    const methodIds = new Set<string>();
    lines.forEach(line => {
      if (line.method_hint) methodIds.add(line.method_hint);
    });

    const newMap = new Map<string, Method>();
    for (const id of methodIds) {
      const method = await getMethodAsync(id);
      if (method) {
        newMap.set(id, method);
      }
    }
    methodsMap = newMap;
  }

  // Derive unique methods used in this trace
  const usedMethods = $derived(() => {
    return Array.from(methodsMap.entries()).map(([id, method]) => ({
      id,
      method,
    }));
  });

  async function loadTrace() {
    const id = $page.params.id;
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/traces/${id}`);
      if (!response.ok) {
        throw new Error('Trace not found');
      }
      const data = await response.json();
      trace = data.trace;
      lines = data.lines;
      injections = data.injections || [];
      // Show all lines initially
      displayedLines = lines;
      // Load methods for display
      await loadMethodsForLines();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  function startReplay() {
    displayedLines = [];
    replayIndex = 0;
    isReplaying = true;
    isPaused = false;
    // First line will be added by handleLineComplete being called initially
    if (lines.length > 0) {
      displayedLines = [lines[0]];
      replayIndex = 1;
    }
  }

  function togglePause() {
    isPaused = !isPaused;
    if (!isPaused && replayIndex < lines.length) {
      // Resume by triggering next line
      handleLineComplete();
    }
  }

  function handleLineComplete() {
    if (!isReplaying || isPaused || replayIndex >= lines.length) {
      if (replayIndex >= lines.length) {
        isReplaying = false;
        isPaused = false;
      }
      return;
    }

    // Add next line
    displayedLines = [...displayedLines, lines[replayIndex]];
    replayIndex++;
  }

  function stopReplay() {
    isReplaying = false;
    isPaused = false;
    displayedLines = lines;
  }

  // Get injections that appear after a specific line
  function getInjectionsAfterLine(sequence: number): TraceInjection[] {
    return injections.filter(inj => inj.after_line_sequence === sequence);
  }

  async function handleExport() {
    if (!trace || lines.length === 0 || isExporting) return;

    isExporting = true;
    try {
      await exportToPdf({
        query: trace.query,
        lines: lines.map(l => ({
          id: l.id,
          content: l.content,
          isSymbol: l.is_symbol || false,
          methodHint: l.method_hint,
          timestamp: Date.now(),
          depth: l.depth || 0,
        })),
      });
    } finally {
      isExporting = false;
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  onMount(loadTrace);
</script>

<svelte:head>
  <title>{trace?.query ? trace.query.slice(0, 30) + '...' : 'trace'}</title>
</svelte:head>

<div class="container">
  <header class="header">
    <a href="/history" class="back">← history</a>
    <div class="header-actions">
      {#if !loading && !error && lines.length > 0}
        {#if isReplaying}
          <button class="header-btn" onclick={togglePause}>
            {isPaused ? 'resume' : 'pause'}
          </button>
          <button class="header-btn" onclick={stopReplay}>stop</button>
          <div class="speed-controls">
            {#each SPEED_OPTIONS as option}
              <button
                class="speed-btn"
                class:active={speedMultiplier === option.value}
                onclick={() => speedMultiplier = option.value}
              >
                {option.label}
              </button>
            {/each}
          </div>
          <span class="progress">{replayIndex}/{lines.length}</span>
        {:else}
          <button class="header-btn" onclick={startReplay}>replay</button>
          <button class="header-btn" onclick={handleExport} disabled={isExporting}>
            {isExporting ? 'exporting...' : 'export'}
          </button>
        {/if}
      {/if}
    </div>
  </header>

  <main class="main">
    {#if loading}
      <div class="loading">loading...</div>
    {:else if error}
      <div class="error">
        <p>{error}</p>
        <a href="/history">back to history</a>
      </div>
    {:else if trace}
      <div class="trace-header">
        <div class="query">
          <span class="prompt">›</span>
          <span class="query-text" class:truncated={formattedQuery.isTruncated}>{formattedQuery.preview}{#if formattedQuery.indicator}<span class="char-count">{formattedQuery.indicator}</span>{/if}</span>
        </div>
        <div class="meta">
          <span>{formatDate(trace.created_at)}</span>
          {#if trace.line_count}
            <span>{trace.line_count} lines</span>
          {/if}
          {#if trace.total_duration_ms}
            <span>{formatDuration(trace.total_duration_ms)}</span>
          {/if}
          {#if trace.dominant_method}
            <span class="method">{trace.dominant_method}</span>
          {/if}
        </div>
      </div>

      <!-- Method Legend -->
      {#if usedMethods().length > 0}
        <div class="method-legend">
          <span class="legend-label">methods:</span>
          {#each usedMethods() as { id, method }}
            <span class="legend-item" style="color: {method?.color || 'var(--muted-color)'}">
              {method?.name || id}
            </span>
          {/each}
        </div>
      {/if}

      <div class="trace-view">
        {#each displayedLines as line, index (line.id)}
          {#if line.is_symbol}
            <TransitionSymbol
              symbol={line.content}
              isNew={isReplaying && index === displayedLines.length - 1}
              onComplete={isReplaying && index === displayedLines.length - 1 ? handleLineComplete : undefined}
            />
          {:else}
            <TraceLine
              lineId={line.id}
              content={line.content}
              methodHint={line.method_hint}
              depth={line.depth || 0}
              isNew={isReplaying && index === displayedLines.length - 1}
              onComplete={isReplaying && index === displayedLines.length - 1 ? handleLineComplete : undefined}
            />
          {/if}
          <!-- Show injections after this line -->
          {#each getInjectionsAfterLine(line.sequence) as injection}
            <div class="injection">
              <span class="injection-marker">+</span>
              <span class="injection-content">{injection.content}</span>
            </div>
          {/each}
        {/each}
      </div>
    {/if}
  </main>
</div>

<LegendHud />

<style>
  .container {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--bg-color);
  }

  .header {
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-color);
  }

  .back {
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    text-decoration: none;
  }

  .back:hover {
    color: var(--text-color);
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  .header-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    transition: color 150ms;
  }

  .header-btn:hover {
    color: var(--text-color);
  }

  .main {
    flex: 1;
    width: min(85ch, 90vw);
    margin-inline: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
  }

  .loading,
  .error {
    text-align: center;
    padding: 4rem 1rem;
    color: var(--muted-color);
  }

  .error a {
    display: inline-block;
    margin-top: 1rem;
    color: var(--accent-color);
  }

  .trace-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .query {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .prompt {
    font-size: var(--font-size-lg);
    color: var(--accent-color);
    opacity: 0.8;
  }

  .query-text {
    font-size: var(--font-size-base);
    color: var(--text-color);
    line-height: 1.5;
  }

  .query-text.truncated {
    white-space: normal;
  }

  .query-text .char-count {
    display: inline-block;
    margin-left: 0.5em;
    padding: 0.1em 0.5em;
    font-size: 0.8em;
    color: var(--muted-color, #666);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color, #333);
    border-radius: 3px;
    vertical-align: middle;
  }

  .meta {
    display: flex;
    gap: 1rem;
    font-size: var(--font-size-sm);
    color: var(--muted-color);
  }

  .meta .method {
    color: var(--accent-color);
    opacity: 0.8;
  }

  .trace-view {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding-bottom: 4rem;
  }

  /* Speed controls */
  .speed-controls {
    display: flex;
    gap: 0.25rem;
    margin-left: 0.5rem;
    padding-left: 0.5rem;
    border-left: 1px solid var(--border-color);
  }

  .speed-btn {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--muted-color);
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 3px;
    padding: 0.15rem 0.35rem;
    cursor: pointer;
    transition: color 150ms, border-color 150ms, background 150ms;
  }

  .speed-btn:hover {
    color: var(--text-color);
    border-color: var(--muted-color);
  }

  .speed-btn.active {
    color: var(--text-color);
    background: var(--surface-color);
    border-color: var(--muted-color);
  }

  .progress {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    margin-left: 0.5rem;
  }

  /* Method legend */
  .method-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 0;
    margin-bottom: 1rem;
    font-size: var(--font-size-sm);
  }

  .legend-label {
    color: var(--muted-color);
    opacity: 0.6;
  }

  .legend-item {
    opacity: 0.8;
  }

  /* Injections */
  .injection {
    display: flex;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    background: rgba(107, 138, 253, 0.05);
    border-left: 2px solid var(--accent-color);
    border-radius: 0 4px 4px 0;
  }

  .injection-marker {
    color: var(--accent-color);
    font-weight: 600;
    opacity: 0.8;
  }

  .injection-content {
    color: var(--text-color);
    opacity: 0.9;
    font-style: italic;
  }
</style>
