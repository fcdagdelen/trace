<script lang="ts">
  import { traceStore } from '$lib/stores/trace';
  import { METHOD_TYPOGRAPHY } from '$lib/utils/typography';
  import { getMethod } from '$lib/methods';

  // Get the current method hint and its details
  const currentMethod = $derived(() => {
    const hint = $traceStore.currentMethodHint;
    if (!hint) return null;

    const method = getMethod(hint);
    const typography = METHOD_TYPOGRAPHY[hint];

    if (!method || !typography) return null;

    return {
      id: hint,
      name: method.name,
      source: method.source,
      color: typography.glowColor,
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
    style="--method-color: {method?.color}"
  >
    <div class="method-dot"></div>
    <span class="method-name">{method?.name}</span>
  </div>
{/if}

<style>
  .active-method {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--muted-color, #666);
    opacity: 0;
    transition: opacity 300ms ease-out;
    z-index: 50;
    pointer-events: none;
  }

  .active-method.visible {
    opacity: 1;
  }

  .method-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--method-color);
    box-shadow: 0 0 6px var(--method-color);
    animation: pulse 2s ease-in-out infinite;
  }

  .method-name {
    color: var(--method-color);
    text-shadow: 0 0 8px var(--method-color);
    letter-spacing: 0.05em;
    text-transform: lowercase;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.6;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.2);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .method-dot {
      animation: none;
    }
  }
</style>
