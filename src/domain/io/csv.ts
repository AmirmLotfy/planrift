/**
 * CSV export with RFC 4180 quoting and spreadsheet formula-injection protection: any cell
 * starting with =, +, -, @, tab or carriage return is prefixed with an apostrophe.
 */

import type { ComparisonColumn } from '../revision/compare';

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: readonly (readonly unknown[])[]): string {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** One row per (column, document, element reason). */
export function impactLedgerCsv(columns: readonly ComparisonColumn[]): string {
  const rows: unknown[][] = [['Scenario', 'Lifecycle', 'Document', 'Title', 'Issued revision', 'Element', 'Change', 'Link note', 'Status']];
  for (const column of columns) {
    for (const impact of column.impacts) {
      for (const reason of impact.reasons) {
        rows.push([column.label, column.lifecycle, impact.documentId, impact.title, impact.revision, reason.elementId, reason.description, reason.linkNote, impact.status]);
      }
    }
  }
  return toCsv(rows);
}
