import { supabase } from './supabase';

export type BlacklistRow = {
  domain: string;
  source: string;
  status: string;
  reasoning: string;
  created_at: string;
};

export type ScanResult = {
  added: { domain: string; source: string; status: string; reasoning: string }[];
  scanned: number;
  skipped: number;
  error?: string;
};

export async function fetchActiveBlacklist(): Promise<string[]> {
  const { data, error } = await supabase
    .from('blacklisted_domains')
    .select('domain')
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? []).map((r) => r.domain.toLowerCase());
}

export async function scanDomains(domains: string[]): Promise<ScanResult> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-domains`;
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ domains }),
  });
  const body = (await res.json()) as ScanResult;
  if (!res.ok) {
    throw new Error(body.error ?? `Scan failed (${res.status})`);
  }
  return body;
}

export async function setDomainStatus(
  domain: string,
  status: 'active' | 'reverted'
): Promise<void> {
  const { error } = await supabase
    .from('blacklisted_domains')
    .update({ status })
    .eq('domain', domain);
  if (error) throw error;
}
