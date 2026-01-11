<script lang="ts">
  import { createSupabaseBrowserClient } from '$lib/services/supabase';

  let email = $state('');
  let loading = $state(false);
  let message = $state<{ type: 'success' | 'error'; text: string } | null>(null);

  const supabase = createSupabaseBrowserClient();

  async function handleLogin(e: Event) {
    e.preventDefault();
    loading = true;
    message = null;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      message = { type: 'error', text: error.message };
    } else {
      message = { type: 'success', text: 'Check your email for the magic link' };
    }

    loading = false;
  }
</script>

<svelte:head>
  <title>trace | enter</title>
</svelte:head>

<div class="auth-container">
  <div class="auth-content">
    <header class="auth-header">
      <h1 class="title">trace</h1>
      <p class="subtitle">watch thought unfold</p>
    </header>

    <form class="auth-form" onsubmit={handleLogin}>
      <div class="input-group">
        <input
          type="email"
          bind:value={email}
          placeholder="your@email.com"
          required
          disabled={loading}
          class="email-input"
        />
      </div>

      <button type="submit" disabled={loading || !email} class="submit-button">
        {loading ? 'sending...' : 'enter'}
      </button>

      {#if message}
        <p class="message" class:error={message.type === 'error'} class:success={message.type === 'success'}>
          {message.text}
        </p>
      {/if}
    </form>

    <footer class="auth-footer">
      <p>a magic link will be sent to your email</p>
    </footer>
  </div>
</div>

<style>
  .auth-container {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .auth-content {
    width: 100%;
    max-width: 24rem;
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .auth-header {
    text-align: center;
  }

  .title {
    font-size: var(--font-size-lg);
    font-weight: 400;
    letter-spacing: 0.2em;
    color: var(--text-color);
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: var(--font-size-sm);
    color: var(--muted-color);
    letter-spacing: 0.05em;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .input-group {
    position: relative;
  }

  .email-input {
    width: 100%;
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--text-color);
    background: var(--surface-color);
    border: 1px solid var(--border-color);
    outline: none;
    transition: border-color 200ms ease;
  }

  .email-input::placeholder {
    color: var(--muted-color);
  }

  .email-input:focus {
    border-color: var(--accent-color);
  }

  .email-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-button {
    padding: 1rem;
    font-family: var(--font-mono);
    font-size: var(--font-size-base);
    color: var(--bg-color);
    background: var(--text-color);
    border: none;
    cursor: pointer;
    transition: opacity 200ms ease, transform 100ms ease;
    letter-spacing: 0.1em;
  }

  .submit-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .submit-button:active:not(:disabled) {
    transform: scale(0.98);
  }

  .submit-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .message {
    font-size: var(--font-size-sm);
    text-align: center;
    padding: 0.75rem;
  }

  .message.error {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
  }

  .message.success {
    color: var(--accent-color);
    background: rgba(138, 164, 255, 0.1);
  }

  .auth-footer {
    text-align: center;
  }

  .auth-footer p {
    font-size: var(--font-size-sm);
    color: var(--muted-color);
  }
</style>
