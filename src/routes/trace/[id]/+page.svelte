<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import TraceLine from '$lib/components/TraceLine.svelte';
  import TransitionSymbol from '$lib/components/TransitionSymbol.svelte';
  import LegendHud from '$lib/components/LegendHud.svelte';
  import { exportToPdf } from '$lib/utils/export';
  import type { Trace, TraceLine as TraceLineType } from '$lib/types/database';

  let trace = $state<Trace | null>(null);
  let lines = $state<TraceLineType[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Playback state
  let isReplaying = $state(false);
  let replayIndex = $state(0);
  let displayedLines = $state<TraceLineType[]>([]);

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
      // Show all lines initially
      displayedLines = lines;
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
    // First line will be added by handleLineComplete being called initially
    if (lines.length > 0) {
      displayedLines = [lines[0]];
      replayIndex = 1;
    }
  }

  function handleLineComplete() {
    if (!isReplaying || replayIndex >= lines.length) {
      if (replayIndex >= lines.length) {
        isReplaying = false;
      }
      return;
    }

    // Add next line
    displayedLines = [...displayedLines, lines[replayIndex]];
    replayIndex++;
  }

  function stopReplay() {
    isReplaying = false;
    displayedLines = lines;
  }

  function handleExport() {
    if (!trace || lines.length === 0) return;

    exportToPdf({
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
          <button class="header-btn" onclick={stopReplay}>stop</button>
        {:else}
          <button class="header-btn" onclick={startReplay}>replay</button>
        {/if}
        <button class="header-btn" onclick={handleExport}>export</button>
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
          <span class="query-text">{trace.query}</span>
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
              content={line.content}
              methodHint={line.method_hint}
              depth={line.depth || 0}
              isNew={isReplaying && index === displayedLines.length - 1}
              onComplete={isReplaying && index === displayedLines.length - 1 ? handleLineComplete : undefined}
            />
          {/if}
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
</style>
