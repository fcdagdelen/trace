<script lang="ts">
  import { onMount } from 'svelte';
  import { getTypography } from '$lib/utils/typography';
  import { lineVisible, lineHidden } from '$lib/stores/visibleSpirits';

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
  }

  let { lineId, content, methodHint, depth = 0, isNew = false, typeSpeed = 25, onComplete, onProgress, showCursor = false }: Props = $props();

  let lineElement: HTMLDivElement;

  const typography = $derived(getTypography(methodHint));

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

  // Visual encoding based on depth
  const depthStyles = $derived({
    indent: organicIndent(),
    brightness: 0.88 + (depth * 0.03),
    weight: typography.weight + (depth * 25),
    speed: 32 + (depth * 4),
  });

  let displayedContent = $state('');
  let isTyping = $state(false);
  let typingContentId = '';

  // Type out content character by character
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

    let idx = 0;
    const speed = depthStyles.speed;

    const interval = setInterval(() => {
      idx++;
      displayedContent = targetContent.slice(0, idx);
      onProgress?.();

      if (idx >= targetContent.length) {
        clearInterval(interval);
        isTyping = false;
        onComplete?.();
      }
    }, speed);

    return () => {
      clearInterval(interval);
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

<div
  bind:this={lineElement}
  class="trace-line"
  class:typing={isTyping}
  class:breathe={animationClass === 'breathe' && isTyping}
  class:pulse={animationClass === 'pulse' && isTyping}
  class:flicker={animationClass === 'flicker' && isTyping}
  class:float={animationClass === 'float' && isTyping}
  style="
    padding-inline-start: {depthStyles.indent}em;
    filter: brightness({depthStyles.brightness});
    font-weight: {depthStyles.weight};
    letter-spacing: {typography.letterSpacing}em;
    --glow-color: {typography.glowColor};
    --settled-color: color-mix(in srgb, {typography.glowColor} 60%, var(--text-color, #e8e6e3));
    --spirit-glyph-color: {typography.glowColor};
  "
>
  {#if methodHint && isTyping}
    <span class="spirit-glyph" aria-hidden="true">{typography.glyph}</span>
  {/if}
  <span class="content">{displayedContent}</span>
  {#if isTyping || showCursor}
    <span class="cursor"></span>
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
</style>
