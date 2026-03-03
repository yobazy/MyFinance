import { createSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { calculateConfidence } from '../../../../lib/confidenceCalculator';

export const runtime = 'nodejs';
export const maxDuration = 60;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type ApplyRulesMode = 'auto' | 'suggestions_only';

type TxRow = {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category_id: string | null;
  suggested_category_id: string | null;
};

type RuleRow = {
  id: string;
  name: string;
  rule_type: string;
  pattern: string;
  conditions: Record<string, unknown>;
  category_id: string;
  priority: number;
  is_active: boolean;
  case_sensitive: boolean;
  created_by: string;
  match_count: number;
};

type Suggestion = {
  categoryId: string;
  confidence: number;
  rule: RuleRow;
};

function normalizeAmount(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function buildSuggestionForRule(
  supabase: any,
  userId: string,
  rule: RuleRow,
  transactionDescription: string
): Promise<Suggestion> {
  // Calculate dynamic confidence based on historical performance
  const confidence = await calculateConfidence(
    supabase,
    userId,
    rule.id,
    transactionDescription,
    rule.created_by,
    rule.match_count || 0
  );

  return {
    categoryId: rule.category_id,
    confidence,
    rule,
  };
}

function ruleMatches(tx: TxRow, rule: RuleRow): boolean {
  const descriptionRaw = tx.description ?? '';
  const amount = Math.abs(normalizeAmount(tx.amount));

  let searchDescription = descriptionRaw;
  let searchPattern = rule.pattern;

  if (!rule.case_sensitive) {
    searchDescription = searchDescription.toUpperCase();
    searchPattern = searchPattern.toUpperCase();
  }

  switch (rule.rule_type) {
    case 'keyword': {
      const rawKeywords = rule.pattern.split(',');
      let keywords = rawKeywords.map((k) => k.trim()).filter(Boolean);
      if (!rule.case_sensitive) {
        keywords = keywords.map((k) => k.toUpperCase());
      }
      return keywords.some((kw) => kw && searchDescription.includes(kw));
    }
    case 'contains':
      return searchPattern.length > 0 && searchDescription.includes(searchPattern);
    case 'exact':
      return searchDescription === searchPattern;
    case 'amount_range': {
      try {
        const cond = (rule.conditions ?? {}) as {
          min?: number;
          max?: number;
        };
        const min = typeof cond.min === 'number' ? cond.min : 0;
        const max = typeof cond.max === 'number' ? cond.max : Number.POSITIVE_INFINITY;
        return amount >= min && amount <= max;
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

async function getBestSuggestion(
  supabase: any,
  userId: string,
  tx: TxRow,
  rules: RuleRow[]
): Promise<Suggestion | null> {
  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (ruleMatches(tx, rule)) {
      return await buildSuggestionForRule(supabase, userId, rule, tx.description);
    }
  }
  return null;
}

export async function POST(req: Request) {
  const supabase = createSupabaseAdminClient();

  const authz = req.headers.get('authorization') ?? '';
  const token = authz.toLowerCase().startsWith('bearer ')
    ? authz.slice('bearer '.length).trim()
    : '';

  if (!token) return json(401, { error: 'Missing Bearer token' });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr) return json(401, { error: userErr.message });
  const userId = userData.user?.id;
  if (!userId) return json(401, { error: 'Invalid token' });

  // For now we always operate in "suggestions only" mode. The client still sends a
  // `mode` field for future extensibility, but we do not auto-apply categories here.
  let _payload: { mode?: string } = {};
  try {
    _payload = (await req.json()) as { mode?: string };
  } catch {
    _payload = {};
  }

  const { data: txRows, error: txErr } = await supabase
    .from('transactions')
    .select('id,user_id,description,amount,category_id,suggested_category_id')
    .eq('user_id', userId)
    .is('category_id', null)
    .limit(5000);

  if (txErr) return json(500, { error: txErr.message });

  const transactions = (txRows ?? []) as TxRow[];
  if (transactions.length === 0) {
    return json(200, { ok: true, rowsProcessed: 0 });
  }

  const { data: ruleRows, error: rulesErr } = await supabase
    .from('categorization_rules')
    .select(
      'id,name,rule_type,pattern,conditions,category_id,priority,is_active,case_sensitive,created_by,match_count',
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(500);

  if (rulesErr) return json(500, { error: rulesErr.message });

  const rules = (ruleRows ?? []) as RuleRow[];
  if (rules.length === 0) {
    return json(200, { ok: true, rowsProcessed: 0 });
  }

  // Check if client wants streaming progress updates
  const wantsStream = req.headers.get('accept')?.includes('text/event-stream');
  
  const updates: {
    id: string;
    category_id?: string | null;
    auto_categorized?: boolean;
    confidence_score?: number | null;
    suggested_category_id?: string | null;
  }[] = [];

  const ruleUsageInserts: {
    user_id: string;
    rule_id: string;
    transaction_id: string;
    confidence_score: number;
    was_applied: boolean;
  }[] = [];

  const totalTransactions = transactions.length;
  let processedCount = 0;
  let matchedCount = 0;

  // If streaming, create a ReadableStream to send progress updates
  if (wantsStream) {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
          const sendProgress = (current: number, total: number, matched: number) => {
            const progress = Math.round((current / total) * 100);
            const data = JSON.stringify({
              type: 'progress',
              current,
              total,
              matched,
              progress,
              message: `Categorizing transaction ${current} of ${total}${matched > 0 ? ` (${matched} with suggestions so far)` : ''}`,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          };

        try {
          // Send initial progress
          sendProgress(0, totalTransactions, 0);

          for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            const suggestion = await getBestSuggestion(supabase, userId, tx, rules);
            
            processedCount++;
            
            if (suggestion) {
              matchedCount++;
              const { categoryId, confidence, rule } = suggestion;

              updates.push({
                id: tx.id,
                suggested_category_id: categoryId,
                confidence_score: confidence,
              });
              ruleUsageInserts.push({
                user_id: userId,
                rule_id: rule.id,
                transaction_id: tx.id,
                confidence_score: confidence,
                was_applied: false,
              });
            }

            // Send progress updates at reasonable intervals
            // For small batches: every transaction
            // For medium batches: every 10 transactions
            // For large batches: every 1% or every 50 transactions, whichever is more frequent
            const updateInterval = totalTransactions < 100 
              ? 1 
              : Math.max(10, Math.min(50, Math.floor(totalTransactions / 100)));
            
            if (i % updateInterval === 0 || i === transactions.length - 1) {
              sendProgress(processedCount, totalTransactions, matchedCount);
            }
          }

          // Send final progress
          sendProgress(totalTransactions, totalTransactions, matchedCount);
          
          // Now do the database updates
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'status', message: 'Saving results...' })}\n\n`));

          if (updates.length > 0) {
            for (const row of updates) {
              const { id, ...rest } = row;
              const { error: updErr } = await supabase
                .from('transactions')
                .update(rest)
                .eq('id', id);
              if (updErr) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: updErr.message })}\n\n`));
                controller.close();
                return;
              }
            }
          }

          if (ruleUsageInserts.length > 0) {
            const { error: usageErr } = await supabase.from('rule_usage').insert(ruleUsageInserts);
            if (usageErr) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: usageErr.message })}\n\n`));
              controller.close();
              return;
            }

            const uniqueRuleIds = [...new Set(ruleUsageInserts.map((ru) => ru.rule_id))];
            for (const ruleId of uniqueRuleIds) {
              try {
                await supabase.rpc('increment_rule_match_count', { rule_id: ruleId });
              } catch {
                const { data: rule } = await supabase
                  .from('categorization_rules')
                  .select('match_count')
                  .eq('id', ruleId)
                  .single();
                if (rule) {
                  await supabase
                    .from('categorization_rules')
                    .update({
                      match_count: (rule.match_count || 0) + ruleUsageInserts.filter((ru) => ru.rule_id === ruleId).length,
                      last_matched: new Date().toISOString(),
                    })
                    .eq('id', ruleId);
                }
              }
            }
          }

          // Send final result
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            ok: true, 
            rowsProcessed: totalTransactions,
            matched: matchedCount,
          })}\n\n`));
          controller.close();
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error?.message || 'Unknown error' 
          })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // Non-streaming path (original behavior)
  for (const tx of transactions) {
    const suggestion = await getBestSuggestion(supabase, userId, tx, rules);
    if (!suggestion) continue;

    const { categoryId, confidence, rule } = suggestion;

    // Suggestions only: never change category_id here, only suggested_category_id.
    updates.push({
      id: tx.id,
      suggested_category_id: categoryId,
      confidence_score: confidence,
    });
    ruleUsageInserts.push({
      user_id: userId,
      rule_id: rule.id,
      transaction_id: tx.id,
      confidence_score: confidence,
      was_applied: false,
    });
  }

  if (updates.length > 0) {
    // We only ever update existing transactions (selected above), so use per-row UPDATE
    // instead of upsert to avoid accidental inserts missing required columns like user_id.
    for (const row of updates) {
      const { id, ...rest } = row;
      const { error: updErr } = await supabase
        .from('transactions')
        .update(rest)
        .eq('id', id);
      if (updErr) return json(500, { error: updErr.message });
    }
  }

  if (ruleUsageInserts.length > 0) {
    const { error: usageErr } = await supabase.from('rule_usage').insert(ruleUsageInserts);
    if (usageErr) return json(500, { error: usageErr.message });

    // Update match_count for rules that were used
    const uniqueRuleIds = [...new Set(ruleUsageInserts.map((ru) => ru.rule_id))];
    for (const ruleId of uniqueRuleIds) {
      try {
        await supabase.rpc('increment_rule_match_count', { rule_id: ruleId });
      } catch {
        // Fallback: manually increment if function doesn't exist
        const { data: rule } = await supabase
          .from('categorization_rules')
          .select('match_count')
          .eq('id', ruleId)
          .single();
        if (rule) {
          await supabase
            .from('categorization_rules')
            .update({
              match_count: (rule.match_count || 0) + ruleUsageInserts.filter((ru) => ru.rule_id === ruleId).length,
              last_matched: new Date().toISOString(),
            })
            .eq('id', ruleId);
        }
      }
    }
  }

  return json(200, { ok: true, rowsProcessed: transactions.length });
}

