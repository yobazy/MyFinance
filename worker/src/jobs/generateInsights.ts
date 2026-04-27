import type { SupabaseClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { getUserAnthropicKey } from '../lib/getUserAnthropicKey';

type JobRow = {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
};

export async function handleGenerateInsightsJob(params: {
  supabase: SupabaseClient;
  job: JobRow;
}): Promise<{ ok: boolean }> {
  const { supabase, job } = params;
  const userId = String(job.user_id ?? '');
  if (!userId) throw new Error('generate_insights job missing user_id');

  const anthropicApiKey = await getUserAnthropicKey(supabase, userId);
  if (!anthropicApiKey) throw new Error('No Anthropic API key configured for this user');

  const now = new Date();
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of current month
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // first day of current month
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  // Fetch current month spending by category
  const { data: currentRows } = await supabase
    .from('transactions')
    .select('amount, categories(name)')
    .eq('user_id', userId)
    .gte('date', fmt(periodStart))
    .lte('date', fmt(periodEnd))
    .not('category_id', 'is', null);

  // Fetch previous month spending by category
  const { data: prevRows } = await supabase
    .from('transactions')
    .select('amount, categories(name)')
    .eq('user_id', userId)
    .gte('date', fmt(prevStart))
    .lte('date', fmt(prevEnd))
    .not('category_id', 'is', null);

  const aggregateByCategory = (rows: { amount: number; categories: { name: string } | null }[]) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      const name = row.categories?.name ?? 'Uncategorized';
      map.set(name, (map.get(name) ?? 0) + Math.abs(row.amount));
    }
    return map;
  };

  type AggRow = { amount: number; categories: { name: string } | null };
  const currentTotals = aggregateByCategory(
    (currentRows ?? []) as unknown as AggRow[],
  );
  const prevTotals = aggregateByCategory(
    (prevRows ?? []) as unknown as AggRow[],
  );

  const currentMonth = periodStart.toLocaleString('default', { month: 'long', year: 'numeric' });
  const prevMonth = prevStart.toLocaleString('default', { month: 'long', year: 'numeric' });

  const formatTable = (map: Map<string, number>) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `  ${cat}: $${amt.toFixed(2)}`)
      .join('\n') || '  (no data)';

  const prompt = `You are a friendly personal finance assistant. Write a concise 3–5 sentence spending summary for the user.

${currentMonth} spending by category:
${formatTable(currentTotals)}

${prevMonth} spending by category (previous month):
${formatTable(prevTotals)}

Focus on: total spend, biggest categories, notable increases or decreases vs last month. Be conversational and specific with dollar amounts. Do not use bullet points or headers — write flowing prose.`;

  const client = new Anthropic({ apiKey: anthropicApiKey });
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const narrative =
    response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';

  if (!narrative) throw new Error('AI returned empty narrative');

  const { error } = await supabase.from('spending_insights').insert({
    user_id: userId,
    period_start: fmt(periodStart),
    period_end: fmt(periodEnd),
    narrative,
    metadata: {
      current_totals: Object.fromEntries(currentTotals),
      prev_totals: Object.fromEntries(prevTotals),
    },
  });

  if (error) throw error;

  return { ok: true };
}
