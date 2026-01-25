# CLAUDE.md - Trace Development Context

## What This Is

Trace is a philosophical thinking tool that channels AI responses through "spirits"—the cognitive frameworks of thinkers like Herzog, Benjamin, and Bateson. Not a chatbot. Not a summary engine. A possession engine.

## Core Concepts

### Spirit
A crystallized cognitive style encoded as executable specification. Not "what would X say" but "how does X move through a problem." Each spirit has:
- **Kernel**: Irreducible essence
- **Thinking Mode**: Numbered cognitive procedures
- **Voice**: Syntactic fingerprint, rhythm constraints
- **Anti-Patterns**: What the spirit NEVER does
- **Transmutation Protocol**: How to hand off to other spirits

### Detection
Multi-signal engine that identifies active spirit. Priority: symbol resonance > handoff hooks > momentum > structural patterns > rotation. Hysteresis prevents jitter.

### Transmutation
Choreographed spirit handoff via hook lines. Spirits transition intentionally, not randomly. Example: Herzog uses "And what remains in the ruins..." to hook Benjamin.

## Architecture

```
src/lib/
├── spirits/          # Spirit definitions (Skills.md format)
│   ├── {id}/
│   │   ├── index.md      # Core definition
│   │   ├── deep.md       # Extended content (depth 2+)
│   │   └── compiled.json # Derived metadata
│   ├── loader.ts     # Spirit loading
│   ├── parser.ts     # Markdown parsing
│   └── types.ts      # TypeScript interfaces
├── utils/
│   ├── detection.ts  # Spirit detection engine
│   ├── symbols.ts    # Transitional symbols (∎, ◊, †, etc.)
│   └── pacing.ts     # Stream reading rhythm
├── methods/          # Legacy JSON format (deprecated, kept for reference)
├── services/
│   └── claude.ts     # API streaming
└── prompts/
    └── system.ts     # System prompt builder
```

## Commands

```bash
npm run dev          # Development server
npm run typecheck    # ALWAYS before commits
npm run test         # Run all tests
npm run build        # Production build
```

## Key Decisions

1. **Skills.md > JSON**: A/B testing validated +8% quality improvement
2. **Structure over vocabulary**: Spirits detected by syntax patterns, not keyword matching
3. **Hysteresis for stability**: Spirits persist until strong counter-signal
4. **Hook lines for choreography**: Intentional transitions, not random rotation

## When Modifying Spirits

1. Edit `src/lib/spirits/{id}/index.md`
2. Update `deep.md` if changing extended content
3. If adding new spirit, also add to `loader.ts` → `getSkillsSpiritIds()`
4. Add hook line patterns to `detection.ts` → `HOOK_LINE_PATTERNS`
5. Run tests: `npm run test -- src/lib/utils/detection.test.ts`

## When Modifying Detection

Detection priority is intentional:
1. Symbols are explicit authorial markers
2. Hook lines are explicit handoff signals
3. Momentum rewards sustained presence
4. Structure matches voice patterns
5. Rotation prevents monotony

Don't change priority without understanding the tradeoffs.

## Anti-Patterns to Avoid

- **Vocabulary matching**: Spirits aren't about keywords. Voice = syntax, not terms.
- **Arbitrary rotation**: Transitions should feel motivated, not random.
- **Over-explaining**: Let the trace breathe. Herzog doesn't explain why things matter.
- **Thesis statements**: Traces don't conclude. They leave residue.

## Testing Philosophy

A/B test results in `ab-test-results/` validate format choices. When making significant changes:
1. Run existing test suite
2. Consider manual trace review for quality
3. Compare against baseline

## Database

Supabase for persistence:
- `traces`: Trace metadata
- `trace_lines`: Individual lines with spirit, symbol data
- `spirits`: Spirit metadata (not content—content is in repo)

## The Vibe

This isn't a utility app. It's cognitive infrastructure. The spirits should feel like they're *thinking through* the query, not responding to it. The transitions should feel like a conversation between thinkers, not a random shuffle.

When in doubt, ask: would this trace teach someone how this thinker moves?
