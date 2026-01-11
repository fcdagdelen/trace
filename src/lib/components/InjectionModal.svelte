<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    onInject: (content: string) => void;
    onCancel: () => void;
  }

  let { onInject, onCancel }: Props = $props();

  let content = $state('');
  let textarea: HTMLTextAreaElement;

  function handleSubmit() {
    const trimmed = content.trim();
    if (trimmed) {
      onInject(trimmed);
      content = '';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onCancel();
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  }

  onMount(() => {
    textarea?.focus();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="modal-backdrop" onclick={onCancel} role="presentation">
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={handleKeydown} role="dialog" aria-modal="true" tabindex="-1">
    <div class="modal-header">
      <h2>Inject a thought</h2>
      <p>Your interjection will be woven into the trace</p>
    </div>

    <textarea
      bind:this={textarea}
      bind:value={content}
      onkeydown={handleKeydown}
      placeholder="A direction, a question, a fragment..."
      rows="3"
    ></textarea>

    <div class="modal-actions">
      <button class="cancel" onclick={onCancel}>
        Cancel <kbd>Esc</kbd>
      </button>
      <button class="inject" onclick={handleSubmit} disabled={!content.trim()}>
        Inject <kbd>Cmd+Enter</kbd>
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(2px);
  }

  .modal {
    background: var(--bg-color, #1a1a1a);
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 8px;
    padding: 1.5rem;
    width: 90%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .modal-header {
    text-align: center;
  }

  .modal-header h2 {
    font-family: 'Georgia', serif;
    font-size: 1.25rem;
    font-weight: normal;
    color: var(--text-color, #e8e6e3);
    margin: 0 0 0.5rem 0;
  }

  .modal-header p {
    font-size: 0.875rem;
    color: var(--muted-color, #666);
    margin: 0;
  }

  textarea {
    width: 100%;
    padding: 1rem;
    font-family: 'Georgia', serif;
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-color, #e8e6e3);
    background: var(--surface-color, #2a2a2a);
    border: 1px solid var(--border-color, #3a3a3a);
    border-radius: 4px;
    resize: vertical;
    min-height: 80px;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent-color, #6b8afd);
  }

  textarea::placeholder {
    color: var(--muted-color, #666);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  button {
    padding: 0.5rem 1rem;
    font-family: 'Georgia', serif;
    font-size: 0.875rem;
    border-radius: 4px;
    cursor: pointer;
    transition: all 150ms ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  button kbd {
    font-size: 0.7rem;
    opacity: 0.7;
  }

  .cancel {
    color: var(--muted-color, #666);
    background: transparent;
    border: 1px solid var(--border-color, #3a3a3a);
  }

  .cancel:hover {
    background: var(--surface-color, #2a2a2a);
  }

  .inject {
    color: var(--text-color, #e8e6e3);
    background: var(--accent-color, #6b8afd);
    border: 1px solid var(--accent-color, #6b8afd);
  }

  .inject:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  .inject:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
