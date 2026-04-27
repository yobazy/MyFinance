import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateConfidence } from '../lib/confidenceCalculator';
import { aiSuggestCategory } from '../lib/aiCategorizer';

type JobRow = {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
};

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

type ApplyRulesMode = 'auto' | 'suggestions_only';

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
  supabase: SupabaseClient,
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
      // For now we ignore complex rule types; they can be added over time.
      return false;
  }
}

async function getBestSuggestion(
  supabase: SupabaseClient,
  userId: string,
  tx: TxRow,
  rules: RuleRow[]
): Promise<Suggestion | null> {
  // Rules are already sorted by priority desc.
  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (ruleMatches(tx, rule)) {
      return await buildSuggestionForRule(supabase, userId, rule, tx.description);
    }
  }
  return null;
}

export async function handleApplyRulesJob(params: {
  supabase: SupabaseClient;
  job: JobRow;
  anthropicApiKey?: string;
}): Promise<{ rowsProcessed: number }> {
  const { supabase, job, anthropicApiKey } = params;
  const userId = String(job.user_id ?? '');
  if (!userId) throw new Error('apply_rules job missing user_id');

  const mode: ApplyRulesMode =
    job.payload && job.payload['mode'] === 'suggestions_only' ? 'suggestions_only' : 'auto';

  // Fetch categories for AI fallback
  const { data: categoryRows } = await supabase
    .from('categories')
    .select('id,name')
    .eq('user_id', userId);
  const categories = (categoryRows ?? []) as { id: string; name: string }[];

  // Fetch uncategorized transactions for this user.
  const { data: txRows, error: txErr } = await supabase
    .from('transactions')
    .select('id,user_id,description,amount,category_id,suggested_category_id')
    .eq('user_id', userId)
    .is('category_id', null)
    .limit(5000);

  if (txErr) throw txErr;

  const transactions = (txRows ?? []) as TxRow[];
  if (transactions.length === 0) {
    return { rowsProcessed: 0 };
  }

  // Fetch rules for this user ordered by priority desc (highest first).
  const { data: ruleRows, error: rulesErr } = await supabase
    .from('categorization_rules')
    .select(
      'id,name,rule_type,pattern,conditions,category_id,priority,is_active,case_sensitive,created_by,match_count',
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: false })
    .limit(500);

  if (rulesErr) throw rulesErr;

  const rules = (ruleRows ?? []) as RuleRow[];
  if (rules.length === 0) {
    return { rowsProcessed: 0 };
  }

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

  // Track which transactions were matched by rules for AI fallback
  const ruleMatchedIds = new Set<string>();

  for (const tx of transactions) {
    const suggestion = await getBestSuggestion(supabase, userId, tx, rules);
    if (!suggestion) continue;
    ruleMatchedIds.add(tx.id);

    const { categoryId, confidence, rule } = suggestion;

    if (mode === 'auto') {
      if (confidence >= 0.6) {
        updates.push({
          id: tx.id,
          category_id: categoryId,
          auto_categorized: true,
          confidence_score: confidence,
          suggested_category_id: null,
        });
        ruleUsageInserts.push({
          user_id: userId,
          rule_id: rule.id,
          transaction_id: tx.id,
          confidence_score: confidence,
          was_applied: true,
        });
        continue;
      }
      if (confidence > 0.3) {
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
        continue;
      }
      // Very low confidence: record as suggestion only if useful.
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
    } else {
      // suggestions_only
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
  }

  // AI fallback: categorize transactions that no rule matched
  if (anthropicApiKey && categories.length > 0) {
    const unmatched = transactions.filter((tx) => !ruleMatchedIds.has(tx.id));
    for (const tx of unmatched) {
      try {
        const aiResult = await aiSuggestCategory(
          tx.description,
          tx.amount,
          categories,
          anthropicApiKey,
        );
        if (aiResult) {
          updates.push({
            id: tx.id,
            suggested_category_id: aiResult.categoryId,
            confidence_score: aiResult.confidence,
          });
        }
      } catch {
        // Skip individual AI failures silently
      }
    }
  }

  if (updates.length > 0) {
    const { error: updErr } = await supabase.from('transactions').upsert(updates, {
      onConflict: 'id',
    });
    if (updErr) throw updErr;
  }

  if (ruleUsageInserts.length > 0) {
    const { error: usageErr } = await supabase.from('rule_usage').insert(ruleUsageInserts);
    if (usageErr) throw usageErr;

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
          const countForThisRule = ruleUsageInserts.filter((ru) => ru.rule_id === ruleId).length;
          await supabase
            .from('categorization_rules')
            .update({
              match_count: (rule.match_count || 0) + countForThisRule,
              last_matched: new Date().toISOString(),
            })
            .eq('id', ruleId);
        }
      }
    }
  }

  return { rowsProcessed: transactions.length };
}

