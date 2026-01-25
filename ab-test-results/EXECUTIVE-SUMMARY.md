# A/B Test Executive Summary
## JSON vs Skills.md Spirit Format Comparison

**Date**: January 25, 2026
**Total Tests**: 31 (6 manual + 25 automated)
**Spirits Tested**: Herzog, Benjamin, Wittgenstein

---

## Motivation

TRACE generates philosophical thinking traces by channeling "spirits" - thinkers like Werner Herzog, Walter Benjamin, and Ludwig Wittgenstein - through LLM prompting. The system needed to determine the optimal format for encoding these spirit definitions.

Two formats were compared:

1. **JSON (Legacy)**: Flat JSON objects with vocabulary arrays for detection
   - Vocabulary-based spirit detection (keyword matching)
   - Simple key-value structure
   - Detection via term frequency

2. **Skills.md (New)**: YAML frontmatter + structured markdown
   - Kernel section (compressed essence of the thinker)
   - Thinking Mode section (numbered cognitive procedures)
   - Voice section (stylistic constraints and patterns)
   - Structure-based detection (no vocabulary matching)

The hypothesis: Skills.md's richer structural encoding would produce more coherent, stylistically consistent traces while better embodying each spirit's unique cognitive patterns.

---

## Test Architecture

### Automated Test Runner (`scripts/run-ab-tests.ts`)

```
┌─────────────────────────────────────────────────────────┐
│                    Test Runner                          │
├─────────────────────────────────────────────────────────┤
│  For each of 25 queries:                                │
│    1. Call /api/trace with spiritFormat='json'          │
│    2. Call /api/trace with spiritFormat='skills'        │
│    3. Capture SSE stream for both                       │
│    4. Record metrics:                                   │
│       - Structure detections (spirit identified)        │
│       - Rotation detections (spirit switches)           │
│       - Symbol counts                                   │
│       - Full trace output                               │
│    5. Write comparison markdown to ab-test-results/     │
└─────────────────────────────────────────────────────────┘
```

### Query Corpus

25 philosophical prompts spanning:
- Phenomenology ("What does it mean to truly see something?")
- Epistemology ("How do we know what we know?")
- Metaphysics ("What is the nature of time?")
- Aesthetics ("Why do we create art?")
- Existential ("What remains when everything is stripped away?")

### Metrics Captured

| Metric | Description |
|--------|-------------|
| Structure Detections | Count of lines where a spirit was detected |
| Rotation Detections | Count of spirit-to-spirit transitions |
| Symbol Detections | Count of transitional symbols (◊, †, ∘, etc.) |
| Depth Escalations | Progressive disclosure level changes |
| Spirit Flow | Sequence of detected spirits per line |

---

## Evaluation Methodology

### 8-Dimension Quality Rubric

Traces were evaluated (by Opus 4.5 via Claude Web App) on:

| Dimension | Description |
|-----------|-------------|
| **Content Depth** | Richness and layers of meaning |
| **Conceptual Coherence** | Logical flow and thematic unity |
| **Spirit Embodiment** | Authentic channeling of the thinker |
| **Stylistic Consistency** | Uniform voice and aesthetic |
| **Rhythmic Flow** | Cadence, pacing, prosodic quality |
| **Imagetic Density** | Vividness of imagery, symbolic weight |
| **Philosophical Rigor** | Depth and precision of argumentation |
| **Emotional Resonance** | Affective impact and engagement |

Each dimension scored 0-10.

---

## Key Findings

### Overall Winner: Skills.md

| Metric | JSON | Skills.md | Delta |
|--------|------|-----------|-------|
| **Win Rate** | ~20% | ~77% | +57pp |
| **Avg Quality Score** | 7.73 | 8.37 | +0.64 |
| **Avg Structure Detect** | 39.3 | 34.0 | -5.3 |
| **Avg Rotation Detect** | 1.6 | 1.3 | -0.3 |

### Dimension-Level Analysis

Skills.md showed the largest improvements in:

1. **Stylistic Consistency** (+0.9): The explicit Voice section in Skills.md provides clearer guidance for maintaining consistent tone
2. **Spirit Embodiment** (+0.7): Kernel + Thinking Mode captures cognitive patterns better than vocabulary lists
3. **Philosophical Rigor** (+0.6): Numbered procedures in Thinking Mode enforce structured reasoning

### Counter-Intuitive Finding

**Higher detection count ≠ higher quality**

JSON averaged more structure detections (39.3 vs 34.0) but scored lower overall. This suggests:
- The detection algorithm measures pattern frequency, not effectiveness
- Skills.md produces more sustained, coherent spirit channeling with fewer but deeper engagements
- Lower rotation count correlates with smoother transitions

### JSON's Niche Advantage

In highly poetic/surrealist queries ("Heart Pumping Ink", "Razors of Vengeance"), JSON occasionally produced richer metaphoric density. The vocabulary arrays may provide useful creative constraints for imagetic contexts.

---

## Recommendation

**Adopt Skills.md as the primary format** for spirit definitions.

The structured markdown approach demonstrates:
- Superior quality across 77% of test cases
- Particular strength in stylistic consistency, philosophical rigor, and spirit embodiment
- More stable spirit channeling (lower rotation count)

**Consider hybrid approach**: Retain JSON vocabulary arrays as an optional enhancement layer for queries requiring maximum imagetic density, particularly in poetic/surrealist contexts.

---

## File Structure

```
ab-test-results/
├── EXECUTIVE-SUMMARY.md          # This document
├── ab-test-results-2026-01-25.md # Combined results (263KB)
├── test-01-mean-truly-see.md     # Individual test files
├── test-02-memory-shape-identity.md
├── ...
└── test-25-weight-ordinary.md
```

---

## Appendix: Test Queries

1. What does it mean to truly see something?
2. How does memory shape identity?
3. What is the relationship between chaos and order?
4. Why do we create art?
5. What makes a place feel like home?
6. How do we know what we know?
7. What is the nature of time?
8. Why do humans tell stories?
9. What is the boundary between self and other?
10. How does language shape thought?
11. What does it mean to fail magnificently?
12. Why do we seek meaning in suffering?
13. What is the relationship between the map and the territory?
14. How do systems think?
15. What remains when everything is stripped away?
16. Why do images haunt us?
17. What is the space between words?
18. How does the past speak to the present?
19. What makes something authentic?
20. Why do we return to the same questions?
21. What is the texture of silence?
22. How do we navigate uncertainty?
23. What does the ruin reveal?
24. Why do patterns repeat across scales?
25. What is the weight of the ordinary?
