// Variable pacing logic for the trace stream
// Creates breathing rhythm - faster in flow, slower at transitions

import { isTransitionalSymbol } from './symbols';

// Base delay in milliseconds
const BASE_DELAY = 50;  // ~200 wpm base reading speed

// Pacing multipliers
const PACING = {
  flow: 0.8,           // Slightly faster during continuous flow
  sentence: 1.0,       // Normal for regular sentences
  symbol: 6.0,         // Much slower at transitional symbols (300ms)
  methodShift: 8.0,    // Pause at method transitions (400ms)
  closing: 10.0,       // Extra pause before closure (500ms)
} as const;

export interface PacingContext {
  consecutiveLines: number;  // Lines since last symbol
  isClosing: boolean;        // Approaching end
  methodShifting: boolean;   // Method transition detected
}

export function calculateDelay(line: string, context: PacingContext): number {
  const trimmed = line.trim();

  // Empty lines get minimal delay
  if (!trimmed) {
    return BASE_DELAY * 0.5;
  }

  // Transitional symbols get extended pause
  if (isTransitionalSymbol(trimmed)) {
    return BASE_DELAY * PACING.symbol;
  }

  // Method shift pause
  if (context.methodShifting) {
    return BASE_DELAY * PACING.methodShift;
  }

  // Closing sequence
  if (context.isClosing) {
    return BASE_DELAY * PACING.closing;
  }

  // Flow acceleration - the longer we go without symbols, the faster
  if (context.consecutiveLines > 3) {
    return BASE_DELAY * PACING.flow;
  }

  // Default sentence pacing
  return BASE_DELAY * PACING.sentence;
}

// Detect if we're in a closing sequence
// Look for closure markers in the text
export function detectClosing(line: string): boolean {
  const closingMarkers = [
    'what remains',
    'here is',
    'and so',
    'thus',
    'finally',
    'in the end',
    'this, then',
    'we arrive',
  ];

  const lower = line.toLowerCase();
  return closingMarkers.some(marker => lower.includes(marker));
}
