<script lang="ts">
  import { traceStore } from '$lib/stores/trace';
  import { SPIRIT_TYPOGRAPHY } from '$lib/utils/typography';
  import { getMethodAsync, type Method } from '$lib/methods';

  // Cache for loaded methods
  let methodsCache = $state<Map<string, Method>>(new Map());

  // Load method when needed
  async function loadMethod(hint: string) {
    if (!methodsCache.has(hint)) {
      const method = await getMethodAsync(hint);
      if (method) {
        methodsCache = new Map(methodsCache).set(hint, method);
      }
    }
  }

  // Track encountered spirits in order of first appearance
  let encounteredSpiritIds = $state<string[]>([]);

  // Watch trace lines and build up encountered spirits
  $effect(() => {
    const lines = $traceStore.lines;
    const currentHint = $traceStore.currentMethodHint;

    // Collect all unique spirit IDs from lines in order of first appearance
    const seen = new Set<string>();
    const ordered: string[] = [];

    for (const line of lines) {
      if (line.methodHint && !seen.has(line.methodHint)) {
        seen.add(line.methodHint);
        ordered.push(line.methodHint);
        // Trigger async load
        loadMethod(line.methodHint);
      }
    }

    // Also include current hint if not in lines yet (streaming)
    if (currentHint && !seen.has(currentHint)) {
      ordered.push(currentHint);
      loadMethod(currentHint);
    }

    encounteredSpiritIds = ordered;
  });

  // Reset when streaming stops
  $effect(() => {
    if (!$traceStore.isStreaming && !$traceStore.sessionId) {
      encounteredSpiritIds = [];
    }
  });

  // Build spirit display data
  const encounteredSpirits = $derived(() => {
    return encounteredSpiritIds
      .map(id => {
        const method = methodsCache.get(id);
        const typography = SPIRIT_TYPOGRAPHY[id];
        if (!method || !typography) return null;

        return {
          id,
          name: method.name,
          glyph: typography.glyph,
          color: typography.glowColor,
          animationStyle: typography.animationStyle,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  });

  const currentSpiritId = $derived($traceStore.currentMethodHint);
</script>

{#if $traceStore.isStreaming && encounteredSpirits().length > 0}
  <div class="spirit-stack">
    {#each encounteredSpirits() as spirit (spirit.id)}
      {@const isActive = spirit.id === currentSpiritId}
      <div
        class="spirit-badge"
        class:active={isActive}
        class:breathe={isActive && spirit.animationStyle === 'breathe'}
        class:pulse={isActive && spirit.animationStyle === 'pulse'}
        class:flicker={isActive && spirit.animationStyle === 'flicker'}
        class:float={isActive && spirit.animationStyle === 'float'}
        style="--spirit-color: {spirit.color}"
      >
        <span class="spirit-glyph">{spirit.glyph}</span>
        <span class="spirit-name">{spirit.name}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .spirit-stack {
    position: fixed;
    bottom: var(--space-xl, 2rem);
    right: var(--space-xl, 2rem);
    display: flex;
    flex-direction: column-reverse;
    gap: var(--space-xs, 0.5rem);
    z-index: 50;
    pointer-events: none;
  }

  .spirit-badge {
    display: flex;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--muted-color, #6a6a6a);
    opacity: 0.4;
    transition: opacity 300ms var(--ease-out, ease-out);
    padding: var(--space-2xs, 0.25rem) var(--space-sm, 0.75rem);
    background: rgba(10, 10, 11, 0.6);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-sm, 2px);
    backdrop-filter: blur(4px);
    animation: fadeIn 300ms var(--ease-out) forwards;
  }

  .spirit-badge.active {
    opacity: 1;
    border-color: color-mix(in srgb, var(--spirit-color) 40%, transparent);
    background: rgba(10, 10, 11, 0.85);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(8px);
    }
    to {
      opacity: var(--target-opacity, 0.4);
    }
  }

  .spirit-badge.active {
    --target-opacity: 1;
  }

  .spirit-glyph {
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--spirit-color);
    opacity: 0.6;
    transition: opacity 300ms, text-shadow 300ms;
  }

  .spirit-badge.active .spirit-glyph {
    opacity: 1;
    text-shadow: 0 0 8px var(--spirit-color);
  }

  .spirit-name {
    color: var(--muted-color);
    letter-spacing: var(--tracking-wide, 0.025em);
    text-transform: lowercase;
    transition: color 300ms;
  }

  .spirit-badge.active .spirit-name {
    color: var(--spirit-color);
    text-shadow: 0 0 12px color-mix(in srgb, var(--spirit-color) 40%, transparent);
  }

  /* Spirit-specific animations - only when active */
  .spirit-badge.active.breathe .spirit-glyph {
    animation: glyphBreathe 2.5s ease-in-out infinite;
  }

  .spirit-badge.active.pulse .spirit-glyph {
    animation: glyphPulse 1.5s ease-in-out infinite;
  }

  .spirit-badge.active.flicker .spirit-glyph {
    animation: glyphFlicker 0.15s ease-in-out infinite;
  }

  .spirit-badge.active.float .spirit-glyph {
    animation: glyphFloat 3s ease-in-out infinite;
  }

  @keyframes glyphBreathe {
    0%, 100% {
      opacity: 0.7;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.1);
    }
  }

  @keyframes glyphPulse {
    0%, 100% {
      opacity: 0.6;
      text-shadow: 0 0 4px var(--spirit-color);
    }
    50% {
      opacity: 1;
      text-shadow: 0 0 16px var(--spirit-color);
    }
  }

  @keyframes glyphFlicker {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes glyphFloat {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-2px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .spirit-glyph {
      animation: none !important;
    }
  }

  /* Mobile: smaller, adjusted position */
  @media (max-width: 640px) {
    .spirit-stack {
      bottom: var(--space-3xl, 4rem);
      right: var(--space-md, 1rem);
    }

    .spirit-badge {
      font-size: var(--font-size-2xs, 0.65rem);
      padding: var(--space-2xs, 0.2rem) var(--space-xs, 0.5rem);
    }

    .spirit-glyph {
      font-size: var(--font-size-xs, 0.75rem);
    }
  }
</style>
