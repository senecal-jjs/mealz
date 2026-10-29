/**
 * Reads a recipe from photos of its pages with Claude. The phone also sends
 * the text it recognized on the device, as a second reading of the same pages.
 */
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export type Page = { data: string; mediaType: 'image/jpeg' | 'image/png' };
export type ScanInput = { pages: Page[]; text: string };

export const ScannedRecipe = z.object({
  title: z.string(),
  description: z.string().nullable(),
  servings: z.int().positive().nullable(),
  prepMinutes: z.int().positive().nullable(),
  cookMinutes: z.int().positive().nullable(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  notes: z.array(z.string()),
});
export type ScannedRecipe = z.infer<typeof ScannedRecipe>;

const nullable = (type: string, description: string) => ({ type: [type, 'null'], description });

/** The response shape Claude must follow; mirrors `ScannedRecipe`. */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'description',
    'servings',
    'prepMinutes',
    'cookMinutes',
    'ingredients',
    'steps',
    'notes',
  ],
  properties: {
    title: { type: 'string', description: 'The recipe name, in title case.' },
    description: nullable('string', 'The short introduction, if the page has one.'),
    servings: nullable(
      'integer',
      'Servings as printed. For a range like "2-4", the larger number. Null if not printed.',
    ),
    prepMinutes: nullable('integer', 'Prep time in minutes, if printed. Never estimated.'),
    cookMinutes: nullable('integer', 'Cook time in minutes, if printed. Never estimated.'),
    ingredients: {
      type: 'array',
      items: { type: 'string' },
      description:
        'One ingredient per item, amount first, e.g. "2 tbsp olive oil" or "3 cloves garlic, minced".',
    },
    steps: {
      type: 'array',
      items: { type: 'string' },
      description: 'The instructions in order, one step per item, without step numbers.',
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Short warnings for the cook to check, e.g. text hidden by a pop-up. Empty when there are none.',
    },
  },
} as const;

export const INSTRUCTIONS = `You read recipes from photos of cookbook pages, recipe cards and screenshots, and return them in a fixed structure for a meal-planning app.

You get one or more photos (the pages of one recipe, in order) and the text the phone recognized from them. The photos are the source of truth; the text helps with small print but may contain recognition errors.

- Copy only what the pages say. Never invent ingredients, amounts, steps, servings or times. If something is not printed, use null.
- Ingredients: one per item, amount first. Leave out section headings such as "For the sauce". Split "salt and pepper" into two items; if a step gives their amounts, use those amounts.
- Steps: one per item, in order, without numbers. Join text that wraps across lines or pages.
- Leave out everything that isn't the recipe: ads, pop-ups, navigation, ratings, comments, product links.
- If part of the recipe is hidden, cut off or unreadable, keep what is readable and say what is missing in notes. Do not fill the gap with a guess.`;

export type ModelConfig = { model: string; effort: 'low' | 'medium' | 'high' };

export type ReadResult = {
  recipe: ScannedRecipe;
  usage: { inputTokens: number; outputTokens: number };
};

/** Thrown when Claude declines or returns something unusable; the app falls back to its on-device reader. */
export class UnreadableError extends Error {}

export async function readRecipe(
  client: Anthropic,
  input: ScanInput,
  config: ModelConfig,
): Promise<ReadResult> {
  const response = await client.beta.messages.create({
    model: config.model,
    max_tokens: 16000,
    // Claude Opus 5.5 can decline a request it misjudges as unsafe; the server
    // then retries on Anthropic's recommended fallback model.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: INSTRUCTIONS,
    output_config: {
      effort: config.effort,
      format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [
          ...input.pages.map((page) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: page.mediaType, data: page.data },
          })),
          { type: 'text', text: `Text recognized on the phone:\n\n${input.text}` },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') throw new UnreadableError('refused');
  if (response.stop_reason === 'max_tokens') throw new UnreadableError('too long');
  const text = response.content.find((b) => b.type === 'text')?.text;
  if (!text) throw new UnreadableError('no answer');

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new UnreadableError('invalid JSON');
  }
  const parsed = ScannedRecipe.safeParse(json);
  if (!parsed.success) throw new UnreadableError('wrong shape');
  const recipe = parsed.data;
  if (recipe.ingredients.length === 0 || recipe.steps.length === 0) {
    throw new UnreadableError('no recipe found');
  }
  return {
    recipe,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
