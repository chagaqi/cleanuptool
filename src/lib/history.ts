import { supabase } from './supabase';
import type { ProcessedResult } from './csvProcessor';

export type ProcessingRun = {
  id: string;
  user_id: string;
  run_name: string;
  file_names: string[];
  total_ingested: number;
  duplicates_removed: number;
  leads_with_email: number;
  leads_website_no_email: number;
  leads_no_website: number;
  master_list_count: number;
  created_at: string;
};

export async function saveProcessingRun(
  userId: string,
  fileNames: string[],
  result: ProcessedResult
): Promise<ProcessingRun> {
  const runName = fileNames.length === 1
    ? fileNames[0].replace(/\.csv$/i, '')
    : `${fileNames.length} files`;

  const { data, error } = await supabase
    .from('processing_runs')
    .insert({
      user_id: userId,
      run_name: runName,
      file_names: fileNames,
      total_ingested: result.totalIngested,
      duplicates_removed: result.duplicatesRemoved,
      leads_with_email: result.leadsWithEmail.length,
      leads_website_no_email: result.leadsWebsiteNoEmail.length,
      leads_no_website: result.leadsNoWebsite.length,
      master_list_count: result.masterList.length,
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data!;
}

export async function fetchProcessingHistory(userId: string): Promise<ProcessingRun[]> {
  const { data, error } = await supabase
    .from('processing_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
