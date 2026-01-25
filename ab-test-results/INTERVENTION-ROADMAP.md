# Intervention Roadmap: Effort/Impact Analysis

Based on the qualitative analysis of 25 A/B tests, here are the 5 recommended interventions ordered by effort and impact.

---

## Effort/Impact Matrix

```
                    LOW EFFORT              HIGH EFFORT
                    ──────────────────────────────────────
HIGH IMPACT    │  [4] Hysteresis        [5] Depth as Skill
               │  [1] Anti-Patterns     [2] Handoff Protocol
               │
MEDIUM IMPACT  │                        [3] Tunable Intensity
               │
LOW IMPACT     │
```

---

## Detailed Analysis

### 1. Anti-Patterns Section in Skills Files

| Dimension | Assessment |
|-----------|------------|
| **Effort** | Low (1-2 hours) |
| **Impact** | Medium-High |
| **Risk** | Very Low |

**What it is**: Add explicit "do NOT" constraints to each spirit's skills.md file to prevent didactic drift.

**Example addition to Herzog:**
```markdown
## Anti-Patterns
- Do NOT explain why something matters in thesis form
- Do NOT summarize or conclude cleanly
- Do NOT use "the point is..." or "in other words..."
- Prefer: scene → obsession → residue (never resolution)
```

**Why it works**: Claude responds well to negative constraints. The failure mode "explaining the point" is addressable purely through prompt engineering.

**Dependencies**: None

---

### 2. Handoff Protocol

| Dimension | Assessment |
|-----------|------------|
| **Effort** | Medium (4-6 hours) |
| **Impact** | High |
| **Risk** | Low |

**What it is**: Add explicit rules for when/how spirits should hand off to each other, plus "hook line" requirements.

**Example addition:**
```markdown
## Transmutation Protocol
### Hand TO this spirit when:
- Query becomes existential/nature-indifferent → Herzog
- Query becomes historical-material → Benjamin
- Query becomes epistemic/logical → Wittgenstein

### Before handing off:
- Leave a "hook line" the next spirit can grab
- Example: "But what remains when..." (hooks Wittgenstein)
```

**Why it works**: Turns classifier-driven switching into motivated choreography. Addresses the "incidental switching" problem.

**Dependencies**: Benefits significantly from #4 (hysteresis) to prevent jitter during handoffs

---

### 3. Possession Intensity Parameter

| Dimension | Assessment |
|-----------|------------|
| **Effort** | Medium-High (6-8 hours) |
| **Impact** | Medium |
| **Risk** | Medium |

**What it is**: Runtime parameter controlling:
- Minimum lines before switch allowed
- Voice constraint strictness
- Preference for mono vs triadic mode

**Product modes:**
- "Monovoice possession" (deep single spirit)
- "Triadic ritual" (balanced rotation)
- "Chaotic chorus" (rapid switching)

**Why it might not be worth it yet**: This is a product feature, not a fix. The underlying mechanisms need to work well first before exposing tuning knobs.

**Dependencies**: Requires #4 (hysteresis) to be meaningful

---

### 4. Hysteresis for Detection

| Dimension | Assessment |
|-----------|------------|
| **Effort** | Low-Medium (2-4 hours) |
| **Impact** | High |
| **Risk** | Low |

**What it is**:
- Require N lines of evidence before switching (N=2-3)
- Add decay/stickiness instead of instant flip
- Treat symbols as hard anchors (override weak structural cues)

**Implementation sketch:**
```typescript
interface DetectionState {
  // ... existing fields
  switchEvidence: number;        // Lines supporting switch to different spirit
  switchCandidate: string | null; // Spirit we might switch to
}

// Only switch when evidence accumulates
if (result.id !== state.currentSpiritId) {
  if (result.id === state.switchCandidate) {
    state.switchEvidence++;
    if (state.switchEvidence >= SWITCH_THRESHOLD) {
      // Actually switch
    }
  } else {
    state.switchCandidate = result.id;
    state.switchEvidence = 1;
  }
}
```

**Why it's high-value**: Immediately improves perceived coherence. Reduces "invented switches" from classifier sensitivity. Foundational for other features.

**Dependencies**: None (in fact, everything else benefits from this)

---

### 5. Depth Escalation as Explicit Skill

| Dimension | Assessment |
|-----------|------------|
| **Effort** | High (8-12 hours) |
| **Impact** | High (signature capability) |
| **Risk** | Medium-High |

**What it is**: Midstream injection of "exocognitive skills" based on output evaluation:
- If no concrete scene by line 6 → inject "Scene-Anchor" skill
- If no conceptual turn by midpoint → inject "Dialectical Twist" skill
- If trending toward conclusion → inject "Leave the wound open" skill

**Why it's complex**:
- Requires real-time output evaluation
- Needs skill injection mechanism
- Must not disrupt flow
- Risk of over-engineering

**Dependencies**:
- Requires working depth tracking (now fixed ✓)
- Benefits from all other interventions
- Should be last in sequence

---

## Synergy Map

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   [4] Hysteresis ──────────────────────────────────────┐    │
│        │                                               │    │
│        │ enables                                       │    │
│        ▼                                               │    │
│   [2] Handoff Protocol ◄─── same file edits ───► [1] Anti-Patterns
│        │                                               │    │
│        │ enables                                       │    │
│        ▼                                               │    │
│   [3] Tunable Intensity                                │    │
│        │                                               │    │
│        │ all feed into                                 │    │
│        ▼                                               │    │
│   [5] Depth as Skill ◄─────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key synergies:**

| Pair | Synergy |
|------|---------|
| #1 + #2 | Both are skills.md edits, can do in single pass |
| #4 + #2 | Hysteresis prevents jitter during handoffs |
| #4 + #3 | Hysteresis makes intensity tuning meaningful |
| All → #5 | Depth as skill works best when other mechanisms are solid |

---

## Recommendation

### Phase 1: Foundation (Do Now)
**Implement #4 (Hysteresis) + #1 (Anti-Patterns)**

| Why | Details |
|-----|---------|
| Highest ROI | Both are low effort, high impact |
| Foundation | Hysteresis enables everything else |
| Quick win | Anti-patterns can ship same day |
| Measurable | Re-run A/B tests to verify improvement |

**Estimated time**: 3-4 hours total

### Phase 2: Choreography (Do Next)
**Implement #2 (Handoff Protocol)**

| Why | Details |
|-----|---------|
| Core differentiator | Turns multiple voices into choreography |
| Builds on Phase 1 | Hysteresis makes handoffs smooth |
| Same file edits | Natural continuation of anti-patterns work |

**Estimated time**: 4-6 hours

### Phase 3: Product Polish (Do Later)
**Implement #3 (Tunable Intensity) if needed**

| Why | Details |
|-----|---------|
| Product feature | Not a fix, an enhancement |
| Wait for data | See if Phases 1-2 resolve the issues |
| User-facing | Requires UI/UX decisions |

**Estimated time**: 6-8 hours

### Phase 4: Signature Capability (Do Eventually)
**Implement #5 (Depth as Skill)**

| Why | Details |
|-----|---------|
| Complex | Needs solid foundation first |
| High risk | Could over-engineer |
| Signature | Worth doing well, not fast |

**Estimated time**: 8-12 hours

---

## Summary Table

| Priority | Intervention | Effort | Impact | Do When |
|----------|--------------|--------|--------|---------|
| **1** | Hysteresis | Low-Med | High | **Now** |
| **1** | Anti-Patterns | Low | Med-High | **Now** |
| **2** | Handoff Protocol | Medium | High | Next |
| **3** | Tunable Intensity | Med-High | Medium | Later |
| **4** | Depth as Skill | High | High | Eventually |

---

## Next Action

Start with Phase 1:
1. Implement hysteresis in `detection.ts` (2-3 hours)
2. Add anti-patterns to Herzog, Benjamin, Wittgenstein skills.md files (1 hour)
3. Re-run 5-10 A/B tests to measure improvement
4. Commit results before moving to Phase 2
