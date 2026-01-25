// YAML frontmatter + markdown parser for skill files
// Parses the skills.md format: YAML frontmatter + markdown body
import type { HandoffRule, HookLine, TransmutationProtocol } from './types';

export interface SpiritMeta {
  id: string;
  name: string;
  source: string;
  resonantSymbols: string[];
  domains: string[];
  compatibleWith: string[];
  tensionsWith: string[];
}

export interface ParsedSpirit {
  meta: SpiritMeta;
  kernel: string;           // First paragraph (compressed essence)
  thinkingMode: string[];   // Numbered procedures
  voice: string[];          // Stylistic constraints
  transmutation?: TransmutationProtocol; // Handoff rules
  fullContent: string;      // Complete markdown body
}

/**
 * Parse YAML frontmatter from markdown content
 */
function parseYamlFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('No valid YAML frontmatter found');
  }

  const yamlContent = match[1];
  const body = match[2];

  // Simple YAML parser for flat structure with arrays
  const meta: Record<string, unknown> = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    // Parse array values [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1);
      const items = arrayContent.split(',').map(item => {
        const cleaned = item.trim();
        // Remove quotes if present
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
          return cleaned.slice(1, -1);
        }
        return cleaned;
      });
      meta[key] = items;
    } else {
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      meta[key] = value;
    }
  }

  return { meta, body };
}

/**
 * Extract sections from markdown body by heading
 */
function extractSections(body: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const lines = body.split('\n');

  let currentSection = '__intro__';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for ## heading
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      // Save previous section
      if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = headingMatch[1].toLowerCase().replace(/\s+/g, '-');
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save final section
  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

/**
 * Extract kernel (first paragraph after # heading)
 */
function extractKernel(body: string): string {
  const lines = body.split('\n');
  let foundH1 = false;
  const kernelLines: string[] = [];

  for (const line of lines) {
    // Skip until we find H1
    if (line.match(/^#\s+.+$/)) {
      foundH1 = true;
      continue;
    }

    if (!foundH1) continue;

    // Skip empty lines at start
    if (kernelLines.length === 0 && !line.trim()) continue;

    // Stop at next heading
    if (line.match(/^##\s+/)) break;

    // Stop at empty line after content (end of first paragraph)
    if (!line.trim() && kernelLines.length > 0) break;

    kernelLines.push(line);
  }

  return kernelLines.join('\n').trim();
}

/**
 * Extract numbered procedures from a section
 */
function extractNumberedItems(content: string): string[] {
  const items: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Match "1. **Title** - Description" format
    const match = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[-–]\s*(.+)$/);
    if (match) {
      items.push(`${match[1]}: ${match[2]}`);
    }
  }

  return items;
}

/**
 * Extract bullet points from a section
 */
function extractBulletItems(content: string): string[] {
  const items: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^[-*]\s+(.+)$/);
    if (match) {
      items.push(match[1]);
    }
  }

  return items;
}

/**
 * Extract transmutation protocol from section content
 */
function extractTransmutationProtocol(content: string): TransmutationProtocol | undefined {
  if (!content) return undefined;

  const lines = content.split('\n');
  const handToWhen: string[] = [];
  const handFromRules: HandoffRule[] = [];
  const hookLines: HookLine[] = [];

  let currentSubsection: 'to' | 'from' | 'hooks' | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for subsection headers
    if (trimmed.toLowerCase().includes('hand to') && trimmed.includes('when')) {
      currentSubsection = 'to';
      continue;
    }
    if (trimmed.toLowerCase().includes('hand from') && trimmed.includes('when')) {
      currentSubsection = 'from';
      continue;
    }
    if (trimmed.toLowerCase().includes('hook line')) {
      currentSubsection = 'hooks';
      continue;
    }

    // Extract bullet items based on current subsection
    const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      const text = bulletMatch[1];

      if (currentSubsection === 'to') {
        handToWhen.push(text);
      } else if (currentSubsection === 'from') {
        // Parse "condition → spiritName" format
        const arrowMatch = text.match(/(.+?)\s*[→→]\s*(\w+)/);
        if (arrowMatch) {
          handFromRules.push({
            condition: arrowMatch[1].trim(),
            targetSpirit: arrowMatch[2].toLowerCase(),
          });
        }
      } else if (currentSubsection === 'hooks') {
        // Parse "\"hook text\" (hooks spiritName)" format
        const hookMatch = text.match(/[""](.+?)[""].*\(hooks?\s+(\w+)\)/i);
        if (hookMatch) {
          hookLines.push({
            text: hookMatch[1].trim(),
            targetSpirit: hookMatch[2].toLowerCase(),
          });
        }
      }
    }
  }

  // Only return if we found something
  if (handToWhen.length === 0 && handFromRules.length === 0 && hookLines.length === 0) {
    return undefined;
  }

  return { handToWhen, handFromRules, hookLines };
}

/**
 * Parse a spirit skill file
 */
export function parseSpirit(content: string): ParsedSpirit {
  const { meta, body } = parseYamlFrontmatter(content);
  const sections = extractSections(body);

  // Validate required meta fields
  const requiredFields = ['id', 'name', 'source', 'resonantSymbols', 'domains', 'compatibleWith', 'tensionsWith'];
  for (const field of requiredFields) {
    if (!(field in meta)) {
      throw new Error(`Missing required field in frontmatter: ${field}`);
    }
  }

  const spiritMeta: SpiritMeta = {
    id: meta.id as string,
    name: meta.name as string,
    source: meta.source as string,
    resonantSymbols: meta.resonantSymbols as string[],
    domains: meta.domains as string[],
    compatibleWith: meta.compatibleWith as string[],
    tensionsWith: meta.tensionsWith as string[],
  };

  const kernel = extractKernel(body);
  const thinkingMode = extractNumberedItems(sections['thinking-mode'] || '');
  const voice = extractBulletItems(sections['voice'] || '');
  const transmutation = extractTransmutationProtocol(sections['transmutation-protocol'] || '');

  return {
    meta: spiritMeta,
    kernel,
    thinkingMode,
    voice,
    transmutation,
    fullContent: body,
  };
}

/**
 * Convert ParsedSpirit to prompt content for system injection
 */
export function spiritToPromptContent(spirit: ParsedSpirit, depth: number = 0): string {
  if (depth === 0) {
    // Kernel only - minimal injection
    return spirit.kernel;
  }

  if (depth === 1) {
    // Kernel + thinking mode
    const thinkingSection = spirit.thinkingMode.length > 0
      ? `\n\nWhen possessed:\n${spirit.thinkingMode.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
      : '';
    return spirit.kernel + thinkingSection;
  }

  // Depth >= 2: Full content including voice
  const voiceSection = spirit.voice.length > 0
    ? `\n\nVoice:\n${spirit.voice.map(v => `- ${v}`).join('\n')}`
    : '';

  const thinkingSection = spirit.thinkingMode.length > 0
    ? `\n\nWhen possessed:\n${spirit.thinkingMode.map((item, i) => `${i + 1}. ${item}`).join('\n')}`
    : '';

  return spirit.kernel + thinkingSection + voiceSection;
}
