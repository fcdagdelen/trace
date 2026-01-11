// Transitional symbols - esoteric punctuation of thought
// Each symbol carries semantic weight in the flow of cognition

export const SYMBOLS = {
  lozenge: '◊',      // pause, held breath
  reference: '※',    // something is being pointed to
  stellar: '⊹',      // gathering of points
  ring: '∘',         // circulation, return
  dotted: '◌',       // placeholder, potential
  dagger: '†',       // a cut, mortality enters
  asterism: '⁂',     // constellation forms
  therefore: '∴',    // implication without logic
  tombstone: '∎',    // end of proof, settling
  concave: '⟡',      // opening, receptivity
  diamond: '◈',      // recursion, depth
  sine: '∿',         // oscillation, continuation
  ellipsis: '⋮',     // descent, more beneath
} as const;

export type SymbolKey = keyof typeof SYMBOLS;
export type Symbol = typeof SYMBOLS[SymbolKey];

export const SYMBOL_LIST = Object.values(SYMBOLS);

// Check if a line is a transitional symbol
export function isTransitionalSymbol(line: string): boolean {
  const trimmed = line.trim();
  return SYMBOL_LIST.includes(trimmed as Symbol);
}

// Get symbol semantics for display hints
export const SYMBOL_SEMANTICS: Record<Symbol, string> = {
  '◊': 'pause',
  '※': 'reference',
  '⊹': 'gathering',
  '∘': 'return',
  '◌': 'potential',
  '†': 'cut',
  '⁂': 'constellation',
  '∴': 'implication',
  '∎': 'settling',
  '⟡': 'opening',
  '◈': 'depth',
  '∿': 'continuation',
  '⋮': 'descent',
};

// Depth direction: 1 = descend deeper, -1 = surface, 0 = neutral
export const SYMBOL_DEPTH_DIRECTION: Record<Symbol, -1 | 0 | 1> = {
  '◈': 1,   // depth - go deeper
  '⋮': 1,   // descent - more beneath
  '◊': 1,   // pause - inward
  '⁂': 1,   // constellation - patterns at depth
  '†': 1,   // cut - entering
  '∘': -1,  // return - circulation back
  '⟡': -1,  // opening - surfacing
  '∎': -1,  // settling - resolution
  '∴': -1,  // therefore - synthesis
  '※': 0,   // reference - pointing sideways
  '⊹': 0,   // stellar - gathering
  '◌': 0,   // placeholder - neutral
  '∿': 0,   // continuation - oscillation
};

export function getDepthDirection(symbol: string): -1 | 0 | 1 {
  return SYMBOL_DEPTH_DIRECTION[symbol as Symbol] ?? 0;
}
