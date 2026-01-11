// PDF export for trace output
import { jsPDF } from 'jspdf';
import type { TraceLine } from '$lib/stores/trace';
import { METHOD_TYPOGRAPHY, DEFAULT_TYPOGRAPHY } from '$lib/utils/typography';

interface ExportOptions {
  query: string;
  lines: TraceLine[];
}

// Convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 232, g: 232, b: 232 };
}

// Map unicode symbols to ASCII-safe alternatives for PDF
const SYMBOL_TO_ASCII: Record<string, string> = {
  '◊': '<>',
  '※': '*',
  '⊹': '+',
  '∘': 'o',
  '◌': '( )',
  '†': '+',
  '⁂': '* * *',
  '∴': '...',
  '∎': '[]',
  '⟡': '<>',
  '◈': '<>',
  '∿': '~',
  '⋮': ':',
};

// Convert symbol to PDF-safe version
function symbolToPdf(symbol: string): string {
  return SYMBOL_TO_ASCII[symbol.trim()] || symbol;
}

// Convert text, handling em-dashes
function textToPdf(text: string): string {
  return text
    .replace(/—/g, '--')
    .replace(/–/g, '-')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    .replace(/"/g, '"')
    .replace(/"/g, '"');
}

export function exportToPdf({ query, lines }: ExportOptions): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // Dark background
  pdf.setFillColor(10, 10, 10);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  let y = margin;

  // Helper to add new page with dark background
  const addPage = () => {
    pdf.addPage();
    pdf.setFillColor(10, 10, 10);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    y = margin;
  };

  // Check if we need a new page
  const checkPage = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      addPage();
    }
  };

  // Use Times for better readability on dark background
  pdf.setFont('times', 'normal');

  // Title / Query
  pdf.setFontSize(11);
  const accentColor = hexToRgb('#8aa4ff');
  pdf.setTextColor(accentColor.r, accentColor.g, accentColor.b);
  pdf.text('>', margin, y);

  pdf.setFontSize(13);
  pdf.setTextColor(232, 232, 232);
  const queryText = textToPdf(query);
  const queryLines = pdf.splitTextToSize(queryText, contentWidth - 20);
  pdf.text(queryLines, margin + 15, y);
  y += queryLines.length * 18 + 28;

  // Separator
  pdf.setDrawColor(40, 40, 40);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Track seen methods for attribution
  const seenMethods = new Set<string>();

  // Content
  pdf.setFontSize(11);
  const lineHeight = 16;

  for (const line of lines) {
    if (line.methodHint) {
      seenMethods.add(line.methodHint);
    }

    if (line.isSymbol) {
      // Symbol - centered, muted
      checkPage(45);
      y += 14;
      pdf.setTextColor(120, 120, 120);
      pdf.setFontSize(12);
      const symbolText = symbolToPdf(line.content);
      const symbolWidth = pdf.getTextWidth(symbolText);
      pdf.text(symbolText, (pageWidth - symbolWidth) / 2, y);
      y += 22;
      pdf.setFontSize(11);
    } else {
      // Text line with method color
      const typography = line.methodHint
        ? METHOD_TYPOGRAPHY[line.methodHint] || DEFAULT_TYPOGRAPHY
        : DEFAULT_TYPOGRAPHY;

      const color = hexToRgb(typography.glowColor);
      // Mix with white for settled look (70% color, 30% white)
      const mixedColor = {
        r: Math.round(color.r * 0.7 + 232 * 0.3),
        g: Math.round(color.g * 0.7 + 232 * 0.3),
        b: Math.round(color.b * 0.7 + 232 * 0.3),
      };
      pdf.setTextColor(mixedColor.r, mixedColor.g, mixedColor.b);

      // Organic indentation
      const baseIndent = line.depth * 1.5;
      let hash = 0;
      for (let i = 0; i < Math.min(line.content.length, 20); i++) {
        hash = ((hash << 5) - hash) + line.content.charCodeAt(i);
        hash |= 0;
      }
      const variance = (Math.abs(hash) % 5) * 0.3;
      const indent = (baseIndent + variance) * 6;

      const text = textToPdf(line.content);
      const wrappedLines = pdf.splitTextToSize(text, contentWidth - indent);

      checkPage(wrappedLines.length * lineHeight);

      for (const wLine of wrappedLines) {
        pdf.text(wLine, margin + indent, y);
        y += lineHeight;
      }
    }
  }

  // Spirit attribution at the bottom
  if (seenMethods.size > 0) {
    y += 25;
    checkPage(seenMethods.size * 16 + 40);

    // Separator
    pdf.setDrawColor(40, 40, 40);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 18;

    pdf.setFontSize(8);
    pdf.setTextColor(80, 80, 80);
    pdf.text('spirits consulted:', margin, y);
    y += 14;

    for (const methodId of seenMethods) {
      const typography = METHOD_TYPOGRAPHY[methodId];
      if (typography) {
        const color = hexToRgb(typography.glowColor);

        // Color square
        pdf.setFillColor(color.r, color.g, color.b);
        pdf.rect(margin, y - 7, 7, 7, 'F');

        // Filename
        pdf.setTextColor(color.r, color.g, color.b);
        pdf.text(`${methodId}.md`, margin + 12, y);
        y += 12;
      }
    }
  }

  // Save
  pdf.save(`trace-${Date.now()}.pdf`);
}
