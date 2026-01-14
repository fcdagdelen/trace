<script lang="ts">
  import type { Method } from '$lib/methods';
  import { blendColors } from '$lib/utils/transmutation';

  interface Props {
    spirits: Method[];
    onTransmute: (spiritA: string, spiritB: string, name: string, slug: string) => void;
    onCancel: () => void;
  }

  let { spirits, onTransmute, onCancel }: Props = $props();

  let selectedA = $state<string | null>(null);
  let selectedB = $state<string | null>(null);
  let hybridName = $state('');
  let hybridSlug = $state('');
  let isTransmuting = $state(false);

  // Get spirit by ID
  function getSpirit(id: string): Method | undefined {
    return spirits.find(s => s.id === id);
  }

  // Preview the blended color
  const previewColor = $derived(() => {
    if (!selectedA || !selectedB) return '#666666';
    const a = getSpirit(selectedA);
    const b = getSpirit(selectedB);
    if (!a || !b) return '#666666';
    return blendColors(a.color, b.color);
  });

  // Auto-generate slug from name
  function updateSlug() {
    hybridSlug = hybridName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Can we transmute?
  const canTransmute = $derived(
    selectedA &&
    selectedB &&
    selectedA !== selectedB &&
    hybridName.trim().length > 0 &&
    hybridSlug.length > 0 &&
    /^[a-z0-9-]+$/.test(hybridSlug) &&
    !isTransmuting
  );

  function handleTransmute() {
    if (!canTransmute || !selectedA || !selectedB) return;
    isTransmuting = true;
    onTransmute(selectedA, selectedB, hybridName.trim(), hybridSlug);
  }

  // Filter spirits for B selection (exclude selected A)
  const spiritsForB = $derived(
    selectedA ? spirits.filter(s => s.id !== selectedA) : spirits
  );
</script>

<div
  class="modal-backdrop"
  onclick={onCancel}
  onkeydown={(e) => e.key === 'Escape' && onCancel()}
  role="button"
  tabindex="-1"
>
  <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" tabindex="-1">
    <header class="modal-header">
      <h2 class="title">transmute spirits</h2>
      <p class="subtitle">merge two voices into a dialectical hybrid</p>
    </header>

    <div class="transmutation-grid">
      <!-- Spirit A Selection -->
      <div class="spirit-slot">
        <span class="slot-label">first spirit</span>
        <div class="spirit-list">
          {#each spirits as spirit (spirit.id)}
            <button
              class="spirit-option"
              class:selected={selectedA === spirit.id}
              class:disabled={selectedB === spirit.id}
              onclick={() => selectedA = spirit.id}
              disabled={selectedB === spirit.id}
              style="--spirit-color: {spirit.color}"
            >
              <span class="spirit-indicator"></span>
              <span class="spirit-name">{spirit.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Fusion Preview -->
      <div class="fusion-preview">
        <div class="fusion-symbol" style="--preview-color: {previewColor()}">
          <span class="plus">+</span>
        </div>
        {#if selectedA && selectedB}
          <div class="tension-hint">
            {getSpirit(selectedA)?.tensionsWith.includes(selectedB) ? 'high tension' : 'compatible'}
          </div>
        {/if}
      </div>

      <!-- Spirit B Selection -->
      <div class="spirit-slot">
        <span class="slot-label">second spirit</span>
        <div class="spirit-list">
          {#each spiritsForB as spirit (spirit.id)}
            <button
              class="spirit-option"
              class:selected={selectedB === spirit.id}
              onclick={() => selectedB = spirit.id}
              style="--spirit-color: {spirit.color}"
            >
              <span class="spirit-indicator"></span>
              <span class="spirit-name">{spirit.name}</span>
            </button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Hybrid Name Input -->
    <div class="name-input-section">
      <label class="input-label" for="hybrid-name">name the hybrid</label>
      <input
        id="hybrid-name"
        type="text"
        class="name-input"
        bind:value={hybridName}
        oninput={updateSlug}
        placeholder="e.g., The Dialectician"
        maxlength="50"
      />
      <div class="slug-preview">
        slug: <span class="slug-value">{hybridSlug || '...'}</span>
      </div>
    </div>

    <!-- Result Preview -->
    {#if selectedA && selectedB && hybridName}
      <div class="preview-card" style="--preview-color: {previewColor()}">
        <div class="preview-indicator"></div>
        <div class="preview-info">
          <span class="preview-name">{hybridName}</span>
          <span class="preview-source">{getSpirit(selectedA)?.name} + {getSpirit(selectedB)?.name}</span>
        </div>
      </div>
    {/if}

    <footer class="modal-footer">
      <button class="cancel-btn" onclick={onCancel}>cancel</button>
      <button
        class="transmute-btn"
        onclick={handleTransmute}
        disabled={!canTransmute}
      >
        {isTransmuting ? 'transmuting...' : 'transmute'}
      </button>
    </footer>
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
  }

  .modal {
    background: var(--bg-color, #0d0d0d);
    border: 1px solid var(--border-color, #222);
    padding: 1.5rem;
    max-width: 800px;
    width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .modal-header {
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

  .transmutation-grid {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 1rem;
    align-items: start;
  }

  .spirit-slot {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .slot-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--muted-color, #666);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .spirit-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-height: 250px;
    overflow-y: auto;
    padding-right: 0.5rem;
  }

  .spirit-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: transparent;
    border: 1px solid var(--border-color, #222);
    cursor: pointer;
    transition: all 150ms;
    text-align: left;
  }

  .spirit-option:hover:not(:disabled) {
    border-color: var(--muted-color, #444);
  }

  .spirit-option.selected {
    border-color: var(--spirit-color);
    background: rgba(255, 255, 255, 0.05);
  }

  .spirit-option.disabled,
  .spirit-option:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .spirit-indicator {
    width: 3px;
    height: 20px;
    background: var(--spirit-color);
    opacity: 0.3;
  }

  .spirit-option.selected .spirit-indicator {
    opacity: 1;
  }

  .spirit-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--text-color, #e8e6e3);
  }

  .fusion-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    gap: 0.5rem;
  }

  .fusion-symbol {
    width: 48px;
    height: 48px;
    border: 2px solid var(--preview-color);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 300ms;
  }

  .plus {
    font-family: var(--font-mono);
    font-size: 1.5rem;
    color: var(--preview-color);
    transition: color 300ms;
  }

  .tension-hint {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--muted-color, #666);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .name-input-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .input-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--muted-color, #666);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .name-input {
    font-family: var(--font-mono);
    font-size: var(--font-size-base, 1rem);
    color: var(--text-color, #e8e6e3);
    background: transparent;
    border: 1px solid var(--border-color, #222);
    padding: 0.75rem;
    outline: none;
  }

  .name-input:focus {
    border-color: var(--accent-color, #6b8afd);
  }

  .name-input::placeholder {
    color: var(--muted-color, #444);
  }

  .slug-preview {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--muted-color, #666);
  }

  .slug-value {
    color: var(--text-color, #e8e6e3);
  }

  .preview-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--preview-color);
  }

  .preview-indicator {
    width: 4px;
    height: 40px;
    background: var(--preview-color);
  }

  .preview-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .preview-name {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--text-color, #e8e6e3);
  }

  .preview-source {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--muted-color, #666);
    font-style: italic;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color, #222);
  }

  .cancel-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #666);
    background: transparent;
    border: 1px solid var(--border-color, #222);
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    transition: all 150ms;
  }

  .cancel-btn:hover {
    border-color: var(--muted-color, #444);
    color: var(--text-color, #e8e6e3);
  }

  .transmute-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--bg-color, #0d0d0d);
    background: var(--accent-color, #6b8afd);
    border: none;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    transition: all 150ms;
  }

  .transmute-btn:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .transmute-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    .transmutation-grid {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .fusion-preview {
      order: -1;
    }
  }
</style>
