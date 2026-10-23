import { catalog, getRecipe } from '@/catalog';
import type { Ingredient, Recipe, RecipeIngredient } from '@/catalog/types';
import { compileGroceryList, describeLine, type PlannedRecipe } from '@/domain/grocery';

const ingredients = new Map<string, Ingredient>(
  (
    [
      { id: 'lime', name: 'lime', aisle: 'produce', kind: 'plant' },
      { id: 'onion', name: 'red onion', aisle: 'produce', kind: 'plant' },
      { id: 'garlic', name: 'garlic', plural: 'garlic', aisle: 'produce', kind: 'plant' },
      { id: 'cilantro', name: 'cilantro', aisle: 'produce', kind: 'plant' },
      { id: 'chicken', name: 'chicken breast', aisle: 'meat', kind: 'poultry' },
      { id: 'tomatoes', name: 'cherry tomatoes', aisle: 'produce', kind: 'plant' },
      { id: 'rice', name: 'jasmine rice', aisle: 'pantry', kind: 'plant' },
      { id: 'oil', name: 'olive oil', aisle: 'pantry', kind: 'plant', staple: true },
      { id: 'salt', name: 'salt', aisle: 'spices', kind: 'plant', staple: true },
      { id: 'beans', name: 'black beans', aisle: 'pantry', kind: 'plant' },
      { id: 'cream', name: 'sour cream', aisle: 'dairy', kind: 'dairy' },
    ] satisfies Ingredient[]
  ).map((i) => [i.id, i]),
);

let nextId = 0;
function recipe(
  title: string,
  items: [string, number | null, RecipeIngredient['unit'], boolean?][],
) {
  return {
    id: `r${nextId++}`,
    title,
    baseServings: 4,
    ingredients: items.map(([ingredient, quantity, unit, optional], i) => ({
      id: `i${i}`,
      ingredient,
      quantity,
      unit,
      optional,
    })),
  } as Recipe;
}

const plan = (...entries: [Recipe, number][]): PlannedRecipe[] =>
  entries.map(([r, servings]) => ({ recipe: r, servings }));

const lines = (planned: PlannedRecipe[], system?: 'us' | 'metric') =>
  compileGroceryList(planned, ingredients, system).map(describeLine);

describe('compileGroceryList', () => {
  it('merges the same ingredient across recipes and lists where it is used', () => {
    const tacos = recipe('Tacos', [['lime', 2, 'whole']]);
    const curry = recipe('Curry', [['lime', 1, 'whole']]);
    const list = compileGroceryList(plan([tacos, 4], [curry, 4]), ingredients);
    expect(list).toHaveLength(1);
    expect(describeLine(list[0])).toBe('3 limes');
    expect(list[0].recipeTitles).toEqual(['Curry', 'Tacos']);
  });

  it('scales by servings and rounds counted items up', () => {
    const tacos = recipe('Tacos', [
      ['onion', 0.5, 'whole'],
      ['lime', 1, 'whole'],
    ]);
    expect(lines(plan([tacos, 2]))).toEqual(['1 lime', '1 red onion']);
    expect(lines(plan([tacos, 6]))).toEqual(['2 limes', '1 red onion']);
    expect(lines(plan([tacos, 12]))).toEqual(['3 limes', '2 red onions']);
  });

  it('adds volumes in different units and picks a readable unit', () => {
    const a = recipe('A', [['oil', 2, 'tbsp']]);
    const b = recipe('B', [['oil', 0.5, 'cup']]);
    // 2 tbsp + ½ cup = ⅝ cup, rounded up to the next ¼ cup.
    expect(lines(plan([a, 4], [b, 4]))).toEqual(['¾ cup olive oil']);
    expect(lines(plan([a, 4]))).toEqual(['2 tbsp olive oil']);
    expect(lines(plan([a, 1]))).toEqual(['1 ½ tsp olive oil']);
    expect(lines(plan([recipe('Rice', [['rice', 1.5, 'cup']]), 8]))).toEqual([
      '3 cups jasmine rice',
    ]);
  });

  it('adds weights and switches from oz to lb', () => {
    const a = recipe('A', [['tomatoes', 10, 'oz']]);
    const b = recipe('B', [['tomatoes', 20, 'oz']]);
    expect(lines(plan([a, 4]))).toEqual(['10 oz cherry tomatoes']);
    // 30 oz = 1.875 lb, rounded up to the next ¼ lb.
    expect(lines(plan([a, 4], [b, 4]))).toEqual(['2 lb cherry tomatoes']);
    expect(lines(plan([recipe('C', [['chicken', 1.5, 'lb']]), 2]))).toEqual([
      '12 oz chicken breast',
    ]);
  });

  it('counts cloves, cans and bunches separately and rounds them up', () => {
    const a = recipe('A', [
      ['garlic', 3, 'clove'],
      ['beans', 2, 'can'],
      ['cilantro', 0.25, 'bunch'],
    ]);
    const b = recipe('B', [
      ['garlic', 2, 'clove'],
      ['cilantro', 0.5, 'bunch'],
    ]);
    expect(lines(plan([a, 4], [b, 4]))).toEqual([
      '1 bunch cilantro',
      '5 cloves garlic',
      '2 cans black beans',
    ]);
    expect(lines(plan([a, 2]))).toEqual([
      '1 bunch cilantro',
      '2 cloves garlic',
      '1 can black beans',
    ]);
  });

  it('shows "to taste" items once, without an amount', () => {
    const a = recipe('A', [['salt', null, null]]);
    const b = recipe('B', [['salt', null, null]]);
    expect(lines(plan([a, 4], [b, 4]))).toEqual(['salt']);
  });

  it('prefers a real amount over "to taste"', () => {
    const a = recipe('A', [['oil', null, null]]);
    const b = recipe('B', [['oil', 1, 'tbsp']]);
    expect(lines(plan([a, 4], [b, 4]))).toEqual(['1 tbsp olive oil']);
  });

  it('marks an ingredient optional only when every use is optional', () => {
    const a = recipe('A', [['cream', 0.5, 'cup', true]]);
    const b = recipe('B', [['cream', 0.25, 'cup']]);
    expect(lines(plan([a, 4]))).toEqual(['½ cup sour cream (optional)']);
    expect(lines(plan([a, 4], [b, 4]))).toEqual(['¾ cup sour cream']);
  });

  it('shows amounts it cannot convert side by side', () => {
    const a = recipe('A', [['onion', 1, 'whole']]);
    const b = recipe('B', [['onion', 4, 'oz']]);
    expect(lines(plan([a, 4], [b, 4]))).toEqual(['4 oz + 1 red onion']);
  });

  it('sorts by aisle, then name, and flags staples', () => {
    const list = compileGroceryList(
      plan([
        recipe('A', [
          ['salt', null, null],
          ['rice', 1, 'cup'],
          ['chicken', 1, 'lb'],
          ['lime', 1, 'whole'],
          ['cream', 1, 'cup'],
          ['onion', 1, 'whole'],
        ]),
        4,
      ]),
      ingredients,
    );
    expect(list.map((l) => l.key)).toEqual(['lime', 'onion', 'chicken', 'cream', 'rice', 'salt']);
    expect(list.find((l) => l.key === 'salt')?.staple).toBe(true);
  });

  it('supports metric units', () => {
    const a = recipe('A', [
      ['tomatoes', 10, 'oz'],
      ['oil', 2, 'tbsp'],
      ['chicken', 3, 'lb'],
    ]);
    expect(lines(plan([a, 4]), 'metric')).toEqual([
      '290 g cherry tomatoes',
      '1.4 kg chicken breast',
      '30 ml olive oil',
    ]);
  });

  it('returns nothing for an empty plan', () => {
    expect(compileGroceryList([], ingredients)).toEqual([]);
  });

  it('builds a sensible list from real catalog recipes', () => {
    const planned = ['black-bean-tacos-lime-slaw', 'sweet-potato-black-bean-chili'].map((id) => ({
      recipe: getRecipe(id)!,
      servings: 4,
    }));
    const text = compileGroceryList(planned, catalog.ingredients).map(describeLine);
    expect(text).toEqual(
      expect.arrayContaining([
        '4 cans black beans',
        '3 limes',
        '1 bunch cilantro',
        '5 cloves garlic',
        '2 avocados',
      ]),
    );
  });
});
