import type { ModelRecipe, TextLine } from '@/domain/recipe-text';
import type { ScannedPage } from '@/features/my-recipes/cloud';
import { structureScan, structureScannedText } from '@/features/my-recipes/structure';

const page: TextLine[] = [
  'PANCAKES',
  'Makes 8',
  'Ingredients',
  '1 cup flour',
  '1 egg',
  '1 cup milk',
  'Method',
  '1. Whisk everything together.',
  '2. Fry for 2 minutes per side.',
].map((text) => ({ text }));

const modelReturning = (result: ModelRecipe | Error, available = true) => ({
  available: () => available,
  structure: jest.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  }),
});

const good: ModelRecipe = {
  title: 'Fluffy Pancakes',
  description: 'Makes 8',
  ingredients: ['• 1 cup flour', '1 egg', '1.5 cups milk', 'Salt and pepper to taste'],
  steps: ['1. Whisk everything together.', 'Fry for 2 minutes per side.'],
};

describe('structureScannedText', () => {
  it('uses the rules when the model is unavailable, without calling it', async () => {
    const model = modelReturning(good, false);
    const result = await structureScannedText(page, model);
    expect(result.source).toBe('rules');
    expect(result.recipe.title).toBe('PANCAKES');
    expect(result.recipe.ingredients).toEqual(['1 cup flour', '1 egg', '1 cup milk']);
    expect(model.structure).not.toHaveBeenCalled();
  });

  it('uses the model when available, cleaning its output and taking numbers from the rules', async () => {
    const model = modelReturning(good);
    const result = await structureScannedText(page, model);
    expect(model.structure).toHaveBeenCalledWith(page.map((l) => l.text).join('\n'));
    expect(result).toEqual({
      source: 'model',
      notes: [],
      recipe: {
        title: 'Fluffy Pancakes',
        // The model offered the servings line as the description; the
        // servings themselves come from the rules.
        description: '',
        servings: 8,
        prepMinutes: null,
        cookMinutes: null,
        ingredients: [
          '1 cup flour',
          '1 egg',
          '1.5 cups milk', // a decimal amount isn't mistaken for a step number
          'Salt to taste',
          'Black pepper to taste',
        ],
        steps: ['Whisk everything together.', 'Fry for 2 minutes per side.'],
      },
    });
  });

  it('falls back to the rules when the model fails', async () => {
    const result = await structureScannedText(page, modelReturning(new Error('busy')));
    expect(result.source).toBe('rules');
  });

  it('falls back when the model returns nothing usable or loses most of the list', async () => {
    const empty = { ...good, ingredients: [], steps: [] };
    expect((await structureScannedText(page, modelReturning(empty))).source).toBe('rules');
    const partial = { ...good, ingredients: ['1 egg'] };
    expect((await structureScannedText(page, modelReturning(partial))).source).toBe('rules');
  });
});

describe('structureScan', () => {
  const pages: ScannedPage[] = [{ uri: 'file:///p.jpg', lines: page }];
  const unavailable = modelReturning(good, false);
  const cloudRecipe = {
    recipe: {
      title: 'Pancakes',
      description: '',
      servings: 8,
      prepMinutes: null,
      cookMinutes: null,
      ingredients: ['1 cup flour'],
      steps: ['Whisk and fry.'],
    },
    notes: ['The last step is cut off.'],
    credit: null,
  };

  it('uses the cloud reader when allowed', async () => {
    const cloud = jest.fn(async () => cloudRecipe);
    const result = await structureScan(pages, cloud, unavailable);
    expect(cloud).toHaveBeenCalledWith(pages);
    expect(result).toEqual({
      recipe: cloudRecipe.recipe,
      notes: cloudRecipe.notes,
      source: 'cloud',
    });
  });

  it('reads on the device when the cloud fails or is not allowed', async () => {
    const offline = jest.fn(async () => Promise.reject(new Error('offline')));
    const failed = await structureScan(pages, offline, unavailable);
    expect(failed).toMatchObject({ source: 'rules', notes: [] });
    expect(failed.recipe.title).toBe('PANCAKES');

    expect((await structureScan(pages, null, unavailable)).source).toBe('rules');
  });
});
