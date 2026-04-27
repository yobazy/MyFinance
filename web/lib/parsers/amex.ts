import * as XLSX from 'xlsx';
import { fingerprintTransaction } from '../fingerprint';

export type NormalizedTransactionInsert = {
  user_id: string;
  account_id: string;
  date: string;
  description: string;
  amount: number;
  source: string;
  merchant?: string | null;
  raw: Record<string, unknown>;
  fingerprint: string;
};

function toIsoDate(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof value === 'number') {
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

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '_');
}

function findHeaderRowIdx(rows: unknown[][]): number | null {
  const hasRequired = (row: unknown[]) => {
    const keys = new Set(
      row
        .map((value) => normalizeHeader(String(value ?? '')))
        .filter((value) => value.length > 0),
    );
    return keys.has('date') && keys.has('description') && keys.has('amount');
  };

  const preferredIdx = 11;
  if (rows[preferredIdx] && hasRequired(rows[preferredIdx])) return preferredIdx;

  for (let i = 0; i < Math.min(rows.length, 50); i += 1) {
    const row = rows[i] ?? [];
    if (row.length > 0 && hasRequired(row)) return i;
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  const normalized = String(value).replace(/[$,]/g, '').trim();
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseAmexCsv(params: {
  buffer: Buffer;
  userId: string;
  accountId: string;
  source?: string;
}): NormalizedTransactionInsert[] {
  const text = params.buffer.toString('utf-8');
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map((header) => header.trim());
  const dateIdx = headers.findIndex((header) => normalizeHeader(header) === 'date');
  const transactionIdx = headers.findIndex((header) => normalizeHeader(header) === 'transaction');
  const chargesIdx = headers.findIndex((header) => normalizeHeader(header).includes('charges'));
  const creditsIdx = headers.findIndex((header) => normalizeHeader(header).includes('credits'));

  if (dateIdx === -1 || transactionIdx === -1 || (chargesIdx === -1 && creditsIdx === -1)) {
    return [];
  }

  const out: NormalizedTransactionInsert[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;

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
    fields.push(current.trim());

    if (fields.length <= Math.max(dateIdx, transactionIdx, chargesIdx, creditsIdx)) continue;

    const dateStr = fields[dateIdx]?.trim();
    if (!dateStr) continue;

    const dateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    let date: string | null = null;
    if (dateMatch) {
      const [, dd, mm, yyyy] = dateMatch;
      date = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    } else {
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

    const description = fields[transactionIdx]?.trim();
    if (!description) continue;

    const charges = chargesIdx >= 0 ? toNumber(fields[chargesIdx]?.trim()) ?? 0 : 0;
    const credits = creditsIdx >= 0 ? toNumber(fields[creditsIdx]?.trim()) ?? 0 : 0;
    const amount = charges - credits;
    if (amount === 0) continue;

    const descriptionUpper = description.toUpperCase();
    const source = params.source ?? 'Amex';
    const raw: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      if (fields[idx]) {
        raw[normalizeHeader(header)] = fields[idx];
      }
    });

    out.push({
      user_id: params.userId,
      account_id: params.accountId,
      date,
      description: descriptionUpper,
      amount,
      source,
      merchant: null,
      raw,
      fingerprint: fingerprintTransaction({
        userId: params.userId,
        accountId: params.accountId,
        source,
        date,
        amount: String(amount),
        description: descriptionUpper,
        salt: JSON.stringify(raw),
      }),
    });
  }

  return out;
}

export async function parseAmexXlsx(params: {
  buffer: Buffer;
  userId: string;
  accountId: string;
  source?: string;
}): Promise<NormalizedTransactionInsert[]> {
  const firstBytes = params.buffer.slice(0, Math.min(100, params.buffer.length));
  const textStart = firstBytes.toString('utf-8', 0, Math.min(100, firstBytes.length));
  const isLikelyCsv =
    textStart.includes('Category') &&
    textStart.includes('Card Member') &&
    textStart.includes('Date') &&
    textStart.includes('Transaction') &&
    !textStart.startsWith('PK') &&
    !textStart.startsWith('\xD0\xCF');

  if (isLikelyCsv) {
    return parseAmexCsv(params);
  }

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
  const colKeys = new Map<number, string>();
  headerRow.forEach((cellValue, colIdx) => {
    const raw = String(cellValue ?? '').trim();
    if (!raw) return;
    let key = normalizeHeader(raw);
    if (key === 'exchange_rate') key = 'exc_rate';
    colKeys.set(colIdx, key);
  });

  const out: NormalizedTransactionInsert[] = [];

  for (let rowIdx = headerRowIdx + 1; rowIdx < rows.length; rowIdx += 1) {
    const row = rows[rowIdx] ?? [];
    if (
      row.length === 0 ||
      row.every((value) => value === null || value === undefined || String(value).trim() === '')
    ) {
      continue;
    }

    const raw: Record<string, unknown> = {};
    for (const [colIdx, key] of colKeys.entries()) {
      raw[key] = row[colIdx] ?? null;
    }

    const date = toIsoDate(raw.date);
    const description = String(raw.description ?? '').trim();
    const amount = toNumber(raw.amount);
    const merchant = raw.merchant ? String(raw.merchant).trim() : null;

    if (!date || !description || amount === null) continue;

    const descriptionUpper = description.toUpperCase();

    out.push({
      user_id: params.userId,
      account_id: params.accountId,
      date,
      description: descriptionUpper,
      amount,
      source: params.source ?? 'Amex',
      merchant,
      raw,
      fingerprint: fingerprintTransaction({
        userId: params.userId,
        accountId: params.accountId,
        source: params.source ?? 'Amex',
        date,
        amount: String(amount),
        description: descriptionUpper,
        salt: JSON.stringify(raw),
      }),
    });
  }

  return out;
}

