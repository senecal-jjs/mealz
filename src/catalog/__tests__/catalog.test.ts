import { buildCatalog } from '@/catalog';
import { ingredientSources, recipeSources } from '@/catalog/data';
import { deriveRecipe } from '@/catalog/derive';
import type { Ingredient, RecipeSource } from '@/catalog/types';
import { validateCatalog } from '@/catalog/validate';

const ingredients: Ingredient[] = [
  { id: 'chicken', name: 'chicken', aisle: 'meat', kind: 'poultry' },
  { id: 'salmon', name: 'salmon', aisle: 'meat', kind: 'fish' },
  { id: 'cheese', name: 'cheese', aisle: 'dairy', kind: 'dairy' },
  { id: 'rice', name: 'rice', aisle: 'pantry', kind: 'plant', highCarb: true },
  { id: 'soy-sauce', name: 'soy sauce', aisle: 'pantry', kind: 'plant', allergens: ['soy'] },
  { id: 'spinach', name: 'spinach', aisle: 'produce', kind: 'plant' },
];
const byId = new Map(ingredients.map((i) => [i.id, i]));

function recipe(items: [string, boolean?][], extra: Partial<RecipeSource> = {}): RecipeSource {
  return {
    id: 'test',
    title: 'Test',
    description: '',
    image: null,
    baseServings: 4,
    prepMinutes: 5,
    cookMinutes: 10,
    difficulty: 'easy',
    tags: [],
    reviewed: false,
    ingredients: items.map(([ingredient, optional], i) => ({
      id: `i${i}`,
      ingredient,
      quantity: 1,
      unit: 'cup',
      optional,
    })),
    steps: [{ text: 'Cook.', uses: items.map((_, i) => `i${i}`) }],
    ...extra,
  };
}

describe('deriveRecipe', () => {
  it('derives diets from ingredient kinds', () => {
    expect(deriveRecipe(recipe([['spinach']]), byId).diets).toEqual([
      'vegetarian',
      'vegan',
      'pescatarian',
      'low-carb',
    ]);
    expect(deriveRecipe(recipe([['spinach'], ['cheese']]), byId).diets).toEqual([
      'vegetarian',
      'pescatarian',
      'low-carb',
    ]);
    expect(deriveRecipe(recipe([['salmon'], ['rice']]), byId).diets).toEqual(['pescatarian']);
    expect(deriveRecipe(recipe([['chicken']]), byId).diets).toEqual(['low-carb']);
  });

  it('collects implied and explicit allergens', () => {
    expect(deriveRecipe(recipe([['cheese'], ['soy-sauce'], ['salmon']]), byId).allergens).toEqual([
      'dairy',
      'fish',
      'soy',
    ]);
  });

  it('ignores optional ingredients', () => {
    const derived = deriveRecipe(recipe([['spinach'], ['cheese', true]]), byId);
    expect(derived.diets).toContain('vegan');
    expect(derived.allergens).toEqual([]);
  });

  it('adds up total time', () => {
    expect(deriveRecipe(recipe([['spinach']]), byId).totalMinutes).toBe(15);
  });
});

describe('validateCatalog', () => {
  it('reports broken references and unused ingredients', () => {
    const bad = recipe([['spinach'], ['unicorn']]);
    bad.steps = [{ text: 'Cook.', uses: ['i0', 'nope'] }];
    const { errors } = validateCatalog(ingredients, [bad]);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('unknown ingredient "unicorn"'),
        expect.stringContaining('uses unknown ingredient "nope"'),
        expect.stringContaining(`ingredient "i1" isn't used by any step`),
      ]),
    );
  });

  it('requires an image on reviewed recipes', () => {
    const { errors } = validateCatalog(ingredients, [recipe([['spinach']], { reviewed: true })]);
    expect(errors).toEqual([expect.stringContaining('need an image')]);
  });

  it('passes for the shipped catalog', () => {
    expect(validateCatalog(ingredientSources, recipeSources).errors).toEqual([]);
  });
});

describe('buildCatalog', () => {
  it('hides drafts unless asked for them', () => {
    const draft = recipe([['spinach']]);
    const reviewed = recipe([['spinach']], { id: 'done', reviewed: true, image: 'x.jpg' });
    expect(buildCatalog(ingredients, [draft, reviewed], false).recipes.map((r) => r.id)).toEqual([
      'done',
    ]);
    expect(buildCatalog(ingredients, [draft, reviewed], true).recipes).toHaveLength(2);
  });

  it('gives every diet at least a few recipes', () => {
    const { recipes } = buildCatalog(ingredientSources, recipeSources, true);
    for (const diet of ['vegetarian', 'vegan', 'pescatarian', 'low-carb'] as const) {
      expect(recipes.filter((r) => r.diets.includes(diet)).length).toBeGreaterThanOrEqual(3);
    }
  });
});
