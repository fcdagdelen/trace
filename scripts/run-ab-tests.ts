#!/usr/bin/env npx tsx
/**
 * A/B Test Runner
 * Runs 25 tests comparing JSON vs Skills.md format
 * Stores results in markdown files for analysis
 */

import fs from 'fs';
import path from 'path';

const API_URL = process.env.API_URL || 'http://localhost:5173';

// 25 diverse queries for testing
const TEST_QUERIES = [
  "What does it mean to truly see something?",
  "How does memory shape identity?",
  "What is the relationship between chaos and order?",
  "Why do we create art?",
  "What makes a place feel like home?",
  "How do we know what we know?",
  "What is the nature of time?",
  "Why do humans tell stories?",
  "What is the boundary between self and other?",
  "How does language shape thought?",
  "What does it mean to fail magnificently?",
  "Why do we seek meaning in suffering?",
  "What is the relationship between the map and the territory?",
  "How do systems think?",
  "What remains when everything is stripped away?",
  "Why do images haunt us?",
  "What is the space between words?",
  "How does the past speak to the present?",
  "What makes something authentic?",
  "Why do we return to the same questions?",
  "What is the texture of silence?",
  "How do we navigate uncertainty?",
  "What does the ruin reveal?",
  "Why do patterns repeat across scales?",
  "What is the weight of the ordinary?",
];

// Methods to use (all have skills.md now)
const METHODS = ['herzog', 'benjamin', 'wittgenstein'];

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

interface TraceResult {
  lines: TraceLine[];
  metrics: TraceMetrics | null;
  error?: string;
}

async function runTrace(query: string, format: 'json' | 'skills'): Promise<TraceResult> {
  const sessionId = `ab-test-${format}-${Date.now()}`;

  try {
    const response = await fetch(`${API_URL}/api/trace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'dev_bypass_auth=1',
      },
      body: JSON.stringify({
        query,
        methodIds: METHODS,
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
    const lines: TraceLine[] = [];
    let metrics: TraceMetrics | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        if (!chunk.startsWith('data: ')) continue;
        const data = JSON.parse(chunk.slice(6));

        if (data.type === 'line' || data.type === 'symbol') {
          lines.push({
            content: data.content,
            methodHint: data.methodHint,
            detectionSource: data.detectionSource,
            confidence: data.confidence,
            isSymbol: data.type === 'symbol',
          });
        } else if (data.type === 'complete') {
          metrics = data.metrics;
        } else if (data.type === 'error') {
          return { lines, metrics: null, error: data.message };
        }
      }
    }

    return { lines, metrics };
  } catch (error) {
    return {
      lines: [],
      metrics: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function formatTraceOutput(result: TraceResult): string {
  if (result.error) {
    return `ERROR: ${result.error}`;
  }
  return result.lines.map(line => {
    if (line.isSymbol) {
      return `\n${line.content}\n`;
    }
    return line.content;
  }).join('\n');
}

function formatMetrics(metrics: TraceMetrics | null): string {
  if (!metrics) return 'No metrics available';
  return `- Symbol detections: ${metrics.symbolDetections}
- Structure detections: ${metrics.structureDetections}
- Rotation detections: ${metrics.rotationDetections}
- Depth escalations: ${metrics.depthEscalations}`;
}

function formatLineAnnotations(result: TraceResult): string {
  if (result.error || result.lines.length === 0) return 'No annotations available';

  const annotations: string[] = [];
  let currentSpirit: string | null = null;
  let spiritLineCount = 0;

  for (const line of result.lines) {
    if (line.isSymbol) continue;

    if (line.methodHint !== currentSpirit) {
      if (currentSpirit && spiritLineCount > 0) {
        annotations.push(`${currentSpirit}: ${spiritLineCount} lines`);
      }
      currentSpirit = line.methodHint;
      spiritLineCount = 1;
    } else {
      spiritLineCount++;
    }
  }

  // Add last spirit
  if (currentSpirit && spiritLineCount > 0) {
    annotations.push(`${currentSpirit}: ${spiritLineCount} lines`);
  }

  return annotations.join('\n');
}

function generateSlug(query: string): string {
  const stopWords = new Set(['what', 'does', 'it', 'to', 'the', 'a', 'an', 'is', 'are', 'how', 'why', 'when', 'where', 'who', 'we', 'do', 'of', 'in', 'and', 'between']);
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 3);

  return words.length > 0 ? words.join('-') : 'query';
}

async function runTest(index: number, query: string): Promise<string> {
  console.log(`Running test ${index + 1}/25: "${query.slice(0, 50)}..."`);

  // Run both formats in parallel
  const [jsonResult, skillsResult] = await Promise.all([
    runTrace(query, 'json'),
    runTrace(query, 'skills'),
  ]);

  const slug = generateSlug(query);
  const timestamp = new Date().toISOString();

  return `# Test ${String(index + 1).padStart(2, '0')}: ${query}

## Metadata

- **Test ID**: ${index + 1}
- **Query**: ${query}
- **Slug**: ${slug}
- **Timestamp**: ${timestamp}
- **Methods**: ${METHODS.join(', ')}

---

## FORMAT A: JSON (Legacy)

### Metrics
${formatMetrics(jsonResult.metrics)}

### Spirit Flow
${formatLineAnnotations(jsonResult)}

### Output
${formatTraceOutput(jsonResult)}

---

## FORMAT B: Skills.md (New)

### Metrics
${formatMetrics(skillsResult.metrics)}

### Spirit Flow
${formatLineAnnotations(skillsResult)}

### Output
${formatTraceOutput(skillsResult)}

---

## Raw Metrics Comparison

| Metric | JSON | Skills |
|--------|------|--------|
| Symbol Detections | ${jsonResult.metrics?.symbolDetections ?? 'N/A'} | ${skillsResult.metrics?.symbolDetections ?? 'N/A'} |
| Structure Detections | ${jsonResult.metrics?.structureDetections ?? 'N/A'} | ${skillsResult.metrics?.structureDetections ?? 'N/A'} |
| Rotation Detections | ${jsonResult.metrics?.rotationDetections ?? 'N/A'} | ${skillsResult.metrics?.rotationDetections ?? 'N/A'} |
| Depth Escalations | ${jsonResult.metrics?.depthEscalations ?? 'N/A'} | ${skillsResult.metrics?.depthEscalations ?? 'N/A'} |

`;
}

async function main() {
  const outputDir = path.join(process.cwd(), 'ab-test-results');

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\nA/B Test Runner`);
  console.log(`===============`);
  console.log(`API: ${API_URL}`);
  console.log(`Output: ${outputDir}`);
  console.log(`Tests: ${TEST_QUERIES.length}`);
  console.log(`Methods: ${METHODS.join(', ')}\n`);

  const allResults: string[] = [];
  const timestamp = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    try {
      const result = await runTest(i, TEST_QUERIES[i]);
      allResults.push(result);

      // Save individual test
      const slug = generateSlug(TEST_QUERIES[i]);
      const filename = `test-${String(i + 1).padStart(2, '0')}-${slug}.md`;
      fs.writeFileSync(path.join(outputDir, filename), result);

      // Small delay between tests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Test ${i + 1} failed:`, error);
      allResults.push(`# Test ${i + 1}: ERROR\n\nFailed to run test: ${error}\n\n`);
    }
  }

  // Create combined file
  const combinedContent = `# A/B Test Results: JSON vs Skills.md Format

## Overview

- **Date**: ${timestamp}
- **Total Tests**: ${TEST_QUERIES.length}
- **Methods Tested**: ${METHODS.join(', ')}
- **Format Comparison**: JSON (legacy) vs Skills.md (new)

## Purpose

This document contains the results of ${TEST_QUERIES.length} A/B tests comparing two spirit format approaches:

1. **JSON Format (Legacy)**: Traditional flat JSON objects with vocabulary arrays for detection
2. **Skills.md Format (New)**: YAML frontmatter + structured markdown with:
   - Kernel section (compressed essence)
   - Thinking Mode section (numbered procedures)
   - Voice section (stylistic constraints)
   - Structure-based detection (no vocabulary matching)

## Analysis Dimensions

When reviewing these results, consider:

1. **Content Quality**: Which format produces deeper, more coherent thinking?
2. **Spirit Embodiment**: Which better captures the essence of each thinker without naming them?
3. **Stylistic Consistency**: Which maintains more consistent voice and rhythm?
4. **Spirit Persistence**: Do spirits "stick" for meaningful stretches or fragment quickly?
5. **Detection Accuracy**: Which detection approach (vocab vs structure) seems more effective?

---

${allResults.join('\n---\n\n')}

## Summary Statistics

This section to be filled after manual analysis or by running analysis script.

### Detection Method Distribution

To be computed from metrics above.

### Spirit Flow Patterns

To be analyzed from spirit flow annotations.

### Quality Assessment

To be determined through blind review.
`;

  fs.writeFileSync(path.join(outputDir, `ab-test-results-${timestamp}.md`), combinedContent);

  console.log(`\nComplete!`);
  console.log(`Individual tests: ${outputDir}/test-*.md`);
  console.log(`Combined results: ${outputDir}/ab-test-results-${timestamp}.md`);
}

main().catch(console.error);
