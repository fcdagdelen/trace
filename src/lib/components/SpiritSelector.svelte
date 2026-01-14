<script lang="ts">
  import type { Method } from '$lib/methods';

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

  // Group spirits by domain for display
  const spiritsByDomain = $derived(() => {
    const domains = new Map<string, Method[]>();
    for (const spirit of spirits) {
      const primaryDomain = spirit.domains[0] || 'other';
      if (!domains.has(primaryDomain)) {
        domains.set(primaryDomain, []);
      }
      domains.get(primaryDomain)!.push(spirit);
    }
    return domains;
  });

  const canConfirm = $derived(selectedIds.size > 0);
</script>

<div class="spirit-selector">
  <header class="selector-header">
    <div class="header-text">
      <h2 class="title">summon spirits</h2>
      <p class="subtitle">select 1-{maxSelections} spirits to possess this trace</p>
    </div>
    <div class="header-actions">
      <button class="auto-btn" onclick={onAutoSelect}>
        let them choose
      </button>
    </div>
  </header>

  <div class="spirits-grid">
    {#each spirits as spirit (spirit.id)}
      <button
        class="spirit-card"
        class:selected={selectedIds.has(spirit.id)}
        onclick={() => toggleSpirit(spirit.id)}
        style="--spirit-color: {spirit.color}"
      >
        <div class="spirit-indicator"></div>
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
        {#if selectedIds.has(spirit.id)}
          <span class="check-mark">+</span>
        {/if}
      </button>
    {/each}
  </div>

  <footer class="selector-footer">
    <div class="selection-count">
      {selectedIds.size} / {maxSelections} selected
    </div>
    <button
      class="confirm-btn"
      onclick={handleConfirm}
      disabled={!canConfirm}
    >
      begin trace
    </button>
  </footer>
</div>

<style>
  .spirit-selector {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-height: 70vh;
  }

  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .title {
    font-family: var(--font-mono);
    font-size: var(--font-size-base, 1.125rem);
    font-weight: normal;
    color: var(--text-color, #e8e6e3);
    margin: 0;
    letter-spacing: 0.02em;
  }

  .subtitle {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #666);
    margin: 0;
  }

  .auto-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--accent-color, #6b8afd);
    background: transparent;
    border: 1px solid var(--accent-color, #6b8afd);
    padding: 0.5rem 1rem;
    cursor: pointer;
    transition: all 150ms;
  }

  .auto-btn:hover {
    background: rgba(107, 138, 253, 0.1);
  }

  .spirits-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
    overflow-y: auto;
    padding-right: 0.5rem;
    max-height: 50vh;
  }

  .spirit-card {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--border-color, #222);
    cursor: pointer;
    transition: all 150ms;
    text-align: left;
    position: relative;
  }

  .spirit-card:hover {
    border-color: var(--muted-color, #444);
    background: rgba(255, 255, 255, 0.04);
  }

  .spirit-card.selected {
    border-color: var(--spirit-color);
    background: rgba(255, 255, 255, 0.05);
  }

  .spirit-indicator {
    width: 4px;
    height: 100%;
    min-height: 48px;
    background: var(--spirit-color);
    opacity: 0.3;
    transition: opacity 150ms;
  }

  .spirit-card.selected .spirit-indicator {
    opacity: 1;
  }

  .spirit-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .spirit-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--text-color, #e8e6e3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .spirit-source {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--muted-color, #666);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .spirit-domains {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin-top: 0.25rem;
  }

  .domain-tag {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--muted-color, #555);
    background: rgba(255, 255, 255, 0.05);
    padding: 0.1rem 0.4rem;
    border-radius: 2px;
    text-transform: lowercase;
  }

  .check-mark {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    font-family: var(--font-mono);
    font-size: 1rem;
    color: var(--spirit-color);
    font-weight: bold;
  }

  .selector-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color, #222);
  }

  .selection-count {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #666);
  }

  .confirm-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--bg-color, #0d0d0d);
    background: var(--accent-color, #6b8afd);
    border: none;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    transition: all 150ms;
  }

  .confirm-btn:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .confirm-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
