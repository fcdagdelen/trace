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
      // Don't clear query - parent will hide this component
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Enter submits, Shift+Enter for newline
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  }

  // Auto-resize textarea to content
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

<div class="input-area">
  <span class="prompt">›</span>
  <textarea
    bind:this={textarea}
    bind:value={query}
    onkeydown={handleKeydown}
    oninput={handleInput}
    placeholder="enter a thought..."
    rows="1"
    {disabled}
  ></textarea>
</div>

<style>
  .input-area {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .prompt {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg, 1.25rem);
    color: var(--accent-color, #6b8afd);
    line-height: var(--line-height, 1.7);
    user-select: none;
    opacity: 0.8;
  }

  textarea {
    flex: 1;
    padding: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-base, 1.125rem);
    line-height: var(--line-height, 1.7);
    color: var(--text-color, #e8e6e3);
    background: transparent;
    border: none;
    resize: none;
    overflow: hidden;
    min-height: 1.7em;
  }

  textarea:focus {
    outline: none;
  }

  textarea::placeholder {
    color: var(--muted-color, #444);
    font-style: italic;
  }

  textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
