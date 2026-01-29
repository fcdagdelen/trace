<script lang="ts">
  import { goto } from '$app/navigation';
  import TransmutationModal from '$lib/components/TransmutationModal.svelte';
  import { getDefaultSpirits, fetchAllSpirits } from '$lib/services/spirits';
  import { createSupabaseBrowserClient } from '$lib/services/supabase';
  import { isPaidUser } from '$lib/stores/user';
  import type { Method } from '$lib/methods';

  const supabase = createSupabaseBrowserClient();

  // State
  let spirits = $state<Method[]>([]);
  let isLoading = $state(true);
  let error = $state<string | null>(null);
  let success = $state<{ name: string; slug: string } | null>(null);

  // Load all available spirits on mount
  $effect(() => {
    loadSpirits();
  });

  async function loadSpirits() {
    isLoading = true;
    error = null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      spirits = await fetchAllSpirits(supabase, userId);
    } catch (e) {
      console.error('Failed to load spirits:', e);
      // Fall back to defaults
      spirits = await getDefaultSpirits();
    } finally {
      isLoading = false;
    }
  }

  async function handleTransmute(spiritA: string, spiritB: string, name: string, slug: string) {
    error = null;
    success = null;

    try {
      const response = await fetch('/api/spirits/transmute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spiritA, spiritB, name, slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transmutation failed');
      }

      success = { name, slug };

      // Reload spirits to include the new one
      await loadSpirits();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Transmutation failed';
    }
  }

  function handleCancel() {
    goto('/');
  }

  function dismissSuccess() {
    success = null;
  }
</script>

<svelte:head>
  <title>transmute spirits | trace</title>
</svelte:head>

<div class="page">
  <header class="header">
    <a href="/" class="back-link">← trace</a>
    <span class="title">spirit transmutation</span>
  </header>

  <main class="main">
    {#if !$isPaidUser}
      <!-- Paywall for free users -->
      <div class="paywall">
        <div class="paywall-icon">+</div>
        <div class="paywall-text">
          <span class="paywall-title">Spirit Transmutation</span>
          <span class="paywall-description">
            Combine two spirits to create a new hybrid thinker.
            This feature is available for paid users.
          </span>
        </div>
        <div class="paywall-actions">
          <a href="/" class="action-btn">back to trace</a>
          <button class="action-btn primary" disabled>upgrade coming soon</button>
        </div>
      </div>
    {:else if isLoading}
      <div class="loading">loading spirits...</div>
    {:else if success}
      <div class="success-message">
        <div class="success-icon">+</div>
        <div class="success-text">
          <span class="success-title">{success.name} created</span>
          <span class="success-slug">/{success.slug}</span>
        </div>
        <div class="success-actions">
          <button class="action-btn" onclick={dismissSuccess}>create another</button>
          <a href="/" class="action-btn primary">use in trace</a>
        </div>
      </div>
    {:else}
      <TransmutationModal
        {spirits}
        onTransmute={handleTransmute}
        onCancel={handleCancel}
      />
    {/if}

    {#if error}
      <div class="error">{error}</div>
    {/if}
  </main>
</div>

<style>
  .page {
    min-height: 100vh;
    background: var(--bg-color, #0d0d0d);
    display: flex;
    flex-direction: column;
  }

  .header {
    padding: 0.75rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    border-bottom: 1px solid var(--border-color, #222);
  }

  .back-link {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #666);
    text-decoration: none;
    transition: color 150ms;
  }

  .back-link:hover {
    color: var(--text-color, #e8e6e3);
  }

  .title {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #555);
    letter-spacing: 0.05em;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .loading {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #666);
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .error {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: #e57373;
    margin-top: 1rem;
    padding: 0.75rem 1.5rem;
    border: 1px solid #e57373;
    background: rgba(229, 115, 115, 0.05);
  }

  .success-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 3rem;
    border: 1px solid var(--accent-color, #6b8afd);
    background: rgba(107, 138, 253, 0.02);
  }

  .success-icon {
    font-family: var(--font-mono);
    font-size: 3rem;
    color: var(--accent-color, #6b8afd);
    line-height: 1;
  }

  .success-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .success-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-base, 1.125rem);
    color: var(--text-color, #e8e6e3);
  }

  .success-slug {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #666);
  }

  .success-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .action-btn {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #666);
    background: transparent;
    border: 1px solid var(--border-color, #333);
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    text-decoration: none;
    transition: all 150ms;
  }

  .action-btn:hover {
    color: var(--text-color, #e8e6e3);
    border-color: var(--muted-color, #666);
  }

  .action-btn.primary {
    color: var(--bg-color, #0d0d0d);
    background: var(--accent-color, #6b8afd);
    border-color: var(--accent-color, #6b8afd);
  }

  .action-btn.primary:hover {
    filter: brightness(1.1);
  }

  .action-btn.primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: none;
  }

  .paywall {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 3rem;
    border: 1px solid var(--border-color, #333);
    background: rgba(255, 255, 255, 0.02);
    max-width: 400px;
    text-align: center;
  }

  .paywall-icon {
    font-family: var(--font-mono);
    font-size: 3rem;
    color: var(--muted-color, #555);
    line-height: 1;
    opacity: 0.5;
  }

  .paywall-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .paywall-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-base, 1.125rem);
    color: var(--text-color, #e8e6e3);
  }

  .paywall-description {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #666);
    line-height: 1.6;
  }

  .paywall-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }
</style>
