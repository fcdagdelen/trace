<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { traceStore, type TraceLine } from '$lib/stores/trace';
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
        // Scroll when new line starts
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
    // Skip if in instant mode
    if (instantMode) return;

    typingId = null;
    scrollToBottom();

    // Check if more lines are waiting
    const storeLines = $traceStore.lines;
    if (storeLines.length > processedCount) {
      // Use microtask to batch updates
      queueMicrotask(() => {
        // Re-read from store to get fresh data
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
  {#each displayedLines as line, index (line.id)}
    {#if line.isSymbol}
      <TransitionSymbol
        symbol={line.content}
        isNew={!instantMode && line.id === typingId}
        onComplete={!instantMode && line.id === typingId ? handleLineComplete : undefined}
      />
    {:else}
      <TraceLineComponent
        content={line.content}
        methodHint={line.methodHint}
        depth={line.depth}
        isNew={!instantMode && line.id === typingId}
        onComplete={!instantMode && line.id === typingId ? handleLineComplete : undefined}
        onProgress={!instantMode && line.id === typingId ? scrollToBottom : undefined}
        showCursor={!instantMode && !line.isSymbol && typingId === null && index === displayedLines.length - 1 && $traceStore.isStreaming}
      />
    {/if}
  {/each}
</div>

<div class="hints">
  {#if $traceStore.isStreaming && !$traceStore.isPaused && !instantMode}
    <div class="hint">
      <kbd>space</kbd> to pause
    </div>
  {/if}

  {#if !instantMode && (hasAnimatingContent || $traceStore.isStreaming)}
    <button class="reveal-btn" onclick={revealAll}>
      reveal all
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

  .hints {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 1rem;
    align-items: center;
    z-index: 10;
  }

  .hint {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #444);
    background: var(--bg-color, #0d0d0d);
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color, #222);
    opacity: 0.9;
  }

  .hint kbd {
    color: var(--text-color, #888);
  }

  .reveal-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #555);
    background: var(--bg-color, #0d0d0d);
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color, #222);
    cursor: pointer;
    transition: color 150ms, border-color 150ms;
  }

  .reveal-btn:hover {
    color: var(--text-color, #e8e6e3);
    border-color: var(--muted-color, #444);
  }
</style>
