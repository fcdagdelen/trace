<script lang="ts">
  import { SYMBOLS, SYMBOL_SEMANTICS, SYMBOL_DEPTH_DIRECTION } from '$lib/utils/symbols';

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  // Group symbols by depth direction
  const symbolEntries = Object.entries(SYMBOLS).map(([key, symbol]) => ({
    key,
    symbol,
    semantic: SYMBOL_SEMANTICS[symbol as keyof typeof SYMBOL_SEMANTICS] ?? '',
    depth: SYMBOL_DEPTH_DIRECTION[symbol as keyof typeof SYMBOL_DEPTH_DIRECTION] ?? 0,
  }));

  const descendingSymbols = symbolEntries.filter(s => s.depth === 1);
  const ascendingSymbols = symbolEntries.filter(s => s.depth === -1);
  const neutralSymbols = symbolEntries.filter(s => s.depth === 0);

  // Handle escape key
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={onClose} role="presentation">
  <div
    class="modal"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.key === 'Escape' && onClose()}
    role="dialog"
    aria-labelledby="legend-title"
    aria-modal="true"
    tabindex="-1"
  >
    <header class="modal-header">
      <h2 id="legend-title" class="modal-title">transitional symbols</h2>
      <button class="close-btn" onclick={onClose} aria-label="Close">
        <span aria-hidden="true">x</span>
      </button>
    </header>

    <div class="modal-content">
      <p class="intro">
        Esoteric punctuation marks the rhythm of thinking. Each symbol carries semantic weight in the flow of cognition.
      </p>

      <section class="symbol-group">
        <h3 class="group-title descend">descending</h3>
        <p class="group-desc">moves thought inward, deeper</p>
        <div class="symbols">
          {#each descendingSymbols as entry}
            <div class="symbol-entry">
              <span class="symbol">{entry.symbol}</span>
              <span class="semantic">{entry.semantic}</span>
            </div>
          {/each}
        </div>
      </section>

      <section class="symbol-group">
        <h3 class="group-title ascend">ascending</h3>
        <p class="group-desc">surfaces, returns, resolves</p>
        <div class="symbols">
          {#each ascendingSymbols as entry}
            <div class="symbol-entry">
              <span class="symbol">{entry.symbol}</span>
              <span class="semantic">{entry.semantic}</span>
            </div>
          {/each}
        </div>
      </section>

      <section class="symbol-group">
        <h3 class="group-title neutral">neutral</h3>
        <p class="group-desc">marks without depth change</p>
        <div class="symbols">
          {#each neutralSymbols as entry}
            <div class="symbol-entry">
              <span class="symbol">{entry.symbol}</span>
              <span class="semantic">{entry.semantic}</span>
            </div>
          {/each}
        </div>
      </section>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 150ms ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: var(--bg-color, #0d0d0d);
    border: 1px solid var(--border-color, #222);
    max-width: 480px;
    width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    animation: slideUp 200ms ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color, #222);
  }

  .modal-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: normal;
    color: var(--muted-color, #666);
    letter-spacing: 0.05em;
    margin: 0;
  }

  .close-btn {
    font-family: var(--font-mono);
    font-size: 1rem;
    color: var(--muted-color, #666);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    transition: color 150ms;
  }

  .close-btn:hover {
    color: var(--text-color, #e8e6e3);
  }

  .modal-content {
    padding: 1.5rem;
  }

  .intro {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #888);
    line-height: 1.6;
    margin: 0 0 1.5rem 0;
    font-style: italic;
  }

  .symbol-group {
    margin-bottom: 1.5rem;
  }

  .symbol-group:last-child {
    margin-bottom: 0;
  }

  .group-title {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: normal;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin: 0 0 0.25rem 0;
  }

  .group-title.descend {
    color: #7b9aff;
  }

  .group-title.ascend {
    color: #a3e4a3;
  }

  .group-title.neutral {
    color: #b8b8b8;
  }

  .group-desc {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--muted-color, #555);
    margin: 0 0 0.75rem 0;
  }

  .symbols {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 0.5rem;
  }

  .symbol-entry {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-color, #222);
  }

  .symbol {
    font-size: 1.25rem;
    color: var(--text-color, #e8e6e3);
    width: 1.5rem;
    text-align: center;
  }

  .semantic {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--muted-color, #888);
  }
</style>
