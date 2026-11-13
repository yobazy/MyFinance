import Anthropic from '@anthropic-ai/sdk';

type Category = { id: string; name: string };

export type AiSuggestion = { categoryId: string; confidence: number };

/**
 * Asks Claude to pick one of the user's categories for a transaction that no rule matched.
 * Returns null when the model declines to choose or picks an id that isn't in the list.
 * Amounts follow the app convention: expenses are positive, income is negative.
 */
export async function aiSuggestCategory(
  description: string,
  amount: number,
  categories: Category[],
  apiKey: string,
): Promise<AiSuggestion | null> {
  if (categories.length === 0) return null;

  const client = new Anthropic({ apiKey });
  const categoryList = categories.map((c) => `${c.id}: ${c.name}`).join('\n');

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    system:
      'You categorize personal finance transactions. Pick the single best category from the list, ' +
      'or answer with category_id "none" when no category fits. confidence is your probability (0 to 1) ' +
      'that the chosen category is correct.',
    messages: [
      {
        role: 'user',
        content:
          `Categories (id: name):\n${categoryList}\n\n` +
          `Transaction: ${description}\n` +
          `Amount: ${amount} (positive = expense, negative = income or refund)`,
      },
    ],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            category_id: { type: 'string', enum: [...categories.map((c) => c.id), 'none'] },
            confidence: { type: 'number' },
          },
          required: ['category_id', 'confidence'],
          additionalProperties: false,
        },
      },
    },
  });

  if (response.stop_reason !== 'end_turn') return null;
  const text = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
  if (!text) return null;

  const parsed = JSON.parse(text) as { category_id: string; confidence: number };
  if (!categories.some((c) => c.id === parsed.category_id)) return null;

  const confidence = Number.isFinite(parsed.confidence) ? parsed.confidence : 0.5;
  return { categoryId: parsed.category_id, confidence: Math.min(1, Math.max(0, confidence)) };
}
