// Typography utilities for spirit-specific visual identity
// Each spirit has a unique typographic and visual signature

export interface SpiritTypography {
  letterSpacing: number;      // em units
  color: string;              // dim indicator color
  glowColor: string;          // bright glow during typing
  glyph: string;              // unique visual motif
  animationStyle: 'breathe' | 'pulse' | 'float' | 'flicker' | 'steady';
  weight: number;             // font weight modifier
}

// Spirit typography configurations
// Each thinker has a distinct visual signature
export const SPIRIT_TYPOGRAPHY: Record<string, SpiritTypography> = {
  herzog: {
    letterSpacing: 0.012,
    color: '#3a3028',
    glowColor: '#c4a574',      // amber - documentary warmth
    glyph: '⧫',               // solid diamond - unrelenting gaze
    animationStyle: 'steady',
    weight: 400,
  },
  barthes: {
    letterSpacing: 0.015,
    color: '#4a3728',
    glowColor: '#d4a574',      // warm peach - punctum
    glyph: '✦',               // four-pointed star - the prick
    animationStyle: 'breathe',
    weight: 400,
  },
  warburg: {
    letterSpacing: 0.012,
    color: '#2d3a4a',
    glowColor: '#7ca1c4',      // archival blue
    glyph: '⬡',               // hexagon - atlas panel
    animationStyle: 'float',
    weight: 400,
  },
  benjamin: {
    letterSpacing: 0.018,
    color: '#3a3a2d',
    glowColor: '#c4b87c',      // golden amber - aura
    glyph: '◬',               // triangle with dot - dialectical image
    animationStyle: 'flicker',
    weight: 400,
  },
  deleuze: {
    letterSpacing: 0.008,
    color: '#2d4a3a',
    glowColor: '#7cc4a1',      // mint teal - rhizome
    glyph: '⌘',               // command - assemblage
    animationStyle: 'pulse',
    weight: 400,
  },
  wittgenstein: {
    letterSpacing: 0.020,
    color: '#3d3d3d',
    glowColor: '#a8a8a8',      // silver - clarity
    glyph: '⬚',               // dotted square - logical space
    animationStyle: 'steady',
    weight: 500,
  },
  bateson: {
    letterSpacing: 0.014,
    color: '#4a2d3a',
    glowColor: '#c47ca1',      // rose mauve - pattern
    glyph: '∞',               // infinity - recursive pattern
    animationStyle: 'breathe',
    weight: 400,
  },
  simmel: {
    letterSpacing: 0.016,
    color: '#3a3a4a',
    glowColor: '#a1a1c4',      // lavender slate - urbanity
    glyph: '◈',               // diamond in square - social geometry
    animationStyle: 'pulse',
    weight: 400,
  },
  'ibn-khaldun': {
    letterSpacing: 0.013,
    color: '#4a3a2d',
    glowColor: '#c4a17c',      // desert sand - asabiyyah
    glyph: '☽',               // crescent - cyclical time
    animationStyle: 'float',
    weight: 400,
  },
  grothendieck: {
    letterSpacing: 0.022,
    color: '#2d2d4a',
    glowColor: '#7c7cc4',      // indigo - abstraction
    glyph: '⟐',               // diamond with cross - topos
    animationStyle: 'steady',
    weight: 500,
  },
  calasso: {
    letterSpacing: 0.011,
    color: '#4a2d2d',
    glowColor: '#c47c7c',      // coral red - sacrifice
    glyph: '⚶',               // white sun - myth
    animationStyle: 'flicker',
    weight: 400,
  },
  borges: {
    letterSpacing: 0.017,
    color: '#3a2d4a',
    glowColor: '#a17cc4',      // soft violet - labyrinth
    glyph: '⌬',               // benzene ring - infinite library
    animationStyle: 'float',
    weight: 400,
  },
  derrida: {
    letterSpacing: 0.019,
    color: '#2d4a4a',
    glowColor: '#7cc4c4',      // aqua cyan - trace
    glyph: '⫘',               // arrow through - différance
    animationStyle: 'pulse',
    weight: 400,
  },
  flusser: {
    letterSpacing: 0.015,
    color: '#3d3a2d',
    glowColor: '#b4a87c',      // ochre - technical image
    glyph: '⏣',               // benzene with circle - apparatus
    animationStyle: 'breathe',
    weight: 400,
  },
};

// Backward compatibility alias
export const METHOD_TYPOGRAPHY = SPIRIT_TYPOGRAPHY;

// Default typography when no spirit is active
export const DEFAULT_TYPOGRAPHY: SpiritTypography = {
  letterSpacing: 0.015,
  color: '#3a3a3a',
  glowColor: '#b0b0b0',
  glyph: '◯',
  animationStyle: 'breathe',
  weight: 400,
};

// Get typography for a spirit
export function getTypography(spiritId: string | null): SpiritTypography {
  if (!spiritId) return DEFAULT_TYPOGRAPHY;
  return SPIRIT_TYPOGRAPHY[spiritId] || DEFAULT_TYPOGRAPHY;
}

// Get spirit glyph for visual motif
export function getSpiritGlyph(spiritId: string | null): string {
  if (!spiritId) return DEFAULT_TYPOGRAPHY.glyph;
  return SPIRIT_TYPOGRAPHY[spiritId]?.glyph || DEFAULT_TYPOGRAPHY.glyph;
}

// Get all spirit IDs with their visual signatures
export function getAllSpiritVisuals(): Array<{
  id: string;
  glyph: string;
  glowColor: string;
  animationStyle: string;
}> {
  return Object.entries(SPIRIT_TYPOGRAPHY).map(([id, typo]) => ({
    id,
    glyph: typo.glyph,
    glowColor: typo.glowColor,
    animationStyle: typo.animationStyle,
  }));
}

// Interpolate between two typography states for smooth transitions
export function interpolateTypography(
  from: SpiritTypography,
  to: SpiritTypography,
  t: number // 0-1 progress
): SpiritTypography {
  return {
    letterSpacing: from.letterSpacing + (to.letterSpacing - from.letterSpacing) * t,
    color: interpolateColor(from.color, to.color, t),
    glowColor: interpolateColor(from.glowColor, to.glowColor, t),
    glyph: t > 0.5 ? to.glyph : from.glyph,
    animationStyle: t > 0.5 ? to.animationStyle : from.animationStyle,
    weight: Math.round(from.weight + (to.weight - from.weight) * t),
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

// CSS custom properties for a spirit
export function getSpiritCssVars(spiritId: string | null): Record<string, string> {
  const typo = getTypography(spiritId);
  return {
    '--spirit-letter-spacing': `${typo.letterSpacing}em`,
    '--spirit-color': typo.color,
    '--spirit-glow': typo.glowColor,
    '--spirit-glyph': `"${typo.glyph}"`,
    '--spirit-weight': String(typo.weight),
  };
}
