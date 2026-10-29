import assert from 'node:assert/strict';
import { test } from 'node:test';

import type Anthropic from '@anthropic-ai/sdk';

import { readRecipe, UnreadableError, type ScannedRecipe } from '../src/recipe.ts';

const recipe: ScannedRecipe = {
  title: 'Sheet Pan Greek Chicken',
  description: null,
  servings: 4,
  prepMinutes: 25,
  cookMinutes: 30,
  ingredients: ['2 tbsp olive oil', '2 lb chicken thighs'],
  steps: ['Preheat the oven to 425°F.', 'Bake for 25 minutes.'],
  notes: ['Step 8 is partly hidden by a pop-up.'],
};

/** A client whose `beta.messages.create` returns the given response and records the request. */
function fakeClient(response: object) {
  const calls: Record<string, unknown>[] = [];
  const client = {
    beta: {
      messages: {
        create: async (params: Record<string, unknown>) => {
          calls.push(params);
          return { usage: { input_tokens: 2000, output_tokens: 600 }, ...response };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, calls };
}

const input = {
  pages: [{ data: 'aGVsbG8=', mediaType: 'image/jpeg' as const }],
  text: 'Sheet Pan',
};
const config = { model: 'claude-opus-5-5', effort: 'low' as const };

test('sends the pages and recognized text, and returns the parsed recipe', async () => {
  const { client, calls } = fakeClient({
    stop_reason: 'end_turn',
    content: [
      { type: 'thinking', thinking: '' },
      { type: 'text', text: JSON.stringify(recipe) },
    ],
  });
  const result = await readRecipe(client, input, config);
  assert.deepEqual(result, { recipe, usage: { inputTokens: 2000, outputTokens: 600 } });

  const params = calls[0] as {
    model: string;
    fallbacks: string;
    messages: { content: { type: string }[] }[];
  };
  assert.equal(params.model, 'claude-opus-5-5');
  assert.equal(params.fallbacks, 'default');
  assert.deepEqual(
    params.messages[0].content.map((b) => b.type),
    ['image', 'text'],
  );
});

test('rejects refusals, malformed JSON, the wrong shape and empty recipes', async () => {
  const cases = [
    { stop_reason: 'refusal', content: [] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"title":' }] },
    { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"title":"x"}' }] },
    {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({ ...recipe, ingredients: [] }) }],
    },
  ];
  for (const response of cases) {
    const { client } = fakeClient(response);
    await assert.rejects(readRecipe(client, input, config), UnreadableError);
  }
});
