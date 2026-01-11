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

  // Single effect: sync store lines to displayed lines
  $effect(() => {
    const storeLines = $traceStore.lines;

    // Reset if store was cleared
    if (storeLines.length === 0 && processedCount > 0) {
      processedCount = 0;
      displayedLines = [];
      typingId = null;
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

  // Called when a line finishes typing
  function handleLineComplete() {
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
        isNew={line.id === typingId}
        onComplete={line.id === typingId ? handleLineComplete : undefined}
      />
    {:else}
      <TraceLineComponent
        content={line.content}
        methodHint={line.methodHint}
        depth={line.depth}
        isNew={line.id === typingId}
        onComplete={line.id === typingId ? handleLineComplete : undefined}
        onProgress={line.id === typingId ? scrollToBottom : undefined}
        showCursor={!line.isSymbol && typingId === null && index === displayedLines.length - 1 && $traceStore.isStreaming}
      />
    {/if}
  {/each}
</div>

{#if $traceStore.isStreaming && !$traceStore.isPaused}
  <div class="hint">
    <kbd>space</kbd> to pause
  </div>
{/if}

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

  .hint {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #444);
    background: var(--bg-color, #0d0d0d);
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color, #222);
    opacity: 0.9;
    z-index: 10;
  }

  .hint kbd {
    color: var(--text-color, #888);
  }
</style>
