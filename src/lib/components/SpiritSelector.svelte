<script lang="ts">
  import type { Method } from '$lib/methods';
  import { SPIRIT_TYPOGRAPHY } from '$lib/utils/typography';

  interface Props {
    spirits: Method[];
    onSelect: (selectedIds: string[]) => void;
    onAutoSelect: () => void;
    maxSelections?: number;
  }

  let { spirits, onSelect, onAutoSelect, maxSelections = 5 }: Props = $props();

  let selectedIds = $state<Set<string>>(new Set());

  function toggleSpirit(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else if (newSelected.size < maxSelections) {
      newSelected.add(id);
    }
    selectedIds = newSelected;
  }

  function handleConfirm() {
    if (selectedIds.size > 0) {
      onSelect(Array.from(selectedIds));
    }
  }

  // Get spirit typography for glyph and color
  function getSpiritVisuals(id: string) {
    const typo = SPIRIT_TYPOGRAPHY[id];
    return {
      glyph: typo?.glyph || '◯',
      glowColor: typo?.glowColor || '#888',
      animationStyle: typo?.animationStyle || 'breathe',
    };
  }

  const canConfirm = $derived(selectedIds.size > 0);
</script>

<div class="spirit-selector">
  <header class="selector-header">
    <div class="header-content">
      <h2 class="title">summon spirits</h2>
      <p class="subtitle">select 1-{maxSelections} spirits to possess this trace</p>
    </div>
    <button class="auto-btn" onclick={onAutoSelect}>
      <span class="auto-icon">◯</span>
      let them choose
    </button>
  </header>

  <div class="spirits-grid">
    {#each spirits as spirit, index (spirit.id)}
      {@const visuals = getSpiritVisuals(spirit.id)}
      <button
        class="spirit-card"
        class:selected={selectedIds.has(spirit.id)}
        onclick={() => toggleSpirit(spirit.id)}
        style="
          --spirit-color: {spirit.color};
          --spirit-glow: {visuals.glowColor};
          --animation-delay: {index * 50}ms;
        "
      >
        <div class="spirit-glyph" aria-hidden="true">{visuals.glyph}</div>
        <div class="spirit-info">
          <span class="spirit-name">{spirit.name}</span>
          {#if spirit.source}
            <span class="spirit-source">{spirit.source}</span>
          {/if}
          <div class="spirit-domains">
            {#each spirit.domains.slice(0, 3) as domain}
              <span class="domain-tag">{domain}</span>
            {/each}
          </div>
        </div>
        <div class="selection-indicator">
          {#if selectedIds.has(spirit.id)}
            <span class="check">✓</span>
          {/if}
        </div>
      </button>
    {/each}
  </div>

  <footer class="selector-footer">
    <div class="selection-status">
      <span class="selection-count">{selectedIds.size}</span>
      <span class="selection-max">/ {maxSelections}</span>
      <span class="selection-label">selected</span>
    </div>
    <button
      class="confirm-btn"
      onclick={handleConfirm}
      disabled={!canConfirm}
    >
      <span class="btn-text">begin trace</span>
      <span class="btn-arrow">→</span>
    </button>
  </footer>
</div>

<style>
  .spirit-selector {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg, 1.5rem);
    max-height: 70vh;
  }

  /* Header */
  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-md, 1rem);
    flex-wrap: wrap;
  }

  .header-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs, 0.25rem);
  }

  .title {
    font-family: var(--font-display, 'Cormorant Garamond', serif);
    font-size: var(--font-size-xl, 1.5rem);
    font-weight: 400;
    color: var(--text-color, #e8e6e3);
    margin: 0;
    letter-spacing: var(--tracking-wide, 0.02em);
  }

  .subtitle {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #6a6a6a);
    margin: 0;
  }

  .auto-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--accent-color, #8aa4ff);
    background: transparent;
    border: 1px solid var(--accent-color, #8aa4ff);
    padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
    border-radius: var(--radius-sm, 2px);
    cursor: pointer;
    transition:
      background var(--duration-fast, 150ms),
      box-shadow var(--duration-fast, 150ms);
  }

  .auto-btn:hover {
    background: var(--accent-glow, rgba(138, 164, 255, 0.15));
    box-shadow: var(--shadow-glow, 0 0 20px rgba(138, 164, 255, 0.15));
  }

  .auto-icon {
    font-size: 1.1em;
    opacity: 0.7;
    animation: breathe 3s ease-in-out infinite;
  }

  /* Spirits grid */
  .spirits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: var(--space-sm, 0.75rem);
    overflow-y: auto;
    padding-right: var(--space-xs, 0.5rem);
    max-height: 50vh;
  }

  .spirit-card {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm, 0.75rem);
    padding: var(--space-md, 1rem);
    background: var(--surface-color, #141416);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-md, 4px);
    cursor: pointer;
    text-align: left;
    position: relative;
    transition:
      border-color var(--duration-fast, 150ms),
      background var(--duration-fast, 150ms),
      transform var(--duration-fast, 150ms),
      box-shadow var(--duration-fast, 150ms);
    animation: cardFadeIn 0.4s var(--ease-out, ease-out) var(--animation-delay, 0ms) backwards;
  }

  @keyframes cardFadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .spirit-card:hover {
    border-color: var(--muted-color, #4a4a4a);
    background: var(--surface-elevated, #1a1a1d);
    transform: translateY(-2px);
  }

  .spirit-card.selected {
    border-color: var(--spirit-glow);
    background: linear-gradient(
      135deg,
      var(--surface-elevated, #1a1a1d) 0%,
      rgba(138, 164, 255, 0.05) 100%
    );
    box-shadow:
      0 0 0 1px var(--spirit-glow),
      0 4px 16px rgba(0, 0, 0, 0.4);
  }

  /* Spirit glyph */
  .spirit-glyph {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    font-size: 1.25rem;
    color: var(--spirit-glow);
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-sm, 2px);
    flex-shrink: 0;
    transition:
      background var(--duration-fast, 150ms),
      border-color var(--duration-fast, 150ms),
      box-shadow var(--duration-fast, 150ms);
  }

  .spirit-card:hover .spirit-glyph {
    border-color: var(--spirit-glow);
  }

  .spirit-card.selected .spirit-glyph {
    background: rgba(255, 255, 255, 0.05);
    border-color: var(--spirit-glow);
    box-shadow: 0 0 12px color-mix(in srgb, var(--spirit-glow) 40%, transparent);
  }

  /* Spirit info */
  .spirit-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs, 0.25rem);
    min-width: 0;
  }

  .spirit-name {
    font-family: var(--font-display, 'Cormorant Garamond', serif);
    font-size: var(--font-size-base, 1rem);
    font-weight: 500;
    color: var(--text-color, #e8e6e3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .spirit-source {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.7rem);
    color: var(--muted-color, #6a6a6a);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0.8;
  }

  .spirit-domains {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2xs, 0.25rem);
    margin-top: var(--space-2xs, 0.25rem);
  }

  .domain-tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.65rem);
    color: var(--muted-dim, #4a4a4a);
    background: rgba(255, 255, 255, 0.03);
    padding: 0.15rem 0.4rem;
    border-radius: var(--radius-sm, 2px);
    text-transform: lowercase;
    letter-spacing: var(--tracking-wide, 0.02em);
  }

  /* Selection indicator */
  .selection-indicator {
    position: absolute;
    top: var(--space-xs, 0.5rem);
    right: var(--space-xs, 0.5rem);
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .check {
    font-size: 0.9rem;
    color: var(--spirit-glow);
    animation: checkPop 0.3s var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) forwards;
  }

  @keyframes checkPop {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Footer */
  .selector-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: var(--space-md, 1rem);
    border-top: 1px solid var(--border-color, #1f1f23);
  }

  .selection-status {
    display: flex;
    align-items: baseline;
    gap: var(--space-2xs, 0.25rem);
    font-family: var(--font-mono);
  }

  .selection-count {
    font-size: var(--font-size-lg, 1.25rem);
    font-weight: 500;
    color: var(--text-color, #e8e6e3);
  }

  .selection-max {
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #6a6a6a);
  }

  .selection-label {
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-dim, #4a4a4a);
    margin-left: var(--space-2xs, 0.25rem);
  }

  .confirm-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--bg-color, #0a0a0b);
    background: var(--accent-color, #8aa4ff);
    border: none;
    padding: var(--space-sm, 0.75rem) var(--space-lg, 1.5rem);
    border-radius: var(--radius-sm, 2px);
    cursor: pointer;
    transition:
      filter var(--duration-fast, 150ms),
      transform var(--duration-fast, 150ms);
  }

  .confirm-btn:hover:not(:disabled) {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .confirm-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-arrow {
    transition: transform var(--duration-fast, 150ms);
  }

  .confirm-btn:hover:not(:disabled) .btn-arrow {
    transform: translateX(2px);
  }

  /* Mobile */
  @media (max-width: 640px) {
    .selector-header {
      flex-direction: column;
      gap: var(--space-md, 1rem);
    }

    .auto-btn {
      width: 100%;
      justify-content: center;
    }

    .spirits-grid {
      grid-template-columns: 1fr;
    }

    .selector-footer {
      flex-direction: column;
      gap: var(--space-md, 1rem);
    }

    .confirm-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>
