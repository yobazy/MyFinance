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
 * Parse Amex CSV files in YearEndSummary format.
 * Format: Category,Card Member,Account Number,Sub-Category,Date,Month-Billed,Transaction,Charges $,Credits $
 * Date format: DD/MM/YYYY
 */
function parseAmexCsv(params: {
  buffer: Buffer;
  userId: string;
  accountId: string;
  source?: string;
}): NormalizedTransaction[] {
  const text = params.buffer.toString('utf-8');
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  if (lines.length === 0) return [];

  // Parse header row
  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim());
  
  // Find column indices
  const dateIdx = headers.findIndex((h) => normalizeHeader(h) === 'date');
  const transactionIdx = headers.findIndex((h) => normalizeHeader(h) === 'transaction');
  const chargesIdx = headers.findIndex((h) => normalizeHeader(h).includes('charges'));
  const creditsIdx = headers.findIndex((h) => normalizeHeader(h).includes('credits'));

  if (dateIdx === -1 || transactionIdx === -1 || (chargesIdx === -1 && creditsIdx === -1)) {
    return [];
  }

  const out: NormalizedTransaction[] = [];

  // Process data rows
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || line.trim().length === 0) continue;

    // Parse CSV line (handling quoted fields)
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j += 1) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim()); // Add last field

    if (fields.length <= Math.max(dateIdx, transactionIdx, chargesIdx, creditsIdx)) continue;

    // Parse date (DD/MM/YYYY format)
    const dateStr = fields[dateIdx]?.trim();
    if (!dateStr) continue;
    
    // Try to parse DD/MM/YYYY
    const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    let date: string | null = null;
    if (dateMatch) {
      const [, dd, mm, yyyy] = dateMatch;
      date = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    } else {
      // Fallback to Date.parse
      const parsed = Date.parse(dateStr);
      if (!Number.isNaN(parsed)) {
        const d = new Date(parsed);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        date = `${yyyy}-${mm}-${dd}`;
      }
    }
    if (!date) continue;

    // Get transaction description
    const description = fields[transactionIdx]?.trim();
    if (!description) continue;

    // Calculate amount to match Plaid / app semantics:
    // - Charges are spending (positive outflow)
    // - Credits are refunds/payments (negative inflow)
    const chargesStr = chargesIdx >= 0 ? fields[chargesIdx]?.trim() : '';
    const creditsStr = creditsIdx >= 0 ? fields[creditsIdx]?.trim() : '';
    const charges = toNumber(chargesStr) ?? 0;
    const credits = toNumber(creditsStr) ?? 0;
    const amount = charges - credits; // Positive = charge, negative = credit/refund

    if (amount === 0) continue; // Skip zero-amount transactions

    const descriptionUpper = description.toUpperCase();
    const source = params.source ?? 'Amex';

    // Build raw object for fingerprint salt
    const rawObj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (fields[idx]) {
        rawObj[normalizeHeader(h)] = fields[idx];
      }
    });

    const fingerprint = fingerprintTransaction({
      userId: params.userId,
      accountId: params.accountId,
      source,
      date,
      amount: String(amount),
      description: descriptionUpper,
      salt: JSON.stringify(rawObj),
    });

    out.push({
      user_id: params.userId,
      account_id: params.accountId,
      date,
      description: descriptionUpper,
      amount,
      source,
      merchant: null,
      raw: rawObj,
      fingerprint,
    });
  }

  return out;
}

/**
 * Detect if buffer is CSV or Excel and parse accordingly.
 * Supports:
 * - Excel files (.xls, .xlsx) - with optional 11-row preamble
 * - CSV files (YearEndSummary format) - header row starts immediately
 */
export async function parseAmexXlsx(params: {
  buffer: Buffer;
  userId: string;
  accountId: string;
  source?: string;
}): Promise<NormalizedTransaction[]> {
  // Try to detect if it's CSV by checking if it starts with text that looks like CSV headers
  const firstBytes = params.buffer.slice(0, Math.min(100, params.buffer.length));
  const textStart = firstBytes.toString('utf-8', 0, Math.min(100, firstBytes.length));
  
  // Check if it looks like CSV (starts with text headers, not Excel binary signature)
  // Excel files start with specific byte sequences (PK for .xlsx, D0 CF for .xls)
  const isLikelyCsv = 
    textStart.includes('Category') && 
    textStart.includes('Card Member') && 
    textStart.includes('Date') &&
    textStart.includes('Transaction') &&
    !textStart.startsWith('PK') && // .xlsx signature
    !textStart.startsWith('\xD0\xCF'); // .xls signature

  if (isLikelyCsv) {
    return parseAmexCsv(params);
  }

  // Otherwise, try to parse as Excel
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

