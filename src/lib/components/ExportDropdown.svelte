<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    disabled?: boolean;
    onExportPdf: () => void;
    onExportMarkdown: () => void;
    onCopy: () => void;
    isExporting?: boolean;
    isCopying?: boolean;
    copySuccess?: boolean;
  }

  let {
    disabled = false,
    onExportPdf,
    onExportMarkdown,
    onCopy,
    isExporting = false,
    isCopying = false,
    copySuccess = false,
  }: Props = $props();

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement;

  function toggle() {
    if (!disabled) {
      isOpen = !isOpen;
    }
  }

  function handleSelect(action: () => void) {
    action();
    isOpen = false;
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      isOpen = false;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div class="export-dropdown" bind:this={dropdownRef}>
  <button
    class="export-trigger"
    class:open={isOpen}
    onclick={toggle}
    disabled={disabled}
    aria-haspopup="true"
    aria-expanded={isOpen}
  >
    <span class="trigger-text">export</span>
    <span class="trigger-chevron" class:rotated={isOpen}>&#9662;</span>
  </button>

  {#if isOpen}
    <div class="dropdown-menu" role="menu">
      <button
        class="dropdown-item"
        onclick={() => handleSelect(onCopy)}
        disabled={isCopying}
        role="menuitem"
      >
        <span class="item-icon">⧉</span>
        <span class="item-label">
          {#if copySuccess}
            copied!
          {:else if isCopying}
            copying...
          {:else}
            copy to clipboard
          {/if}
        </span>
        <kbd>&#8984;C</kbd>
      </button>

      <button
        class="dropdown-item"
        onclick={() => handleSelect(onExportMarkdown)}
        role="menuitem"
      >
        <span class="item-icon">&#9998;</span>
        <span class="item-label">markdown (.md)</span>
      </button>

      <button
        class="dropdown-item"
        onclick={() => handleSelect(onExportPdf)}
        disabled={isExporting}
        role="menuitem"
      >
        <span class="item-icon">&#9638;</span>
        <span class="item-label">
          {#if isExporting}
            generating...
          {:else}
            styled PDF
          {/if}
        </span>
      </button>
    </div>
  {/if}
</div>

<style>
  .export-dropdown {
    position: relative;
  }

  .export-trigger {
    display: flex;
    align-items: center;
    gap: var(--space-2xs, 0.25rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #6a6a6a);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: var(--space-2xs, 0.25rem) var(--space-xs, 0.5rem);
    border-radius: var(--radius-sm, 2px);
    transition:
      color var(--duration-fast, 150ms),
      background var(--duration-fast, 150ms);
  }

  .export-trigger:hover:not(:disabled),
  .export-trigger.open {
    color: var(--text-color, #e8e6e3);
    background: rgba(255, 255, 255, 0.04);
  }

  .export-trigger:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .trigger-chevron {
    font-size: var(--font-size-xs, 0.75rem);
    transition: transform var(--duration-fast, 150ms);
    opacity: 0.6;
  }

  .trigger-chevron.rotated {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + var(--space-xs, 0.5rem));
    right: 0;
    min-width: 200px;
    background: var(--bg-elevated, #0f0f11);
    border: 1px solid var(--border-strong, #2a2a30);
    border-radius: var(--radius-md, 4px);
    padding: var(--space-xs, 0.5rem);
    box-shadow: var(--shadow-lg, 0 8px 32px rgba(0, 0, 0, 0.5));
    z-index: 100;
    animation: dropdownEnter 0.2s var(--ease-out, ease-out);
  }

  @keyframes dropdownEnter {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm, 0.75rem);
    width: 100%;
    padding: var(--space-sm, 0.75rem) var(--space-md, 1rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--text-secondary, #b8b5b0);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm, 2px);
    cursor: pointer;
    text-align: left;
    transition:
      color var(--duration-fast, 150ms),
      background var(--duration-fast, 150ms);
  }

  .dropdown-item:hover:not(:disabled) {
    color: var(--text-color, #e8e6e3);
    background: var(--surface-color, #141416);
  }

  .dropdown-item:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
    font-size: var(--font-size-base, 1rem);
    opacity: 0.6;
  }

  .item-label {
    flex: 1;
  }

  .dropdown-item kbd {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--muted-dim, #4a484a);
    padding: 0.1em 0.4em;
    background: var(--surface-color, #141416);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-sm, 2px);
  }

  /* Mobile */
  @media (max-width: 640px) {
    .dropdown-menu {
      min-width: 180px;
    }

    .dropdown-item {
      padding: var(--space-xs, 0.5rem) var(--space-sm, 0.75rem);
      font-size: var(--font-size-xs, 0.75rem);
    }

    .dropdown-item kbd {
      display: none;
    }
  }
</style>
