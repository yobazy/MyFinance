import { createSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

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

function buildSuggestionForRule(rule: RuleRow): Suggestion {
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
      return false;
  }
}

function getBestSuggestion(tx: TxRow, rules: RuleRow[]): Suggestion | null {
  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (ruleMatches(tx, rule)) {
      return buildSuggestionForRule(rule);
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

  let payload: { mode?: string } = {};
  try {
    payload = (await req.json()) as { mode?: string };
  } catch {
    payload = {};
  }

  const mode: ApplyRulesMode =
    payload.mode === 'suggestions_only' ? 'suggestions_only' : 'auto';

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
      'id,name,rule_type,pattern,conditions,category_id,priority,is_active,case_sensitive,created_by',
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
    if (updErr) return json(500, { error: updErr.message });
  }

  if (ruleUsageInserts.length > 0) {
    const { error: usageErr } = await supabase.from('rule_usage').insert(ruleUsageInserts);
    if (usageErr) return json(500, { error: usageErr.message });
  }

  return json(200, { ok: true, rowsProcessed: transactions.length });
}

