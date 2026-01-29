<script lang="ts">
  import { onMount } from 'svelte';
  import { SPIRIT_TYPOGRAPHY } from '$lib/utils/typography';
  import type { SpiritStat } from '../../routes/api/stats/spirits/+server';

  interface Props {
    onBeginTrace: () => void;
  }

  let { onBeginTrace }: Props = $props();

  let spirits = $state<SpiritStat[]>([]);
  let totalTraces = $state(0);
  let isLoading = $state(true);
  let hoveredSpirit = $state<string | null>(null);

  // Fetch spirit stats
  onMount(async () => {
    try {
      const response = await fetch('/api/stats/spirits');
      if (response.ok) {
        const data = await response.json();
        spirits = data.spirits;
        totalTraces = data.totalTraces;
      }
    } catch (e) {
      console.error('Failed to fetch spirit stats:', e);
    } finally {
      isLoading = false;
    }
  });

  // Top 5 spirits for display (or fewer if user hasn't traced much)
  const topSpirits = $derived(spirits.slice(0, 5));

  // Calculate affinity strength (0-1) for visual scaling
  function getAffinity(stat: SpiritStat): number {
    if (spirits.length === 0 || totalTraces === 0) return 0;
    const maxDominant = spirits[0]?.dominantCount ?? 1;
    return Math.max(0.3, stat.dominantCount / Math.max(maxDominant, 1));
  }

  // Get spirit typography data
  function getSpiritData(id: string) {
    return SPIRIT_TYPOGRAPHY[id] ?? {
      glyph: '?',
      glowColor: '#8aa4ff',
      color: '#3a3a3a',
    };
  }

  // Format spirit name for display
  function formatName(id: string): string {
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
</script>

<div class="sanctuary">
  <!-- Ambient background elements -->
  <div class="ambient-layer" aria-hidden="true">
    <div class="ambient-orb orb-1"></div>
    <div class="ambient-orb orb-2"></div>
    <div class="ambient-orb orb-3"></div>
  </div>

  <div class="sanctuary-content">
    <!-- Welcome text -->
    <header class="sanctuary-header">
      <h1 class="welcome-text">
        {#if totalTraces > 0}
          <span class="welcome-line">Welcome back</span>
        {:else}
          <span class="welcome-line">Welcome</span>
        {/if}
      </h1>
      {#if totalTraces > 0}
        <p class="trace-count">
          {totalTraces} trace{totalTraces === 1 ? '' : 's'} woven
        </p>
      {/if}
    </header>

    <!-- Spirit constellation -->
    {#if !isLoading && topSpirits.length > 0}
      <div class="spirit-constellation">
        <p class="constellation-label">your familiar spirits</p>
        <div class="sigil-ring">
          {#each topSpirits as stat, index}
            {@const data = getSpiritData(stat.spiritId)}
            {@const affinity = getAffinity(stat)}
            {@const isHovered = hoveredSpirit === stat.spiritId}
            <button
              class="sigil-container"
              class:hovered={isHovered}
              style="
                --sigil-color: {data.glowColor};
                --sigil-affinity: {affinity};
                --sigil-index: {index};
                --sigil-delay: {index * 150}ms;
              "
              onmouseenter={() => hoveredSpirit = stat.spiritId}
              onmouseleave={() => hoveredSpirit = null}
              onfocus={() => hoveredSpirit = stat.spiritId}
              onblur={() => hoveredSpirit = null}
              aria-label="{formatName(stat.spiritId)} - appeared in {stat.traceCount} traces"
            >
              <!-- Emanation rings -->
              <div class="emanation-rings" aria-hidden="true">
                <div class="ring ring-1"></div>
                <div class="ring ring-2"></div>
                <div class="ring ring-3"></div>
              </div>

              <!-- Core sigil -->
              <span class="sigil-glyph">{data.glyph}</span>

              <!-- Spirit name (appears on hover) -->
              <span class="sigil-name" class:visible={isHovered}>
                {formatName(stat.spiritId)}
              </span>

              <!-- Affinity indicator -->
              <span class="affinity-bar">
                <span class="affinity-fill" style="--fill: {affinity * 100}%"></span>
              </span>
            </button>
          {/each}
        </div>
      </div>
    {:else if !isLoading && topSpirits.length === 0}
      <div class="first-visit">
        <div class="first-visit-glyph">&#9702;</div>
        <p class="first-visit-text">
          No spirits yet.<br />
          Begin a trace to discover your affinities.
        </p>
      </div>
    {:else}
      <div class="loading-state">
        <div class="loading-glyph">&#8258;</div>
      </div>
    {/if}

    <!-- Call to action -->
    <div class="sanctuary-cta">
      <button class="begin-btn" onclick={onBeginTrace}>
        <span class="begin-glyph">&#x25B7;</span>
        <span class="begin-text">begin trace</span>
      </button>
      <p class="cta-hint">or press <kbd>enter</kbd></p>
    </div>
  </div>
</div>

<style>
  .sanctuary {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
    min-height: 60vh;
  }

  /* ═══════════════════════════════════════════════════════════
     AMBIENT BACKGROUND
     ═══════════════════════════════════════════════════════════ */

  .ambient-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  .ambient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.15;
    animation: orbFloat 20s ease-in-out infinite;
  }

  .orb-1 {
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, var(--accent-color) 0%, transparent 70%);
    top: -10%;
    left: 20%;
    animation-delay: 0s;
  }

  .orb-2 {
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, #7b9aff 0%, transparent 70%);
    bottom: 10%;
    right: 15%;
    animation-delay: -7s;
  }

  .orb-3 {
    width: 250px;
    height: 250px;
    background: radial-gradient(circle, #a78bfa 0%, transparent 70%);
    top: 40%;
    left: -5%;
    animation-delay: -14s;
  }

  @keyframes orbFloat {
    0%, 100% { transform: translate(0, 0) scale(1); }
    25% { transform: translate(30px, -20px) scale(1.05); }
    50% { transform: translate(-20px, 30px) scale(0.95); }
    75% { transform: translate(-30px, -10px) scale(1.02); }
  }

  /* ═══════════════════════════════════════════════════════════
     CONTENT
     ═══════════════════════════════════════════════════════════ */

  .sanctuary-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2xl);
    padding: var(--space-xl);
    animation: contentFadeIn 0.8s var(--ease-out) forwards;
  }

  @keyframes contentFadeIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ═══════════════════════════════════════════════════════════
     HEADER
     ═══════════════════════════════════════════════════════════ */

  .sanctuary-header {
    text-align: center;
  }

  .welcome-text {
    font-family: var(--font-display);
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 300;
    color: var(--text-color);
    letter-spacing: var(--tracking-wider);
    margin: 0;
    line-height: 1.2;
  }

  .welcome-line {
    display: block;
    animation: welcomeFade 1s var(--ease-out) forwards;
    animation-delay: 0.2s;
    opacity: 0;
  }

  @keyframes welcomeFade {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .trace-count {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    margin: var(--space-sm) 0 0 0;
    letter-spacing: var(--tracking-wide);
    animation: welcomeFade 1s var(--ease-out) forwards;
    animation-delay: 0.4s;
    opacity: 0;
  }

  /* ═══════════════════════════════════════════════════════════
     SPIRIT CONSTELLATION
     ═══════════════════════════════════════════════════════════ */

  .spirit-constellation {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-lg);
  }

  .constellation-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--muted-dim);
    text-transform: uppercase;
    letter-spacing: var(--tracking-widest);
    margin: 0;
    animation: welcomeFade 1s var(--ease-out) forwards;
    animation-delay: 0.5s;
    opacity: 0;
  }

  .sigil-ring {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xl);
    flex-wrap: wrap;
    max-width: 600px;
  }

  /* ═══════════════════════════════════════════════════════════
     SIGIL CONTAINER
     ═══════════════════════════════════════════════════════════ */

  .sigil-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: var(--space-md);
    animation: sigilEnter 0.6s var(--ease-out) forwards;
    animation-delay: calc(0.6s + var(--sigil-delay));
    opacity: 0;
    transform: scale(0.8);
  }

  @keyframes sigilEnter {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Emanation rings */
  .emanation-rings {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -60%);
    pointer-events: none;
  }

  .ring {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    border: 1px solid var(--sigil-color);
    opacity: 0;
    transition: opacity 0.4s var(--ease-out), transform 0.4s var(--ease-out);
  }

  .ring-1 {
    width: calc(60px * var(--sigil-affinity, 0.5));
    height: calc(60px * var(--sigil-affinity, 0.5));
  }

  .ring-2 {
    width: calc(90px * var(--sigil-affinity, 0.5));
    height: calc(90px * var(--sigil-affinity, 0.5));
  }

  .ring-3 {
    width: calc(120px * var(--sigil-affinity, 0.5));
    height: calc(120px * var(--sigil-affinity, 0.5));
  }

  .sigil-container:hover .ring,
  .sigil-container.hovered .ring,
  .sigil-container:focus .ring {
    opacity: 0.3;
  }

  .sigil-container:hover .ring-1,
  .sigil-container.hovered .ring-1,
  .sigil-container:focus .ring-1 {
    animation: ringPulse 2s ease-in-out infinite;
  }

  .sigil-container:hover .ring-2,
  .sigil-container.hovered .ring-2,
  .sigil-container:focus .ring-2 {
    animation: ringPulse 2s ease-in-out infinite;
    animation-delay: 0.3s;
  }

  .sigil-container:hover .ring-3,
  .sigil-container.hovered .ring-3,
  .sigil-container:focus .ring-3 {
    animation: ringPulse 2s ease-in-out infinite;
    animation-delay: 0.6s;
  }

  @keyframes ringPulse {
    0%, 100% {
      opacity: 0.2;
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      opacity: 0.4;
      transform: translate(-50%, -50%) scale(1.1);
    }
  }

  /* Core glyph */
  .sigil-glyph {
    font-size: calc(2.5rem + 1rem * var(--sigil-affinity, 0.5));
    color: var(--sigil-color);
    line-height: 1;
    transition:
      transform 0.3s var(--ease-out),
      text-shadow 0.3s var(--ease-out),
      filter 0.3s var(--ease-out);
    text-shadow:
      0 0 20px var(--sigil-color),
      0 0 40px color-mix(in srgb, var(--sigil-color) 50%, transparent);
    filter: brightness(0.9);
    position: relative;
    z-index: 2;
  }

  .sigil-container:hover .sigil-glyph,
  .sigil-container.hovered .sigil-glyph,
  .sigil-container:focus .sigil-glyph {
    transform: scale(1.15);
    filter: brightness(1.2);
    text-shadow:
      0 0 30px var(--sigil-color),
      0 0 60px var(--sigil-color),
      0 0 90px color-mix(in srgb, var(--sigil-color) 40%, transparent);
  }

  /* Spirit name */
  .sigil-name {
    font-family: var(--font-display);
    font-size: var(--font-size-base);
    font-weight: 400;
    font-style: italic;
    color: var(--sigil-color);
    letter-spacing: var(--tracking-wide);
    opacity: 0;
    transform: translateY(-8px);
    transition:
      opacity 0.3s var(--ease-out),
      transform 0.3s var(--ease-out);
    white-space: nowrap;
  }

  .sigil-name.visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Affinity bar */
  .affinity-bar {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 2px;
    background: var(--border-color);
    border-radius: 1px;
    overflow: hidden;
    opacity: 0;
    transition: opacity 0.3s var(--ease-out);
  }

  .sigil-container:hover .affinity-bar,
  .sigil-container.hovered .affinity-bar,
  .sigil-container:focus .affinity-bar {
    opacity: 1;
  }

  .affinity-fill {
    display: block;
    height: 100%;
    width: var(--fill, 50%);
    background: var(--sigil-color);
    border-radius: 1px;
  }

  /* ═══════════════════════════════════════════════════════════
     FIRST VISIT / LOADING STATES
     ═══════════════════════════════════════════════════════════ */

  .first-visit,
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-xl);
  }

  .first-visit-glyph {
    font-size: 3rem;
    color: var(--muted-dim);
    opacity: 0.5;
  }

  .first-visit-text {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    text-align: center;
    line-height: 1.8;
    margin: 0;
  }

  .loading-glyph {
    font-size: 2rem;
    color: var(--muted-dim);
    animation: loadingRotate 2s linear infinite;
  }

  @keyframes loadingRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* ═══════════════════════════════════════════════════════════
     CALL TO ACTION
     ═══════════════════════════════════════════════════════════ */

  .sanctuary-cta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    animation: welcomeFade 1s var(--ease-out) forwards;
    animation-delay: 1s;
    opacity: 0;
  }

  .begin-btn {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--text-color);
    background: transparent;
    border: 1px solid var(--border-strong);
    padding: var(--space-md) var(--space-xl);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition:
      border-color 0.3s var(--ease-out),
      background 0.3s var(--ease-out),
      box-shadow 0.3s var(--ease-out);
  }

  .begin-btn:hover,
  .begin-btn:focus {
    border-color: var(--accent-color);
    background: rgba(138, 164, 255, 0.05);
    box-shadow:
      0 0 20px rgba(138, 164, 255, 0.1),
      inset 0 0 20px rgba(138, 164, 255, 0.05);
    outline: none;
  }

  .begin-glyph {
    font-size: var(--font-size-sm);
    color: var(--accent-color);
    transition: transform 0.3s var(--ease-out);
  }

  .begin-btn:hover .begin-glyph,
  .begin-btn:focus .begin-glyph {
    transform: translateX(2px);
  }

  .begin-text {
    letter-spacing: var(--tracking-wide);
  }

  .cta-hint {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--muted-dim);
    margin: 0;
  }

  .cta-hint kbd {
    display: inline-block;
    padding: 0.1em 0.4em;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--muted-color);
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    margin-inline: 0.2em;
  }

  /* ═══════════════════════════════════════════════════════════
     RESPONSIVE
     ═══════════════════════════════════════════════════════════ */

  @media (max-width: 640px) {
    .sanctuary {
      min-height: 50vh;
    }

    .sanctuary-content {
      gap: var(--space-xl);
      padding: var(--space-md);
    }

    .welcome-text {
      font-size: clamp(1.5rem, 8vw, 2.5rem);
    }

    .sigil-ring {
      gap: var(--space-lg);
    }

    .sigil-container {
      padding: var(--space-sm);
    }

    .sigil-glyph {
      font-size: calc(2rem + 0.5rem * var(--sigil-affinity, 0.5));
    }

    .sigil-name {
      font-size: var(--font-size-sm);
    }

    .begin-btn {
      padding: var(--space-sm) var(--space-lg);
    }

    .ambient-orb {
      filter: blur(60px);
      opacity: 0.1;
    }

    .orb-1 { width: 250px; height: 250px; }
    .orb-2 { width: 200px; height: 200px; }
    .orb-3 { width: 150px; height: 150px; }
  }
</style>
