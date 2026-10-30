import { catalog } from '@/catalog';
import { draftToRecipe } from '@/domain/recipe-draft';
import {
  parsedToDraft,
  readingOrder,
  type ParsedRecipeText,
  type TextLine,
} from '@/domain/recipe-text';

describe('readingOrder', () => {
  it('reads two-column pages column by column', () => {
    const line = (text: string, x: number, y: number, width = 0.35, height = 0.02): TextLine => ({
      text,
      x,
      y,
      width,
      height,
    });
    const page = [
      line('Tomato Soup', 0.1, 0.05, 0.6, 0.05),
      line('Ingredients', 0.05, 0.2),
      line('Method', 0.55, 0.2),
      line('2 tbsp butter', 0.05, 0.24),
      line('1. Melt the butter and cook the', 0.55, 0.24, 0.4),
      line('1 onion, chopped', 0.05, 0.28),
      line('onion for 6 minutes.', 0.55, 0.28, 0.25),
      line('1 can tomatoes', 0.05, 0.32),
      line('2. Add the tomatoes and simmer.', 0.55, 0.32, 0.4),
    ];
    expect(readingOrder(page).map((l) => l.text)).toEqual([
      'Tomato Soup',
      'Ingredients',
      '2 tbsp butter',
      '1 onion, chopped',
      '1 can tomatoes',
      'Method',
      '1. Melt the butter and cook the',
      'onion for 6 minutes.',
      '2. Add the tomatoes and simmer.',
    ]);
  });

  it('leaves lines without positions as they are', () => {
    const lines = [{ text: 'b' }, { text: 'a' }];
    expect(readingOrder(lines)).toBe(lines);
  });
});

describe('parsedToDraft', () => {
  const parsed: ParsedRecipeText = {
    title: 'LEMON GARLIC CHICKEN',
    description: 'A bright, weeknight-friendly skillet dinner.',
    servings: 4,
    prepMinutes: 10,
    cookMinutes: 25,
    ingredients: [
      '1 ½ lb boneless chicken thighs',
      '3 cloves garlic, minced',
      '2 tbsp olive oil',
      '1 lemon, zested and juiced',
      'Salt to taste',
      'Black pepper to taste',
    ],
    steps: [
      'Season the chicken with salt and pepper.',
      'Heat the oil in a large skillet and cook the chicken until golden, about 6 minutes per side.',
      'Add the garlic, lemon zest and juice and simmer for 2 minutes.',
    ],
  };

  it('produces an editor draft that saves as a recipe once reviewed', () => {
    const draft = parsedToDraft(parsed, 2);
    expect(draft.title).toBe('Lemon Garlic Chicken');
    expect(draft.servings).toBe(4);
    const result = draftToRecipe(
      { ...draft, id: 'my-scan' },
      catalog.ingredients,
      (n) => `my-${n}`,
    );
    if (!result.ok) throw new Error(result.problems.join('; '));
    expect(result.recipe.ingredients.map((i) => i.ingredient)).toEqual([
      'chicken-thighs',
      'garlic',
      'olive-oil',
      'lemon',
      'salt',
      'black-pepper',
    ]);
    expect(result.recipe.steps.map((s) => s.timerMinutes)).toEqual([undefined, 6, 2]);
  });

  it('falls back to the default servings and blank rows when text is missing', () => {
    const empty = { ...parsed, servings: null, ingredients: [], steps: [] };
    const draft = parsedToDraft(empty, 3);
    expect(draft.servings).toBe(3);
    expect(draft.ingredients).toHaveLength(1);
    expect(draft.steps).toHaveLength(1);
  });
});
