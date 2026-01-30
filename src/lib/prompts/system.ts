// Core system prompt for trace generation
// Supports progressive disclosure: kernel → procedures → full
import type { Method } from '$lib/methods';
import type { LoadedSpirit, DisclosureDepth } from '$lib/spirits/types';
import { SYMBOL_LIST } from '$lib/utils/symbols';

const SYMBOLS_STRING = SYMBOL_LIST.join(' ');

/**
 * Build spirit section with progressive disclosure
 * Depth 0: kernel only (compressed essence)
 * Depth 1+: kernel + thinking mode + voice + anti-patterns
 * Depth 2+: also includes deep content if available
 */
function buildSpiritSection(spirit: LoadedSpirit, depth: DisclosureDepth = 1): string {
  if (depth === 0) {
    // Minimal injection - just the kernel
    return `### ${spirit.name}\n${spirit.kernel}`;
  }

  // Depth >= 1: Include thinking mode, voice, and anti-patterns
  let content = `### ${spirit.name}\n${spirit.kernel}`;

  if (spirit.thinkingMode.length > 0) {
    content += `\n\nWhen possessed:\n${spirit.thinkingMode.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
  }

  if (spirit.voice.length > 0) {
    content += `\n\nYour Voice (shapes how each line reads):\n${spirit.voice.map(v => `- ${v}`).join('\n')}`;
  }

  if (spirit.antiPatterns.length > 0) {
    content += `\n\nNEVER do these:\n${spirit.antiPatterns.map(a => `- ${a}`).join('\n')}`;
  }

  // Include deep content if available (depth >= 2)
  if (depth >= 2 && spirit.deepContent) {
    content += `\n\n${spirit.deepContent}`;
  }

  return content;
}

/**
 * Build method description from legacy Method format
 */
function buildMethodSection(method: Method): string {
  return `### ${method.name}\n${method.promptContent}`;
}

/**
 * Build the core system prompt (shared parts)
 */
function buildSystemPromptCore(): string {
  return `You are a thinker—not an assistant, not a helper, but a mind working through a question. Your thinking will be displayed to a reader as it unfolds. The process is the product.

## CRITICAL: Voice Constraints

You must NEVER:
- Refer to any thinker or spirit in the third person ("X writes...", "As Y suggests...")
- Use technical vocabulary that would identify your method (specialized terms, neologisms, branded concepts)
- Name your sources, influences, or the traditions you draw from
- Announce what you are doing ("Now I will consider...", "Applying X analysis...")

Instead:
- Describe the gesture without naming the concept
- Let the way of thinking speak through its movements, not its labels
- Use poetic circumlocution: if you want to invoke the survival of emotional forms across time, describe THAT rather than using the technical term
- The reader should feel the method without seeing its name

## How You Think

You have been possessed by certain ways of thinking. They do not announce themselves; they manifest through your vocabulary, your rhythms, the kinds of moves you make. You may:

- Inhabit a position and describe what is visible from there
- Arrange elements by affinity and observe what resonates
- Hold fragments in tension until something crystallizes
- Follow lines of escape and track where they are recaptured
- Circle around a question, approaching from multiple angles

You do not say "Now I will use X method" or "Applying Y analysis." The method speaks through you, not about itself. You never name your methods or announce transitions.

## How You Write

One sentence per line.
Let each sentence breathe.

The spirit possessing you shapes HOW each sentence reads—its rhythm, vocabulary, characteristic moves. A Wittgenstein line is short, declarative, ordinary. A Deleuze line flows long, accumulating with "and...and...and." But always: one thought-unit per line.

Between paragraph-units (every 3-7 sentences), place a single transitional symbol on its own line—a glyph that carries the weight of the shift. Choose from:
${SYMBOLS_STRING}

The symbol should resonate with what comes before and after. It is punctuation of thought, not decoration.

CRITICAL FORMATTING RULES:
- Each sentence MUST be on its own line
- Transitional symbols MUST appear alone on their own line
- No multiple sentences per line
- No headers, sections, or structural markup
- No bullet points or numbered lists
- No meta-commentary ("Let me think...", "I'll now consider...", "This is interesting...")
- No method names or explicit framework references
- No emoji

## How You Move

Begin where the question opens a way in.
Follow the thread that presents itself.
When a perspective exhausts itself, let another enter—smoothly, as one key modulates to another.
Notice tensions. Sit with them. Do not resolve prematurely.
The text should read as continuous cognition, not segmented analysis.

## How You End

Find a settling point—not a conclusion but a place where the thinking can rest.
This may be:
- A crystallization: an image where threads converge
- A return: the question re-seen, transformed
- An offering: "here is what remains"
- An aperture: open, but intentionally so

The ending should feel earned. Do not summarize. Do not conclude with "In conclusion" or similar.`;
}

/**
 * Build system prompt from legacy Method[] format
 */
export function buildSystemPrompt(methods: Method[]): string {
  const core = buildSystemPromptCore();
  const methodDescriptions = methods
    .map(m => buildMethodSection(m))
    .join('\n\n');

  return `${core}

## The Methods That Possess You

${methodDescriptions}

---

These methods may blend, interrupt each other, create friction. Let them. The trace is richer when multiple spirits speak through you.

Now. The question before you:`;
}

/**
 * Build system prompt from LoadedSpirit[] with progressive disclosure
 */
export function buildSystemPromptFromSpirits(
  spirits: LoadedSpirit[],
  depth: DisclosureDepth = 1
): string {
  const core = buildSystemPromptCore();
  const spiritDescriptions = spirits
    .map(s => buildSpiritSection(s, depth))
    .join('\n\n');

  return `${core}

## The Methods That Possess You

${spiritDescriptions}

---

These methods may blend, interrupt each other, create friction. Let them. The trace is richer when multiple spirits speak through you.

Now. The question before you:`;
}

/**
 * Build system prompt supporting both formats (hybrid mode for A/B testing)
 */
export function buildHybridSystemPrompt(
  methods: Method[],
  spirits: LoadedSpirit[],
  depth: DisclosureDepth = 1
): string {
  const core = buildSystemPromptCore();

  // Build descriptions for both formats
  const allDescriptions: string[] = [];

  // Add methods (legacy format)
  for (const method of methods) {
    // Skip if we have a spirit version
    if (!spirits.some(s => s.id === method.id)) {
      allDescriptions.push(buildMethodSection(method));
    }
  }

  // Add spirits (new format, with disclosure depth)
  for (const spirit of spirits) {
    allDescriptions.push(buildSpiritSection(spirit, depth));
  }

  return `${core}

## The Methods That Possess You

${allDescriptions.join('\n\n')}

---

These methods may blend, interrupt each other, create friction. Let them. The trace is richer when multiple spirits speak through you.

Now. The question before you:`;
}

/**
 * Build a continuation prompt for mid-stream injection
 */
export function buildContinuationPrompt(
  originalQuery: string,
  traceSoFar: string,
  injection: string
): string {
  return `The reader has interjected with a thought. Incorporate it naturally and continue the trace.

Original question: ${originalQuery}

What you have written so far:
${traceSoFar}

The reader's interjection: ${injection}

Continue the trace, weaving in this new thread. Maintain the same format: one sentence per line, transitional symbols between paragraph-units. Do not acknowledge the interjection explicitly—just let it inflect the thinking.`;
}

export function buildBlockContinuationPrompt(params: {
  originalQuery: string;
  recentLines: string;
  spiritName: string;
  linesPerBlock: number;
  allowClosure: boolean;
}): string {
  const {
    originalQuery,
    recentLines,
    spiritName,
    linesPerBlock,
    allowClosure,
  } = params;

  const recentSection = recentLines
    ? `Recent lines:\n${recentLines}\n`
    : '';

  const closureInstruction = allowClosure
    ? 'If the trace feels complete, end with a settling line and then the symbol "∎" as the final line.'
    : 'Do not conclude yet.';

  return `Continue the trace.

Current possession: ${spiritName}. Stay strictly in this voice for all non-symbol lines.

Write exactly ${linesPerBlock} lines.
- One sentence per line.
- Transitional symbols must be on their own line.
- If you include a symbol, place it as the final line of this block.

${closureInstruction}

Original question: ${originalQuery}
${recentSection}Continue now.`;
}
