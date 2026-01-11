<script lang="ts">
  import { onMount } from 'svelte';
  import type { Trace } from '$lib/types/database';

  type TracePreview = Pick<Trace, 'id' | 'query' | 'method_ids' | 'line_count' | 'symbol_count' | 'dominant_method' | 'total_duration_ms' | 'created_at'>;

  let traces = $state<TracePreview[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let total = $state(0);
  let offset = $state(0);
  const limit = 20;

  async function loadTraces() {
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/traces?limit=${limit}&offset=${offset}`);
      if (!response.ok) {
        throw new Error('Failed to load traces');
      }
      const data = await response.json();
      traces = data.traces;
      total = data.total;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Unknown error';
    } finally {
      loading = false;
    }
  }

  async function deleteTrace(id: string, event: MouseEvent) {
    event.stopPropagation();
    if (!confirm('Delete this trace?')) return;

    try {
      const response = await fetch(`/api/traces/${id}`, { method: 'DELETE' });
      if (response.ok) {
        traces = traces.filter(t => t.id !== id);
        total--;
      }
    } catch {
      // Silent fail
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function truncateQuery(query: string, maxLen = 60): string {
    if (query.length <= maxLen) return query;
    return query.slice(0, maxLen).trim() + '...';
  }

  function nextPage() {
    if (offset + limit < total) {
      offset += limit;
      loadTraces();
    }
  }

  function prevPage() {
    if (offset > 0) {
      offset = Math.max(0, offset - limit);
      loadTraces();
    }
  }

  onMount(loadTraces);
</script>

<svelte:head>
  <title>history | trace</title>
</svelte:head>

<div class="container">
  <header class="header">
    <a href="/" class="back">← trace</a>
    <span class="title">history</span>
    <span class="count">{total} traces</span>
  </header>

  <main class="main">
    {#if loading}
      <div class="loading">loading...</div>
    {:else if error}
      <div class="error">{error}</div>
    {:else if traces.length === 0}
      <div class="empty">
        <p>no traces yet</p>
        <a href="/">begin</a>
      </div>
    {:else}
      <ul class="trace-list">
        {#each traces as trace (trace.id)}
          <li class="trace-item">
            <a href="/trace/{trace.id}" class="trace-link">
              <div class="trace-query">{truncateQuery(trace.query)}</div>
              <div class="trace-meta">
                <span class="meta-item">{formatDate(trace.created_at)}</span>
                {#if trace.line_count}
                  <span class="meta-item">{trace.line_count} lines</span>
                {/if}
                {#if trace.dominant_method}
                  <span class="meta-item method">{trace.dominant_method}</span>
                {/if}
                {#if trace.total_duration_ms}
                  <span class="meta-item">{formatDuration(trace.total_duration_ms)}</span>
                {/if}
              </div>
            </a>
            <button class="delete-btn" onclick={(e) => deleteTrace(trace.id, e)}>×</button>
          </li>
        {/each}
      </ul>

      {#if total > limit}
        <div class="pagination">
          <button onclick={prevPage} disabled={offset === 0}>prev</button>
          <span class="page-info">{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
          <button onclick={nextPage} disabled={offset + limit >= total}>next</button>
        </div>
      {/if}
    {/if}
  </main>
</div>

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
    gap: 1.5rem;
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

  .title {
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    letter-spacing: 0.1em;
  }

  .count {
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    opacity: 0.6;
    margin-left: auto;
  }

  .main {
    flex: 1;
    width: min(85ch, 90vw);
    margin-inline: auto;
    padding: 2rem;
  }

  .loading,
  .error,
  .empty {
    text-align: center;
    padding: 4rem 1rem;
    color: var(--muted-color);
  }

  .empty a {
    display: inline-block;
    margin-top: 1rem;
    color: var(--accent-color);
  }

  .trace-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .trace-item {
    position: relative;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    transition: border-color 150ms, background 150ms;
  }

  .trace-item:hover {
    border-color: var(--muted-color);
    background: #1a1a1a;
  }

  .trace-link {
    display: block;
    padding: 1rem 1.25rem;
    padding-right: 2.5rem;
    text-decoration: none;
    color: inherit;
  }

  .trace-query {
    font-size: var(--font-size-base);
    color: var(--text-color);
    line-height: 1.4;
  }

  .trace-meta {
    display: flex;
    gap: 1rem;
    margin-top: 0.5rem;
    font-size: var(--font-size-sm);
    color: var(--muted-color);
  }

  .meta-item.method {
    color: var(--accent-color);
    opacity: 0.8;
  }

  .delete-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    width: 1.5rem;
    height: 1.5rem;
    background: transparent;
    border: none;
    color: var(--muted-color);
    font-size: 1.25rem;
    cursor: pointer;
    opacity: 0;
    transition: opacity 150ms, color 150ms;
  }

  .trace-item:hover .delete-btn {
    opacity: 0.6;
  }

  .delete-btn:hover {
    opacity: 1 !important;
    color: #e57373;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .pagination button {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    background: transparent;
    border: 1px solid var(--border-color);
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: color 150ms, border-color 150ms;
  }

  .pagination button:hover:not(:disabled) {
    color: var(--text-color);
    border-color: var(--muted-color);
  }

  .pagination button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .page-info {
    font-size: var(--font-size-sm);
    color: var(--muted-color);
  }
</style>
