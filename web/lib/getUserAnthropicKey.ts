import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from './supabaseAdmin';

export async function getUserAnthropicKey(userId: string): Promise<string | null>;
export async function getUserAnthropicKey(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null>;
export async function getUserAnthropicKey(
  supabaseOrUserId: SupabaseClient | string,
  maybeUserId?: string,
): Promise<string | null> {
  const supabase =
    typeof supabaseOrUserId === 'string'
      ? createSupabaseAdminClient()
      : supabaseOrUserId;
  const userId = typeof supabaseOrUserId === 'string' ? supabaseOrUserId : maybeUserId;

  if (!userId) {
    throw new Error('userId is required');
  }

  const { data } = await supabase
    .from('user_settings')
    .select('anthropic_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  return (data as { anthropic_api_key?: string | null } | null)?.anthropic_api_key ?? null;
}
