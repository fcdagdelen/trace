<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { traceStore, type TraceLine } from '$lib/stores/trace';
  import { clearVisibleLines } from '$lib/stores/visibleSpirits';
  import TraceLineComponent from './TraceLine.svelte';
  import TransitionSymbol from './TransitionSymbol.svelte';

  interface Props {
    onPause?: () => void;
  }

  let { onPause }: Props = $props();

  let container: HTMLDivElement;

  // Simple state: which lines are displayed, which is typing
  let displayedLines = $state<TraceLine[]>([]);
  let typingId = $state<string | null>(null);
  let processedCount = 0;

  // Instant mode: skip all animations and show all content immediately
  let instantMode = $state(false);

  // Single effect: sync store lines to displayed lines
  $effect(() => {
    const storeLines = $traceStore.lines;

    // Reset if store was cleared
    if (storeLines.length === 0 && processedCount > 0) {
      processedCount = 0;
      displayedLines = [];
      typingId = null;
      instantMode = false;
      clearVisibleLines();
      return;
    }

    // In instant mode, show all lines immediately
    if (instantMode) {
      if (storeLines.length > displayedLines.length) {
        displayedLines = [...storeLines];
        processedCount = storeLines.length;
        typingId = null;
        scrollToBottom();
      }
      return;
    }

    // Only process new lines
    if (storeLines.length > processedCount && typingId === null) {
      const nextLine = storeLines[processedCount];
      if (nextLine) {
        processedCount++;
        displayedLines = [...displayedLines, nextLine];
        typingId = nextLine.id;
        scrollToBottom();
      }
    }
  });

  // Reveal all content instantly
  function revealAll() {
    instantMode = true;
    typingId = null;
    const storeLines = $traceStore.lines;
    displayedLines = [...storeLines];
    processedCount = storeLines.length;
    scrollToBottom();
  }

  // Check if there's content being animated (for showing reveal button)
  const hasAnimatingContent = $derived(
    $traceStore.lines.length > displayedLines.length ||
    typingId !== null
  );

  // Called when a line finishes typing
  function handleLineComplete() {
    if (instantMode) return;

    typingId = null;
    scrollToBottom();

    const storeLines = $traceStore.lines;
    if (storeLines.length > processedCount) {
      queueMicrotask(() => {
        const freshLines = $traceStore.lines;
        if (freshLines.length > processedCount) {
          const nextLine = freshLines[processedCount];
          processedCount++;
          displayedLines = [...displayedLines, nextLine];
          typingId = nextLine.id;
        }
      });
    }
  }

  function scrollToBottom() {
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  // Handle keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.code === 'Space' && $traceStore.isStreaming) {
      event.preventDefault();
      onPause?.();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="trace-view" bind:this={container}>
  <!-- Centered watermark for screenshots (hide when streaming or few lines) -->
  {#if !$traceStore.isStreaming && displayedLines.length > 5}
    <div class="watermark" aria-hidden="true">
      <span class="watermark-glyph">◯</span>
      <span class="watermark-text">trace</span>
    </div>
  {/if}

  {#each displayedLines as line, index (line.id)}
    <div class="line-wrapper" style="--line-index: {index}">
      {#if line.isSymbol}
        <TransitionSymbol
          symbol={line.content}
          isNew={!instantMode && line.id === typingId}
          onComplete={!instantMode && line.id === typingId ? handleLineComplete : undefined}
        />
      {:else}
        <TraceLineComponent
          lineId={line.id}
          content={line.content}
          methodHint={line.methodHint}
          depth={line.depth}
          isNew={!instantMode && line.id === typingId}
          onComplete={!instantMode && line.id === typingId ? handleLineComplete : undefined}
          onProgress={!instantMode && line.id === typingId ? scrollToBottom : undefined}
          showCursor={!instantMode && !line.isSymbol && typingId === null && index === displayedLines.length - 1 && $traceStore.isStreaming}
        />
      {/if}
    </div>
  {/each}
</div>

<div class="hints">
  {#if $traceStore.isStreaming && !$traceStore.isPaused && !instantMode}
    <div class="hint">
      <kbd>space</kbd>
      <span>to pause</span>
    </div>
  {/if}

  {#if !instantMode && (hasAnimatingContent || $traceStore.isStreaming)}
    <button class="reveal-btn" onclick={revealAll}>
      <span class="reveal-icon">⏭</span>
      <span>reveal all</span>
    </button>
  {/if}
</div>

<style>
  .trace-view {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0;
    padding-block-end: 8rem;
    scroll-behavior: smooth;
    position: relative;

    /* Bottom fade to signal viewport boundary */
    mask-image: linear-gradient(
      to bottom,
      black 0%,
      black calc(100% - 6rem),
      transparent 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      black 0%,
      black calc(100% - 6rem),
      transparent 100%
    );
  }

  /* Centered watermark */
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
    pointer-events: none;
    z-index: 0;
    opacity: 0.04;
  }

  .watermark-glyph {
    font-size: clamp(4rem, 10vw, 8rem);
    color: var(--text-color, #e8e6e3);
    line-height: 1;
  }

  .watermark-text {
    font-family: var(--font-display, 'Cormorant Garamond', serif);
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    font-weight: 300;
    color: var(--text-color, #e8e6e3);
    letter-spacing: var(--tracking-wider, 0.05em);
    text-transform: lowercase;
  }

  .line-wrapper {
    animation: lineEnter 0.3s var(--ease-out, ease-out) backwards;
  }

  @keyframes lineEnter {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .hints {
    position: fixed;
    bottom: var(--space-xl, 2rem);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: var(--space-md, 1rem);
    align-items: center;
    z-index: 10;
  }

  .hint {
    display: flex;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-dim, #4a484a);
    background: rgba(10, 10, 11, 0.9);
    padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-md, 4px);
    backdrop-filter: blur(8px);
    animation: hintFadeIn 0.3s var(--ease-out, ease-out);
  }

  @keyframes hintFadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .hint kbd {
    display: inline-block;
    padding: 0.15em 0.5em;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--text-secondary, #b8b5b0);
    background: var(--surface-color, #141416);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-sm, 2px);
  }

  .reveal-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #6a6a6a);
    background: rgba(10, 10, 11, 0.9);
    padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-md, 4px);
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition:
      color var(--duration-fast, 150ms),
      border-color var(--duration-fast, 150ms),
      background var(--duration-fast, 150ms);
    animation: hintFadeIn 0.3s var(--ease-out, ease-out);
  }

  .reveal-btn:hover {
    color: var(--text-color, #e8e6e3);
    border-color: var(--border-strong, #2a2a30);
    background: var(--surface-color, #141416);
  }

  .reveal-icon {
    font-size: var(--font-size-xs, 0.75rem);
    opacity: 0.7;
  }

  /* Mobile adjustments */
  @media (max-width: 640px) {
    .hints {
      bottom: var(--space-lg, 1.5rem);
      flex-direction: column;
      gap: var(--space-xs, 0.5rem);
    }

    .hint,
    .reveal-btn {
      font-size: var(--font-size-xs, 0.75rem);
      padding: var(--space-2xs, 0.25rem) var(--space-sm, 0.75rem);
    }
  }
</style>
