# Qualitative Analysis: JSON vs Skills.md
## Deep dive into 25 A/B test runs

**Evaluator**: Claude Opus 4.5 (external)
**Date**: January 25, 2026

---

## Critical Finding: Metrics Are Not Measuring the Hypothesis

Two of the four headline metrics are **non-informative**:

| Metric | JSON (all runs) | Skills (all runs) |
|--------|-----------------|-------------------|
| Symbol Detections | 0 | 0 |
| Depth Escalations | 0 | 0 |

This means the A/B isn't actually testing:
- "Vocabulary/symbol detection vs structure detection" (as framed)
- The depth-escalation mechanism

**"Structure detections" is basically a proxy for output line-count.** It tracks almost perfectly with the number of lines in Spirit Flow. Not a reliable "detection accuracy" indicator—mostly "how much output got produced/logged."

### What the metrics *do* measure

The meaningful signals in these runs are:

| Signal | What it tells us |
|--------|------------------|
| Spirit switching frequency | How often detected spirit changes between lines |
| Spirit participation | How many distinct spirits appear (2 vs 3) |
| Output length | Weak proxy for depth |

---

## Verdict: Skills.md is Directionally Better

Given the north star of **possession + syncretic flow** (distinct spirits that stick long enough to feel real, but can hand off):

### Skills.md wins on experience-shaping goals

**Less micro-fragmentation (better persistence)**

| Format | Avg spirit-switches per response |
|--------|----------------------------------|
| Skills | ~4.76 |
| JSON | ~5.80 |

Skills has fewer switches in **14/25** tests (JSON wins 6, ties 5).

**More triadic participation (better syncretism)**

| Format | Runs with all 3 spirits |
|--------|-------------------------|
| Skills | **16/25** (64%) |
| JSON | **10/25** (40%) |

Skills more often achieves what users should feel: *multiple presences* without constant jitter.

### JSON's minor advantage: essay fullness

| Format | Avg word count |
|--------|----------------|
| JSON | ~704 words |
| Skills | ~675 words |

Per-test wins on raw length are basically a coin flip (JSON 13, Skills 12). JSON is not clearly deeper overall, but more often expands on explanation/argumentation prompts.

---

## Qualitative Patterns Across Outputs

### Skills produces "cleaner possession"

- More often *inhabits a mode* and stays there long enough to register
- More often achieves "three-presence ecology" (even if unevenly weighted)
- Better on phenomenological/texture prompts (silence, time, home, return-to-questions)

### Skills failure mode: "explaining the point"

On prompts like:
- "Why do humans tell stories?"
- "Why do images haunt us?"
- "How does memory shape identity?"

Skills occasionally becomes more **declarative/didactic** ("here's why"), whereas JSON more often stays in **performance/enactment** ("here is the scene, here is the obsession, here is the residue").

**Implication**: Skills template needs sharper anti-gravity—force *showing* over *stating*, especially for Benjamin/Herzog lanes.

### Skills' biggest failure mode: mono-voice collapse

Skills can **collapse into one spirit** and never properly "open the channel" to the others. Test 14 ("How do systems think?") is the clearest example—essentially mono-voice throughout.

This fights the product premise unless intentionally chosen and framed.

---

## Recommended Interventions

### 1. Fix the measurement (prerequisite for all claims)

Make metrics actually measure the hypothesis:

- **Symbol detection**: Log symbol occurrences per spirit, per line, and whether they contributed to classification
- **Depth escalation**: Log why it didn't trigger (no threshold hit? disabled? never evaluated?)
- **Separate concerns**:
  - Output length
  - Structure-feature matches
  - Classification confidence

### 2. Align Skills files with Claude's native schema

Claude's strongest learned pattern:
- Activation
- Behavior / Steps
- When to Use
- Constraints
- Related / Compatible

Current Skills format (Kernel / Thinking Mode / Voice) is nice but doesn't leverage training-time resonance.

**Add two missing sections:**

#### Anti-Patterns (prevent didactic drift)
```
- Do NOT explain "why stories matter" in thesis form
- Do NOT summarize the argument
- Do NOT conclude cleanly
- Prefer scene → fracture → residue
```

#### Signature Moves (reliable enactment machinery)
```
- Begin with a sensory scene
- Introduce one object that carries historical/existential weight
- Perform one "not X but Y" turn
- End on an unresolved image
```

### 3. Add handoff protocol for motivated switching

Add to every spirit skill:

```markdown
## Transmutation / Handoff

- If query becomes epistemic → hand to Wittgenstein-mode
- If query becomes historical-material → hand to Benjamin-mode
- If query becomes existential/nature-indifferent/obsessive → hand to Herzog-mode

Before handing off, leave a "hook line" the next spirit can grab.
```

Turn "multiple voices" into *choreography* rather than classifier artifact.

### 4. Make possession intensity tunable

Add runtime knob affecting:
- Minimum contiguous lines before switch allowed
- How stylistically strict voice constraints are
- Whether system prefers 1 primary spirit vs triadic interplay

Product modes:
- "Monovoice possession"
- "Triadic ritual"
- "Chaotic chorus"

### 5. Add hysteresis to detection

Prevent "invented switches" from classifier sensitivity:

- Require **N lines of evidence** before switching labels (N=2 or 3)
- Add **stickiness** (decay instead of instant flip)
- Treat symbols as **hard anchors** when present (override weak structure cues)

### 6. Make depth escalation real

Since depth escalations never triggered, implement as explicit exocognitive skill:

**Trigger examples:**
- If output hasn't introduced concrete scene by line 6 → inject "Scene-Anchor" skill
- If output hasn't performed conceptual turn by midpoint → inject "Dialectical Twist" skill
- If output trending toward conclusion → inject "Leave the wound open" skill

This becomes signature capability: **the system actively maintains possession quality**.

---

## Summary

| Dimension | Winner | Margin |
|-----------|--------|--------|
| Spirit persistence | Skills | 14/25 wins |
| Triadic participation | Skills | 16 vs 10 runs |
| Output length | Tie | 13/12 |
| Measurement validity | Neither | Both zeroed on key metrics |

**Skills is the better direction** for the intended experience, but:
1. Current instrumentation doesn't prove the story you want to tell
2. Skills needs anti-didactic constraints to prevent "explaining the point"
3. Detection needs hysteresis to prevent classifier jitter

---

## Presentation-Ready Framing (1 slide)

> **A/B Result: Skills.md shows directional advantage**
>
> - 64% of Skills runs achieved triadic spirit participation (vs 40% JSON)
> - Skills averaged 18% fewer spirit switches (4.76 vs 5.80)
> - Output quality roughly equivalent; Skills slightly more compressed
>
> **Next iteration focuses on:**
> - Fixing symbol/depth metrics (currently non-functional)
> - Adding anti-didactic constraints to Skills templates
> - Implementing handoff protocols for motivated switching
>
> *This is a measured improvement, not a conclusive victory—and the metrics need work before we can claim detection superiority.*
