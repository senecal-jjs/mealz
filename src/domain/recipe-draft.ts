/**
 * The recipe editor's model: what the form holds, and how it becomes a recipe
 * the rest of the app understands. Ingredients are typed (or scanned) as single
 * lines like "2 large yellow onions, diced" and matched to known ingredients;
 * anything unknown becomes a custom ingredient once the user says what it is.
 */
import type {
  Aisle,
  Allergen,
  Ingredient,
  IngredientKind,
  RecipeIngredient,
  RecipeSource,
  Step,
} from '@/catalog/types';
import {
  coreWords,
  matchIngredient,
  parseIngredientLine,
  type ParsedIngredient,
} from '@/domain/ingredient-text';
import { formatIngredient } from '@/domain/quantity';

/** What the user tells us about an ingredient the app doesn't know. */
export type CustomSpec = {
  /** Required before saving: it decides which diets the recipe fits. */
  kind: IngredientKind | null;
  aisle: Aisle;
  allergens: Allergen[];
};

export type DraftIngredient = {
  key: string;
  line: string;
  /** null: match automatically. An ingredient id: the user's pick. 'new': not a known ingredient. */
  override: string | 'new' | null;
  custom: CustomSpec;
};

export type DraftStep = { key: string; text: string; timerMinutes: number | null };

export type RecipeDraft = {
  id: string | null;
  title: string;
  description: string;
  image: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  ingredients: DraftIngredient[];
  steps: DraftStep[];
};

let keySeq = 0;
export function draftKey(): string {
  keySeq += 1;
  return `k${keySeq}`;
}

export const EMPTY_CUSTOM: CustomSpec = { kind: null, aisle: 'other', allergens: [] };

export function draftIngredient(line = ''): DraftIngredient {
  return { key: draftKey(), line, override: null, custom: { ...EMPTY_CUSTOM } };
}

export function draftStep(text = '', timerMinutes: number | null = null): DraftStep {
  return { key: draftKey(), text, timerMinutes };
}

export function emptyDraft(servings: number): RecipeDraft {
  return {
    id: null,
    title: '',
    description: '',
    image: null,
    servings,
    prepMinutes: null,
    cookMinutes: null,
    ingredients: [draftIngredient()],
    steps: [draftStep()],
  };
}

export type ResolvedIngredient = {
  parsed: ParsedIngredient;
  /** The known ingredient this line maps to, if any. */
  match: Ingredient | undefined;
  /** True when the line needs a custom ingredient (no match, or the user said "new"). */
  isNew: boolean;
};

export function resolveIngredient(
  item: DraftIngredient,
  known: Map<string, Ingredient>,
): ResolvedIngredient {
  const parsed = parseIngredientLine(item.line);
  if (item.override === 'new') return { parsed, match: undefined, isNew: true };
  const match =
    (item.override ? known.get(item.override) : undefined) ??
    matchIngredient(parsed.name, known.values());
  return { parsed, match, isNew: !match };
}

/**
 * The longest time a step mentions, in minutes: "simmer 10 to 12 minutes" →
 * 12, "about 1 hour" → 60. Seconds-only steps get no timer.
 */
export function detectTimerMinutes(text: string): number | null {
  let best = 0;
  const pattern =
    /(\d+(?:\.\d+)?)(?:\s*(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?)\b/gi;
  for (const m of text.matchAll(pattern)) {
    const value = Number(m[2] ?? m[1]);
    const minutes = /^h/i.test(m[3]) ? value * 60 : value;
    best = Math.max(best, minutes);
  }
  return best > 0 ? Math.round(best) : null;
}

/** Last words too generic to identify an ingredient on their own ("harissa paste" → "harissa"). */
const GENERIC_LAST_WORDS = new Set([
  'paste',
  'sauce',
  'powder',
  'seed',
  'flake',
  'mix',
  'seasoning',
]);

/**
 * Which ingredients a step mentions, by their name's key words: all of them,
 * or the last word ("chicken thighs" → "thigh"), or the first word when the
 * last one is generic ("harissa paste" → "harissa").
 */
function stepUses(text: string, items: { id: string; name: string }[]): string[] {
  const words = new Set(coreWords(text));
  return items
    .filter((item) => {
      const name = coreWords(item.name);
      if (name.length === 0) return false;
      const last = name[name.length - 1];
      return (
        name.every((w) => words.has(w)) ||
        (!GENERIC_LAST_WORDS.has(last) && words.has(last)) ||
        (GENERIC_LAST_WORDS.has(last) && name.length > 1 && words.has(name[0]))
      );
    })
    .map((item) => item.id);
}

export type DraftResult =
  | { ok: true; recipe: RecipeSource; newIngredients: Ingredient[] }
  | { ok: false; problems: string[] };

/**
 * Turns the form into a recipe plus any new custom ingredients. Returns the
 * problems to fix instead when the draft isn't complete.
 */
export function draftToRecipe(
  draft: RecipeDraft,
  known: Map<string, Ingredient>,
  makeIngredientId: (name: string) => string,
): DraftResult {
  const problems: string[] = [];
  if (!draft.title.trim()) problems.push('Give the recipe a name.');

  const lines = draft.ingredients.filter((i) => i.line.trim());
  const steps = draft.steps.filter((s) => s.text.trim());
  if (lines.length === 0) problems.push('Add at least one ingredient.');
  if (steps.length === 0) problems.push('Add at least one step.');

  const newIngredients: Ingredient[] = [];
  const recipeIngredients: RecipeIngredient[] = [];
  lines.forEach((item, index) => {
    const { parsed, match, isNew } = resolveIngredient(item, known);
    if (!parsed.name) {
      problems.push(`Ingredient ${index + 1} needs a name.`);
      return;
    }
    let ingredient = match;
    if (isNew) {
      if (!item.custom.kind) {
        problems.push(`Say what “${parsed.name}” is, so diet filters stay accurate.`);
        return;
      }
      // Two lines naming the same new thing share one custom ingredient.
      ingredient = newIngredients.find((n) => n.name.toLowerCase() === parsed.name.toLowerCase());
      if (!ingredient) {
        ingredient = {
          id: makeIngredientId(parsed.name),
          name: parsed.name.toLowerCase(),
          aisle: item.custom.aisle,
          kind: item.custom.kind,
          ...(item.custom.allergens.length && { allergens: item.custom.allergens }),
        };
        newIngredients.push(ingredient);
      }
    }
    recipeIngredients.push({
      id: `i${index + 1}`,
      ingredient: ingredient!.id,
      quantity: parsed.quantity,
      unit: parsed.unit,
      ...(parsed.prep && { prep: parsed.prep }),
      ...(parsed.optional && { optional: true }),
    });
  });

  if (problems.length) return { ok: false, problems };

  const named = recipeIngredients.map((ri) => ({
    id: ri.id,
    name: (known.get(ri.ingredient) ?? newIngredients.find((n) => n.id === ri.ingredient))!.name,
  }));
  const recipeSteps: Step[] = steps.map((s) => {
    const timer = s.timerMinutes ?? detectTimerMinutes(s.text);
    return {
      text: s.text.trim(),
      uses: stepUses(s.text, named),
      ...(timer && { timerMinutes: timer }),
    };
  });

  return {
    ok: true,
    newIngredients,
    recipe: {
      id: draft.id!,
      title: draft.title.trim(),
      description: draft.description.trim(),
      image: draft.image,
      baseServings: draft.servings,
      prepMinutes: draft.prepMinutes ?? 0,
      cookMinutes: draft.cookMinutes ?? 0,
      difficulty: 'easy',
      tags: [],
      reviewed: true,
      ingredients: recipeIngredients,
      steps: recipeSteps,
    },
  };
}

/** Turns a saved recipe back into form lines for editing. */
export function recipeToDraft(recipe: RecipeSource, known: Map<string, Ingredient>): RecipeDraft {
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    image: recipe.image,
    servings: recipe.baseServings,
    prepMinutes: recipe.prepMinutes || null,
    cookMinutes: recipe.cookMinutes || null,
    ingredients: recipe.ingredients.map((item) => {
      const ingredient = known.get(item.ingredient);
      const { amount, name } = ingredient
        ? formatIngredient(item, ingredient)
        : { amount: '', name: item.ingredient };
      const parts = [amount, name].filter(Boolean).join(' ');
      const line = [parts, item.prep, item.optional ? 'optional' : ''].filter(Boolean).join(', ');
      return {
        key: draftKey(),
        line,
        override: item.ingredient,
        custom: { ...EMPTY_CUSTOM },
      };
    }),
    steps: recipe.steps.map((s) => draftStep(s.text, s.timerMinutes ?? null)),
  };
}
