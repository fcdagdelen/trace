<script lang="ts">
  import { traceStore } from '$lib/stores/trace';
  import { METHOD_TYPOGRAPHY } from '$lib/utils/typography';

  // Derive which methods have appeared in the trace
  const seenMethods = $derived(() => {
    const seen = new Set<string>();
    for (const line of $traceStore.lines) {
      if (line.methodHint && METHOD_TYPOGRAPHY[line.methodHint]) {
        seen.add(line.methodHint);
      }
    }
    return Array.from(seen).map((id) => ({
      id,
      filename: `${id}.md`,
      color: METHOD_TYPOGRAPHY[id].glowColor,
    }));
  });
</script>

{#if seenMethods().length > 0}
  <div class="legend-hud">
    {#each seenMethods() as entry}
      <div class="legend-entry" style="--entry-color: {entry.color};">
        <span class="filename">{entry.filename}</span>
        <div class="pixel"></div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .legend-hud {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    display: flex;
    flex-direction: column-reverse;
    align-items: flex-end;
    gap: 4px;
    z-index: 100;
  }

  .legend-entry {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    cursor: default;
  }

  .filename {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--muted-color, #6a6a6a);
    opacity: 0;
    transform: translateX(4px);
    transition:
      opacity 150ms ease-out,
      transform 150ms ease-out,
      color 150ms ease-out,
      text-shadow 150ms ease-out;
    white-space: nowrap;
    text-align: right;
  }

  .pixel {
    width: 10px;
    height: 10px;
    background: var(--entry-color);
    flex-shrink: 0;
    transition:
      transform 150ms ease-out,
      box-shadow 150ms ease-out;
  }

  .legend-entry:hover .filename {
    opacity: 1;
    transform: translateX(0);
    color: var(--entry-color);
    text-shadow: 0 0 8px var(--entry-color);
  }

  .legend-entry:hover .pixel {
    transform: scale(1.2);
    box-shadow:
      0 0 6px var(--entry-color),
      0 0 12px var(--entry-color);
  }
</style>
