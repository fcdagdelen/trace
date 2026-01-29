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
  <div
    class="modal"
    onclick={(e) => e.stopPropagation()}
    onkeydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="injection-title"
    tabindex="-1"
  >
    <div class="modal-header">
      <span class="header-glyph" aria-hidden="true">◊</span>
      <div class="header-content">
        <h2 id="injection-title">Inject a thought</h2>
        <p>Your interjection will be woven into the trace</p>
      </div>
    </div>

    <textarea
      bind:this={textarea}
      bind:value={content}
      onkeydown={handleKeydown}
      placeholder="A direction, a question, a fragment..."
      rows="3"
    ></textarea>

    <div class="modal-actions">
      <button class="cancel-btn" onclick={onCancel}>
        <span class="btn-text">Cancel</span>
        <kbd>Esc</kbd>
      </button>
      <button class="inject-btn" onclick={handleSubmit} disabled={!content.trim()}>
        <span class="btn-text">Inject</span>
        <kbd>⌘↵</kbd>
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(5, 5, 6, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    backdrop-filter: blur(var(--blur-sm, 4px));
    animation: backdropFadeIn 0.2s var(--ease-out, ease-out);
  }

  @keyframes backdropFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal {
    background: var(--bg-elevated, #0f0f11);
    border: 1px solid var(--border-strong, #2a2a30);
    border-radius: var(--radius-lg, 8px);
    padding: var(--space-lg, 1.5rem);
    width: 90%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg, 1.5rem);
    box-shadow: var(--shadow-xl, 0 16px 48px rgba(0, 0, 0, 0.7));
    animation: modalSlideIn 0.3s var(--ease-out, ease-out);
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .modal-header {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md, 1rem);
  }

  .header-glyph {
    font-size: var(--font-size-xl, 1.5rem);
    color: var(--accent-color, #8aa4ff);
    opacity: 0.7;
    animation: glyphFloat 3s ease-in-out infinite;
  }

  @keyframes glyphFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .header-content {
    flex: 1;
  }

  .modal-header h2 {
    font-family: var(--font-display, 'Cormorant Garamond', serif);
    font-size: var(--font-size-xl, 1.5rem);
    font-weight: 400;
    color: var(--text-color, #e8e6e3);
    margin: 0 0 var(--space-2xs, 0.25rem) 0;
    letter-spacing: var(--tracking-wide, 0.02em);
  }

  .modal-header p {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    color: var(--muted-color, #6a6a6a);
    margin: 0;
  }

  textarea {
    width: 100%;
    padding: var(--space-md, 1rem);
    font-family: var(--font-display, 'Cormorant Garamond', serif);
    font-size: var(--font-size-md, 1.125rem);
    line-height: 1.6;
    color: var(--text-color, #e8e6e3);
    background: var(--surface-color, #141416);
    border: 1px solid var(--border-color, #1f1f23);
    border-radius: var(--radius-md, 4px);
    resize: vertical;
    min-height: 100px;
    transition:
      border-color var(--duration-fast, 150ms),
      box-shadow var(--duration-fast, 150ms);
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent-dim, #6b8adb);
    box-shadow: var(--shadow-glow, 0 0 20px rgba(138, 164, 255, 0.15));
  }

  textarea::placeholder {
    color: var(--muted-dim, #4a484a);
    font-style: italic;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-sm, 0.75rem);
  }

  .cancel-btn,
  .inject-btn {
    display: flex;
    align-items: center;
    gap: var(--space-xs, 0.5rem);
    padding: var(--space-xs, 0.5rem) var(--space-md, 1rem);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm, 0.875rem);
    border-radius: var(--radius-sm, 2px);
    cursor: pointer;
    transition:
      background var(--duration-fast, 150ms),
      border-color var(--duration-fast, 150ms),
      color var(--duration-fast, 150ms);
  }

  .cancel-btn {
    color: var(--muted-color, #6a6a6a);
    background: transparent;
    border: 1px solid var(--border-color, #1f1f23);
  }

  .cancel-btn:hover {
    color: var(--text-color, #e8e6e3);
    border-color: var(--border-strong, #2a2a30);
    background: var(--surface-color, #141416);
  }

  .inject-btn {
    color: var(--bg-color, #0a0a0b);
    background: var(--accent-color, #8aa4ff);
    border: 1px solid var(--accent-color, #8aa4ff);
  }

  .inject-btn:hover:not(:disabled) {
    background: var(--accent-bright, #a8c0ff);
    border-color: var(--accent-bright, #a8c0ff);
  }

  .inject-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  kbd {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs, 0.7rem);
    opacity: 0.6;
    padding: 0.1em 0.3em;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-sm, 2px);
  }

  .inject-btn kbd {
    background: rgba(0, 0, 0, 0.1);
  }

  /* Mobile */
  @media (max-width: 640px) {
    .modal {
      padding: var(--space-md, 1rem);
      gap: var(--space-md, 1rem);
    }

    .modal-actions {
      flex-direction: column;
    }

    .cancel-btn,
    .inject-btn {
      justify-content: center;
    }
  }
</style>
