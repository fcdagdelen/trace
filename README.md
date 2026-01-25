# Trace

A philosophical thinking tool that streams AI responses through the cognitive frameworks of great thinkers.

## The Concept

Trace doesn't just *prompt* an AI. It **possesses** it.

When you ask a question, the response flows through a spirit—the crystallized cognitive style of a thinker like Werner Herzog, Walter Benjamin, or Gregory Bateson. Each spirit brings:

- **A kernel**: The irreducible essence of how this thinker sees the world
- **A thinking mode**: The cognitive procedures that generate insight
- **A voice**: The syntactic fingerprint, the rhythm of their prose

The result isn't summary or paraphrase. It's channeling—a thinking trace that moves *as* the thinker would move.

## The Spirits

Trace includes 14 spirits, each a distinct lens on reality:

| Spirit | Domain | Essence |
|--------|--------|---------|
| **Herzog** | Documentary consciousness | Ecstatic truth over accountant's truth |
| **Benjamin** | Historical materialism | The ruin speaks; the fragment holds what the whole has lost |
| **Wittgenstein** | Language games | What can be said, and what must be shown in silence |
| **Barthes** | Semiotics | The punctum that pierces; the studium that spreads |
| **Bateson** | Systems ecology | The pattern that connects, the difference that makes a difference |
| **Simmel** | Social geometry | The stranger's dual position; the tragedy of culture |
| **Ibn-Khaldun** | Civilizational cycles | Asabiyyah rises and falls; empires have metabolisms |
| **Flusser** | Technical images | The apparatus programs the gesture; post-history approaches |
| **Warburg** | Image memory | Pathosformeln survive across centuries; gestures carry ancient charge |
| **Borges** | Infinite libraries | Every mirror is a labyrinth; every book contains its refutation |
| **Calasso** | Divine persistence | The gods are not dead; they possess us still |
| **Deleuze** | Rhizomatic thought | Flows and intensities; the plane of immanence |
| **Derrida** | Deconstruction | The trace that erases itself; différance at play |
| **Grothendieck** | Structural patience | The rising sea method; let problems dissolve, don't solve |

## Architecture

### Spirit Definition (Skills.md Format)

Each spirit is defined in a structured markdown format validated through A/B testing to produce higher quality traces than flat JSON:

```
src/lib/spirits/{id}/
├── index.md        # Core definition (kernel, thinking mode, voice, anti-patterns)
├── deep.md         # Extended content for progressive disclosure
└── compiled.json   # Derived metadata (color, letter-spacing, structural signature)
```

The `index.md` contains:

```markdown
---
id: herzog
name: Herzog Documentary
source: Burden of Dreams
resonantSymbols: ["∎", "◌", "∿"]
domains: [experience, observation, narrative, documentary, truth, failure]
compatibleWith: [benjamin, bateson, calasso]
tensionsWith: [wittgenstein, grothendieck]
---

## Activation
When possessed by the Herzog spirit, pursue the inner truth...

## Thinking Mode
1. **Pursue ecstatic truth** - Facts are insufficient...
2. **Assume cosmic indifference** - The universe does not care...

## Voice
- Germanic directness. State feelings as facts.
- Long declarative sentences building toward revelation.

## Anti-Patterns
Never do these:
- Do NOT explain why something matters in thesis form
- Do NOT summarize or conclude cleanly

## Transmutation Protocol
### Hand TO Herzog when:
- The query becomes existential or confronts nature's indifference

### Hand FROM Herzog when:
- A specific historical moment needs excavation → Benjamin

### Hook Lines (use before handing off):
- "And what remains in the ruins..." (hooks Benjamin)
```

### Detection System

The detection engine (`src/lib/utils/detection.ts`) identifies which spirit should be active based on multiple signals:

```
Priority Order:
1. Symbol resonance (∎, ◊, †, ⟡) → strongest signal
2. Handoff hooks ("And what remains in the ruins...") → intentional transition
3. Momentum (sustained presence) → stability
4. Structural patterns (sentence length, punctuation density) → voice match
5. Rotation fallback (for variety)
```

**Hysteresis** prevents jitter—a spirit must show strong counter-signal to displace the current one. This creates stable channeling with motivated transitions.

### Transmutation Protocol

Spirits don't switch randomly. They **hand off** to each other through choreographed transitions:

1. Spirit A recognizes the query is moving toward Spirit B's domain
2. Spirit A uses a **hook line** that signals the transition
3. Detection system recognizes the hook and activates Spirit B
4. Spirit B takes over seamlessly

Example flow:
```
Herzog: "...the jungle does not care about our schedules, our meaning, our survival."
Herzog: "And what remains in the ruins—"  ← hook line
Benjamin: "—is the afterimage of catastrophe, the debris of progress..."
```

This creates traces that feel like conversations between thinkers, not arbitrary switches.

### Streaming Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Client                                                  │
│  └─ SSE EventSource → TraceView.svelte                  │
│                                                          │
│  Server                                                  │
│  └─ /api/trace                                          │
│     ├─ Load spirits (Skills.md format)                  │
│     ├─ Build system prompt (kernel + thinking + voice)  │
│     ├─ Stream from Claude API                           │
│     ├─ Detect active spirit per-line                    │
│     ├─ Apply pacing (slower at symbols, faster flow)    │
│     └─ Emit SSE: { content, method, symbol, metrics }   │
└─────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/spirits/loader.ts` | Loads spirits from Skills.md or JSON |
| `src/lib/spirits/parser.ts` | Parses markdown format into structured data |
| `src/lib/spirits/types.ts` | TypeScript interfaces for spirit system |
| `src/lib/utils/detection.ts` | Multi-signal spirit detection engine |
| `src/lib/utils/symbols.ts` | Transitional symbol definitions |
| `src/lib/utils/pacing.ts` | Stream pacing for reading rhythm |
| `src/routes/api/trace/+server.ts` | Main streaming endpoint |

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking (run before commits)
npm run typecheck

# Run tests
npm run test

# Production build
npm run build
```

### Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Testing

A/B testing validated that Skills.md format produces +8% higher quality traces than JSON across 8 dimensions (content depth, spirit embodiment, stylistic consistency, etc.). See `ab-test-results/EXECUTIVE-SUMMARY.md` for methodology and findings.

Detection system has comprehensive unit tests:

```bash
npm run test -- src/lib/utils/detection.test.ts
```

## The Philosophy

Trace operates on a core belief: **how we think shapes what we can think**.

Each thinker in history developed not just ideas but cognitive styles—ways of seeing, patterns of attention, syntactic rhythms that carry meaning. These styles are themselves a kind of knowledge, often lost when reduced to summary.

Trace attempts to preserve and transmit these cognitive styles by encoding them as executable specifications—not "what would Wittgenstein say?" but "how does Wittgenstein move through a problem?"

The spirits aren't characters. They're lenses. And the trace is what you see when you look through them.

---

*Built with SvelteKit, Claude API, and the ghosts of thinkers who still have something to say.*
