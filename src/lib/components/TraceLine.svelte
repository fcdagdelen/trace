<script lang="ts">
  import { onMount } from 'svelte';
  import { getTypography } from '$lib/utils/typography';
  import { lineVisible, lineHidden } from '$lib/stores/visibleSpirits';
  import { feedbackStore } from '$lib/stores/feedback';
  import type { AdherenceSignal } from '$lib/types/feedback';

  interface Props {
    lineId: string;
    content: string;
    methodHint: string | null;
    depth?: number;
    isNew?: boolean;
    typeSpeed?: number;
    onComplete?: () => void;
    onProgress?: () => void;
    showCursor?: boolean;
    traceId?: string | null;
  }

  let { lineId, content, methodHint, depth = 0, isNew = false, typeSpeed = 25, onComplete, onProgress, showCursor = false, traceId = null }: Props = $props();

  let lineElement: HTMLDivElement;

  const typography = $derived(getTypography(methodHint));

  // Feedback state
  let isHovered = $state(false);
  let hoveredIcon = $state<'up' | 'down' | null>(null);
  let settleAnimation = $state<'up' | 'down' | null>(null);

  // Get current feedback for this spirit
  const currentFeedback = $derived.by(() => {
    if (!traceId || !methodHint) return null;
    let feedback: AdherenceSignal | null = null;
    feedbackStore.subscribe(state => {
      feedback = state.byTrace[traceId]?.[methodHint]?.signal ?? null;
    })();
    return feedback;
  });

  // Check if THIS line is where the feedback was clicked (primary emphasis)
  const isClickedLine = $derived.by(() => {
    if (!traceId || !methodHint) return false;
    let clickedId: string | null = null;
    feedbackStore.subscribe(state => {
      clickedId = state.byTrace[traceId]?.[methodHint]?.clickedLineId ?? null;
    })();
    return clickedId === lineId;
  });

  // This spirit has feedback (for section highlighting)
  const hasSpiritFeedback = $derived(currentFeedback !== null);

  // Can show feedback controls
  const canShowFeedback = $derived(!!methodHint && !!traceId && !isNew);

  function handleFeedback(signal: AdherenceSignal) {
    if (!traceId || !methodHint) return;

    // Trigger settle animation
    settleAnimation = signal === 1 ? 'up' : 'down';
    setTimeout(() => {
      settleAnimation = null;
    }, 400);

    // Submit feedback for this spirit (from this line)
    feedbackStore.submit(traceId, lineId, methodHint, signal);
  }

  // Organic indentation: combines depth with content-based variance
  const lineHash = $derived(() => {
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 20); i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  });

  // Organic indent: base depth + small random variance from content
  const organicIndent = $derived(() => {
    const baseIndent = depth * 1.5;
    const variance = (lineHash() % 5) * 0.3;
    return baseIndent + variance;
  });

  // Typing speed constants
  const SENTENCE_PAUSE_MULT = 3;      // Multiplier at .!?
  const CLAUSE_PAUSE_MULT = 1.5;      // Multiplier at ,;:
  const WORD_PAUSE_MULT = 1.1;        // Multiplier at spaces
  const VARIANCE_MIN = 0.9;           // Random variance range
  const VARIANCE_MAX = 1.1;
  const LONG_LINE_THRESHOLD = 80;     // When to speed up
  const MEDIUM_LINE_THRESHOLD = 40;

  // Calculate base speed based on line length (longer = faster to avoid tedium)
  const baseSpeed = $derived(() => {
    if (content.length > LONG_LINE_THRESHOLD) return 20;
    if (content.length > MEDIUM_LINE_THRESHOLD) return 25;
    return 28;
  });

  // Visual encoding based on depth
  const depthStyles = $derived({
    indent: organicIndent(),
    brightness: 0.88 + (depth * 0.03),
    weight: typography.weight + (depth * 25),
    speed: baseSpeed() + (depth * 4),
  });

  let displayedContent = $state('');
  let isTyping = $state(false);
  let typingContentId = '';

  // Calculate delay for a character based on the previous character (organic variance)
  function getCharDelay(prevChar: string, speed: number): number {
    // Pause at sentence endings
    if ('.!?'.includes(prevChar)) return speed * SENTENCE_PAUSE_MULT;

    // Brief pause at clause breaks
    if (',;:'.includes(prevChar)) return speed * CLAUSE_PAUSE_MULT;

    // Slight pause at word boundaries
    if (prevChar === ' ') return speed * WORD_PAUSE_MULT;

    // Small random variance for organic feel
    return speed * (VARIANCE_MIN + Math.random() * (VARIANCE_MAX - VARIANCE_MIN));
  }

  // Build cumulative delay array for all characters
  function buildDelaySchedule(text: string, speed: number): number[] {
    const delays: number[] = [];
    let cumulative = 0;

    for (let i = 0; i < text.length; i++) {
      const prevChar = i === 0 ? '' : text[i - 1];
      cumulative += getCharDelay(prevChar, speed);
      delays.push(cumulative);
    }

    return delays;
  }

  // Type out content character by character using requestAnimationFrame
  $effect(() => {
    const targetContent = content;
    const shouldType = isNew;
    const contentId = `${targetContent}-${shouldType}`;

    if (!shouldType) {
      displayedContent = targetContent;
      isTyping = false;
      return;
    }

    if (typingContentId === contentId) {
      return;
    }

    typingContentId = contentId;
    isTyping = true;
    displayedContent = '';

    const speed = depthStyles.speed;
    const delaySchedule = buildDelaySchedule(targetContent, speed);

    let startTime: number | null = null;
    let lastCharIndex = 0;
    let animationId: number;

    function animateTyping(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      // Find how many characters should be displayed based on elapsed time
      let targetIndex = 0;
      for (let i = 0; i < delaySchedule.length; i++) {
        if (elapsed >= delaySchedule[i]) {
          targetIndex = i + 1;
        } else {
          break;
        }
      }

      if (targetIndex !== lastCharIndex) {
        lastCharIndex = targetIndex;
        displayedContent = targetContent.slice(0, targetIndex);
        onProgress?.();
      }

      if (targetIndex < targetContent.length) {
        animationId = requestAnimationFrame(animateTyping);
      } else {
        isTyping = false;
        onComplete?.();
      }
    }

    animationId = requestAnimationFrame(animateTyping);

    return () => {
      cancelAnimationFrame(animationId);
    };
  });

  // Animation class based on spirit
  const animationClass = $derived(typography.animationStyle);

  // Track visibility for spirit legend
  onMount(() => {
    if (!lineElement || !methodHint) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            lineVisible(lineId, methodHint);
          } else {
            lineHidden(lineId);
          }
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(lineElement);

    return () => {
      observer.disconnect();
      lineHidden(lineId);
    };
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={lineElement}
  class="trace-line"
  class:typing={isTyping}
  class:breathe={animationClass === 'breathe' && isTyping}
  class:pulse={animationClass === 'pulse' && isTyping}
  class:flicker={animationClass === 'flicker' && isTyping}
  class:float={animationClass === 'float' && isTyping}
  class:has-feedback={canShowFeedback}
  class:spirit-voted-up={hasSpiritFeedback && currentFeedback === 1}
  class:spirit-voted-down={hasSpiritFeedback && currentFeedback === -1}
  class:clicked-line={isClickedLine}
  style="
    padding-inline-start: {depthStyles.indent}em;
    filter: brightness({depthStyles.brightness});
    font-weight: {depthStyles.weight};
    letter-spacing: {typography.letterSpacing}em;
    --glow-color: {typography.glowColor};
    --settled-color: color-mix(in srgb, {typography.glowColor} 60%, var(--text-color, #e8e6e3));
    --spirit-glyph-color: {typography.glowColor};
  "
  onmouseenter={() => isHovered = true}
  onmouseleave={() => { isHovered = false; hoveredIcon = null; }}
>
  {#if methodHint && isTyping}
    <span class="spirit-glyph" aria-hidden="true">{typography.glyph}</span>
  {/if}
  <span class="content">{displayedContent}</span>
  {#if isTyping || showCursor}
    <span class="cursor"></span>
  {/if}

  {#if canShowFeedback}
    <span class="feedback-zone">
      {#if methodHint && !isTyping}
        <span class="spirit-glyph-settled" aria-hidden="true">{typography.glyph}</span>
      {/if}

      <span
        class="feedback-icons"
        class:visible={isHovered}
        class:has-vote={currentFeedback !== null}
      >
        <button
          class="feedback-btn up"
          class:active={currentFeedback === 1}
          class:hovered={hoveredIcon === 'up'}
          class:settle={settleAnimation === 'up'}
          onmouseenter={() => hoveredIcon = 'up'}
          onmouseleave={() => hoveredIcon = null}
          onclick={() => handleFeedback(1)}
          aria-label="This feels like {methodHint}"
          title="This feels like {methodHint}"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
        </button>
        <button
          class="feedback-btn down"
          class:active={currentFeedback === -1}
          class:hovered={hoveredIcon === 'down'}
          class:settle={settleAnimation === 'down'}
          onmouseenter={() => hoveredIcon = 'down'}
          onmouseleave={() => hoveredIcon = null}
          onclick={() => handleFeedback(-1)}
          aria-label="This doesn't feel like {methodHint}"
          title="This doesn't feel like {methodHint}"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
          </svg>
        </button>
      </span>

      {#if currentFeedback === 1}
        <span class="feedback-indicator voted-up" aria-label="You found this adherent"></span>
      {:else if currentFeedback === -1}
        <span class="feedback-indicator voted-down" aria-label="You found this non-adherent"></span>
      {/if}
    </span>
  {/if}
</div>

<style>
  .trace-line {
    font-family: var(--font-mono);
    font-size: var(--font-size-base, 1rem);
    line-height: var(--line-height, 1.7);
    color: var(--settled-color, #e8e6e3);
    margin: 0;
    min-height: 1.7em;
    position: relative;
    transition:
      letter-spacing 400ms var(--ease-out, ease-out),
      color 600ms var(--ease-out, ease-out),
      padding-inline-start 300ms var(--ease-out, ease-out),
      filter 400ms var(--ease-out, ease-out),
      font-weight 400ms var(--ease-out, ease-out);
  }

  .trace-line.typing {
    color: var(--glow-color, #b0b0b0);
    transition: none;
  }

  /* Spirit glyph indicator */
  .spirit-glyph {
    position: absolute;
    left: -1.5em;
    top: 0.15em;
    font-size: 0.7em;
    color: var(--spirit-glyph-color, var(--muted-color));
    opacity: 0.5;
    animation: glyphFade 2s ease-out forwards;
    pointer-events: none;
    user-select: none;
  }

  @keyframes glyphFade {
    0% {
      opacity: 0;
      transform: translateX(-4px);
    }
    20% {
      opacity: 0.6;
      transform: translateX(0);
    }
    100% {
      opacity: 0.3;
      transform: translateX(0);
    }
  }

  .content {
    display: inline;
  }

  /* Cursor */
  .cursor {
    display: inline-block;
    width: 0.55em;
    height: 1.05em;
    margin-inline-start: 2px;
    vertical-align: text-bottom;
    background: var(--glow-color, var(--text-color));
    animation: cursorBlink 1s step-end infinite;
    box-shadow: 0 0 8px var(--glow-color, transparent);
  }

  @keyframes cursorBlink {
    0%, 50% { opacity: 1; }
    50.01%, 100% { opacity: 0; }
  }

  /* Spirit-specific animations during typing */
  .trace-line.breathe {
    animation: lineBreath 2s ease-in-out infinite;
  }

  .trace-line.pulse {
    animation: linePulse 1.5s ease-in-out infinite;
  }

  .trace-line.flicker {
    animation: lineFlicker 0.1s ease-in-out infinite;
  }

  .trace-line.float {
    animation: lineFloat 3s ease-in-out infinite;
  }

  @keyframes lineBreath {
    0%, 100% {
      opacity: 0.9;
    }
    50% {
      opacity: 1;
    }
  }

  @keyframes linePulse {
    0%, 100% {
      text-shadow: 0 0 0 transparent;
    }
    50% {
      text-shadow: 0 0 8px var(--glow-color, transparent);
    }
  }

  @keyframes lineFlicker {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.95;
    }
  }

  @keyframes lineFloat {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-1px);
    }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    .trace-line.breathe,
    .trace-line.pulse,
    .trace-line.flicker,
    .trace-line.float {
      animation: none;
    }

    .cursor {
      animation: none;
      opacity: 1;
    }

    .spirit-glyph {
      animation: none;
      opacity: 0.3;
    }
  }

  /* ═══════════════════════════════════════════════════════════
     FEEDBACK UI
     ═══════════════════════════════════════════════════════════ */

  .feedback-zone {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    margin-inline-start: 0.75em;
    vertical-align: middle;
  }

  .spirit-glyph-settled {
    font-size: 0.7em;
    color: var(--spirit-glyph-color, var(--muted-color));
    opacity: 0.25;
    transition: opacity 300ms ease-out;
  }

  .trace-line:hover .spirit-glyph-settled {
    opacity: 0.5;
  }

  .feedback-indicator {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    opacity: 0.7;
  }

  .feedback-indicator.voted-up {
    background: #6fbf73;
    box-shadow: 0 0 4px rgba(111, 191, 115, 0.5);
  }

  .feedback-indicator.voted-down {
    background: #e57373;
    box-shadow: 0 0 4px rgba(229, 115, 115, 0.5);
  }

  .feedback-icons {
    display: inline-flex;
    align-items: center;
    gap: 0.25em;
    opacity: 0;
    transform: translateX(-4px);
    transition:
      opacity 200ms ease-out,
      transform 200ms ease-out;
    pointer-events: none;
  }

  .feedback-icons.visible {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }

  .feedback-icons.has-vote {
    opacity: 0;
  }

  .feedback-icons.visible.has-vote {
    opacity: 0.6;
    pointer-events: auto;
  }

  /* ═══════════════════════════════════════════════════════════
     SPIRIT SECTION HIGHLIGHTING
     ═══════════════════════════════════════════════════════════ */

  /* Subtle highlight for all lines of a spirit with positive feedback */
  .trace-line.spirit-voted-up {
    background: linear-gradient(90deg, rgba(111, 191, 115, 0.06) 0%, transparent 60%);
    border-left: 2px solid rgba(111, 191, 115, 0.25);
    margin-left: -2px;
    padding-left: calc(var(--current-indent, 0) + 2px);
  }

  /* Subtle highlight for all lines of a spirit with negative feedback */
  .trace-line.spirit-voted-down {
    background: linear-gradient(90deg, rgba(229, 115, 115, 0.06) 0%, transparent 60%);
    border-left: 2px solid rgba(229, 115, 115, 0.25);
    margin-left: -2px;
    padding-left: calc(var(--current-indent, 0) + 2px);
  }

  /* Emphasized highlight for the clicked line (positive) */
  .trace-line.spirit-voted-up.clicked-line {
    background: linear-gradient(90deg, rgba(111, 191, 115, 0.12) 0%, transparent 70%);
    border-left: 2px solid rgba(111, 191, 115, 0.5);
  }

  /* Emphasized highlight for the clicked line (negative) */
  .trace-line.spirit-voted-down.clicked-line {
    background: linear-gradient(90deg, rgba(229, 115, 115, 0.12) 0%, transparent 70%);
    border-left: 2px solid rgba(229, 115, 115, 0.5);
  }

  .feedback-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.1em;
    height: 1.1em;
    padding: 0;
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--muted-dim, #4a484a);
    opacity: 0.5;
    transition:
      color 150ms ease-out,
      opacity 150ms ease-out,
      transform 150ms ease-out;
  }

  .feedback-btn svg {
    width: 100%;
    height: 100%;
  }

  .feedback-btn:hover {
    opacity: 1;
  }

  .feedback-btn.up:hover,
  .feedback-btn.up.hovered {
    color: #6fbf73;
    filter: drop-shadow(0 0 4px rgba(111, 191, 115, 0.5));
  }

  .feedback-btn.down:hover,
  .feedback-btn.down.hovered {
    color: #e57373;
    filter: drop-shadow(0 0 4px rgba(229, 115, 115, 0.5));
  }

  .feedback-btn.active {
    opacity: 1;
  }

  .feedback-btn.up.active {
    color: #6fbf73;
  }

  .feedback-btn.down.active {
    color: #e57373;
  }

  /* Settle animation on click */
  .feedback-btn.settle {
    animation: feedbackSettle 400ms ease-out forwards;
  }

  @keyframes feedbackSettle {
    0% {
      transform: scale(1);
    }
    30% {
      transform: scale(1.3);
    }
    60% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
    }
  }

  .feedback-btn.up.settle {
    animation: feedbackSettleUp 400ms ease-out forwards;
  }

  @keyframes feedbackSettleUp {
    0% {
      transform: scale(1);
      color: var(--muted-dim);
    }
    30% {
      transform: scale(1.3);
      color: #6fbf73;
      filter: drop-shadow(0 0 8px rgba(111, 191, 115, 0.7));
    }
    60% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
      color: #6fbf73;
    }
  }

  .feedback-btn.down.settle {
    animation: feedbackSettleDown 400ms ease-out forwards;
  }

  @keyframes feedbackSettleDown {
    0% {
      transform: scale(1);
      color: var(--muted-dim);
    }
    30% {
      transform: scale(1.3);
      color: #e57373;
      filter: drop-shadow(0 0 8px rgba(229, 115, 115, 0.7));
    }
    60% {
      transform: scale(0.9);
    }
    100% {
      transform: scale(1);
      color: #e57373;
    }
  }
</style>
