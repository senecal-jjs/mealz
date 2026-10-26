import { catalog } from '@/catalog';
import { draftToRecipe } from '@/domain/recipe-draft';
import { parsedToDraft, parseRecipeText, readingOrder, type TextLine } from '@/domain/recipe-text';

const typical = [
  'LEMON GARLIC CHICKEN',
  'A bright, weeknight-friendly skillet dinner.',
  'Serves 4 · Prep 10 min · Cook 25 min',
  'Ingredients',
  '1 ½ lb boneless chicken thighs',
  '3 cloves garlic, minced',
  '2 tbsp olive oil',
  '1 lemon, zested and',
  'juiced',
  'Salt and pepper to taste',
  'Directions',
  '1. Season the chicken with salt and pepper.',
  '2. Heat the oil in a large skillet and cook the chicken until golden,',
  'about 6 minutes per side.',
  '3. Add the garlic, lemon zest and juice and sim-',
  'mer for 2 minutes.',
  '42',
];

describe('parseRecipeText', () => {
  it('reads a typical recipe page with headings and numbered steps', () => {
    expect(parseRecipeText(typical)).toEqual({
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
    });
  });

  it('handles other heading words, bullets and subheaders', () => {
    const parsed = parseRecipeText([
      'Quick Pasta',
      'Makes 2 servings',
      'You will need:',
      '• 8 oz spaghetti',
      'For the sauce:',
      '• 2 tbsp butter',
      'Method:',
      'Boil the pasta for 10 minutes.',
      'Melt the butter and toss.',
    ]);
    expect(parsed.title).toBe('Quick Pasta');
    expect(parsed.servings).toBe(2);
    expect(parsed.ingredients).toEqual(['8 oz spaghetti', '2 tbsp butter']);
    expect(parsed.steps).toEqual(['Boil the pasta for 10 minutes.', 'Melt the butter and toss.']);
  });

  it('drops section headings inside the ingredient list', () => {
    const parsed = parseRecipeText([
      'Baked Mac and Cheese',
      'Ingredients',
      'MACARONI:',
      '250g / 8 oz macaroni (elbow pasta)',
      'TOPPING',
      '2/3 cup panko breadcrumbs',
      'SEASONINGS (OPTIONAL):',
      '1 tsp garlic powder',
      'Instructions',
      'Cook the pasta for 8 minutes.',
    ]);
    expect(parsed.ingredients).toEqual([
      '250g / 8 oz macaroni (elbow pasta)',
      '2/3 cup panko breadcrumbs',
      '1 tsp garlic powder',
    ]);
  });

  it('finds the ingredients without any headings', () => {
    const parsed = parseRecipeText([
      'Simple Shakshuka',
      '2 tbsp olive oil',
      '1 onion, diced',
      '1 can crushed tomatoes',
      '6 eggs',
      'Cook the onion in the oil until soft, then add the tomatoes and simmer for 10 minutes.',
      'Crack in the eggs, cover and cook until set.',
    ]);
    expect(parsed.title).toBe('Simple Shakshuka');
    expect(parsed.ingredients).toHaveLength(4);
    expect(parsed.steps).toHaveLength(2);
  });

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
    expect(readingOrder(page).map((l) => l.text)[0]).toBe('Tomato Soup');
    const parsed = parseRecipeText(page);
    expect(parsed.ingredients).toEqual(['2 tbsp butter', '1 onion, chopped', '1 can tomatoes']);
    expect(parsed.steps).toEqual([
      'Melt the butter and cook the onion for 6 minutes.',
      'Add the tomatoes and simmer.',
    ]);
  });
});

describe('parsedToDraft', () => {
  it('produces an editor draft that saves as a recipe once reviewed', () => {
    const draft = parsedToDraft(parseRecipeText(typical), 2);
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
    const draft = parsedToDraft(parseRecipeText([]), 3);
    expect(draft.servings).toBe(3);
    expect(draft.ingredients).toHaveLength(1);
    expect(draft.steps).toHaveLength(1);
  });
});
