/**
 * PDF Generator for Reconciliation Summary Report
 * Story 5-9: Uses dynamic imports for jsPDF (~29MB) to avoid bundle bloat
 *
 * IMPORTANT: This file should NOT have static imports for jsPDF or jspdf-autotable
 * All imports are done dynamically when generateReconciliationPDF is called
 */

import type { ReconciliationSummary } from '@/lib/validation/schemas';

/**
 * Generate PDF summary report for a completed reconciliation session
 * Uses dynamic imports to load jsPDF only when needed (29MB library)
 *
 * @param summary - Full reconciliation summary data
 * @returns Blob containing the PDF file
 */
export async function generateReconciliationPDF(
  summary: ReconciliationSummary
): Promise<Blob> {
  // Dynamic imports - only load when user clicks "Download PDF"
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let yPos = 20;

  // Helper to check if we need a new page
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > 280) {
      doc.addPage();
      yPos = 20;
    }
  };

  // ============================================================================
  // HEADER
  // ============================================================================
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SIS RECONCILIATION SUMMARY REPORT', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Session details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Session: ${summary.fileName}`, margin, yPos);
  yPos += 5;
  doc.text(`Completed: ${formatDateTime(summary.completedAt)}`, margin, yPos);
  yPos += 5;
  doc.text(`Completed By: ${summary.completedByEmail || summary.completedBy}`, margin, yPos);
  yPos += 5;
  doc.text(`Duration: ${summary.durationFormatted}`, margin, yPos);
  yPos += 10;

  // Divider line
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  // ============================================================================
  // OVERALL RESULTS
  // ============================================================================
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('OVERALL RESULTS', margin, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Records: ${summary.totalRecords}`, margin, yPos);
  yPos += 8;

  // Results table
  autoTable(doc, {
    startY: yPos,
    head: [['Matched', 'Conflicts Resolved', 'New in SIS', 'Missing from SIS']],
    body: [[
      summary.matchedCount.toString(),
      summary.conflictCount.toString(),
      summary.newInSISCount.toString(),
      summary.missingFromSISCount.toString(),
    ]],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246], fontSize: 9 },
    bodyStyles: { fontSize: 10, halign: 'center' },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ============================================================================
  // RESOLUTION BREAKDOWN
  // ============================================================================
  checkPageBreak(30);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('RESOLUTION BREAKDOWN', margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [['Action', 'Count']],
    body: [
      ['Accept SIS', summary.acceptedSISCount.toString()],
      ['Keep DAEP', summary.keptDAEPCount.toString()],
      ['New Placements Created', summary.newPlacementsCreated.toString()],
      ['Missing Reviewed', summary.missingReviewed.toString()],
    ],
    theme: 'striped',
    headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'center' } },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 12;

  // ============================================================================
  // DISCREPANCIES RESOLVED
  // ============================================================================
  if (summary.resolutions.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`DISCREPANCIES RESOLVED (${summary.resolutions.length})`, margin, yPos);
    yPos += 8;

    const discrepancyRows = summary.resolutions.map((r) => [
      r.studentName,
      formatType(r.discrepancyType),
      r.field || '—',
      r.sisValue || '—',
      r.daepValue || '—',
      r.accepted,
      r.note ? truncate(r.note, 15) : '',
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Student', 'Type', 'Field', 'SIS', 'DAEP', 'Accepted', 'Note']],
      body: discrepancyRows,
      theme: 'striped',
      headStyles: { fillColor: [234, 179, 8], textColor: [0, 0, 0], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 30 },
        6: { cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        // Add header on new pages
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Reconciliation Report - ${summary.fileName}`,
          pageWidth - margin,
          10,
          { align: 'right' }
        );
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 12;
  }

  // ============================================================================
  // MATCHED RECORDS
  // ============================================================================
  if (summary.matchedRecords.length > 0) {
    checkPageBreak(40);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`MATCHED RECORDS (${summary.matchedRecords.length})`, margin, yPos);
    yPos += 8;

    const matchedRows = summary.matchedRecords.map((r) => [
      r.studentName,
      r.homeCampus,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Student', 'Campus']],
      body: matchedRows,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 80 },
      },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ============================================================================
  // FOOTER
  // ============================================================================
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated by DAEP Management System | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

// ============================================================================
// HELPERS
// ============================================================================

function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    field_conflict: 'Conflict',
    new_in_sis: 'New in SIS',
    missing_from_sis: 'Missing',
    matched: 'Matched',
  };
  return labels[type] || type;
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 1) + '…';
}
