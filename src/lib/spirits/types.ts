// Types for the skills-native spirit system

export interface StructuralSignature {
  sentenceLength: 'short' | 'medium' | 'long' | 'varied';
  punctuationDensity: 'sparse' | 'moderate' | 'dense';
  rhetoricalMoves: string[];  // e.g., ["juxtaposition", "deferral", "return"]
}

export interface HandoffRule {
  targetSpirit: string;
  condition: string;
}

export interface HookLine {
  text: string;
  targetSpirit: string;
}

export interface TransmutationProtocol {
  handToWhen: string[];          // Conditions when to hand TO this spirit
  handFromRules: HandoffRule[];  // Rules for handing FROM this spirit
  hookLines: HookLine[];         // Hook lines to use before handoff
}

export interface CompiledSpirit {
  derivedAt: string;           // ISO timestamp
  version: string;             // semver or content hash
  color: string;               // hex color
  letterSpacing: number;       // 0.01-0.04
  structuralSignature: StructuralSignature;
}

export interface LoadedSpirit {
  id: string;
  name: string;
  source: string;
  format: 'json' | 'skills';

  // Core content
  kernel: string;
  thinkingMode: string[];
  voice: string[];
  fullPromptContent: string;

  // Metadata
  resonantSymbols: string[];
  domains: string[];
  compatibleWith: string[];
  tensionsWith: string[];

  // Compiled/derived (from compiled.json or JSON file)
  color: string;
  letterSpacing: number;
  structuralSignature?: StructuralSignature;

  // Handoff choreography
  transmutation?: TransmutationProtocol;

  // For progressive disclosure
  hasDeepContent: boolean;
  deepContent?: string;
}

// Detection depth levels for progressive disclosure
export type DisclosureDepth = 0 | 1 | 2;

export interface SpiritLoadOptions {
  format?: 'json' | 'skills' | 'auto';
  depth?: DisclosureDepth;
}
