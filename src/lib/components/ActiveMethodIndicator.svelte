<script lang="ts">
  import { traceStore } from '$lib/stores/trace';
  import { SPIRIT_TYPOGRAPHY, type SpiritTypography } from '$lib/utils/typography';
  import { getMethodAsync, type Method } from '$lib/methods';

  // Cache for loaded methods
  let methodsCache = $state<Map<string, Method>>(new Map());

  // Load method when hint changes
  async function loadMethod(hint: string) {
    if (!methodsCache.has(hint)) {
      const method = await getMethodAsync(hint);
      if (method) {
        methodsCache = new Map(methodsCache).set(hint, method);
      }
    }
  }

  // Get the current method hint and its details
  const currentMethod = $derived(() => {
    const hint = $traceStore.currentMethodHint;
    if (!hint) return null;

    // Trigger async load if not cached
    if (!methodsCache.has(hint)) {
      loadMethod(hint);
      return null;
    }

    const method = methodsCache.get(hint);
    const typography = SPIRIT_TYPOGRAPHY[hint];

    if (!method || !typography) return null;

    return {
      id: hint,
      name: method.name,
      source: method.source,
      glyph: typography.glyph,
      color: typography.glowColor,
      animationStyle: typography.animationStyle,
    };
  });

  // Track if we should show (fade in/out on change)
  let visible = $state(false);
  let lastMethodId = $state<string | null>(null);

  $effect(() => {
    const method = currentMethod();
    if (method && method.id !== lastMethodId) {
      lastMethodId = method.id;
      visible = true;
    }
  });
</script>

{#if $traceStore.isStreaming && currentMethod()}
  {@const method = currentMethod()}
  <div
    class="active-method"
    class:visible
    class:breathe={method?.animationStyle === 'breathe'}
    class:pulse={method?.animationStyle === 'pulse'}
    class:flicker={method?.animationStyle === 'flicker'}
    class:float={method?.animationStyle === 'float'}
    style="--method-color: {method?.color}"
  >
    <div class="method-glyph">{method?.glyph}</div>
    <span class="method-name">{method?.name}</span>
  </div>
{/if}

<style>
  .active-method {
    position: fixed;
    top: var(--space-lg, 1.5rem);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: var(--space-sm, 0.75rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--muted-color, #6a6a6a);
    opacity: 0;
    transition: opacity 400ms var(--ease-out, ease-out);
    z-index: 50;
    pointer-events: none;
    padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
    background: rgba(10, 10, 11, 0.8);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-md, 4px);
    backdrop-filter: blur(8px);
  }

  .active-method.visible {
    opacity: 1;
  }

  .method-glyph {
    font-size: var(--font-size-md, 1.125rem);
    color: var(--method-color);
    text-shadow: 0 0 8px var(--method-color);
  }

  .method-name {
    color: var(--method-color);
    text-shadow: 0 0 12px color-mix(in srgb, var(--method-color) 50%, transparent);
    letter-spacing: var(--tracking-wider, 0.05em);
    text-transform: lowercase;
  }

  /* Spirit-specific animations */
  .active-method.breathe .method-glyph {
    animation: glyphBreathe 2.5s ease-in-out infinite;
  }

  .active-method.pulse .method-glyph {
    animation: glyphPulse 1.5s ease-in-out infinite;
  }

  .active-method.flicker .method-glyph {
    animation: glyphFlicker 0.15s ease-in-out infinite;
  }

  .active-method.float .method-glyph {
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
      text-shadow: 0 0 4px var(--method-color);
    }
    50% {
      opacity: 1;
      text-shadow: 0 0 16px var(--method-color);
    }
  }

  @keyframes glyphFlicker {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.8;
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
    .method-glyph {
      animation: none !important;
    }
  }

  /* Mobile: smaller, less intrusive */
  @media (max-width: 640px) {
    .active-method {
      top: auto;
      bottom: var(--space-3xl, 4rem);
      font-size: var(--font-size-xs, 0.7rem);
      padding: var(--space-2xs, 0.25rem) var(--space-sm, 0.75rem);
    }

    .method-glyph {
      font-size: var(--font-size-sm, 0.9rem);
    }
  }
</style>
