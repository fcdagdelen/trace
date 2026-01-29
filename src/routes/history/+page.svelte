<script lang="ts">
  import { onMount } from 'svelte';
  import { getAllMethods, type Method } from '$lib/methods';
  import type { Trace } from '$lib/types/database';

  type TracePreview = Pick<Trace, 'id' | 'query' | 'method_ids' | 'line_count' | 'symbol_count' | 'dominant_method' | 'total_duration_ms' | 'created_at'>;

  let traces = $state<TracePreview[]>([]);
  let methods = $state<Method[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let total = $state(0);
  let offset = $state(0);
  const limit = 20;

  // Filter state
  let searchQuery = $state('');
  let selectedMethod = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let showFilters = $state(false);

  // Debounced search
  let searchTimeout: ReturnType<typeof setTimeout>;

  function handleSearchInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    searchQuery = value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      offset = 0;
      loadTraces();
    }, 300);
  }

  async function loadTraces() {
    loading = true;
    error = null;

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (searchQuery) params.set('search', searchQuery);
      if (selectedMethod) params.set('method', selectedMethod);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const response = await fetch(`/api/traces?${params}`);
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

  function applyFilters() {
    offset = 0;
    loadTraces();
  }

  function clearFilters() {
    searchQuery = '';
    selectedMethod = '';
    dateFrom = '';
    dateTo = '';
    offset = 0;
    loadTraces();
  }

  // Check if any filters are active
  const hasActiveFilters = $derived(searchQuery || selectedMethod || dateFrom || dateTo);

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

  onMount(async () => {
    methods = await getAllMethods();
    await loadTraces();
  });
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
    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="search-row">
        <input
          type="text"
          placeholder="search traces..."
          value={searchQuery}
          oninput={handleSearchInput}
          class="search-input"
        />
        <button
          class="filter-toggle"
          class:active={showFilters}
          onclick={() => showFilters = !showFilters}
        >
          {showFilters ? '− filters' : '+ filters'}
        </button>
      </div>

      {#if showFilters}
        <div class="filter-panel">
          <div class="filter-group">
            <label for="method-filter">method</label>
            <select id="method-filter" bind:value={selectedMethod} onchange={applyFilters}>
              <option value="">all methods</option>
              {#each methods as method}
                <option value={method.id}>{method.id.charAt(0).toUpperCase() + method.id.slice(1)}</option>
              {/each}
            </select>
          </div>

          <div class="filter-group">
            <label for="date-from">from</label>
            <input type="date" id="date-from" bind:value={dateFrom} onchange={applyFilters} />
          </div>

          <div class="filter-group">
            <label for="date-to">to</label>
            <input type="date" id="date-to" bind:value={dateTo} onchange={applyFilters} />
          </div>

          {#if hasActiveFilters}
            <button class="clear-filters" onclick={clearFilters}>clear all</button>
          {/if}
        </div>
      {/if}
    </div>

    {#if loading}
      <div class="loading">loading...</div>
    {:else if error}
      <div class="error">{error}</div>
    {:else if traces.length === 0}
      <div class="empty">
        {#if hasActiveFilters}
          <p>no traces match your filters</p>
          <button onclick={clearFilters}>clear filters</button>
        {:else}
          <p>no traces yet</p>
          <a href="/">begin</a>
        {/if}
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
    animation: pageIn 0.4s var(--ease-out, ease-out);
  }

  @keyframes pageIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .header {
    padding: var(--space-sm, 0.75rem) var(--space-lg, 1.5rem);
    display: flex;
    align-items: center;
    gap: var(--space-lg, 1.5rem);
    border-bottom: 1px solid var(--border-color);
    background: linear-gradient(
      180deg,
      var(--bg-elevated, #0f0f11) 0%,
      var(--bg-color) 100%
    );
  }

  .back {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    text-decoration: none;
    transition: color var(--duration-fast, 150ms);
  }

  .back:hover {
    color: var(--text-color);
  }

  .title {
    font-family: var(--font-display, 'Cormorant Garamond', serif);
    font-size: var(--font-size-lg, 1.25rem);
    font-weight: 300;
    color: var(--text-secondary, #b8b5b0);
    letter-spacing: var(--tracking-wider, 0.05em);
  }

  .count {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-dim, #4a484a);
    margin-left: auto;
  }

  .main {
    flex: 1;
    width: min(85ch, 90vw);
    margin-inline: auto;
    padding: var(--space-xl, 2rem);
  }

  .loading,
  .error,
  .empty {
    text-align: center;
    padding: var(--space-3xl, 4rem) var(--space-md, 1rem);
    color: var(--muted-color);
    font-family: var(--font-mono);
  }

  .empty a,
  .empty button {
    display: inline-block;
    margin-top: var(--space-md, 1rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--accent-color);
    background: transparent;
    border: none;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .trace-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs, 0.5rem);
  }

  .trace-item {
    position: relative;
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md, 4px);
    transition:
      border-color var(--duration-fast, 150ms),
      background var(--duration-fast, 150ms),
      transform var(--duration-fast, 150ms);
    animation: itemIn 0.3s var(--ease-out, ease-out) backwards;
  }

  .trace-item:nth-child(1) { animation-delay: 0ms; }
  .trace-item:nth-child(2) { animation-delay: 30ms; }
  .trace-item:nth-child(3) { animation-delay: 60ms; }
  .trace-item:nth-child(4) { animation-delay: 90ms; }
  .trace-item:nth-child(5) { animation-delay: 120ms; }
  .trace-item:nth-child(n+6) { animation-delay: 150ms; }

  @keyframes itemIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .trace-item:hover {
    border-color: var(--border-strong, #2a2a30);
    background: var(--surface-elevated, #1a1a1d);
    transform: translateY(-1px);
  }

  .trace-link {
    display: block;
    padding: var(--space-md, 1rem) var(--space-lg, 1.25rem);
    padding-right: 2.5rem;
    text-decoration: none;
    color: inherit;
  }

  .trace-query {
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--text-color);
    line-height: 1.5;
  }

  .trace-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md, 1rem);
    margin-top: var(--space-xs, 0.5rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
  }

  .meta-item.method {
    color: var(--accent-color);
    opacity: 0.8;
  }

  .delete-btn {
    position: absolute;
    top: var(--space-sm, 0.75rem);
    right: var(--space-sm, 0.75rem);
    width: 1.5rem;
    height: 1.5rem;
    background: transparent;
    border: none;
    color: var(--muted-dim);
    font-size: 1.25rem;
    cursor: pointer;
    opacity: 0.3;
    border-radius: var(--radius-sm, 2px);
    transition:
      opacity var(--duration-fast, 150ms),
      color var(--duration-fast, 150ms),
      background var(--duration-fast, 150ms);
  }

  .trace-item:hover .delete-btn {
    opacity: 0.7;
  }

  .delete-btn:hover {
    opacity: 1 !important;
    color: var(--error-color, #e57373);
    background: rgba(229, 115, 115, 0.1);
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-md, 1rem);
    margin-top: var(--space-xl, 2rem);
    padding-top: var(--space-md, 1rem);
    border-top: 1px solid var(--border-color);
  }

  .pagination button {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    background: transparent;
    border: 1px solid var(--border-color);
    padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
    border-radius: var(--radius-sm, 2px);
    cursor: pointer;
    transition:
      color var(--duration-fast, 150ms),
      border-color var(--duration-fast, 150ms);
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
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
  }

  /* Filters */
  .filters-section {
    margin-bottom: var(--space-lg, 1.5rem);
  }

  .search-row {
    display: flex;
    gap: var(--space-sm, 0.75rem);
    align-items: center;
  }

  .search-input {
    flex: 1;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    padding: var(--space-xs, 0.5rem) var(--space-sm, 0.75rem);
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md, 4px);
    color: var(--text-color);
    transition:
      border-color var(--duration-fast, 150ms),
      box-shadow var(--duration-fast, 150ms);
  }

  .search-input::placeholder {
    color: var(--muted-dim, #4a484a);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent-dim, #6b8adb);
    box-shadow: var(--shadow-glow, 0 0 20px rgba(138, 164, 255, 0.15));
  }

  .filter-toggle {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md, 4px);
    padding: var(--space-xs, 0.5rem) var(--space-sm, 0.75rem);
    cursor: pointer;
    white-space: nowrap;
    transition:
      color var(--duration-fast, 150ms),
      border-color var(--duration-fast, 150ms);
  }

  .filter-toggle:hover,
  .filter-toggle.active {
    color: var(--text-color);
    border-color: var(--muted-color);
  }

  .filter-panel {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md, 1rem);
    align-items: flex-end;
    margin-top: var(--space-sm, 0.75rem);
    padding: var(--space-md, 1rem);
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md, 4px);
    animation: filterPanelIn 0.2s var(--ease-out, ease-out);
  }

  @keyframes filterPanelIn {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs, 0.25rem);
  }

  .filter-group label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--muted-color);
    letter-spacing: var(--tracking-wide, 0.02em);
  }

  .filter-group select,
  .filter-group input[type="date"] {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    padding: 0.4rem 0.5rem;
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm, 2px);
    color: var(--text-color);
    min-width: 140px;
  }

  .filter-group select:focus,
  .filter-group input[type="date"]:focus {
    outline: none;
    border-color: var(--accent-dim, #6b8adb);
  }

  .clear-filters {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    background: transparent;
    border: none;
    padding: 0.4rem 0.5rem;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
    transition: color var(--duration-fast, 150ms);
  }

  .clear-filters:hover {
    color: var(--text-color);
  }

  /* Mobile */
  @media (max-width: 640px) {
    .header {
      padding: var(--space-sm, 0.75rem) var(--space-md, 1rem);
      gap: var(--space-md, 1rem);
    }

    .main {
      padding: var(--space-md, 1rem);
    }

    .search-row {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-toggle {
      text-align: center;
    }

    .filter-panel {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-group {
      width: 100%;
    }

    .filter-group select,
    .filter-group input[type="date"] {
      width: 100%;
    }
  }
</style>
