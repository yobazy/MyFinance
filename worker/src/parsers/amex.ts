import ExcelJS from 'exceljs';
import { fingerprintTransaction } from '../fingerprint.js';
import type { NormalizedTransaction } from './types.js';

function toIsoDate(value: unknown): string | null {
  if (!value) return null;

  // ExcelJS can give Date objects, numbers (excel serial), or strings.
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof value === 'number') {
    // Excel serial date (days since 1900-01-00 with the leap-year bug).
    // This conversion matches common implementations.
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = value * 24 * 60 * 60 * 1000;
    const d = new Date(excelEpoch.getTime() + ms);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    // Try Date.parse first (handles ISO-ish)
    const parsed = Date.parse(s);
    if (!Number.isNaN(parsed)) {
      const d = new Date(parsed);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  return null;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const s = String(value).replace(/[$,]/g, '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Matches your previous Django ingestion assumption:
 * - the Amex export has 11 lines of preamble
 * - row 12 contains headers
 */
export async function parseAmexXlsx(params: {
  buffer: Buffer;
  userId: string;
  accountId: string;
  source?: string;
}): Promise<NormalizedTransaction[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(params.buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRowNumber = 12; // 1-indexed
  const headerRow = sheet.getRow(headerRowNumber);

  // Build column index -> key mapping
  const colKeys = new Map<number, string>();
  headerRow.eachCell((cell, colNumber) => {
    const raw = String(cell.value ?? '').trim();
    if (!raw) return;
    let key = normalizeHeader(raw);
    if (key === 'exchange_rate') key = 'exc_rate';
    colKeys.set(colNumber, key);
  });

  const out: NormalizedTransaction[] = [];

  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);

    // Stop if the row is completely empty
    if (!row || row.cellCount === 0) continue;

    const rawObj: Record<string, unknown> = {};
    row.eachCell((cell, colNumber) => {
      const key = colKeys.get(colNumber);
      if (!key) return;
      rawObj[key] = cell.value ?? null;
    });

    const date = toIsoDate(rawObj['date']);
    const description = String(rawObj['description'] ?? '').trim();
    const amount = toNumber(rawObj['amount']);
    const merchant = rawObj['merchant'] ? String(rawObj['merchant']).trim() : null;

    // Skip blank rows
    if (!date || !description || amount === null) continue;

    // Match old behavior: uppercase descriptions for consistency
    const descriptionUpper = description.toUpperCase();

    const fingerprint = fingerprintTransaction({
      userId: params.userId,
      accountId: params.accountId,
      source: params.source ?? 'Amex',
      date,
      amount: String(amount),
      description: descriptionUpper,
    });

    out.push({
      user_id: params.userId,
      account_id: params.accountId,
      date,
      description: descriptionUpper,
      amount,
      source: params.source ?? 'Amex',
      merchant,
      raw: rawObj,
      fingerprint,
    });
  }

  return out;
}

