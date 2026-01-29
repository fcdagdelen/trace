<script lang="ts">
  import { visibleSpirits } from '$lib/stores/visibleSpirits';
  import { SPIRIT_TYPOGRAPHY } from '$lib/utils/typography';

  // Convert visible spirits set to display data
  const displaySpirits = $derived(() => {
    return Array.from($visibleSpirits)
      .filter(id => SPIRIT_TYPOGRAPHY[id])
      .map((id) => {
        const typo = SPIRIT_TYPOGRAPHY[id];
        return {
          id,
          glyph: typo.glyph,
          color: typo.glowColor,
        };
      });
  });
</script>

{#if displaySpirits().length > 0}
  <div class="legend-hud" role="complementary" aria-label="Active spirits">
    {#each displaySpirits() as spirit (spirit.id)}
      <div
        class="legend-entry"
        style="--entry-color: {spirit.color}"
        title={spirit.id}
      >
        <span class="spirit-id">{spirit.id}</span>
        <span class="spirit-glyph">{spirit.glyph}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .legend-hud {
    position: fixed;
    bottom: var(--space-lg, 1.5rem);
    right: var(--space-lg, 1.5rem);
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: var(--space-2xs, 0.25rem);
    z-index: 100;
  }

  .legend-entry {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-sm, 0.75rem);
    cursor: default;
    animation: entrySlideIn 0.25s var(--ease-out, ease-out) forwards;
  }

  @keyframes entrySlideIn {
    from {
      opacity: 0;
      transform: translateX(8px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }

  .spirit-id {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.7rem);
    color: var(--muted-color, #6a6a6a);
    opacity: 0.4;
    transform: translateX(0);
    max-width: 5ch;
    overflow: hidden;
    text-overflow: ellipsis;
    transition:
      opacity 200ms var(--ease-out, ease-out),
      transform 200ms var(--ease-out, ease-out),
      color 200ms var(--ease-out, ease-out),
      max-width 200ms var(--ease-out, ease-out);
    white-space: nowrap;
    text-align: right;
    letter-spacing: var(--tracking-wide, 0.02em);
  }

  .spirit-glyph {
    font-size: var(--font-size-lg, 1.25rem);
    color: var(--entry-color);
    width: 1.5rem;
    text-align: center;
    transition:
      transform 200ms var(--ease-out, ease-out),
      text-shadow 200ms var(--ease-out, ease-out);
  }

  .legend-entry:hover .spirit-id {
    opacity: 1;
    max-width: none;
    color: var(--entry-color);
  }

  .legend-entry:hover .spirit-glyph {
    transform: scale(1.2);
    text-shadow: 0 0 12px var(--entry-color);
  }

  /* Mobile: hide or minimize */
  @media (max-width: 640px) {
    .legend-hud {
      bottom: var(--space-md, 1rem);
      right: var(--space-md, 1rem);
    }

    .spirit-id {
      display: none;
    }

    .spirit-glyph {
      font-size: var(--font-size-sm, 0.9rem);
    }
  }
</style>
