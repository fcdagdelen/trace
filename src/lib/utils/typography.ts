// Typography utilities for method-specific visual hints
// Subtle shifts in letter-spacing and other micro-typography

export interface MethodTypography {
  letterSpacing: number;  // em units
  color: string;          // margin indicator color
  glowColor: string;      // brighter color for typing animation
}

// Method typography configurations
// These are very subtle - almost subliminal
export const METHOD_TYPOGRAPHY: Record<string, MethodTypography> = {
  barthes: {
    letterSpacing: 0.015,
    color: '#4a3728',
    glowColor: '#d4a574',  // warm peach
  },
  warburg: {
    letterSpacing: 0.012,
    color: '#2d3a4a',
    glowColor: '#7ca1c4',  // soft blue
  },
  benjamin: {
    letterSpacing: 0.018,
    color: '#3a3a2d',
    glowColor: '#c4b87c',  // golden amber
  },
  deleuze: {
    letterSpacing: 0.008,
    color: '#2d4a3a',
    glowColor: '#7cc4a1',  // mint teal
  },
  wittgenstein: {
    letterSpacing: 0.020,
    color: '#3d3d3d',
    glowColor: '#a8a8a8',  // silver
  },
  bateson: {
    letterSpacing: 0.014,
    color: '#4a2d3a',
    glowColor: '#c47ca1',  // rose mauve
  },
  simmel: {
    letterSpacing: 0.016,
    color: '#3a3a4a',
    glowColor: '#a1a1c4',  // lavender slate
  },
  'ibn-khaldun': {
    letterSpacing: 0.013,
    color: '#4a3a2d',
    glowColor: '#c4a17c',  // desert sand
  },
  grothendieck: {
    letterSpacing: 0.022,
    color: '#2d2d4a',
    glowColor: '#7c7cc4',  // indigo
  },
  calasso: {
    letterSpacing: 0.011,
    color: '#4a2d2d',
    glowColor: '#c47c7c',  // coral red
  },
  borges: {
    letterSpacing: 0.017,
    color: '#3a2d4a',
    glowColor: '#a17cc4',  // soft violet
  },
  derrida: {
    letterSpacing: 0.019,
    color: '#2d4a4a',
    glowColor: '#7cc4c4',  // aqua cyan
  },
};

// Default typography when no method is active
export const DEFAULT_TYPOGRAPHY: MethodTypography = {
  letterSpacing: 0.015,
  color: '#3a3a3a',
  glowColor: '#b0b0b0',
};

// Get typography for a method (or blend of methods)
export function getTypography(methodId: string | null): MethodTypography {
  if (!methodId) return DEFAULT_TYPOGRAPHY;
  return METHOD_TYPOGRAPHY[methodId] || DEFAULT_TYPOGRAPHY;
}

// Interpolate between two typography states for smooth transitions
export function interpolateTypography(
  from: MethodTypography,
  to: MethodTypography,
  t: number // 0-1 progress
): MethodTypography {
  return {
    letterSpacing: from.letterSpacing + (to.letterSpacing - from.letterSpacing) * t,
    color: interpolateColor(from.color, to.color, t),
    glowColor: interpolateColor(from.glowColor, to.glowColor, t),
  };
}

// Simple hex color interpolation
function interpolateColor(from: string, to: string, t: number): string {
  const f = hexToRgb(from);
  const tt = hexToRgb(to);

  const r = Math.round(f.r + (tt.r - f.r) * t);
  const g = Math.round(f.g + (tt.g - f.g) * t);
  const b = Math.round(f.b + (tt.b - f.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 58, g: 58, b: 58 };
}
