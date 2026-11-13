import type { SupabaseClient } from '@supabase/supabase-js';

/** Reads the user's own Anthropic API key from `user_settings` (migration 015). */
export async function getUserAnthropicKey(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('anthropic_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  return (data as { anthropic_api_key?: string | null } | null)?.anthropic_api_key ?? null;
}
