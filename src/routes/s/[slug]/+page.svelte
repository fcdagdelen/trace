<script lang="ts">
  import TraceLine from '$lib/components/TraceLine.svelte';
  import TransitionSymbol from '$lib/components/TransitionSymbol.svelte';
  import { exportToPdf, exportToMarkdown, copyToClipboard } from '$lib/utils/export';
  import { formatLargeInput } from '$lib/utils/truncate';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  let isExporting = $state(false);
  let isCopying = $state(false);
  let copySuccess = $state(false);
  let exportError = $state<string | null>(null);

  // Format query for display
  const formattedQuery = $derived(formatLargeInput(data.trace?.query || ''));

  // Transform lines for export
  const exportLines = $derived(data.lines.map(l => ({
    id: l.id,
    content: l.content,
    isSymbol: l.is_symbol || false,
    methodHint: l.method_hint,
    timestamp: Date.now(),
    depth: l.depth || 0,
  })));

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async function handleExportPdf() {
    if (!data.trace || exportLines.length === 0 || isExporting) return;

    isExporting = true;
    try {
      await exportToPdf({
        query: data.trace.query,
        lines: exportLines,
      });
    } finally {
      isExporting = false;
    }
  }

  function handleExportMarkdown() {
    if (!data.trace || exportLines.length === 0) return;

    const result = exportToMarkdown({
      query: data.trace.query,
      lines: exportLines,
    });

    if (!result.success) {
      exportError = result.error ?? 'Export failed';
      setTimeout(() => { exportError = null; }, 5000);
    }
  }

  async function handleCopy() {
    if (!data.trace || exportLines.length === 0 || isCopying) return;

    isCopying = true;
    copySuccess = false;

    try {
      const result = await copyToClipboard({
        query: data.trace.query,
        lines: exportLines,
      });

      if (result.success) {
        copySuccess = true;
        setTimeout(() => { copySuccess = false; }, 2000);
      } else {
        exportError = result.error ?? 'Copy failed';
        setTimeout(() => { exportError = null; }, 5000);
      }
    } finally {
      isCopying = false;
    }
  }
</script>

<svelte:head>
  <title>{data.trace?.query ? data.trace.query.slice(0, 50) + '...' : 'shared trace'} | trace</title>
  <meta name="description" content="A philosophical trace exploring: {data.trace?.query?.slice(0, 100)}" />
</svelte:head>

<div class="container">
  <header class="header">
    <a href="/" class="brand">trace</a>
    <div class="header-actions">
      <button class="header-btn" onclick={handleCopy} disabled={isCopying}>
        {#if copySuccess}
          copied
        {:else if isCopying}
          ...
        {:else}
          copy
        {/if}
      </button>
      <button class="header-btn" onclick={handleExportMarkdown}>.md</button>
      <button class="header-btn" onclick={handleExportPdf} disabled={isExporting}>
        {isExporting ? '...' : '.pdf'}
      </button>
    </div>
  </header>

  <main class="main">
    {#if data.trace}
      <div class="trace-header">
        <div class="query">
          <span class="prompt">›</span>
          <span class="query-text" class:truncated={formattedQuery.isTruncated}>
            {formattedQuery.preview}
            {#if formattedQuery.indicator}
              <span class="char-count">{formattedQuery.indicator}</span>
            {/if}
          </span>
        </div>
        <div class="meta">
          <span>{formatDate(data.trace.created_at)}</span>
          {#if data.lines.length}
            <span>{data.lines.length} lines</span>
          {/if}
          {#if data.trace.dominant_method}
            <span class="method">{data.trace.dominant_method}</span>
          {/if}
        </div>
      </div>

      <div class="trace-view">
        {#each data.lines as line (line.id)}
          {#if line.is_symbol}
            <TransitionSymbol symbol={line.content} />
          {:else}
            <TraceLine
              lineId={line.id}
              content={line.content}
              methodHint={line.method_hint}
              depth={line.depth || 0}
            />
          {/if}
        {/each}
      </div>

      <footer class="footer">
        <span class="shared-badge">shared trace</span>
        <a href="/" class="cta">create your own →</a>
      </footer>
    {/if}
  </main>
</div>

{#if exportError}
  <div class="export-error">{exportError}</div>
{/if}

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

  .brand {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    text-decoration: none;
    letter-spacing: 0.1em;
    text-transform: lowercase;
  }

  .brand:hover {
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

  .header-btn:hover:not(:disabled) {
    color: var(--text-color);
  }

  .header-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .main {
    flex: 1;
    width: min(85ch, 90vw);
    margin-inline: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
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
    color: var(--muted-color);
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
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
    padding-bottom: 2rem;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 1.5rem;
    margin-top: auto;
    border-top: 1px solid var(--border-color);
  }

  .shared-badge {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    opacity: 0.6;
  }

  .cta {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--accent-color);
    text-decoration: none;
    transition: opacity 150ms;
  }

  .cta:hover {
    opacity: 0.8;
  }

  .export-error {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: #e57373;
    background: var(--bg-color);
    border: 1px solid #e57373;
    padding: 0.75rem 1.5rem;
    z-index: 100;
  }
</style>
