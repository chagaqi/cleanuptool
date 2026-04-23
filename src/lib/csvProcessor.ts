import Papa from 'papaparse';

export type Lead = {
  'Company Name': string;
  Website: string;
  'Address Line': string;
  Industry: string;
  Emails: string;
  Phones: string;
  Rating: string;
  'Review Count': number;
  city: string;
  __original: Record<string, string>;
};

const COLUMN_MAP: Record<string, keyof Omit<Lead, '__original'>> = {
  company: 'Company Name',
  url: 'Website',
  address: 'Address Line',
  category: 'Industry',
  emails: 'Emails',
  phones: 'Phones',
  google_rating: 'Rating',
  google_reviews: 'Review Count',
  city: 'city',
};

const SOURCE_EMAIL_KEY = 'emails';

const OUTPUT_HEADER_RENAMES: Record<string, string> = {
  google_reviews: 'custom_total_reviews',
  google_rating: 'custom_avg_reviews',
};

const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;

const JUNK_EXTENSIONS = [
  '.png.webp',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.pdf',
];

export type NormalizedRow = {
  'Company Name': string;
  Website: string;
  'Address Line': string;
  Industry: string;
  rawEmails: string;
  allEmails: string[];
  Phones: string;
  Rating: string;
  'Review Count': number;
  city: string;
  original: Record<string, string>;
};

export type IngestResult = {
  rows: NormalizedRow[];
  sourceColumns: string[];
};

export type ProcessedResult = {
  totalIngested: number;
  duplicatesRemoved: number;
  leadsWithEmail: Lead[];
  leadsWebsiteNoEmail: Lead[];
  leadsNoWebsite: Lead[];
  masterList: Lead[];
  sourceColumns: string[];
};

function stripQuotes(header: string): string {
  return header.replace(/"/g, '').trim();
}

function cleanString(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function extractEmailsFromCell(raw: string): string[] {
  if (!raw) return [];
  const matches = raw.match(EMAIL_REGEX) ?? [];
  return matches
    .map((e) => e.trim().toLowerCase())
    .filter((e) => !JUNK_EXTENSIONS.some((ext) => e.endsWith(ext)));
}

function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).toLowerCase();
}

function isBlacklisted(email: string, blacklist: string[]): boolean {
  const d = domainOf(email);
  if (!d) return false;
  return blacklist.some((bad) => d === bad || d.endsWith(`.${bad}`));
}

function parseReviewCount(v: unknown): number {
  const s = cleanString(v).replace(/,/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

type ParsedFile = {
  rows: Record<string, unknown>[];
  headers: string[];
};

function parseCsvFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => stripQuotes(h),
      complete: (results) =>
        resolve({
          rows: results.data,
          headers: (results.meta.fields ?? []).map(stripQuotes),
        }),
      error: (err) => reject(err),
    });
  });
}

function normalizeRow(raw: Record<string, unknown>): NormalizedRow {
  const mapped: Partial<Omit<Lead, '__original'>> = {};
  for (const [rawKey, internalKey] of Object.entries(COLUMN_MAP)) {
    if (rawKey in raw) {
      const val = raw[rawKey];
      if (internalKey === 'Review Count') {
        mapped[internalKey] = parseReviewCount(val);
      } else {
        (mapped as Record<string, string>)[internalKey] = cleanString(val);
      }
    }
  }

  const original: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) original[k] = cleanString(v);

  const rawEmails = (mapped.Emails as string) ?? '';

  return {
    'Company Name': (mapped['Company Name'] as string) ?? '',
    Website: (mapped.Website as string) ?? '',
    'Address Line': (mapped['Address Line'] as string) ?? '',
    Industry: (mapped.Industry as string) ?? '',
    rawEmails,
    allEmails: extractEmailsFromCell(rawEmails),
    Phones: (mapped.Phones as string) ?? '',
    Rating: (mapped.Rating as string) ?? '',
    'Review Count': (mapped['Review Count'] as number) ?? 0,
    city: (mapped.city as string) ?? '',
    original,
  };
}

export async function ingestFiles(files: File[]): Promise<IngestResult> {
  const allRaw: Record<string, unknown>[] = [];
  const seenCols = new Set<string>();
  const sourceColumns: string[] = [];
  for (const f of files) {
    const parsed = await parseCsvFile(f);
    for (const h of parsed.headers) {
      if (h && !seenCols.has(h)) {
        seenCols.add(h);
        sourceColumns.push(h);
      }
    }
    allRaw.push(...parsed.rows);
  }
  return { rows: allRaw.map(normalizeRow), sourceColumns };
}

export function collectUniqueDomains(rows: NormalizedRow[]): string[] {
  const seen = new Set<string>();
  for (const r of rows) {
    for (const email of r.allEmails) {
      const d = domainOf(email);
      if (d) seen.add(d);
    }
  }
  return Array.from(seen).sort();
}

export function finalizeRows(
  rows: NormalizedRow[],
  blacklist: string[],
  sourceColumns: string[]
): ProcessedResult {
  const totalIngested = rows.length;

  const expanded: Lead[] = [];
  for (const normalized of rows) {
    const emails = normalized.allEmails.filter(
      (e) => !isBlacklisted(e, blacklist)
    );
    const baseOriginal = normalized.original;

    const makeLead = (email: string): Lead => ({
      'Company Name': normalized['Company Name'],
      Website: normalized.Website,
      'Address Line': normalized['Address Line'],
      Industry: normalized.Industry,
      Phones: normalized.Phones,
      Rating: normalized.Rating,
      'Review Count': normalized['Review Count'],
      city: normalized.city,
      Emails: email,
      __original: { ...baseOriginal, [SOURCE_EMAIL_KEY]: email },
    });

    if (emails.length === 0) {
      expanded.push(makeLead(''));
    } else {
      for (const email of emails) expanded.push(makeLead(email));
    }
  }

  const seen = new Set<string>();
  const deduped: Lead[] = [];
  for (const lead of expanded) {
    const key = `${lead['Company Name'].toLowerCase()}|${lead.Emails.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(lead);
  }

  const duplicatesRemoved = expanded.length - deduped.length;
  deduped.sort((a, b) => b['Review Count'] - a['Review Count']);

  const leadsWithEmail: Lead[] = [];
  const leadsWebsiteNoEmail: Lead[] = [];
  const leadsNoWebsite: Lead[] = [];

  for (const lead of deduped) {
    const hasWebsite = lead.Website.length > 0;
    const hasEmail = lead.Emails.length > 0;
    if (!hasWebsite) leadsNoWebsite.push(lead);
    else if (hasEmail) leadsWithEmail.push(lead);
    else leadsWebsiteNoEmail.push(lead);
  }

  return {
    totalIngested,
    duplicatesRemoved,
    leadsWithEmail,
    leadsWebsiteNoEmail,
    leadsNoWebsite,
    masterList: deduped,
    sourceColumns,
  };
}

export function toFullCsv(leads: Lead[], sourceColumns: string[]): string {
  const outputHeaders = sourceColumns.map(
    (c) => OUTPUT_HEADER_RENAMES[c] ?? c
  );
  const rows = leads.map((lead) => {
    const row: Record<string, string> = {};
    for (const col of sourceColumns) {
      const outHeader = OUTPUT_HEADER_RENAMES[col] ?? col;
      row[outHeader] = lead.__original[col] ?? '';
    }
    return row;
  });
  return Papa.unparse(rows, { columns: outputHeaders });
}

export function toOutreachCsv(leads: Lead[]): string {
  const columns = [
    'company name',
    'custom_avg_reviews',
    'custom_total_reviews',
    'phone',
    'email',
    'city',
    'website',
  ];
  const rows = leads.map((lead) => ({
    'company name': lead['Company Name'],
    custom_avg_reviews: lead.Rating,
    custom_total_reviews: lead['Review Count'],
    phone: lead.Phones ? `'${lead.Phones}` : '',
    email: lead.Emails,
    city: lead.city,
    website: lead.Website,
  }));
  return Papa.unparse(rows, { columns });
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
