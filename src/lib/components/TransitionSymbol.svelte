<script lang="ts">
  import { onMount } from 'svelte';
  import { SYMBOL_SEMANTICS, type Symbol } from '$lib/utils/symbols';

  interface Props {
    symbol: string;
    isNew?: boolean;
    onComplete?: () => void;
  }

  let { symbol, isNew = false, onComplete }: Props = $props();

  const semantic = $derived(SYMBOL_SEMANTICS[symbol as Symbol] || 'transition');

  // Symbols have a pause before completing (breathing room)
  $effect(() => {
    if (isNew && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2000); // Longer thinking pause

      return () => clearTimeout(timer);
    }
  });
</script>

<div
  class="transition-symbol"
  class:thinking={isNew}
  title={semantic}
>
  {symbol}
</div>

<style>
  .transition-symbol {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg, 1.25rem);
    color: var(--symbol-color, #888);
    text-align: center;
    padding-block: 1.5rem;
    user-select: none;
  }

  .transition-symbol.thinking {
    color: var(--text-color, #e0e0e0);
    animation: symbolThinking 0.8s ease-in-out infinite;
  }

  @keyframes symbolThinking {
    0%, 100% {
      opacity: 0.5;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.3);
    }
  }
</style>
