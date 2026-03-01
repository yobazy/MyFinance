import * as XLSX from 'xlsx';
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

function findHeaderRowIdx(rows: unknown[][]): number | null {
  const hasRequired = (row: unknown[]) => {
    const keys = new Set(
      row
        .map((v) => normalizeHeader(String(v ?? '')))
        .filter((s) => s.length > 0),
    );
    return keys.has('date') && keys.has('description') && keys.has('amount');
  };

  // Prefer the historical "row 12" convention if it matches, otherwise scan.
  const preferredIdx = 11; // row 12, 0-indexed
  if (rows[preferredIdx] && hasRequired(rows[preferredIdx])) return preferredIdx;

  for (let i = 0; i < Math.min(rows.length, 50); i += 1) {
    const row = rows[i] ?? [];
    if (row.length === 0) continue;
    if (hasRequired(row)) return i;
  }

  return null;
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
  const workbook = XLSX.read(params.buffer, { type: 'buffer', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  }) as unknown[][];

  const headerRowIdx = findHeaderRowIdx(rows);
  if (headerRowIdx === null) return [];
  const headerRow = rows[headerRowIdx] ?? [];

  // Build column index (0-indexed) -> key mapping
  const colKeys = new Map<number, string>();
  headerRow.forEach((cellValue, colIdx) => {
    const raw = String(cellValue ?? '').trim();
    if (!raw) return;
    let key = normalizeHeader(raw);
    if (key === 'exchange_rate') key = 'exc_rate';
    colKeys.set(colIdx, key);
  });

  const out: NormalizedTransaction[] = [];

  for (let r = headerRowIdx + 1; r < rows.length; r += 1) {
    const row = rows[r] ?? [];
    if (
      row.length === 0 ||
      row.every((v) => v === null || v === undefined || String(v).trim() === '')
    ) {
      continue;
    }

    const rawObj: Record<string, unknown> = {};
    for (const [colIdx, key] of colKeys.entries()) {
      rawObj[key] = row[colIdx] ?? null;
    }

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
      // Include the raw row to reduce collisions for "same day/same amount/same description"
      // cases. This must stay deterministic across imports.
      salt: JSON.stringify(rawObj),
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

