import { supabase } from './supabase';

export type Profile = {
  id: string;
  full_name: string;
  company: string;
  created_at: string;
  updated_at: string;
};

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Pick<Profile, 'full_name' | 'company'>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function ensureProfile(userId: string): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, full_name: '', company: '' })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data!;
}
