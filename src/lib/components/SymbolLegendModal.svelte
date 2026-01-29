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
      <div class="header-content">
        <span class="header-glyph" aria-hidden="true">⁂</span>
        <h2 id="legend-title" class="modal-title">Transitional Symbols</h2>
      </div>
      <button class="close-btn" onclick={onClose} aria-label="Close">
        <span aria-hidden="true">×</span>
      </button>
    </header>

    <div class="modal-content">
      <p class="intro">
        Esoteric punctuation marks the rhythm of thinking. Each symbol carries semantic weight in the flow of cognition.
      </p>

      <section class="symbol-group">
        <div class="group-header descend">
          <span class="direction-icon">↓</span>
          <h3 class="group-title">Descending</h3>
        </div>
        <p class="group-desc">Moves thought inward, deeper</p>
        <div class="symbols">
          {#each descendingSymbols as entry, index}
            <div class="symbol-entry" style="--animation-delay: {index * 50}ms">
              <span class="symbol">{entry.symbol}</span>
              <span class="semantic">{entry.semantic}</span>
            </div>
          {/each}
        </div>
      </section>

      <section class="symbol-group">
        <div class="group-header ascend">
          <span class="direction-icon">↑</span>
          <h3 class="group-title">Ascending</h3>
        </div>
        <p class="group-desc">Surfaces, returns, resolves</p>
        <div class="symbols">
          {#each ascendingSymbols as entry, index}
            <div class="symbol-entry" style="--animation-delay: {(index + descendingSymbols.length) * 50}ms">
              <span class="symbol">{entry.symbol}</span>
              <span class="semantic">{entry.semantic}</span>
            </div>
          {/each}
        </div>
      </section>

      <section class="symbol-group">
        <div class="group-header neutral">
          <span class="direction-icon">→</span>
          <h3 class="group-title">Neutral</h3>
        </div>
        <p class="group-desc">Marks without depth change</p>
        <div class="symbols">
          {#each neutralSymbols as entry, index}
            <div class="symbol-entry" style="--animation-delay: {(index + descendingSymbols.length + ascendingSymbols.length) * 50}ms">
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
    background: rgba(5, 5, 6, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(var(--blur-sm, 4px));
    animation: backdropFadeIn 0.2s var(--ease-out, ease-out);
  }

  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: var(--bg-elevated, #0f0f11);
    border: 1px solid var(--border-strong, #2a2a30);
    border-radius: var(--radius-lg, 8px);
    max-width: 520px;
    width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: var(--shadow-xl, 0 16px 48px rgba(0, 0, 0, 0.7));
    animation: modalSlideIn 0.3s var(--ease-out, ease-out);
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md, 1rem) var(--space-lg, 1.5rem);
    border-bottom: 1px solid var(--border-color, #1f1f23);
    position: sticky;
    top: 0;
    background: var(--bg-elevated, #0f0f11);
    z-index: 1;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: var(--space-sm, 0.75rem);
  }

  .header-glyph {
    font-size: var(--font-size-lg, 1.25rem);
    color: var(--accent-color, #8aa4ff);
    opacity: 0.7;
  }

  .modal-title {
    font-family: var(--font-display, 'Cormorant Garamond', serif);
    font-size: var(--font-size-lg, 1.25rem);
    font-weight: 400;
    color: var(--text-color, #e8e6e3);
    letter-spacing: var(--tracking-wide, 0.02em);
    margin: 0;
  }

  .close-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg, 1.25rem);
    color: var(--muted-color, #6a6a6a);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-2xs, 0.25rem) var(--space-xs, 0.5rem);
    border-radius: var(--radius-sm, 2px);
    transition:
      color var(--duration-fast, 150ms),
      background var(--duration-fast, 150ms);
    line-height: 1;
  }

  .close-btn:hover {
    color: var(--text-color, #e8e6e3);
    background: var(--surface-color, #141416);
  }

  .modal-content {
    padding: var(--space-lg, 1.5rem);
  }

  .intro {
    font-family: var(--font-display, 'Cormorant Garamond', serif);
    font-size: var(--font-size-base, 1rem);
    font-style: italic;
    color: var(--muted-color, #6a6a6a);
    line-height: 1.6;
    margin: 0 0 var(--space-xl, 2rem) 0;
  }

  .symbol-group {
    margin-bottom: var(--space-xl, 2rem);
  }

  .symbol-group:last-child {
    margin-bottom: 0;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
    margin-bottom: var(--space-2xs, 0.25rem);
  }

  .direction-icon {
    font-size: var(--font-size-sm, 0.875rem);
    opacity: 0.6;
  }

  .group-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: var(--tracking-widest, 0.1em);
    margin: 0;
  }

  .group-header.descend {
    color: #7b9aff;
  }

  .group-header.ascend {
    color: #7ac47a;
  }

  .group-header.neutral {
    color: #b8b8b8;
  }

  .group-desc {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--muted-dim, #4a484a);
    margin: 0 0 var(--space-sm, 0.75rem) 0;
  }

  .symbols {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-xs, 0.5rem);
  }

  .symbol-entry {
    display: flex;
    align-items: center;
    gap: var(--space-sm, 0.75rem);
    padding: var(--space-xs, 0.5rem) var(--space-sm, 0.75rem);
    background: var(--surface-color, #141416);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-sm, 2px);
    transition:
      border-color var(--duration-fast, 150ms),
      background var(--duration-fast, 150ms);
    animation: entryFadeIn 0.3s var(--ease-out, ease-out) var(--animation-delay, 0ms) backwards;
  }

  @keyframes entryFadeIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .symbol-entry:hover {
    border-color: var(--border-strong, #2a2a30);
    background: var(--surface-elevated, #1a1a1d);
  }

  .symbol {
    font-size: var(--font-size-lg, 1.25rem);
    color: var(--text-color, #e8e6e3);
    width: 1.5rem;
    text-align: center;
    flex-shrink: 0;
  }

  .semantic {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--muted-color, #6a6a6a);
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
  }

  /* Mobile */
  @media (max-width: 640px) {
    .modal-content {
      padding: var(--space-md, 1rem);
    }

    .symbols {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
