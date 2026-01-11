<script lang="ts">
  import { getTypography } from '$lib/utils/typography';

  interface Props {
    content: string;
    methodHint: string | null;
    depth?: number;
    isNew?: boolean;
    typeSpeed?: number; // ms per character
    onComplete?: () => void;
    onProgress?: () => void; // called during typing for scroll sync
    showCursor?: boolean; // show persistent cursor even after typing
  }

  let { content, methodHint, depth = 0, isNew = false, typeSpeed = 25, onComplete, onProgress, showCursor = false }: Props = $props();

  const typography = $derived(getTypography(methodHint));

  // Organic indentation: combines depth with content-based variance
  // Creates natural, distributed indentation rather than strict blocks
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
    const baseIndent = depth * 1.5; // Softer depth scaling
    const variance = (lineHash() % 5) * 0.3; // 0-1.2em variance
    return baseIndent + variance;
  });

  // Visual encoding based on depth
  const depthStyles = $derived({
    indent: organicIndent(),
    brightness: 0.85 + (depth * 0.04),    // 0.85 → 1.0 as depth 0→4 (brighter base)
    weight: 400 + (depth * 30),           // 400 → 520
    speed: 35 + (depth * 5),              // 35ms → 55ms (slower, more contemplative)
  });

  let displayedContent = $state('');
  let isTyping = $state(false);

  // Track the content we're typing to prevent re-runs
  let typingContentId = '';

  // Type out content character by character
  $effect(() => {
    const targetContent = content;
    const shouldType = isNew;
    const contentId = `${targetContent}-${shouldType}`;

    // If not new, show immediately
    if (!shouldType) {
      displayedContent = targetContent;
      isTyping = false;
      return;
    }

    // If we're already typing this exact content, don't restart
    if (typingContentId === contentId) {
      return;
    }

    // Mark this content as being typed
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
</script>

<div
  class="trace-line"
  class:typing={isTyping}
  style="
    padding-inline-start: {depthStyles.indent}em;
    filter: brightness({depthStyles.brightness});
    font-weight: {depthStyles.weight};
    letter-spacing: {typography.letterSpacing}em;
    --glow-color: {typography.glowColor};
    --settled-color: color-mix(in srgb, {typography.glowColor} 70%, var(--text-color, #e8e6e3));
  "
>
  {displayedContent}{#if isTyping || showCursor}<span class="cursor"></span>{/if}
</div>

<style>
  .trace-line {
    font-family: var(--font-mono);
    font-size: var(--font-size-base, 1.25rem);
    line-height: var(--line-height, 1.7);
    color: var(--settled-color, #e8e6e3);
    margin: 0;
    min-height: 1.7em;
    transition:
      letter-spacing 400ms ease-out,
      color 800ms ease-out,
      padding-inline-start 300ms ease-out,
      filter 400ms ease-out,
      font-weight 400ms ease-out;
  }

  .trace-line.typing {
    color: var(--glow-color, #b0b0b0);
    transition: none;
  }

  .cursor {
    display: inline-block;
    width: 0.55em;
    height: 1em;
    margin-inline-start: 2px;
    vertical-align: text-bottom;
    background: var(--glow-color, var(--text-color));
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    50.01%, 100% { opacity: 0; }
  }
</style>
