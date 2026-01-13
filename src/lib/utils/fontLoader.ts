// Lazy font loader for PDF export
// Fetches a Unicode-capable font from CDN only when needed

// DejaVu Sans Mono - excellent Unicode coverage including our symbols
// Using jsDelivr CDN which serves from dejavu-fonts npm package
const FONT_URL = 'https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSansMono.ttf';

let cachedFont: string | null = null;
let loadingPromise: Promise<string> | null = null;

/**
 * Load the PDF export font (DejaVu Sans Mono)
 * Returns base64-encoded TTF data for jsPDF
 * Caches the result for subsequent exports
 */
export async function loadExportFont(): Promise<string> {
  // Return cached font if available
  if (cachedFont) {
    return cachedFont;
  }

  // If already loading, wait for that promise
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start loading
  loadingPromise = fetchAndEncodeFont();

  try {
    cachedFont = await loadingPromise;
    return cachedFont;
  } finally {
    loadingPromise = null;
  }
}

async function fetchAndEncodeFont(): Promise<string> {
  const response = await fetch(FONT_URL);

  if (!response.ok) {
    throw new Error(`Failed to load font: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  return base64;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Check if the font is already cached
 */
export function isFontCached(): boolean {
  return cachedFont !== null;
}

/**
 * Preload the font in the background (optional optimization)
 */
export function preloadFont(): void {
  loadExportFont().catch(() => {
    // Silently fail - will retry on actual export
  });
}
