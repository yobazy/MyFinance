import Anthropic from '@anthropic-ai/sdk';
import { createSupabaseAdminClient } from '../../../lib/supabaseAdmin';
import { getUserAnthropicKey } from '../../../lib/getUserAnthropicKey';

export const runtime = 'nodejs';
export const maxDuration = 60;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// Tools the assistant can call to query the user's financial data
const tools: Anthropic.Tool[] = [
  {
    name: 'get_spending_by_category',
    description: 'Get total spending grouped by category for a date range.',
    input_schema: {
      type: 'object' as const,
      properties: {
        start_date: { type: 'string', description: 'ISO date YYYY-MM-DD (inclusive)' },
        end_date: { type: 'string', description: 'ISO date YYYY-MM-DD (inclusive)' },
      },
    },
  },
  {
    name: 'search_transactions',
    description: 'Search transactions with optional filters.',
    input_schema: {
      type: 'object' as const,
      properties: {
        description_contains: { type: 'string', description: 'Substring to match in description' },
        start_date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        end_date: { type: 'string', description: 'ISO date YYYY-MM-DD' },
        min_amount: { type: 'number', description: 'Minimum absolute amount' },
        max_amount: { type: 'number', description: 'Maximum absolute amount' },
        limit: { type: 'number', description: 'Max rows to return (default 20, max 50)' },
      },
    },
  },
  {
    name: 'get_accounts',
    description: 'List all accounts with their current balances.',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_recent_transactions',
    description: 'Get the most recent transactions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Number of transactions to return (default 10, max 50)' },
      },
    },
  },
];

async function runTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
): Promise<string> {
  if (toolName === 'get_spending_by_category') {
    let query = supabase
      .from('transactions')
      .select('amount, categories(name)')
      .eq('user_id', userId)
      .not('category_id', 'is', null);
    if (toolInput.start_date) query = query.gte('date', toolInput.start_date as string);
    if (toolInput.end_date) query = query.lte('date', toolInput.end_date as string);
    const { data, error } = await query.limit(5000);
    if (error) return JSON.stringify({ error: error.message });
    const totals = new Map<string, number>();
    for (const row of data ?? []) {
      const name = (row.categories as { name?: string } | null)?.name ?? 'Uncategorized';
      totals.set(name, (totals.get(name) ?? 0) + Math.abs(row.amount as number));
    }
    const result = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }));
    return JSON.stringify(result);
  }

  if (toolName === 'search_transactions') {
    const limit = Math.min(Number(toolInput.limit ?? 20), 50);
    let query = supabase
      .from('transactions')
      .select('id,date,description,amount,categories(name)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    if (toolInput.description_contains) {
      query = query.ilike('description', `%${toolInput.description_contains}%`);
    }
    if (toolInput.start_date) query = query.gte('date', toolInput.start_date as string);
    if (toolInput.end_date) query = query.lte('date', toolInput.end_date as string);
    const { data, error } = await query;
    if (error) return JSON.stringify({ error: error.message });
    const rows = (data ?? []).filter((row) => {
      const abs = Math.abs(row.amount as number);
      if (toolInput.min_amount != null && abs < (toolInput.min_amount as number)) return false;
      if (toolInput.max_amount != null && abs > (toolInput.max_amount as number)) return false;
      return true;
    });
    return JSON.stringify(rows.map((r) => ({
      date: r.date,
      description: r.description,
      amount: r.amount,
      category: (r.categories as { name?: string } | null)?.name ?? null,
    })));
  }

  if (toolName === 'get_accounts') {
    const { data, error } = await supabase
      .from('accounts')
      .select('name,type,balance,currency')
      .eq('user_id', userId);
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify(data ?? []);
  }

  if (toolName === 'get_recent_transactions') {
    const limit = Math.min(Number(toolInput.limit ?? 10), 50);
    const { data, error } = await supabase
      .from('transactions')
      .select('date,description,amount,categories(name)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);
    if (error) return JSON.stringify({ error: error.message });
    return JSON.stringify((data ?? []).map((r) => ({
      date: r.date,
      description: r.description,
      amount: r.amount,
      category: (r.categories as { name?: string } | null)?.name ?? null,
    })));
  }

  return JSON.stringify({ error: `Unknown tool: ${toolName}` });
}

export async function POST(req: Request) {
  const supabase = createSupabaseAdminClient();

  const authz = req.headers.get('authorization') ?? '';
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  if (!token) return json(401, { error: 'Missing Bearer token' });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr) return json(401, { error: userErr.message });
  const userId = userData.user?.id;
  if (!userId) return json(401, { error: 'Invalid token' });

  let body: { messages: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: 'messages array required' });
  }

  const apiKey = await getUserAnthropicKey(userId);
  if (!apiKey) {
    return json(402, { error: 'No Anthropic API key saved. Add one in Settings.' });
  }

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are a helpful personal finance assistant. You have access to the user's real financial data via tools. When answering questions about spending, accounts, or transactions, always call the appropriate tool to get accurate data rather than guessing. Be concise and specific — include dollar amounts and dates when relevant. Today's date is ${new Date().toISOString().split('T')[0]}.`;

  // Agentic loop: call Claude, run tools if needed, repeat
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let assistantText = '';
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages: anthropicMessages,
    });

    // Collect text and tool use blocks
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
    );
    const textBlocks = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    if (textBlocks) assistantText += textBlocks;

    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      break;
    }

    // Execute all requested tools
    anthropicMessages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => {
        const result = await runTool(
          block.name,
          block.input as Record<string, unknown>,
          supabase,
          userId,
        );
        return { type: 'tool_result' as const, tool_use_id: block.id, content: result };
      }),
    );

    anthropicMessages.push({ role: 'user', content: toolResults });
  }

  // Persist to chat_messages table
  await supabase.from('chat_messages').insert([
    { user_id: userId, role: 'user', content: messages[messages.length - 1].content },
    { user_id: userId, role: 'assistant', content: assistantText },
  ]);

  return json(200, { reply: assistantText });
}
