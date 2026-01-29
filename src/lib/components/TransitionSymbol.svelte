<script lang="ts">
  import { SYMBOL_SEMANTICS, SYMBOL_DEPTH_DIRECTION, type Symbol } from '$lib/utils/symbols';

  interface Props {
    symbol: string;
    isNew?: boolean;
    onComplete?: () => void;
  }

  let { symbol, isNew = false, onComplete }: Props = $props();

  const semantic = $derived(SYMBOL_SEMANTICS[symbol as Symbol] || 'transition');
  const depthDirection = $derived(SYMBOL_DEPTH_DIRECTION[symbol as Symbol] ?? 0);

  // Direction class for visual styling
  const directionClass = $derived(
    depthDirection === 1 ? 'descending' :
    depthDirection === -1 ? 'ascending' :
    'neutral'
  );

  // Symbols have a pause before completing (breathing room)
  $effect(() => {
    if (isNew && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2200); // Contemplative pause

      return () => clearTimeout(timer);
    }
  });
</script>

<div
  class="transition-symbol"
  class:thinking={isNew}
  class:descending={directionClass === 'descending'}
  class:ascending={directionClass === 'ascending'}
  class:neutral={directionClass === 'neutral'}
  title={semantic}
  role="separator"
  aria-label={`${semantic} symbol`}
>
  <span class="symbol-content">{symbol}</span>
  <span class="semantic-hint">{semantic}</span>
</div>

<style>
  .transition-symbol {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg, 1.25rem);
    color: var(--symbol-color, #6a6a6a);
    text-align: center;
    padding-block: var(--space-lg, 1.5rem);
    user-select: none;
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
  }

  .symbol-content {
    display: block;
    position: relative;
    transition:
      color 400ms var(--ease-out, ease-out),
      transform 400ms var(--ease-out, ease-out),
      text-shadow 400ms var(--ease-out, ease-out);
  }

  .semantic-hint {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.7rem);
    color: var(--muted-dim, #4a4a4a);
    letter-spacing: var(--tracking-wider, 0.05em);
    text-transform: lowercase;
    opacity: 0;
    transform: translateY(-4px);
    transition:
      opacity 300ms var(--ease-out, ease-out),
      transform 300ms var(--ease-out, ease-out);
  }

  /* Show semantic hint on hover */
  .transition-symbol:hover .semantic-hint {
    opacity: 0.6;
    transform: translateY(0);
  }

  /* Active thinking state */
  .transition-symbol.thinking {
    color: var(--text-color, #e0e0e0);
  }

  .transition-symbol.thinking .symbol-content {
    animation: symbolThink 1.5s var(--ease-in-out, ease-in-out) infinite;
  }

  .transition-symbol.thinking .semantic-hint {
    opacity: 0.5;
    transform: translateY(0);
    animation: hintPulse 2s ease-in-out infinite;
  }

  @keyframes symbolThink {
    0%, 100% {
      opacity: 0.5;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.25);
    }
  }

  @keyframes hintPulse {
    0%, 100% {
      opacity: 0.3;
    }
    50% {
      opacity: 0.6;
    }
  }

  /* Direction-specific coloring */
  .transition-symbol.descending {
    --direction-color: #7b9aff;
  }

  .transition-symbol.ascending {
    --direction-color: #7ac47a;
  }

  .transition-symbol.neutral {
    --direction-color: var(--symbol-color, #8a8a8a);
  }

  .transition-symbol.thinking.descending .symbol-content {
    color: var(--direction-color);
    text-shadow: 0 0 16px rgba(123, 154, 255, 0.4);
    animation-name: symbolDescend;
  }

  .transition-symbol.thinking.ascending .symbol-content {
    color: var(--direction-color);
    text-shadow: 0 0 16px rgba(122, 196, 122, 0.4);
    animation-name: symbolAscend;
  }

  .transition-symbol.thinking.neutral .symbol-content {
    animation-name: symbolNeutral;
  }

  @keyframes symbolDescend {
    0%, 100% {
      opacity: 0.5;
      transform: scale(1) translateY(0);
    }
    50% {
      opacity: 1;
      transform: scale(1.25) translateY(2px);
    }
  }

  @keyframes symbolAscend {
    0%, 100% {
      opacity: 0.5;
      transform: scale(1) translateY(0);
    }
    50% {
      opacity: 1;
      transform: scale(1.25) translateY(-2px);
    }
  }

  @keyframes symbolNeutral {
    0%, 100% {
      opacity: 0.5;
      transform: scale(1) rotate(0deg);
    }
    50% {
      opacity: 1;
      transform: scale(1.2) rotate(3deg);
    }
  }

  /* Decorative line accents - positioned relative to symbol, not container */
  .symbol-content::before,
  .symbol-content::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 3rem;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--border-color, #1f1f1f)
    );
    opacity: 0.5;
    transition: opacity 300ms, width 300ms;
    transform: translateY(-50%);
  }

  .symbol-content::before {
    right: calc(100% + 1rem);
    background: linear-gradient(
      90deg,
      transparent,
      var(--border-color, #1f1f1f)
    );
  }

  .symbol-content::after {
    left: calc(100% + 1rem);
    background: linear-gradient(
      -90deg,
      transparent,
      var(--border-color, #1f1f1f)
    );
  }

  .transition-symbol.thinking .symbol-content::before,
  .transition-symbol.thinking .symbol-content::after {
    opacity: 0.8;
    width: 4rem;
    background: linear-gradient(
      90deg,
      transparent,
      var(--direction-color, var(--border-color))
    );
  }

  .transition-symbol.thinking .symbol-content::after {
    background: linear-gradient(
      -90deg,
      transparent,
      var(--direction-color, var(--border-color))
    );
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .transition-symbol.thinking .symbol-content {
      animation: none;
      opacity: 1;
      transform: scale(1.1);
    }

    .transition-symbol.thinking .semantic-hint {
      animation: none;
    }
  }
</style>
