<script lang="ts">
  import { dev } from '$app/environment';
  import { goto } from '$app/navigation';

  let bypassed = $state(false);

  // Check current bypass state from cookie
  $effect(() => {
    bypassed = document.cookie.includes('dev_bypass_auth=1');
  });

  function enableBypass() {
    document.cookie = 'dev_bypass_auth=1; path=/; max-age=86400';
    bypassed = true;
  }

  function disableBypass() {
    document.cookie = 'dev_bypass_auth=; path=/; max-age=0';
    bypassed = false;
  }

  function goToHistory() {
    goto('/history');
  }

  function goToHome() {
    goto('/');
  }
</script>

{#if !dev}
  <div class="not-dev">
    <p>This page is only available in development mode.</p>
  </div>
{:else}
  <div class="dev-panel">
    <h1>Dev Tools</h1>

    <section class="section">
      <h2>Auth Bypass</h2>
      <p class="status">
        Status: <span class:enabled={bypassed} class:disabled={!bypassed}>
          {bypassed ? 'Enabled' : 'Disabled'}
        </span>
      </p>

      {#if bypassed}
        <button class="btn danger" onclick={disableBypass}>Disable Bypass</button>
      {:else}
        <button class="btn primary" onclick={enableBypass}>Enable Bypass</button>
      {/if}

      <p class="hint">
        When enabled, you can access protected routes without authentication.
        API calls will return mock data.
      </p>
    </section>

    <section class="section">
      <h2>Quick Nav</h2>
      <div class="nav-buttons">
        <button class="btn" onclick={goToHome}>Home</button>
        <button class="btn" onclick={goToHistory}>History</button>
        <a href="/spirits/transmute" class="btn">Transmute</a>
      </div>
    </section>
  </div>
{/if}

<style>
  .not-dev {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    color: var(--error-color, #e57373);
    font-family: var(--font-mono);
  }

  .dev-panel {
    max-width: 500px;
    margin: var(--space-2xl, 3rem) auto;
    padding: var(--space-xl, 2rem);
    font-family: var(--font-mono);
  }

  h1 {
    font-family: var(--font-display, serif);
    font-size: var(--font-size-2xl, 2rem);
    font-weight: 300;
    color: var(--text-color, #e8e6e3);
    margin: 0 0 var(--space-xl, 2rem) 0;
    letter-spacing: var(--tracking-wide, 0.02em);
  }

  .section {
    margin-bottom: var(--space-xl, 2rem);
    padding: var(--space-lg, 1.5rem);
    background: var(--surface-color, #141416);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-md, 4px);
  }

  h2 {
    font-size: var(--font-size-sm, 0.875rem);
    font-weight: 500;
    color: var(--muted-color, #6a6a6a);
    text-transform: uppercase;
    letter-spacing: var(--tracking-widest, 0.1em);
    margin: 0 0 var(--space-md, 1rem) 0;
  }

  .status {
    font-size: var(--font-size-base, 1rem);
    color: var(--text-secondary, #b8b5b0);
    margin: 0 0 var(--space-md, 1rem) 0;
  }

  .status .enabled {
    color: var(--success-color, #7ac47a);
  }

  .status .disabled {
    color: var(--muted-color, #6a6a6a);
  }

  .hint {
    font-size: var(--font-size-xs, 0.75rem);
    color: var(--muted-dim, #4a484a);
    margin: var(--space-md, 1rem) 0 0 0;
    line-height: 1.6;
  }

  .btn {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--text-color, #e8e6e3);
    background: var(--bg-elevated, #0f0f11);
    border: 1px solid var(--border-strong, #2a2a30);
    padding: var(--space-sm, 0.75rem) var(--space-lg, 1.5rem);
    border-radius: var(--radius-sm, 2px);
    cursor: pointer;
    text-decoration: none;
    transition: all var(--duration-fast, 150ms);
  }

  .btn:hover {
    background: var(--surface-color, #141416);
    border-color: var(--accent-color, #8aa4ff);
  }

  .btn.primary {
    background: var(--accent-color, #8aa4ff);
    border-color: var(--accent-color, #8aa4ff);
    color: var(--bg-color, #0a0a0b);
  }

  .btn.primary:hover {
    background: var(--accent-bright, #a8c0ff);
  }

  .btn.danger {
    border-color: var(--error-color, #e57373);
    color: var(--error-color, #e57373);
  }

  .btn.danger:hover {
    background: rgba(229, 115, 115, 0.1);
  }

  .nav-buttons {
    display: flex;
    gap: var(--space-sm, 0.75rem);
    flex-wrap: wrap;
  }
</style>
