/**
 * Truncate large pasted content
 * Shows beginning of text + character count indicator
 */

const TRUNCATE_THRESHOLD = 400; // chars before we truncate
const PREVIEW_LENGTH = 150; // chars to show at start

export interface TruncatedInput {
  preview: string;
  indicator: string | null;
  isTruncated: boolean;
  charCount: number;
}

export function formatLargeInput(text: string): TruncatedInput {
  const charCount = text.length;

  if (charCount <= TRUNCATE_THRESHOLD) {
    return {
      preview: text,
      indicator: null,
      isTruncated: false,
      charCount,
    };
  }

  // Get first chunk, trim to word boundary if possible
  let preview = text.slice(0, PREVIEW_LENGTH);
  const lastSpace = preview.lastIndexOf(' ');
  if (lastSpace > PREVIEW_LENGTH * 0.6) {
    preview = preview.slice(0, lastSpace);
  }

  // Clean up trailing punctuation/whitespace
  preview = preview.trimEnd();

  const formatted = formatNumber(charCount);

  return {
    preview,
    indicator: `[${formatted} chars]`,
    isTruncated: true,
    charCount,
  };
}

function formatNumber(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return n.toLocaleString();
}
