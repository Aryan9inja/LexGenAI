/**
 * PDF Generation Utility
 * 
 * Converts contract documents to PDF format for download.
 * Supports both plain text and risk-highlighted versions.
 * 
 * INTEGRATION WITH CENTRALIZED STATE:
 * - Uses document data from `getDocumentData()` in dashboard
 * - Automatically includes risk analysis if available
 * - Generates clean, formatted PDFs with proper pagination
 * 
 * FEATURES:
 * - Extracts actual document title from AI-generated contract (not user input)
 * - Professional formatting with centered title and clear sections
 * - Automatic heading detection and bold formatting
 * - Risk analysis appendix with detailed explanations
 * - Color-coded risk levels (high/medium/low)
 * - Automatic page numbering
 * - No metadata clutter (no "Generated" date or status)
 * 
 * USAGE:
 * ```typescript
 * import { downloadContractPDF } from '@/lib/pdf-utils';
 * const docData = getDocumentData();
 * downloadContractPDF(docData, includeRisks);
 * ```
 */

import { jsPDF } from 'jspdf';

type RiskClause = {
  text: string;
  riskLevel: "high" | "medium" | "low";
  explanation: string;
  suggestion: string;
};

type DocumentData = {
  id: string;
  title: string;
  description?: string;
  text: string;
  risks: RiskClause[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Strip HTML tags from text and normalize spacing
 */
function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  let text = tmp.textContent || tmp.innerText || '';
  
  // Normalize spacing: replace multiple spaces with single space
  text = text.replace(/[ \t]+/g, ' ');
  // Normalize line breaks: max 2 consecutive newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  // Remove spaces at line starts/ends
  text = text.split('\n').map(line => line.trim()).join('\n');
  
  return text.trim();
}

/**
 * Extract the actual document title from the contract text
 * The AI-generated contract typically starts with a proper title like "NON-DISCLOSURE AGREEMENT"
 */
function extractDocumentTitle(text: string): { title: string; remainingText: string } {
  const cleanText = stripHtml(text);
  const lines = cleanText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return { title: 'Contract Document', remainingText: text };
  }
  
  // The first non-empty line is typically the document title
  // It's usually in ALL CAPS or Title Case and relatively short
  const firstLine = lines[0].trim();
  
  // Check if first line looks like a title (short, no punctuation at end)
  const isTitle = firstLine.length < 100 && 
                  !firstLine.endsWith('.') && 
                  !firstLine.endsWith(',') &&
                  firstLine.length > 3;
  
  if (isTitle) {
    // Remove the title from the text and return both
    const titlePattern = new RegExp(`^\\s*${firstLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    const remainingText = cleanText.replace(titlePattern, '').trim();
    return { title: firstLine, remainingText };
  }
  
  return { title: 'Contract Document', remainingText: cleanText };
}

/**
 * Format date for display
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString();
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Add text with word wrapping to PDF with improved formatting
 */
function addWrappedText(
  doc: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  maxWidth: number,
  lineHeight: number = 6
): number {
  // Use justify alignment and better spacing
  const lines = doc.splitTextToSize(text, maxWidth);
  
  lines.forEach((line: string, index: number) => {
    doc.text(line, x, y + (index * lineHeight));
  });
  
  return y + (lines.length * lineHeight);
}

/**
 * Check if text is a section heading
 */
function isHeading(text: string): boolean {
  const trimmed = text.trim();
  
  // Empty or very short text is not a heading
  if (trimmed.length < 3) return false;
  
  // Check various heading patterns
  const patterns = [
    trimmed.length < 50 && trimmed === trimmed.toUpperCase(), // All caps and short
    /^(ARTICLE|SECTION|CLAUSE|RECITALS?|WHEREAS|PARTIES|DEFINITIONS?|TERMS?|CONDITIONS?|OBLIGATIONS?|TERMINATION|SIGNATURES?|APPENDIX|SCHEDULE|EXHIBIT)\s*\d*:?/i.test(trimmed), // Common legal headings
    /^\d+\.\s*[A-Z]/.test(trimmed), // Numbered heading like "1. HEADING"
    trimmed.endsWith(':') && trimmed.length < 80, // Ends with colon and short enough
  ];
  
  return patterns.some(p => p);
}

/**
 * Check if text is a list item
 */
function isListItem(text: string): boolean {
  const trimmed = text.trim();
  return /^(\d+\.|[a-z]\)|\(([a-z]|[ivx]+)\)|[-•*])\s+/i.test(trimmed);
}

/**
 * Generate PDF with plain contract text (no risk highlights)
 */
export function generateBasicContractPDF(
  documentData: DocumentData
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = margin + 10;

  // Extract the actual document title from contract text
  const { title: extractedTitle, remainingText } = extractDocumentTitle(documentData.text);

  // Document Title - centered and prominent
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(extractedTitle.toUpperCase(), maxWidth);
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  });
  
  yPosition += 5;
  
  // Horizontal line
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 12;

  // Contract text
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  
  // Process line by line to preserve document structure
  const lines = remainingText.split('\n');
  let previousLineWasEmpty = false;
  
  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin + 10;
      previousLineWasEmpty = false;
    }
    
    // Empty line - add spacing
    if (!trimmed) {
      if (!previousLineWasEmpty) {
        yPosition += 4; // Spacing for paragraph break
      }
      previousLineWasEmpty = true;
      return;
    }
    
    previousLineWasEmpty = false;
    
    // Determine line type and format accordingly
    if (isHeading(trimmed)) {
      // HEADING
      yPosition += 2; // Extra space before headings
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      yPosition = addWrappedText(doc, trimmed, margin, yPosition, maxWidth, 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      yPosition += 3; // Space after heading
    } else if (isListItem(trimmed)) {
      // LIST ITEM - indent slightly
      const indentMargin = margin + 5;
      const indentMaxWidth = maxWidth - 5;
      yPosition = addWrappedText(doc, trimmed, indentMargin, yPosition, indentMaxWidth, 5.5);
      yPosition += 1.5;
    } else {
      // REGULAR LINE
      yPosition = addWrappedText(doc, trimmed, margin, yPosition, maxWidth, 5.5);
      yPosition += 1.5; // Small space between lines
    }
  });

  // Download with extracted title
  const fileName = `${extractedTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
}

/**
 * Generate PDF with risk analysis included
 */
export function generateContractWithRisksPDF(
  documentData: DocumentData
): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let yPosition = margin + 10;

  // Extract the actual document title from contract text
  const { title: extractedTitle, remainingText } = extractDocumentTitle(documentData.text);

  // Document Title - centered and prominent
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(extractedTitle.toUpperCase(), maxWidth);
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  });
  
  yPosition += 3;
  
  // Risk warning badge if risks exist
  if (documentData.risks.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    const riskText = `⚠ ${documentData.risks.length} RISK${documentData.risks.length !== 1 ? 'S' : ''} IDENTIFIED`;
    doc.text(riskText, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
  }
  
  // Horizontal line
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.setTextColor(0);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 12;

  // Contract text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  // Process line by line to preserve document structure
  const lines = remainingText.split('\n');
  let previousLineWasEmpty = false;
  
  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin + 10;
      previousLineWasEmpty = false;
    }
    
    // Empty line - add spacing
    if (!trimmed) {
      if (!previousLineWasEmpty) {
        yPosition += 4; // Spacing for paragraph break
      }
      previousLineWasEmpty = true;
      return;
    }
    
    previousLineWasEmpty = false;
    
    // Determine line type and format accordingly
    if (isHeading(trimmed)) {
      // HEADING
      yPosition += 2; // Extra space before headings
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      yPosition = addWrappedText(doc, trimmed, margin, yPosition, maxWidth, 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      yPosition += 3; // Space after heading
    } else if (isListItem(trimmed)) {
      // LIST ITEM
      const indentMargin = margin + 5;
      const indentMaxWidth = maxWidth - 5;
      yPosition = addWrappedText(doc, trimmed, indentMargin, yPosition, indentMaxWidth, 5.5);
      yPosition += 1.5;
    } else {
      // REGULAR LINE
      yPosition = addWrappedText(doc, trimmed, margin, yPosition, maxWidth, 5.5);
      yPosition += 1.5; // Small space between lines
    }
  });

  // Risk Analysis Section
  if (documentData.risks.length > 0) {
    // New page for risks
    doc.addPage();
    yPosition = margin + 10;
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('RISK ANALYSIS', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    const riskSummary = `${documentData.risks.length} potential risk${documentData.risks.length !== 1 ? 's' : ''} identified in this contract`;
    doc.text(riskSummary, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;
    
    // List each risk
    documentData.risks.forEach((risk, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin + 10;
      }
      
      // Add separator line before each risk (except first)
      if (index > 0) {
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
      }
      
      // Risk header with background
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      
      // Color based on risk level
      if (risk.riskLevel === 'high') {
        doc.setTextColor(220, 38, 38);
      } else if (risk.riskLevel === 'medium') {
        doc.setTextColor(2, 132, 199);
      } else {
        doc.setTextColor(202, 138, 4);
      }
      
      const riskHeader = `RISK ${index + 1} - ${risk.riskLevel.toUpperCase()} SEVERITY`;
      doc.text(riskHeader, margin, yPosition);
      yPosition += 7;
      
      // Risk text (quoted)
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.setFont('helvetica', 'italic');
      const riskTextPreview = risk.text.length > 200 ? `"${risk.text.substring(0, 200)}..."` : `"${risk.text}"`;
      yPosition = addWrappedText(doc, riskTextPreview, margin + 3, yPosition, maxWidth - 3, 5.5);
      yPosition += 6;
      
      // Explanation section
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.setFontSize(10);
      doc.text('⚠ Why This Is Risky:', margin, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      yPosition = addWrappedText(doc, risk.explanation, margin + 3, yPosition, maxWidth - 3, 5.5);
      yPosition += 6;
      
      // Suggestion section
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('✓ Recommended Action:', margin, yPosition);
      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      yPosition = addWrappedText(doc, risk.suggestion, margin + 3, yPosition, maxWidth - 3, 5.5);
      yPosition += 10;
    });
  }


  // Download with extracted title
  const fileName = `${extractedTitle.replace(/[^a-z0-9]/gi, '_')}_with_risks_${Date.now()}.pdf`;
  doc.save(fileName);
}

/**
 * Main function to download contract as PDF
 */
export function downloadContractPDF(
  documentData: DocumentData,
  includeRisks: boolean = true
): void {
  if (!documentData || !documentData.text) {
    console.error('Cannot generate PDF: No document data provided');
    return;
  }

  if (includeRisks && documentData.risks.length > 0) {
    generateContractWithRisksPDF(documentData);
  } else {
    generateBasicContractPDF(documentData);
  }
}
