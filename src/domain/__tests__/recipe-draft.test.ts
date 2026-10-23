import { catalog } from '@/catalog';
import {
  detectTimerMinutes,
  draftIngredient,
  draftStep,
  draftToRecipe,
  emptyDraft,
  recipeToDraft,
  resolveIngredient,
  type RecipeDraft,
} from '@/domain/recipe-draft';

const known = catalog.ingredients;
let n = 0;
const makeId = (name: string) => `my-${name.replace(/\s+/g, '-')}-${++n}`;

function draft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    ...emptyDraft(4),
    id: 'my-1',
    title: 'Weeknight Garlic Rice',
    ingredients: [
      draftIngredient('1 ½ cups jasmine rice'),
      draftIngredient('3 cloves garlic, minced'),
      draftIngredient('2 tbsp olive oil'),
      draftIngredient('Salt to taste'),
    ],
    steps: [
      draftStep('Warm the olive oil and garlic in a pot for 1 minute.'),
      draftStep(
        'Add the rice and 2 cups water, cover and simmer 15 to 18 minutes. Season with salt.',
      ),
    ],
    ...overrides,
  };
}

describe('detectTimerMinutes', () => {
  it.each([
    ['Simmer for 10 minutes.', 10],
    ['Roast 10 to 12 minutes, until golden.', 12],
    ['Cook about 1 hour.', 60],
    ['Bake 1.5 hours', 90],
    ['Rest 5 mins, then slice. Bake 25 min.', 25],
    ['Stir for 30 seconds.', null],
    ['Season and serve.', null],
  ])('%p → %p', (text, expected) => {
    expect(detectTimerMinutes(text)).toBe(expected);
  });
});

describe('resolveIngredient', () => {
  it('matches automatically, honours a manual pick, and can be forced to new', () => {
    const item = draftIngredient('2 large yellow onions, diced');
    expect(resolveIngredient(item, known).match?.id).toBe('yellow-onion');
    expect(resolveIngredient({ ...item, override: 'red-onion' }, known).match?.id).toBe(
      'red-onion',
    );
    expect(resolveIngredient({ ...item, override: 'new' }, known)).toMatchObject({
      match: undefined,
      isNew: true,
    });
  });
});

describe('draftToRecipe', () => {
  it('builds a recipe with matched ingredients, step links and detected timers', () => {
    const result = draftToRecipe(draft(), known, makeId);
    if (!result.ok) throw new Error(result.problems.join('; '));
    const { recipe, newIngredients } = result;

    expect(newIngredients).toEqual([]);
    expect(recipe).toMatchObject({ id: 'my-1', title: 'Weeknight Garlic Rice', baseServings: 4 });
    expect(recipe.ingredients).toEqual([
      { id: 'i1', ingredient: 'jasmine-rice', quantity: 1.5, unit: 'cup' },
      { id: 'i2', ingredient: 'garlic', quantity: 3, unit: 'clove', prep: 'minced' },
      { id: 'i3', ingredient: 'olive-oil', quantity: 2, unit: 'tbsp' },
      { id: 'i4', ingredient: 'salt', quantity: null, unit: null },
    ]);
    expect(recipe.steps).toEqual([
      {
        text: 'Warm the olive oil and garlic in a pot for 1 minute.',
        uses: ['i2', 'i3'],
        timerMinutes: 1,
      },
      {
        text: 'Add the rice and 2 cups water, cover and simmer 15 to 18 minutes. Season with salt.',
        uses: ['i1', 'i4'],
        timerMinutes: 18,
      },
    ]);
  });

  it('lists what is missing instead of saving', () => {
    const result = draftToRecipe(
      { ...emptyDraft(2), id: 'my-2', ingredients: [draftIngredient('  ')] },
      known,
      makeId,
    );
    expect(result).toEqual({
      ok: false,
      problems: [
        'Give the recipe a name.',
        'Add at least one ingredient.',
        'Add at least one step.',
      ],
    });
  });

  it('asks what an unknown ingredient is, then creates it once', () => {
    const base = draft({
      ingredients: [draftIngredient('2 tbsp gochujang'), draftIngredient('1 tsp gochujang')],
    });
    expect(draftToRecipe(base, known, makeId)).toEqual({
      ok: false,
      problems: [
        'Say what “gochujang” is, so diet filters stay accurate.',
        'Say what “gochujang” is, so diet filters stay accurate.',
      ],
    });

    const answered = {
      ...base,
      ingredients: base.ingredients.map((i) => ({
        ...i,
        custom: { kind: 'plant' as const, aisle: 'other' as const, allergens: ['soy' as const] },
      })),
    };
    const result = draftToRecipe(answered, known, makeId);
    if (!result.ok) throw new Error(result.problems.join('; '));
    expect(result.newIngredients).toEqual([
      expect.objectContaining({ name: 'gochujang', kind: 'plant', allergens: ['soy'] }),
    ]);
    const id = result.newIngredients[0].id;
    expect(result.recipe.ingredients.map((i) => i.ingredient)).toEqual([id, id]);
  });

  it('keeps a manually set timer and allows no timer', () => {
    const result = draftToRecipe(
      draft({ steps: [draftStep('Simmer 20 minutes.', 25), draftStep('Serve warm.')] }),
      known,
      makeId,
    );
    if (!result.ok) throw new Error(result.problems.join('; '));
    expect(result.recipe.steps.map((s) => s.timerMinutes)).toEqual([25, undefined]);
  });
});

describe('recipeToDraft', () => {
  it('round-trips a saved recipe through the form', () => {
    const first = draftToRecipe(draft(), known, makeId);
    if (!first.ok) throw new Error('setup');
    const back = recipeToDraft(first.recipe, known);
    expect(back.ingredients.map((i) => i.line)).toEqual([
      '1 ½ cups jasmine rice',
      '3 cloves garlic, minced',
      '2 tbsp olive oil',
      'salt',
    ]);
    const again = draftToRecipe(back, known, makeId);
    if (!again.ok) throw new Error(again.problems.join('; '));
    expect(again.recipe.ingredients).toEqual(first.recipe.ingredients);
    expect(again.recipe.steps).toEqual(first.recipe.steps);
  });

  it('round-trips a whole bundled recipe', () => {
    const source = catalog.recipesById.get('chickpea-coconut-curry')!;
    const result = draftToRecipe(recipeToDraft(source, known), known, makeId);
    if (!result.ok) throw new Error(result.problems.join('; '));
    expect(
      result.recipe.ingredients.map(({ ingredient, quantity, unit }) => [
        ingredient,
        quantity,
        unit,
      ]),
    ).toEqual(
      source.ingredients.map(({ ingredient, quantity, unit }) => [ingredient, quantity, unit]),
    );
  });
});
