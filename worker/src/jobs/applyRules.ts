import type { SupabaseClient } from '@supabase/supabase-js';

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

function buildSuggestionForRule(rule: RuleRow): Suggestion {
  // Simple confidence model mirroring legacy behavior:
  // - user-created rules (created_by = 'user') get 0.95
  // - preset rules / defaults get 0.8
  const high = 0.95;
  const normal = 0.8;
  const confidence = rule.created_by === 'user' ? high : normal;
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

function getBestSuggestion(tx: TxRow, rules: RuleRow[]): Suggestion | null {
  // Rules are already sorted by priority desc.
  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (ruleMatches(tx, rule)) {
      return buildSuggestionForRule(rule);
    }
  }
  return null;
}

export async function handleApplyRulesJob(params: {
  supabase: SupabaseClient;
  job: JobRow;
}): Promise<{ rowsProcessed: number }> {
  const { supabase, job } = params;
  const userId = String(job.user_id ?? '');
  if (!userId) throw new Error('apply_rules job missing user_id');

  const mode: ApplyRulesMode =
    job.payload && job.payload['mode'] === 'suggestions_only' ? 'suggestions_only' : 'auto';

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
      'id,name,rule_type,pattern,conditions,category_id,priority,is_active,case_sensitive,created_by',
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

  for (const tx of transactions) {
    const suggestion = getBestSuggestion(tx, rules);
    if (!suggestion) continue;

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

  if (updates.length > 0) {
    const { error: updErr } = await supabase.from('transactions').upsert(updates, {
      onConflict: 'id',
    });
    if (updErr) throw updErr;
  }

  if (ruleUsageInserts.length > 0) {
    const { error: usageErr } = await supabase.from('rule_usage').insert(ruleUsageInserts);
    if (usageErr) throw usageErr;
  }

  return { rowsProcessed: transactions.length };
}

