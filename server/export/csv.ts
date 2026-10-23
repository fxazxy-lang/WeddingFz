export type Cell = string | number | null | undefined;

/** Neutralise values that spreadsheet apps would execute as formulas. */
export function safeCell(value: Cell): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /^[=@\t\r]/.test(text) || /^[+-](?![\d\s])/.test(text) ? `'${text}` : text;
}

/**
 * RFC 4180 CSV with a UTF-8 BOM so Excel opens Khmer text correctly.
 */
export function toCsv(header: string[], rows: Cell[][]): string {
  const escape = (value: Cell) => {
    const text = safeCell(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [header, ...rows].map((row) => row.map(escape).join(','));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
