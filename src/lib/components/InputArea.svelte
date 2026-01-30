<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    onSubmit: (query: string) => void;
    disabled?: boolean;
  }

  let { onSubmit, disabled = false }: Props = $props();

  let query = $state('');
  let textarea: HTMLTextAreaElement;

  function handleSubmit() {
    const trimmed = query.trim();
    if (trimmed && !disabled) {
      onSubmit(trimmed);
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }

  onMount(() => {
    textarea?.focus();
  });
</script>

<div class="input-container">
  <div class="input-area">
    <textarea
      bind:this={textarea}
      bind:value={query}
      onkeydown={handleKeydown}
      oninput={handleInput}
      placeholder="enter a thought..."
      rows="1"
      {disabled}
      aria-label="Enter your thought"
    ></textarea>
    <button
      class="submit-btn"
      onclick={handleSubmit}
      disabled={disabled || query.trim().length === 0}
      aria-label="Submit thought"
    >
      <span class="submit-icon">→</span>
    </button>
  </div>

  <div class="input-hint">
    <kbd>enter</kbd> to submit · <kbd>shift+enter</kbd> for newline
  </div>
</div>

<style>
  /*
   * Stable input component - no layout shifts, no appearing/disappearing elements
   * Focus state is subtle glow only, everything else stays constant
   */

  .input-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-md, 1rem);
  }

  .input-area {
    display: flex;
    align-items: center;
    gap: var(--space-sm, 0.75rem);
    padding: var(--space-md, 1rem);
    background: transparent;
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-md, 4px);
    transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
  }

  .input-area:focus-within {
    border-color: var(--accent-dim, #6b8adb);
    box-shadow: 0 0 0 1px var(--accent-dim, #6b8adb), 0 0 20px rgba(138, 164, 255, 0.1);
  }

  textarea {
    flex: 1;
    padding: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-base, 1rem);
    line-height: 1.5;
    color: var(--text-color, #e8e6e3);
    background: transparent;
    background-color: transparent;
    border: none;
    border-radius: 0;
    resize: none;
    overflow: hidden;
    min-height: 1.5em;
    outline: none;
    box-shadow: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    caret-color: var(--accent-color, #8aa4ff);
  }

  textarea:-webkit-autofill,
  textarea:-webkit-autofill:hover,
  textarea:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0 1000px transparent inset;
    -webkit-text-fill-color: var(--text-color, #e8e6e3);
    background-color: transparent !important;
  }

  textarea::placeholder {
    color: var(--muted-color, #6a6a6a);
    font-style: italic;
  }

  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: var(--accent-color, #8aa4ff);
    border: none;
    border-radius: var(--radius-sm, 2px);
    cursor: pointer;
    transition: opacity 150ms ease-out, background 150ms ease-out;
  }

  .submit-btn:hover:not(:disabled) {
    background: var(--accent-bright, #a8c0ff);
  }

  .submit-btn:disabled {
    opacity: 0.2;
    cursor: default;
  }

  .submit-icon {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--bg-color, #0a0a0b);
    font-weight: 600;
  }

  .input-hint {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #6a6a6a);
    text-align: center;
  }

  .input-hint kbd {
    display: inline-block;
    padding: 0.15em 0.5em;
    font-family: var(--font-mono);
    font-size: 0.9em;
    color: var(--text-secondary, #b8b5b0);
    background: var(--surface-color, #141416);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-sm, 2px);
    margin: 0 0.15em;
  }

  /* Mobile */
  @media (max-width: 640px) {
    .input-area {
      padding: var(--space-sm, 0.75rem);
    }

    .input-hint {
      font-size: var(--font-size-xs, 0.75rem);
    }
  }
</style>
