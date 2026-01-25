<script lang="ts">
  import { onMount } from 'svelte';

  // State
  let query = $state('What does it mean to truly see something?');
  let selectedMethods = $state<string[]>(['herzog', 'benjamin', 'wittgenstein']);
  let isRunning = $state(false);

  // Trace state for each format
  let jsonTrace = $state<TraceState>({ lines: [], metrics: null, status: 'idle' });
  let skillsTrace = $state<TraceState>({ lines: [], metrics: null, status: 'idle' });

  interface TraceLine {
    content: string;
    methodHint: string | null;
    detectionSource: string | null;
    confidence?: number;
    isSymbol: boolean;
  }

  interface TraceMetrics {
    symbolDetections: number;
    structureDetections: number;
    rotationDetections: number;
    depthEscalations: number;
  }

  interface TraceState {
    lines: TraceLine[];
    metrics: TraceMetrics | null;
    status: 'idle' | 'running' | 'complete' | 'error';
    error?: string;
  }

  // Available methods (subset for testing)
  const availableMethods = [
    { id: 'herzog', name: 'Herzog', hasSkills: true },
    { id: 'benjamin', name: 'Benjamin', hasSkills: false },
    { id: 'wittgenstein', name: 'Wittgenstein', hasSkills: false },
    { id: 'barthes', name: 'Barthes', hasSkills: false },
    { id: 'deleuze', name: 'Deleuze', hasSkills: false },
    { id: 'bateson', name: 'Bateson', hasSkills: false },
    { id: 'derrida', name: 'Derrida', hasSkills: false },
    { id: 'borges', name: 'Borges', hasSkills: false },
  ];

  function toggleMethod(id: string) {
    if (selectedMethods.includes(id)) {
      selectedMethods = selectedMethods.filter(m => m !== id);
    } else {
      selectedMethods = [...selectedMethods, id];
    }
  }

  async function runTrace(format: 'json' | 'skills'): Promise<void> {
    const state = format === 'json' ? jsonTrace : skillsTrace;

    // Reset state
    if (format === 'json') {
      jsonTrace = { lines: [], metrics: null, status: 'running' };
    } else {
      skillsTrace = { lines: [], metrics: null, status: 'running' };
    }

    const sessionId = `test-${format}-${Date.now()}`;

    try {
      const response = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          methodIds: selectedMethods,
          sessionId,
          spiritFormat: format,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'line' || data.type === 'symbol') {
            const traceLine: TraceLine = {
              content: data.content,
              methodHint: data.methodHint,
              detectionSource: data.detectionSource,
              confidence: data.confidence,
              isSymbol: data.type === 'symbol',
            };

            if (format === 'json') {
              jsonTrace.lines = [...jsonTrace.lines, traceLine];
            } else {
              skillsTrace.lines = [...skillsTrace.lines, traceLine];
            }
          } else if (data.type === 'complete') {
            if (format === 'json') {
              jsonTrace.metrics = data.metrics;
              jsonTrace.status = 'complete';
            } else {
              skillsTrace.metrics = data.metrics;
              skillsTrace.status = 'complete';
            }
          } else if (data.type === 'error') {
            if (format === 'json') {
              jsonTrace.status = 'error';
              jsonTrace.error = data.message;
            } else {
              skillsTrace.status = 'error';
              skillsTrace.error = data.message;
            }
          }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (format === 'json') {
        jsonTrace.status = 'error';
        jsonTrace.error = msg;
      } else {
        skillsTrace.status = 'error';
        skillsTrace.error = msg;
      }
    }
  }

  async function runBothTraces() {
    if (selectedMethods.length === 0) {
      alert('Select at least one method');
      return;
    }

    isRunning = true;

    // Run both simultaneously
    await Promise.all([
      runTrace('json'),
      runTrace('skills'),
    ]);

    isRunning = false;
  }

  function getMethodColor(methodId: string | null): string {
    const colors: Record<string, string> = {
      herzog: '#2d4a3e',
      benjamin: '#744210',
      wittgenstein: '#4a5568',
      barthes: '#4a3728',
      deleuze: '#276749',
      bateson: '#2c5282',
      derrida: '#553c9a',
      borges: '#1a365d',
    };
    return methodId ? colors[methodId] || '#666' : '#666';
  }

  function getSourceBadge(source: string | null): string {
    if (!source) return '';
    const badges: Record<string, string> = {
      symbol: '◊',
      structure: '▤',
      rotation: '↻',
    };
    return badges[source] || '';
  }

  let copyStatus = $state<'idle' | 'copied'>('idle');

  function formatTraceForExport(trace: TraceState): string {
    return trace.lines.map(line => line.content).join('\n');
  }

  function formatMetricsForExport(metrics: TraceMetrics | null): string {
    if (!metrics) return 'No metrics available';
    return `Symbol detections: ${metrics.symbolDetections}
Structure detections: ${metrics.structureDetections}
Rotation detections: ${metrics.rotationDetections}
Depth escalations: ${metrics.depthEscalations}`;
  }

  async function copyForAnalysis() {
    const methodNames = selectedMethods.map(id =>
      availableMethods.find(m => m.id === id)?.name || id
    ).join(', ');

    const exportText = `# A/B Test Export for AI Analysis

## Test Configuration

**Query:** ${query}

**Selected Methods:** ${methodNames}

**Spirits with Skills.md format:** ${selectedMethods.filter(id => availableMethods.find(m => m.id === id)?.hasSkills).join(', ') || 'None'}

---

## FORMAT A: JSON (Legacy Format)

This trace was generated using the traditional JSON-based spirit definitions.
The spirit prompts are stored as flat JSON objects with vocabulary arrays for detection.

### Metrics
${formatMetricsForExport(jsonTrace.metrics)}

### Trace Output
${formatTraceForExport(jsonTrace)}

---

## FORMAT B: Skills.md (New Format)

This trace was generated using the new skills.md format with YAML frontmatter.
Spirit definitions use structured markdown with:
- YAML frontmatter for metadata (symbols, domains, compatibility)
- Kernel section (compressed essence)
- Thinking Mode section (numbered procedures)
- Voice section (stylistic constraints)

Detection uses structural patterns only (no vocabulary matching).

### Metrics
${formatMetricsForExport(skillsTrace.metrics)}

### Trace Output
${formatTraceForExport(skillsTrace)}

---

## Analysis Request

Please compare the two traces above and analyze:
1. **Content quality**: Which trace demonstrates deeper, more coherent thinking?
2. **Spirit embodiment**: Which better captures the essence of the selected methods without naming them?
3. **Stylistic consistency**: Which maintains more consistent voice and rhythm?
4. **Detection accuracy**: Based on the metrics, which detection approach seems more effective?
5. **Overall preference**: Which trace would you prefer as a reader, and why?
`;

    try {
      await navigator.clipboard.writeText(exportText);
      copyStatus = 'copied';
      setTimeout(() => {
        copyStatus = 'idle';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  }
</script>

<svelte:head>
  <title>A/B Test | Trace</title>
</svelte:head>

<div class="container">
  <header>
    <h1>Spirit Format A/B Test</h1>
    <p class="subtitle">Compare JSON vs Skills.md format side-by-side</p>
  </header>

  <section class="controls">
    <div class="query-input">
      <label for="query">Query</label>
      <textarea
        id="query"
        bind:value={query}
        rows="2"
        placeholder="Enter your question..."
      ></textarea>
    </div>

    <div class="method-select">
      <label>Methods</label>
      <div class="method-chips">
        {#each availableMethods as method}
          <button
            class="chip"
            class:selected={selectedMethods.includes(method.id)}
            class:has-skills={method.hasSkills}
            onclick={() => toggleMethod(method.id)}
          >
            {method.name}
            {#if method.hasSkills}
              <span class="skills-badge">skills</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="button-row">
      <button
        class="run-button"
        onclick={runBothTraces}
        disabled={isRunning || selectedMethods.length === 0}
      >
        {isRunning ? 'Running...' : 'Run A/B Test'}
      </button>

      <button
        class="copy-button"
        onclick={copyForAnalysis}
        disabled={jsonTrace.status !== 'complete' || skillsTrace.status !== 'complete'}
      >
        {copyStatus === 'copied' ? 'Copied!' : 'Copy for AI Analysis'}
      </button>
    </div>
  </section>

  <section class="comparison">
    <div class="trace-column">
      <div class="column-header json">
        <h2>JSON Format</h2>
        <span class="status">{jsonTrace.status}</span>
      </div>

      {#if jsonTrace.metrics}
        <div class="metrics">
          <span title="Symbol detections">◊ {jsonTrace.metrics.symbolDetections}</span>
          <span title="Structure detections">▤ {jsonTrace.metrics.structureDetections}</span>
          <span title="Rotation detections">↻ {jsonTrace.metrics.rotationDetections}</span>
        </div>
      {/if}

      <div class="trace-content">
        {#each jsonTrace.lines as line}
          <div
            class="trace-line"
            class:symbol={line.isSymbol}
            style="--method-color: {getMethodColor(line.methodHint)}"
          >
            {#if line.methodHint}
              <span class="method-indicator" title="{line.methodHint} ({line.detectionSource})">
                {getSourceBadge(line.detectionSource)}
              </span>
            {/if}
            <span class="content">{line.content}</span>
          </div>
        {/each}
        {#if jsonTrace.status === 'running'}
          <div class="typing-indicator">...</div>
        {/if}
      </div>
    </div>

    <div class="trace-column">
      <div class="column-header skills">
        <h2>Skills.md Format</h2>
        <span class="status">{skillsTrace.status}</span>
      </div>

      {#if skillsTrace.metrics}
        <div class="metrics">
          <span title="Symbol detections">◊ {skillsTrace.metrics.symbolDetections}</span>
          <span title="Structure detections">▤ {skillsTrace.metrics.structureDetections}</span>
          <span title="Rotation detections">↻ {skillsTrace.metrics.rotationDetections}</span>
        </div>
      {/if}

      <div class="trace-content">
        {#each skillsTrace.lines as line}
          <div
            class="trace-line"
            class:symbol={line.isSymbol}
            style="--method-color: {getMethodColor(line.methodHint)}"
          >
            {#if line.methodHint}
              <span class="method-indicator" title="{line.methodHint} ({line.detectionSource})">
                {getSourceBadge(line.detectionSource)}
              </span>
            {/if}
            <span class="content">{line.content}</span>
          </div>
        {/each}
        {#if skillsTrace.status === 'running'}
          <div class="typing-indicator">...</div>
        {/if}
      </div>
    </div>
  </section>

  <section class="legend">
    <h3>Detection Sources</h3>
    <div class="legend-items">
      <span><strong>◊</strong> Symbol resonance</span>
      <span><strong>▤</strong> Structural pattern</span>
      <span><strong>↻</strong> Rotation fallback</span>
    </div>
  </section>
</div>

<style>
  .container {
    max-width: 1600px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  h1 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  .subtitle {
    color: #666;
    margin-top: 0.5rem;
  }

  .controls {
    background: #f8f8f8;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .query-input {
    margin-bottom: 1rem;
  }

  .query-input label,
  .method-select label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #333;
  }

  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;
    resize: vertical;
    font-family: inherit;
  }

  .method-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chip {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 20px;
    background: white;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.15s;
  }

  .chip:hover {
    border-color: #999;
  }

  .chip.selected {
    background: #333;
    color: white;
    border-color: #333;
  }

  .chip.has-skills {
    border-color: #2d4a3e;
  }

  .chip.has-skills.selected {
    background: #2d4a3e;
  }

  .skills-badge {
    font-size: 0.625rem;
    background: rgba(255,255,255,0.2);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    margin-left: 0.375rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .button-row {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .run-button {
    padding: 0.75rem 2rem;
    background: #333;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.15s;
  }

  .run-button:hover:not(:disabled) {
    background: #555;
  }

  .run-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .copy-button {
    padding: 0.75rem 1.5rem;
    background: #2d4a3e;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .copy-button:hover:not(:disabled) {
    background: #3d5a4e;
  }

  .copy-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .comparison {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .trace-column {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
  }

  .column-header {
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #ddd;
  }

  .column-header.json {
    background: #f5f5f5;
  }

  .column-header.skills {
    background: #e8f0ed;
  }

  .column-header h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
  }

  .status {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #666;
  }

  .metrics {
    padding: 0.75rem 1rem;
    background: #fafafa;
    border-bottom: 1px solid #eee;
    display: flex;
    gap: 1.5rem;
    font-size: 0.875rem;
    color: #666;
  }

  .trace-content {
    padding: 1rem;
    min-height: 400px;
    max-height: 600px;
    overflow-y: auto;
    font-family: 'Georgia', serif;
    font-size: 0.9375rem;
    line-height: 1.7;
  }

  .trace-line {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.25rem;
    border-left: 2px solid transparent;
  }

  .trace-line:has(.method-indicator) {
    border-left-color: var(--method-color);
  }

  .trace-line.symbol {
    text-align: center;
    padding: 0.5rem 0;
    color: #999;
    font-size: 1.25rem;
  }

  .method-indicator {
    position: absolute;
    left: 0;
    top: 0;
    font-size: 0.75rem;
    color: var(--method-color);
    opacity: 0.7;
  }

  .typing-indicator {
    color: #999;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .legend {
    margin-top: 2rem;
    padding: 1rem;
    background: #f8f8f8;
    border-radius: 8px;
  }

  .legend h3 {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .legend-items {
    display: flex;
    gap: 2rem;
    font-size: 0.875rem;
    color: #666;
  }

  @media (max-width: 900px) {
    .comparison {
      grid-template-columns: 1fr;
    }
  }
</style>
